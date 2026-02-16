'use client'

import { useMemo, useState, useEffect } from 'react'
import clsx from 'clsx'
import { useForm, type UseFormRegister } from 'react-hook-form'

import { BMW_PROFILES, type BmwProfileKey } from '@/app/utils/bwmProfiles.util'
import {
  calcAll,
  type CalcResult,
  type ServiceLocation,
  type CarCondition,
} from '@/app/utils/calc.util'
import { AnalysisResult } from '@/app/api/ai/analyze/route'

type FormValues = {
  // Car
  modelKey: BmwProfileKey
  carYear: number
  currentMileageKm: number
  kmPerMonth: number
  carCondition: CarCondition
  // Income
  monthlyIncome: number
  annualIncome?: number
  // Finance
  carPrice: number
  downPaymentAmount: number
  months: number
  interestAprFlat: number
  // Fuel
  fuelPrice: number
  kmPerLiter: number
  // Fixed
  insurancePerYear: number
  taxAndActPerYear: number
  parkingTollPerMonth: number
  // Dep
  holdYears: number
  expectedResalePrice?: number
  depreciationRatePerYear: number
  // Maintenance
  serviceLocation: ServiceLocation
}

type SavedVersion = {
  id: string
  name: string
  timestamp: number
  data: FormValues
}

const STORAGE_KEY = 'bmw-cost-calculator-saves'

function formatBaht(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' ฿'
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Calculator() {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null)
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaves, setShowSaves] = useState(false)

  const defaultModelKey: BmwProfileKey = 'F30_320D'
  const defaultsProfile = BMW_PROFILES[defaultModelKey]

  // Load saved versions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedVersions(parsed)
      } catch (e) {
        console.error('Failed to load saved versions:', e)
      }
    }
  }, [])

  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      modelKey: defaultModelKey,
      carYear: 2016,
      currentMileageKm: 120000,
      kmPerMonth: 1200,
      carCondition: 'normal',

      monthlyIncome: 40000,
      annualIncome: undefined,

      carPrice: 1200000,
      downPaymentAmount: 240000,
      months: 60,
      interestAprFlat: 4.0,

      fuelPrice: 33,
      kmPerLiter: defaultsProfile.defaults.kmPerLiter,

      insurancePerYear: 25000,
      taxAndActPerYear: 6000,
      parkingTollPerMonth: 1500,

      holdYears: 3,
      expectedResalePrice: NaN,
      depreciationRatePerYear: defaultsProfile.defaults.depreciationRatePerYear,

      serviceLocation: 'center',
    },
  })

  const v = form.watch()
  const profile = BMW_PROFILES[v.modelKey]

  const annualIncome = useMemo(() => {
    const manual = Number.isFinite(v.annualIncome as number)
      ? (v.annualIncome as number)
      : undefined
    return manual && manual > 0 ? manual : (v.monthlyIncome ?? 0) * 12
  }, [v.annualIncome, v.monthlyIncome])

  const downPct = useMemo(() => {
    const price = v.carPrice || 0
    const down = v.downPaymentAmount || 0
    return price > 0 ? (down / price) * 100 : 0
  }, [v.carPrice, v.downPaymentAmount])

  const resaleValue = useMemo(() => {
    const x = v.expectedResalePrice as unknown as number | undefined
    return typeof x === 'number' && Number.isFinite(x) ? x : undefined
  }, [v.expectedResalePrice])

  const result: CalcResult = useMemo(() => {
    return calcAll({
      income: { monthlyIncome: v.monthlyIncome || 0, annualIncome },
      finance: {
        carPrice: v.carPrice || 0,
        downPaymentAmount: v.downPaymentAmount || 0,
        months: v.months || 60,
        interestAprFlat: v.interestAprFlat || 0,
      },
      car: {
        modelKey: v.modelKey,
        year: v.carYear || 2016,
        mileageKm: v.currentMileageKm || 0,
        condition: v.carCondition || 'normal',
      },
      usage: {
        kmPerMonth: v.kmPerMonth || 0,
        fuelPricePerLiter: v.fuelPrice || 0,
        kmPerLiter: v.kmPerLiter || 10,
      },
      fixedCosts: {
        insurancePerYear: v.insurancePerYear || 0,
        taxAndActPerYear: v.taxAndActPerYear || 0,
        parkingTollPerMonth: v.parkingTollPerMonth || 0,
      },
      depreciation: {
        holdYears: v.holdYears || 3,
        expectedResalePrice: resaleValue,
        depreciationRatePerYear: v.depreciationRatePerYear || 0,
      },
      maintenance: {
        profileKey: v.modelKey,
        serviceLocation: v.serviceLocation || 'center',
      },
    })
  }, [
    annualIncome,
    resaleValue,
    v.modelKey,
    v.carYear,
    v.currentMileageKm,
    v.kmPerMonth,
    v.carCondition,
    v.monthlyIncome,
    v.carPrice,
    v.downPaymentAmount,
    v.months,
    v.interestAprFlat,
    v.fuelPrice,
    v.kmPerLiter,
    v.insurancePerYear,
    v.taxAndActPerYear,
    v.parkingTollPerMonth,
    v.holdYears,
    v.depreciationRatePerYear,
    v.serviceLocation,
  ])

  const analyzeWithAi = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiAnalysis(null)

    try {
      const payload = {
        modelKey: v.modelKey,
        year: v.carYear,
        mileageKm: v.currentMileageKm,
        kmPerMonth: v.kmPerMonth,
        monthlyIncome: v.monthlyIncome,
        annualIncome,
        carPrice: v.carPrice,
        downPaymentAmount: v.downPaymentAmount,
        months: v.months,
        interestAprFlat: v.interestAprFlat,
        fuelPrice: v.fuelPrice,
        kmPerLiter: v.kmPerLiter,
        insurancePerYear: v.insurancePerYear,
        taxAndActPerYear: v.taxAndActPerYear,
        parkingTollPerMonth: v.parkingTollPerMonth,
        holdYears: v.holdYears,
        depreciationRatePerYear: v.depreciationRatePerYear,
        carCondition: v.carCondition,
        serviceLocation: v.serviceLocation,
        // Calculated results
        totalPerMonth: result.totalPerMonth,
        paymentPerMonth: result.loan.paymentPerMonth,
        fuelCostPerMonth: result.fuel.costPerMonth,
        maintenancePerMonth: result.maintenance.avgPerMonth,
        depreciationPerMonth: result.depreciation.perMonth,
        fixedCostsPerMonth: result.fixedCosts.perMonth,
        ratioToIncome: result.affordability.ratioToMonthlyIncome,
        affordabilityLevel: result.affordability.level,
      }

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'AI analysis failed')
      }

      if (data?.analysisResult) {
        setAiAnalysis(data.analysisResult)
      } else {
        throw new Error('No analysis received from AI')
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      setAiError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด')
    } finally {
      setAiLoading(false)
    }
  }

  const onChangeModel = (key: BmwProfileKey) => {
    const p = BMW_PROFILES[key]
    form.setValue('kmPerLiter', p.defaults.kmPerLiter, { shouldValidate: true })
    form.setValue('depreciationRatePerYear', p.defaults.depreciationRatePerYear, {
      shouldValidate: true,
    })
  }

  const saveCurrentVersion = () => {
    const name = saveName.trim() || `Save ${savedVersions.length + 1}`
    const newVersion: SavedVersion = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      data: { ...v },
    }
    const updated = [...savedVersions, newVersion]
    setSavedVersions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setSaveName('')
  }

  const loadVersion = (version: SavedVersion) => {
    ;(Object.keys(version.data) as Array<keyof FormValues>).forEach((key) => {
      const value = version.data[key]
      form.setValue(key, value as FormValues[typeof key], { shouldValidate: true })
    })
    setAiAnalysis(null) // Clear AI analysis when loading new version
  }

  const deleteVersion = (id: string) => {
    const updated = savedVersions.filter((v) => v.id !== id)
    setSavedVersions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'ควรซื้อ':
        return 'bg-green-500/20 border-green-500/50 text-green-400'
      case 'ไม่ควรซื้อ':
        return 'bg-red-500/20 border-red-500/50 text-red-400'
      default:
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* LEFT: FORM */}
      <section className="lg:col-span-7">
        <div className="rounded-xl2 border border-bmw-line bg-bmw-panel shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-bmw-line px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-extrabold sm:text-lg">Inputs</h2>
              <p className="mt-1 text-xs text-bmw-muted sm:text-sm">
                ช่องที่มี <span className="text-bmw-red">*</span> จำเป็นต้องกรอก
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSaves(!showSaves)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-bold transition border border-bmw-line',
                  showSaves ? 'bg-bmw-blue text-white' : 'bg-bmw-panel2 text-bmw-muted hover:text-white',
                )}
              >
                บันทึก ({savedVersions.length})
              </button>
            </div>
          </div>

          {/* Save/Load Panel */}
          {showSaves && (
            <div className="mx-4 mt-4 rounded-xl border border-bmw-line bg-bmw-panel2 p-4 sm:mx-6">
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="ชื่อการบันทึก (optional)"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="flex-1 h-10 rounded-xl border border-bmw-line bg-black/30 px-3 text-sm text-bmw-text outline-none transition focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={saveCurrentVersion}
                  className="inline-flex items-center justify-center rounded-xl bg-bmw-blue px-4 py-2 text-sm font-extrabold text-white shadow-glow hover:brightness-110"
                >
                  บันทึก
                </button>
              </div>

              {savedVersions.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedVersions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-bmw-line bg-black/20 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{version.name}</div>
                        <div className="text-xs text-bmw-muted">{formatDate(version.timestamp)}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => loadVersion(version)}
                          className="rounded-lg bg-bmw-blue/20 px-2 py-1 text-xs font-bold text-bmw-blue hover:bg-bmw-blue/30"
                        >
                          โหลด
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVersion(version.id)}
                          className="rounded-lg bg-bmw-red/20 px-2 py-1 text-xs font-bold text-bmw-red hover:bg-bmw-red/30"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-bmw-muted py-4">ยังไม่มีการบันทึก</div>
              )}
            </div>
          )}

          {/* AI Analysis Section */}
          <div className="mx-4 mt-4 rounded-xl border border-bmw-line bg-bmw-panel2 p-4 sm:mx-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-extrabold">AI Analysis</div>
                <div className="mt-1 text-xs text-bmw-muted">
                  ให้ AI วิเคราะห์ว่าควรซื้อรถคันนี้หรือไม่ ตามรายได้และค่าใช้จ่าย
                </div>
              </div>
              <button
                type="button"
                onClick={analyzeWithAi}
                disabled={aiLoading}
                className="inline-flex items-center justify-center rounded-xl bg-bmw-blue px-4 py-2 text-sm font-extrabold text-white shadow-glow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  'วิเคราะห์ความเหมาะสม'
                )}
              </button>
            </div>

            {aiError && (
              <div className="mt-3 rounded-lg border border-bmw-red/30 bg-bmw-red/10 px-3 py-2 text-sm text-bmw-red">
                <strong>ข้อผิดพลาด:</strong> {aiError}
              </div>
            )}
          </div>

          <div className="px-4 pb-5 pt-4 sm:px-6">
            {/* SECTION: CAR */}
            <Section
              title="ข้อมูลรถ"
              accent="blue"
              subtitle="เลือกรุ่น + ปี + ไมล์ + การใช้งาน"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldSelect
                  label="รุ่น (ตัวอย่าง)"
                  required
                  value={v.modelKey}
                  onChange={(val) => {
                    form.setValue('modelKey', val as BmwProfileKey, { shouldValidate: true })
                    onChangeModel(val as BmwProfileKey)
                  }}
                  options={Object.entries(BMW_PROFILES).map(([k, p]) => ({ value: k, label: p.displayName }))}
                />
                <FieldInput
                  label="ปีรถ"
                  required
                  type="number"
                  name="carYear"
                  register={form.register}
                />
                <FieldInput
                  label="ไมล์ปัจจุบัน (km)"
                  required
                  type="number"
                  name="currentMileageKm"
                  register={form.register}
                />
                <FieldInput
                  label="ขับ/เดือน (km)"
                  required
                  type="number"
                  name="kmPerMonth"
                  register={form.register}
                />
                <FieldSelect
                  label="สภาพรถ"
                  required
                  value={v.carCondition}
                  onChange={(val) => form.setValue('carCondition', val as CarCondition, { shouldValidate: true })}
                  options={[
                    { value: 'excellent', label: 'ดีมาก (ดูแลดี ไม่มีปัญหา)' },
                    { value: 'normal', label: 'ปกติ (มีสึกหรอเล็กน้อย)' },
                    { value: 'poor', label: 'โทรม (ต้องซ่อมหลายจุด)' },
                  ]}
                />
              </div>

              <div className="mt-3 rounded-xl border border-bmw-line bg-black/30 p-3">
                <div className="text-sm font-bold">{profile.displayName}</div>
                <div className="mt-1 text-xs text-bmw-muted">{profile.notes}</div>
              </div>
            </Section>

            {/* SECTION: INCOME */}
            <Section title="รายได้" accent="navy" subtitle="เพื่อคำนวณสัดส่วนค่าใช้จ่ายต่อรายได้">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldInput
                  label="เงินเดือน (บาท)"
                  required
                  type="number"
                  name="monthlyIncome"
                  register={form.register}
                />
                <FieldInput
                  label="รายได้ต่อปี (ถ้าไม่กรอกจะคำนวณจากเงินเดือน)"
                  type="number"
                  name="annualIncome"
                  register={form.register}
                  helper={`ตอนนี้ใช้: ${formatBaht(annualIncome)} / ปี`}
                />
              </div>
            </Section>

            {/* SECTION: FINANCE */}
            <Section title="ไฟแนนซ์" accent="red" subtitle="ผ่อนแบบ Flat Rate (ง่ายและนิยม)">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldInput
                  label="ราคารถ (บาท)"
                  required
                  type="number"
                  name="carPrice"
                  register={form.register}
                />
                <FieldInput
                  label="ดาวน์ (บาท)"
                  required
                  type="number"
                  name="downPaymentAmount"
                  register={form.register}
                  helper={`คิดเป็นประมาณ: ${formatPct(downPct)}`}
                />
                <FieldInput
                  label="ระยะผ่อน (เดือน)"
                  required
                  type="number"
                  name="months"
                  register={form.register}
                />
                <FieldInput
                  label="ดอกเบี้ยต่อปี (% / Flat)"
                  required
                  type="number"
                  step="0.1"
                  name="interestAprFlat"
                  register={form.register}
                />
              </div>
            </Section>

            {/* SECTION: FUEL */}
            <Section title="ค่าน้ำมัน" accent="blue" subtitle="กรอก km/L หรือให้ AI เติมค่าให้">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldInput
                  label="ราคาน้ำมัน (บาท/ลิตร)"
                  required
                  type="number"
                  name="fuelPrice"
                  register={form.register}
                />
                <FieldInput
                  label="อัตราสิ้นเปลือง (km/L)"
                  required
                  type="number"
                  step="0.1"
                  name="kmPerLiter"
                  register={form.register}
                />
              </div>
            </Section>

            {/* SECTION: FIXED */}
            <Section title="ค่าใช้จ่ายคงที่" accent="navy" subtitle="ประกัน/ภาษี/ค่าใช้จ่ายอื่น ๆ">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldInput
                  label="ประกัน/ปี (บาท)"
                  required
                  type="number"
                  name="insurancePerYear"
                  register={form.register}
                />
                <FieldInput
                  label="ภาษี + พ.ร.บ./ปี (บาท)"
                  required
                  type="number"
                  name="taxAndActPerYear"
                  register={form.register}
                />
                <FieldInput
                  label="จอด/ทางด่วน/อื่น ๆ ต่อเดือน (บาท)"
                  required
                  type="number"
                  name="parkingTollPerMonth"
                  register={form.register}
                />
              </div>
            </Section>

            {/* SECTION: DEP */}
            <Section title="ค่าเสื่อม" accent="red" subtitle={`เลือกกรอก "ขายต่อ" หรือใช้ %/ปี`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldInput
                  label="ถือครอง (ปี)"
                  required
                  type="number"
                  step="0.5"
                  name="holdYears"
                  register={form.register}
                />
                <FieldInput
                  label="ราคาขายต่อคาดการณ์ (บาท) (ถ้าไม่กรอกจะใช้ %/ปี)"
                  type="number"
                  name="expectedResalePrice"
                  register={form.register}
                  helper="เว้นว่างได้"
                />
                <FieldInput
                  label="อัตราเสื่อม (%/ปี)"
                  required
                  type="number"
                  step="0.5"
                  name="depreciationRatePerYear"
                  register={form.register}
                />
              </div>
            </Section>

            {/* SECTION: MAINTENANCE */}
            <Section title="การซ่อมบำรุง" accent="blue" subtitle="เลือกสถานที่ซ่อม">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldSelect
                  label="สถานที่ซ่อม"
                  required
                  value={v.serviceLocation}
                  onChange={(val) => form.setValue('serviceLocation', val as ServiceLocation, { shouldValidate: true })}
                  options={[
                    { value: 'center', label: 'ศูนย์บริการ (แพงกว่า แต่มั่นใจ)' },
                    { value: 'outside', label: 'อู่นอก (ถูกกว่า ~35%)' },
                  ]}
                />
                <div className="rounded-lg border border-bmw-line bg-black/20 p-3">
                  <div className="text-xs text-bmw-muted">อัตราค่าซ่อม</div>
                  <div className="mt-1 text-sm font-bold">
                    {v.serviceLocation === 'center' ? 'x1.0 (ศูนย์)' : 'x0.65 (อู่นอก)'}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </section>

      {/* RIGHT: RESULT */}
      <section className="lg:col-span-5">
        <div className="rounded-xl2 border border-bmw-line bg-bmw-panel shadow-soft">
          <div className="border-b border-bmw-line px-4 py-4 sm:px-6">
            <h2 className="text-base font-extrabold sm:text-lg">Results</h2>
            <p className="mt-1 text-xs text-bmw-muted sm:text-sm">อัปเดตแบบเรียลไทม์เมื่อคุณกรอกข้อมูล</p>
          </div>

          <div className="px-4 py-4 sm:px-6">
            <div className="rounded-xl border border-bmw-line bg-gradient-to-b from-white/5 to-transparent p-4 shadow-glow">
              <div className="text-xs text-bmw-muted">รวมค่าใช้จ่าย/เดือน</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">{formatBaht(result.totalPerMonth)}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  tone={
                    result.affordability.level === 'ไหว'
                      ? 'blue'
                      : result.affordability.level === 'ตึง'
                      ? 'navy'
                      : 'red'
                  }
                >
                  {`${(result.affordability.ratioToMonthlyIncome * 100).toFixed(1)}% ของรายได้ (${result.affordability.level})`}
                </Badge>
                <Badge tone="navy">
                  {`ดาวน์: ${formatBaht(result.loan.downPaymentAmount)} (${formatPct(result.loan.downPaymentPercent)})`}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="ค่างวด/เดือน" value={formatBaht(result.loan.paymentPerMonth)} />
              <Metric label="น้ำมัน/เดือน" value={formatBaht(result.fuel.costPerMonth)} />
              <Metric label="บำรุงรักษาเฉลี่ย/เดือน" value={formatBaht(result.maintenance.avgPerMonth)} />
              <Metric label="ค่าเสื่อม/เดือน" value={formatBaht(result.depreciation.perMonth)} />
              <Metric label="คงที่อื่น ๆ/เดือน" value={formatBaht(result.fixedCosts.perMonth)} />
              <Metric label="ดอกเบี้ยรวม (flat)" value={formatBaht(result.loan.totalInterest)} />
            </div>

            {/* AI Analysis Result */}
            {aiAnalysis && (
              <div className="mt-5 rounded-xl border border-bmw-blue/30 bg-bmw-blue/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold">ผลการวิเคราะห์จาก AI</h3>
                  <span
                    className={clsx(
                      'px-2 py-1 rounded text-xs font-bold border',
                      getVerdictColor(aiAnalysis.verdict),
                    )}
                  >
                    {aiAnalysis.verdict}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-bmw-muted mb-1">ความมั่นใจ</div>
                  <div className="w-full bg-black/30 rounded-full h-2">
                    <div
                      className="bg-bmw-blue h-2 rounded-full transition-all"
                      style={{ width: `${aiAnalysis.confidence}%` }}
                    />
                  </div>
                  <div className="text-right text-xs mt-1">{aiAnalysis.confidence}%</div>
                </div>

                <div className="text-sm mb-3 p-2 bg-black/20 rounded-lg">{aiAnalysis.summary}</div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-bmw-text/90 mb-1">การวิเคราะห์โดยละเอียด</div>
                    <div className="text-xs text-bmw-muted whitespace-pre-wrap">{aiAnalysis.detailedAnalysis}</div>
                  </div>

                  {aiAnalysis.risks.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-bmw-red mb-1">ความเสี่ยงที่ต้องระวัง</div>
                      <ul className="text-xs text-bmw-muted space-y-1">
                        {aiAnalysis.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-bmw-red">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiAnalysis.recommendations.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-bmw-blue mb-1">คำแนะนำ</div>
                      <ul className="text-xs text-bmw-muted space-y-1">
                        {aiAnalysis.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-bmw-blue">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-bold text-bmw-text/90 mb-1">เปรียบเทียบกับเกณฑ์มาตรฐาน</div>
                    <div className="text-xs text-bmw-muted">{aiAnalysis.comparisonWithStandard}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-bmw-line bg-black/25 p-4">
              <div className="text-sm font-extrabold">Breakdown</div>
              <ul className="mt-2 space-y-1 text-sm text-bmw-muted">
                <li>
                  เงินต้นหลังดาวน์: <span className="text-bmw-text">{formatBaht(result.loan.principal)}</span>
                </li>
                <li>
                  กม./เดือน: <span className="text-bmw-text">{result.fuel.kmPerMonth.toLocaleString()}</span> km
                </li>
                <li>
                  ใช้น้ำมัน: <span className="text-bmw-text">{result.fuel.litersPerMonth.toFixed(1)}</span> ลิตร/เดือน
                </li>
                <li>
                  Maintenance profile: <span className="text-bmw-text">{profile.displayName}</span>
                </li>
                <li>
                  สถานที่ซ่อม:{` `}
                  <span className="text-bmw-text">
                    {result.maintenance.serviceLocationMultiplier === 1.0 ? 'ศูนย์ (x1.0)' : 'อู่นอก (x0.65)'}
                  </span>
                </li>
                <li>
                  สภาพรถ:{` `}
                  <span className="text-bmw-text">
                    {v.carCondition === 'excellent'
                      ? 'ดีมาก (x0.7)'
                      : v.carCondition === 'normal'
                      ? 'ปกติ (x1.0)'
                      : 'โทรม (x1.5)'}
                  </span>
                </li>
              </ul>

              <div className="mt-3">
                <div className="text-xs font-bold text-bmw-text/90">ความเสี่ยงตามไมล์/ปีรถ (กันเงินรายเดือน)</div>
                {result.maintenance.riskItems.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {result.maintenance.riskItems.map((x) => (
                      <div key={x.name} className="rounded-lg border border-bmw-line bg-white/5 px-3 py-2 text-sm">
                        <div className="font-bold">{x.name}</div>
                        <div className="text-bmw-muted">~ {formatBaht(x.monthlyReserve)} / เดือน</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-bmw-muted">ยังไม่เข้าเงื่อนไข trigger ของรายการหลัก</div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-bmw-line bg-bmw-panel2 p-4">
              <div className="text-sm font-extrabold">คำแนะนำเร็ว ๆ</div>
              <p className="mt-2 text-sm text-bmw-muted">
                {result.affordability.ratioToMonthlyIncome <= 0.18
                  ? 'ภาพรวมไหว — เหลือ buffer พอสมควรสำหรับซ่อม/เหตุฉุกเฉิน'
                  : result.affordability.ratioToMonthlyIncome <= 0.28
                  ? 'เริ่มตึง — แนะนำกันเงินฉุกเฉินเฉพาะรถเพิ่ม และลดคงที่อื่น ๆ เท่าที่ทำได้'
                  : 'ค่อนข้างเสี่ยง — ลองเพิ่มดาวน์/ลดราคารถ/ลดค่างวด หรือเลือกรุ่นที่คงที่ต่ำกว่า'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------- UI Components ---------- */

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  accent: 'blue' | 'navy' | 'red'
  children: React.ReactNode
}) {
  const bar = accent === 'blue' ? 'bg-bmw-blue' : accent === 'navy' ? 'bg-bmw-navy' : 'bg-bmw-red'

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-3">
        <div className={clsx('h-8 w-1.5 rounded-full', bar)} />
        <div>
          <div className="text-sm font-extrabold">{title}</div>
          {subtitle ? <div className="text-xs text-bmw-muted">{subtitle}</div> : null}
        </div>
      </div>
      <div className="rounded-xl border border-bmw-line bg-black/20 p-3 sm:p-4">{children}</div>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'navy' | 'red' }) {
  const cls =
    tone === 'blue'
      ? 'border-bmw-blue/40 bg-bmw-blue/15 text-white'
      : tone === 'navy'
      ? 'border-bmw-navy/40 bg-bmw-navy/18 text-white'
      : 'border-bmw-red/40 bg-bmw-red/15 text-white'

  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold', cls)}>
      {children}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-bmw-line bg-white/5 p-3">
      <div className="text-xs text-bmw-muted">{label}</div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
    </div>
  )
}

function FieldInput({
  label,
  required,
  helper,
  name,
  register,
  type = 'text',
  step,
}: {
  label: string
  required?: boolean
  helper?: string
  name: keyof FormValues
  register: UseFormRegister<FormValues>
  type?: string
  step?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-bmw-text/90">
        {label} {required ? <span className="text-bmw-red">*</span> : null}
      </label>
      <input
        {...register(name)}
        type={type}
        step={step}
        className={clsx(
          'h-10 w-full rounded-xl border border-bmw-line bg-black/30 px-3 text-sm outline-none transition focus:border-white/20',
          'text-bmw-text placeholder:text-bmw-muted/50',
        )}
      />
      {helper && <div className="text-[11px] text-bmw-muted">{helper}</div>}
    </div>
  )
}

function FieldSelect({
  label,
  required,
  value,
  onChange,
  options,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (val: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-bmw-text/90">
        {label} {required ? <span className="text-bmw-red">*</span> : null}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-bmw-line bg-black/30 px-3 text-sm outline-none transition focus:border-white/20 text-bmw-text"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bmw-panel">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
