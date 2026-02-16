import { NextRequest, NextResponse } from 'next/server'
import { BmwProfileKey, BMW_PROFILES } from '@/app/utils/bwmProfiles.util'
import { CarCondition, ServiceLocation } from '@/app/utils/calc.util'

// GLM API Configuration
const GLM_API_KEY = process.env.GLM_API_KEY
const GLM_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions'
const GLM_MODEL = process.env.GLM_MODEL

export type AnalysisPayload = {
  modelKey: BmwProfileKey
  year: number
  mileageKm: number
  kmPerMonth: number
  monthlyIncome: number
  annualIncome: number
  carPrice: number
  downPaymentAmount: number
  months: number
  interestAprFlat: number
  fuelPrice: number
  kmPerLiter: number
  insurancePerYear: number
  taxAndActPerYear: number
  parkingTollPerMonth: number
  holdYears: number
  depreciationRatePerYear: number
  carCondition: CarCondition
  serviceLocation: ServiceLocation
  // Calculated results
  totalPerMonth: number
  paymentPerMonth: number
  fuelCostPerMonth: number
  maintenancePerMonth: number
  depreciationPerMonth: number
  fixedCostsPerMonth: number
  ratioToIncome: number
  affordabilityLevel: 'ไหว' | 'ตึง' | 'เสี่ยง'
}

export type AnalysisResult = {
  verdict: 'ควรซื้อ' | 'พิจารณาอีกครั้ง' | 'ไม่ควรซื้อ'
  confidence: number // 0-100
  summary: string
  detailedAnalysis: string
  risks: string[]
  recommendations: string[]
  comparisonWithStandard: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!GLM_API_KEY) {
      return NextResponse.json({ error: 'GLM_API_KEY not configured' }, { status: 500 })
    }

    // Parse request body
    const body: AnalysisPayload = await request.json()
    const {
      modelKey,
      year,
      mileageKm,
      kmPerMonth,
      monthlyIncome,
      annualIncome,
      carPrice,
      downPaymentAmount,
      months,
      interestAprFlat,
      fuelPrice,
      kmPerLiter,
      carCondition,
      serviceLocation,
      totalPerMonth,
      paymentPerMonth,
      fuelCostPerMonth,
      maintenancePerMonth,
      depreciationPerMonth,
      fixedCostsPerMonth,
      ratioToIncome,
      affordabilityLevel,
    } = body

    const profile = BMW_PROFILES[modelKey]
    const carAge = new Date().getFullYear() - year

    // Build prompt for GLM
    const prompt = `คุณเป็นที่ปรึกษาด้านการเงินส่วนบุคคลและผู้เชี่ยวชาญรถยนต์ BMW ในประเทศไทย

## ข้อมูลผู้ซื้อ
- รายได้ต่อเดือน: ${monthlyIncome.toLocaleString()} บาท
- รายได้ต่อปี: ${annualIncome.toLocaleString()} บาท

## ข้อมูลรถที่ต้องการซื้อ
- รุ่น: ${profile.displayName}
- อายุรถ: ${carAge} ปี (ปี ${year})
- ไมล์ปัจจุบัน: ${mileageKm.toLocaleString()} km
- สภาพรถ: ${carCondition === 'excellent' ? 'ดีมาก' : carCondition === 'normal' ? 'ปกติ' : 'โทรม'}
- ราคาซื้อ: ${carPrice.toLocaleString()} บาท
- ดาวน์: ${downPaymentAmount.toLocaleString()} บาท (${((downPaymentAmount / carPrice) * 100).toFixed(0)}%)
- ผ่อน: ${months} เดือน
- ดอกเบี้ย: ${interestAprFlat}% ต่อปี (Flat Rate)

## การใช้งาน
- ระยะทางต่อเดือน: ${kmPerMonth} km
- อัตราสิ้นเปลือง: ${kmPerLiter} km/L
- ราคาน้ำมัน: ${fuelPrice} บาท/ลิตร
- สถานที่ซ่อม: ${serviceLocation === 'center' ? 'ศูนย์บริการ' : 'อู่นอก'}

## ค่าใช้จ่ายรายเดือนที่คำนวณได้
- ค่างวดรถ: ${paymentPerMonth.toLocaleString()} บาท
- ค่าน้ำมัน: ${fuelCostPerMonth.toLocaleString()} บาท
- ค่าบำรุงรักษา: ${maintenancePerMonth.toLocaleString()} บาท
- ค่าเสื่อมราคา: ${depreciationPerMonth.toLocaleString()} บาท
- ค่าใช้จ่ายคงที่ (ประกัน+ภาษี+จอด): ${fixedCostsPerMonth.toLocaleString()} บาท
- **รวมค่าใช้จ่ายทั้งหมด: ${totalPerMonth.toLocaleString()} บาท/เดือน**

## ผลการวิเคราะห์จากเว็บไซต์
- สัดส่วนต่อรายได้: ${(ratioToIncome * 100).toFixed(1)}%
- ระดับความเหมาะสม: ${affordabilityLevel}

## คำถาม
ด้วยรายได้ ${monthlyIncome.toLocaleString()} บาท/เดือน และค่าใช้จ่ายรถ ${totalPerMonth.toLocaleString()} บาท/เดือน (คิดเป็น ${(ratioToIncome * 100).toFixed(1)}% ของรายได้)

1. ควรซื้อรถคันนี้หรือไม่? ทำไม?
2. มีความเสี่ยงอะไรบ้างที่ต้องระวัง?
3. มีคำแนะนำอะไรเพิ่มเติม?
4. ถ้าเว็บบอกว่า "${affordabilityLevel}" แต่ยังอยากซื้อ มีข้อควรพิจารณาอะไรบ้าง?

กรุณาตอบกลับในรูปแบบ JSON:
{
  "verdict": "ควรซื้อ" | "พิจารณาอีกครั้ง" | "ไม่ควรซื้อ",
  "confidence": ตัวเลข 0-100 (ความมั่นใจในคำตอบ),
  "summary": "สรุปสั้นๆ 1-2 ประโยค ภาษาพูด",
  "detailedAnalysis": "วิเคราะห์ละเอียด อธิบายเหตุผล",
  "risks": ["ความเสี่ยง1", "ความเสี่ยง2", ...],
  "recommendations": ["คำแนะนำ1", "คำแนะนำ2", ...],
  "comparisonWithStandard": "เปรียบเทียบกับเกณฑ์มาตรฐานที่แนะนำ (ไม่ควรเกิน 20-30% ของรายได้)"
}

สำคัญ: ตอบเป็นภาษาไทยเท่านั้น ไม่ต้องมีข้อความอื่นนอกจาก JSON`

    // Call GLM API
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'คุณเป็นที่ปรึกษาด้านการเงินและรถยนต์ BMW ในประเทศไทย ให้คำแนะนำที่เป็นกลางและเป็นประโยชน์',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GLM API error:', errorText)
      return NextResponse.json(
        { error: 'GLM API request failed', details: errorText },
        { status: 502 },
      )
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const content = message?.content
    const reasoningContent = message?.reasoning_content

    console.log('📝 GLM Response received')
    console.log('  content length:', content ? content.length : 0)

    // Try to parse JSON from content
    let analysisResult: AnalysisResult
    try {
      // Try to extract JSON if wrapped in markdown code block
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)```/) ||
        content.match(/```\s*([\s\S]*?)```/) || [null, content]

      const jsonStr = jsonMatch[1].trim()
      analysisResult = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse GLM response:', content)
      
      // If parsing fails, try to extract from reasoning_content
      if (reasoningContent) {
        console.log('Trying to parse from reasoning_content...')
        // Return a fallback with the raw reasoning
        return NextResponse.json({
          analysisResult: {
            verdict: 'พิจารณาอีกครั้ง',
            confidence: 50,
            summary: 'ไม่สามารถวิเคราะห์ได้สมบูรณ์ กรุณาดูการวิเคราะห์ดั้งเดิม',
            detailedAnalysis: reasoningContent,
            risks: ['ไม่สามารถประมวลผลคำตอบได้'],
            recommendations: ['ลองใหม่อีกครั้ง หรือปรึกษาที่ปรึกษาทางการเงิน'],
            comparisonWithStandard: 'ไม่สามารถเปรียบเทียบได้',
          },
          model: GLM_MODEL,
          timestamp: new Date().toISOString(),
          note: 'Parsed from reasoning',
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to parse AI response', rawContent: content },
        { status: 502 },
      )
    }

    // Ensure all required fields exist
    if (!analysisResult.verdict) analysisResult.verdict = 'พิจารณาอีกครั้ง'
    if (!analysisResult.confidence) analysisResult.confidence = 50
    if (!analysisResult.summary) analysisResult.summary = 'วิเคราะห์เสร็จสิ้น'
    if (!analysisResult.detailedAnalysis) analysisResult.detailedAnalysis = ''
    if (!analysisResult.risks) analysisResult.risks = []
    if (!analysisResult.recommendations) analysisResult.recommendations = []
    if (!analysisResult.comparisonWithStandard) analysisResult.comparisonWithStandard = ''

    console.log('✅ Analysis completed:', analysisResult.verdict)

    return NextResponse.json({
      analysisResult,
      model: GLM_MODEL,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
