import { BMW_PROFILES, type BmwProfileKey } from "@/app/utils/bwmProfiles.util";

export type ServiceLocation = "center" | "outside";
export type CarCondition = "excellent" | "normal" | "poor";

export type CalcInput = {
  income: {
    monthlyIncome: number;
    annualIncome: number;
  };
  finance: {
    carPrice: number;
    downPaymentAmount: number; // บาท
    months: number;
    interestAprFlat: number; // % per year, flat
  };
  car: {
    modelKey: BmwProfileKey;
    year: number;
    mileageKm: number;
    condition: CarCondition;
  };
  usage: {
    kmPerMonth: number;
    fuelPricePerLiter: number;
    kmPerLiter: number;
  };
  fixedCosts: {
    insurancePerYear: number;
    taxAndActPerYear: number;
    parkingTollPerMonth: number;
  };
  depreciation: {
    holdYears: number;
    expectedResalePrice?: number;
    depreciationRatePerYear: number; // % (used if expectedResalePrice missing)
  };
  maintenance: {
    profileKey: BmwProfileKey;
    serviceLocation: ServiceLocation;
  };
};

export type CalcResult = {
  loan: {
    downPaymentAmount: number;
    downPaymentPercent: number;
    principal: number;
    totalInterest: number;
    totalPayable: number;
    paymentPerMonth: number;
  };
  fuel: {
    kmPerMonth: number;
    litersPerMonth: number;
    costPerMonth: number;
  };
  fixedCosts: { perMonth: number };
  depreciation: {
    expectedResalePrice: number;
    perMonth: number;
  };
  maintenance: {
    baseServicePerMonth: number;
    wearPerMonth: number;
    riskReservePerMonth: number;
    avgPerMonth: number;
    riskItems: Array<{ name: string; monthlyReserve: number }>;
    serviceLocationMultiplier: number;
    conditionMultiplier: number;
  };
  affordability: {
    ratioToMonthlyIncome: number;
    level: "ไหว" | "ตึง" | "เสี่ยง";
  };
  totalPerMonth: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Multipliers for service location
const SERVICE_LOCATION_MULTIPLIERS: Record<ServiceLocation, number> = {
  center: 1.0,  // ซ่อมศูนย์
  outside: 0.65, // อู่นอก
};

// Multipliers for car condition affecting risk reserve
const CONDITION_RISK_MULTIPLIERS: Record<CarCondition, number> = {
  excellent: 0.7,  // ดีมาก - ความเสี่ยงต่ำ
  normal: 1.0,     // ปกติ
  poor: 1.5,       // โทรม - ความเสี่ยงสูง
};

export function calcAll(input: CalcInput): CalcResult {
  const carPrice = Math.max(0, input.finance.carPrice);
  const downPaymentAmount = clamp(Math.max(0, input.finance.downPaymentAmount), 0, carPrice);
  const downPaymentPercent = carPrice > 0 ? (downPaymentAmount / carPrice) * 100 : 0;

  const principal = Math.max(0, carPrice - downPaymentAmount);

  const months = Math.max(1, Math.floor(input.finance.months || 1));
  const years = months / 12;

  // Flat interest approximation
  const apr = Math.max(0, input.finance.interestAprFlat) / 100;
  const totalInterest = principal * apr * years;
  const totalPayable = principal + totalInterest;
  const paymentPerMonth = totalPayable / months;

  // Fuel
  const kmPerMonth = Math.max(0, input.usage.kmPerMonth);
  const kmPerLiter = Math.max(0.1, input.usage.kmPerLiter);
  const litersPerMonth = kmPerMonth / kmPerLiter;
  const costPerMonth = litersPerMonth * Math.max(0, input.usage.fuelPricePerLiter);

  // Fixed costs
  const fixedPerMonth =
    Math.max(0, input.fixedCosts.insurancePerYear) / 12 +
    Math.max(0, input.fixedCosts.taxAndActPerYear) / 12 +
    Math.max(0, input.fixedCosts.parkingTollPerMonth);

  // Depreciation
  const holdYears = Math.max(0.5, input.depreciation.holdYears);
  const holdMonths = holdYears * 12;

  const expectedResale =
    typeof input.depreciation.expectedResalePrice === "number"
      ? Math.max(0, input.depreciation.expectedResalePrice)
      : estimateResaleByRate(carPrice, Math.max(0, input.depreciation.depreciationRatePerYear), holdYears);

  const depreciationPerMonth = (carPrice - expectedResale) / holdMonths;

  // Maintenance calculations
  const profile = BMW_PROFILES[input.maintenance.profileKey];
  
  // Base service cost with service location multiplier
  const serviceMultiplier = SERVICE_LOCATION_MULTIPLIERS[input.maintenance.serviceLocation];
  const baseServicePerMonth = (Math.max(0, profile.defaults.baseServicePerYear) / 12) * serviceMultiplier;

  // Wear items (not affected by service location as much, but still some)
  const wearPerMonth =
    (Math.max(0, profile.wearItems.tiresPerKm) * kmPerMonth +
     Math.max(0, profile.wearItems.brakesPerKm) * kmPerMonth) * serviceMultiplier;

  // Risk items with condition multiplier
  const conditionMultiplier = CONDITION_RISK_MULTIPLIERS[input.car.condition];
  const riskTriggered = profile.riskItems
    .map((r) => ({ ...r, isTriggered: isRiskTriggered(r, input.car.year, input.car.mileageKm) }))
    .filter((r) => r.isTriggered);

  const riskItems = riskTriggered.map((r) => ({
    name: r.name,
    monthlyReserve: ((r.monthlyReserveMin + r.monthlyReserveMax) / 2) * conditionMultiplier,
  }));

  const riskReservePerMonth = riskItems.reduce((s, x) => s + x.monthlyReserve, 0);

  const maintenanceAvgPerMonth = baseServicePerMonth + wearPerMonth + riskReservePerMonth;

  const totalPerMonth = paymentPerMonth + costPerMonth + fixedPerMonth + depreciationPerMonth + maintenanceAvgPerMonth;

  const monthlyIncome = Math.max(1, input.income.monthlyIncome);
  const ratio = totalPerMonth / monthlyIncome;
  const level: CalcResult["affordability"]["level"] = ratio <= 0.18 ? "ไหว" : ratio <= 0.28 ? "ตึง" : "เสี่ยง";

  return {
    loan: {
      downPaymentAmount,
      downPaymentPercent,
      principal,
      totalInterest,
      totalPayable,
      paymentPerMonth,
    },
    fuel: { kmPerMonth, litersPerMonth, costPerMonth },
    fixedCosts: { perMonth: fixedPerMonth },
    depreciation: { expectedResalePrice: expectedResale, perMonth: depreciationPerMonth },
    maintenance: {
      baseServicePerMonth,
      wearPerMonth,
      riskReservePerMonth,
      avgPerMonth: maintenanceAvgPerMonth,
      riskItems,
      serviceLocationMultiplier: serviceMultiplier,
      conditionMultiplier,
    },
    affordability: { ratioToMonthlyIncome: ratio, level },
    totalPerMonth,
  };
}

function estimateResaleByRate(price: number, ratePctPerYear: number, years: number) {
  const r = clamp(ratePctPerYear, 0, 40) / 100;
  return price * Math.pow(1 - r, years);
}

function isRiskTriggered(
  r: { minMileageKm?: number; maxMileageKm?: number; minYear?: number; maxYear?: number },
  carYear: number,
  mileageKm: number
) {
  if (typeof r.minMileageKm === "number" && mileageKm < r.minMileageKm) return false;
  if (typeof r.maxMileageKm === "number" && mileageKm > r.maxMileageKm) return false;
  if (typeof r.minYear === "number" && carYear < r.minYear) return false;
  if (typeof r.maxYear === "number" && carYear > r.maxYear) return false;
  return true;
}
