export type BmwProfileKey =
  | 'F30_320D'
  | 'F30_328I'
  | 'G20_330E'
  | 'F10_520D'
  | 'F48_X1_20D'
  | 'G01_X3_20D'

type RiskItem = {
  name: string
  // trigger
  minMileageKm?: number
  maxMileageKm?: number
  minYear?: number
  maxYear?: number
  // reserve per month range (บาท) -> ใน calc จะใช้ค่าเฉลี่ย
  monthlyReserveMin: number
  monthlyReserveMax: number
  note?: string
}

export type BmwProfile = {
  displayName: string
  notes: string
  defaults: {
    kmPerLiter: number
    depreciationRatePerYear: number // %
    baseServicePerYear: number // บาท
  }
  wearItems: {
    tiresPerKm: number // บาท/กม. (เฉลี่ย)
    brakesPerKm: number // บาท/กม. (เฉลี่ย)
  }
  riskItems: RiskItem[]
}

export const BMW_PROFILES: Record<BmwProfileKey, BmwProfile> = {
  F30_320D: {
    displayName: 'BMW 3 Series F30 320d (Diesel)',
    notes: 'โฟกัสดีเซลประหยัด แต่กันงบ wear/เซอร์วิส + ความเสี่ยงตามไมล์ไว้ด้วย',
    defaults: { kmPerLiter: 15, depreciationRatePerYear: 12, baseServicePerYear: 18000 },
    wearItems: {
      tiresPerKm: 0.35, // ~ ยางชุด 28k / 80k km
      brakesPerKm: 0.18, // ~ ผ้า/จานเฉลี่ย 18k / 100k km
    },
    riskItems: [
      {
        name: 'ช่วงล่าง/บูช/ลูกหมาก',
        minMileageKm: 100000,
        monthlyReserveMin: 800,
        monthlyReserveMax: 1500,
      },
      {
        name: 'ระบบระบายความร้อน/ปั๊มน้ำ (กันเผื่อ)',
        minMileageKm: 120000,
        monthlyReserveMin: 600,
        monthlyReserveMax: 1200,
      },
      {
        name: 'EGR/DPF (กันเผื่อ)',
        minMileageKm: 140000,
        monthlyReserveMin: 700,
        monthlyReserveMax: 1600,
      },
    ],
  },

  F30_328I: {
    displayName: 'BMW 3 Series F30 328i (Petrol)',
    notes: 'แรงขึ้น แต่กินน้ำมันกว่า + กันงบระบบระบายความร้อน/ปั๊มน้ำเพิ่ม',
    defaults: { kmPerLiter: 10.5, depreciationRatePerYear: 12, baseServicePerYear: 20000 },
    wearItems: { tiresPerKm: 0.38, brakesPerKm: 0.2 },
    riskItems: [
      {
        name: 'ปั๊มน้ำ/เทอร์โมสตัท (กันเผื่อ)',
        minMileageKm: 90000,
        monthlyReserveMin: 700,
        monthlyReserveMax: 1500,
      },
      {
        name: 'รั่วซึม/ซีลต่างๆ',
        minMileageKm: 120000,
        monthlyReserveMin: 600,
        monthlyReserveMax: 1400,
      },
    ],
  },

  G20_330E: {
    displayName: 'BMW 3 Series G20 330e (PHEV)',
    notes: 'ถ้าชาร์จบ่อย ค่าเชื้อเพลิงอาจต่ำ แต่กันงบระบบไฮบริด/แบตตามอายุไว้ด้วย',
    defaults: { kmPerLiter: 14, depreciationRatePerYear: 13, baseServicePerYear: 22000 },
    wearItems: { tiresPerKm: 0.4, brakesPerKm: 0.16 },
    riskItems: [
      {
        name: 'แบต/ระบบไฮบริด (กันเผื่อ)',
        maxYear: 2019,
        monthlyReserveMin: 900,
        monthlyReserveMax: 2000,
      },
      { name: 'ช่วงล่าง', minMileageKm: 100000, monthlyReserveMin: 800, monthlyReserveMax: 1500 },
    ],
  },

  F10_520D: {
    displayName: 'BMW 5 Series F10 520d (Diesel)',
    notes: 'ตัวถังใหญ่ คงที่สูงขึ้นเล็กน้อย + กันงบช่วงล่าง/ระบบระบายความร้อน',
    defaults: { kmPerLiter: 13.5, depreciationRatePerYear: 11, baseServicePerYear: 22000 },
    wearItems: { tiresPerKm: 0.45, brakesPerKm: 0.24 },
    riskItems: [
      {
        name: 'ช่วงล่าง (น้ำหนักรถ)',
        minMileageKm: 90000,
        monthlyReserveMin: 1000,
        monthlyReserveMax: 2000,
      },
      {
        name: 'ระบบระบายความร้อน/ปั๊มน้ำ (กันเผื่อ)',
        minMileageKm: 120000,
        monthlyReserveMin: 800,
        monthlyReserveMax: 1600,
      },
    ],
  },

  F48_X1_20D: {
    displayName: 'BMW X1 F48 20d (Diesel)',
    notes: 'SUV เล็ก ประหยัดใช้ได้ แต่ยาง/ช่วงล่างเฉลี่ยสูงขึ้นนิดหน่อย',
    defaults: { kmPerLiter: 14, depreciationRatePerYear: 12, baseServicePerYear: 20000 },
    wearItems: { tiresPerKm: 0.42, brakesPerKm: 0.22 },
    riskItems: [
      {
        name: 'ช่วงล่าง/บูช',
        minMileageKm: 90000,
        monthlyReserveMin: 900,
        monthlyReserveMax: 1600,
      },
    ],
  },

  G01_X3_20D: {
    displayName: 'BMW X3 G01 20d (Diesel)',
    notes: 'คงที่สูงกว่า (ยาง/เบรก/ประกัน) แต่ถ้าขับเยอะดีเซลช่วยได้',
    defaults: { kmPerLiter: 13, depreciationRatePerYear: 12, baseServicePerYear: 24000 },
    wearItems: { tiresPerKm: 0.55, brakesPerKm: 0.3 },
    riskItems: [
      { name: 'ช่วงล่าง', minMileageKm: 80000, monthlyReserveMin: 1100, monthlyReserveMax: 2200 },
      {
        name: 'ระบบระบายความร้อน (กันเผื่อ)',
        minMileageKm: 120000,
        monthlyReserveMin: 900,
        monthlyReserveMax: 1800,
      },
    ],
  },
}
