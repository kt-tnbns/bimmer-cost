import { NextRequest, NextResponse } from 'next/server'
import { BmwProfileKey, BMW_PROFILES } from '@/app/utils/bwmProfiles.util'
import { CarCondition, ServiceLocation } from '@/app/utils/calc.util'

// GLM API Configuration
const GLM_API_KEY = process.env.GLM_API_KEY
const GLM_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions'
const GLM_MODEL = process.env.GLM_MODEL

// Helper function to parse numeric values from reasoning content
function parseFromReasoning(reasoning: string): SuggestedInputs | null {
  const result: SuggestedInputs = {}
  console.log('🔍 Parsing reasoning content...')

  // Helper to clean number (remove commas)
  const cleanNumber = (str: string) => str.replace(/,/g, '')

  // Try to extract kmPerLiter - look for patterns like "14.5 km/L" or "estimate around 14.5"
  const kmPatterns = [
    /kmPerLiter[:\s]+(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*km\/L/i,
    /(\d+\.?\d*)\s*km per liter/i,
    /around (\d+\.?\d*)\s*km/i,
    /estimate around (\d+\.?\d*)/i,
    /I'll estimate around (\d+\.?\d*)/i,
    /estimate (\d+\.?\d*)\s*km/i,
  ]
  
  for (const pattern of kmPatterns) {
    const match = reasoning.match(pattern)
    if (match) {
      result.kmPerLiter = parseFloat(match[1])
      console.log('✅ Found kmPerLiter:', result.kmPerLiter)
      break
    }
  }

  // Try to extract insurancePerYear - look for patterns like "20,000 THB" or "20,000"
  const insurancePatterns = [
    /insurancePerYear[:\s]+(\d[\d,]*)/i,
    /insurance.*?[:\s]+(\d[\d,]{4,6})/i,
    /(\d[\d,]{4,6})\s*THB/i,
    /estimate around (\d[\d,]{4,6})/i,
    /I'll estimate around (\d[\d,]{4,6})/i,
  ]
  
  for (const pattern of insurancePatterns) {
    const match = reasoning.match(pattern)
    if (match) {
      result.insurancePerYear = parseInt(cleanNumber(match[1]))
      console.log('✅ Found insurancePerYear:', result.insurancePerYear)
      break
    }
  }

  // Try to extract depreciationRatePerYear - look for patterns like "10%" or "10% per year"
  const depPatterns = [
    /depreciationRatePerYear[:\s]+(\d+\.?\d*)/i,
    /(\d+\.?\d*)%\s*per year/i,
    /(\d+\.?\d*)%\s*depreciation/i,
    /estimate around (\d+\.?\d*)%/i,
    /I'll estimate around (\d+\.?\d*)%/i,
    /around (\d+\.?\d*)%/i,
  ]
  
  for (const pattern of depPatterns) {
    const match = reasoning.match(pattern)
    if (match) {
      result.depreciationRatePerYear = parseFloat(match[1])
      console.log('✅ Found depreciationRatePerYear:', result.depreciationRatePerYear)
      break
    }
  }

  // Try to extract parkingTollPerMonth - look for patterns like "2,500 THB/month" or "2,500"
  const parkingPatterns = [
    /parkingTollPerMonth[:\s]+(\d[\d,]*)/i,
    /parking[:\s]+(\d[\d,]{3,5})/i,
    /(\d[\d,]{3,5})\s*THB.*month/i,
    /(\d[\d,]{3,5})\s*THB.*เดือน/i,
    /estimate around (\d[\d,]{3,5})/i,
    /I'll estimate around (\d[\d,]{3,5})/i,
  ]
  
  for (const pattern of parkingPatterns) {
    const match = reasoning.match(pattern)
    if (match) {
      result.parkingTollPerMonth = parseInt(cleanNumber(match[1]))
      console.log('✅ Found parkingTollPerMonth:', result.parkingTollPerMonth)
      break
    }
  }

  // Return null if no values were parsed
  const hasValues =
    result.kmPerLiter ||
    result.insurancePerYear ||
    result.depreciationRatePerYear ||
    result.parkingTollPerMonth
    
  if (!hasValues) {
    console.log('❌ No values found in reasoning')
    return null
  }

  console.log('✅ Parsed values:', result)
  return result
}

export type PrefillPayload = {
  modelKey: BmwProfileKey
  year: number
  mileageKm: number
  kmPerMonth: number
  monthlyIncome: number
  carPrice: number
  carCondition?: CarCondition
  serviceLocation?: ServiceLocation
}

export type SuggestedInputs = {
  kmPerLiter?: number
  insurancePerYear?: number
  depreciationRatePerYear?: number
  parkingTollPerMonth?: number
  explanation?: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!GLM_API_KEY) {
      return NextResponse.json({ error: 'GLM_API_KEY not configured' }, { status: 500 })
    }

    // Parse request body
    const body: PrefillPayload = await request.json()
    const {
      modelKey,
      year,
      mileageKm,
      kmPerMonth,
      monthlyIncome,
      carPrice,
      carCondition,
      serviceLocation,
    } = body

    const profile = BMW_PROFILES[modelKey]

    // Map conditions for display
    const conditionMap: Record<CarCondition, string> = {
      excellent: 'ดีมาก',
      normal: 'ปกติ',
      poor: 'โทรม',
    }

    const locationMap: Record<ServiceLocation, string> = {
      center: 'ศูนย์บริการ',
      outside: 'อู่นอก',
    }

    // Build prompt for GLM - All in Thai
    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการคำนวณค่าใช้จ่ายรถยนต์ BMW ในประเทศไทย

ข้อมูลรถ:
- รุ่น: ${profile.displayName}
- ปี: ${year} (อายุ ${new Date().getFullYear() - year} ปี)
- ไมล์ปัจจุบัน: ${mileageKm.toLocaleString()} km
- ใช้งาน: ${kmPerMonth} km/เดือน
- ราคาซื้อ: ${carPrice.toLocaleString()} บาท
- รายได้ผู้ซื้อ: ${monthlyIncome.toLocaleString()} บาท/เดือน
- สภาพรถ: ${carCondition ? conditionMap[carCondition] : 'ปกติ'}
- สถานที่ซ่อม: ${serviceLocation ? locationMap[serviceLocation] : 'ศูนย์บริการ'}

ค่าเริ่มต้นจากโปรไฟล์:
- km/L: ${profile.defaults.kmPerLiter}
- ค่าเสื่อม %/ปี: ${profile.defaults.depreciationRatePerYear}
- ค่าบำรุงรักษาพื้นฐาน/ปี: ${profile.defaults.baseServicePerYear.toLocaleString()} บาท

สำคัญมาก: ตอบกลับเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอังกฤษ

กรุณาสร้าง JSON ดังนี้:
{
  "kmPerLiter": <ตัวเลข>,
  "insurancePerYear": <ตัวเลข>,
  "depreciationRatePerYear": <ตัวเลข>,
  "parkingTollPerMonth": <ตัวเลข>,
  "explanation": "อธิบายเป็นภาษาไทยสั้นๆ ว่าทำไมถึงเลือกค่าเหล่านี้ 2-3 ประโยค"
}

หลักการคำนวณ:
- kmPerLiter: รถอายุ ${new Date().getFullYear() - year} ปี สภาพ${carCondition ? conditionMap[carCondition] : 'ปกติ'} ประมาณกี่ km/ลิตร (ค่าเริ่มต้น ${profile.defaults.kmPerLiter})
- insurancePerYear: ประกันรถอายุ ${new Date().getFullYear() - year} ปี ราคา ${carPrice.toLocaleString()} บาท ควรจ่ายเท่าไร (ช่วง 15,000-60,000 บาท)
- depreciationRatePerYear: อัตราเสื่อมรถอายุ ${new Date().getFullYear() - year} ปี (ช่วง 8-18%)
- parkingTollPerMonth: ค่าจอด+ทางด่วน รายได้ ${monthlyIncome.toLocaleString()} บาท/เดือน (เหมาะสมเท่าไร)

ตอบเฉพาะ JSON ภาษาไทย ไม่ต้องมีข้อความอื่นๆ`

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
              'คุณเป็นผู้เชี่ยวชาญด้านรถยนต์ BMW ในประเทศไทย ตอบกลับเป็นภาษาไทยเท่านั้น ให้คำแนะนำค่าใช้จ่ายรถยนต์ในรูปแบบ JSON',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
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

    // Log the raw response for debugging
    console.log('📝 Raw GLM response:')
    console.log('  content length:', content ? content.length : 0)
    console.log('  reasoning length:', reasoningContent ? reasoningContent.length : 0)
    
    // If content is empty, use reasoning_content directly
    if (!content || content.trim() === '') {
      console.log('⚠️ Content is empty, using reasoning_content...')
      if (reasoningContent) {
        console.log('🧠 Reasoning content preview:', reasoningContent.substring(0, 200))
        
        // Try to parse values from reasoning_content
        const parsed = parseFromReasoning(reasoningContent)
        if (parsed) {
          // Add full reasoning as explanation
          parsed.explanation = reasoningContent
          console.log('✅ Returning parsed values with explanation')
          return NextResponse.json({
            suggestedInputs: parsed,
            model: GLM_MODEL,
            timestamp: new Date().toISOString(),
            source: 'reasoning_parsed',
          })
        }
        
        // If parsing failed, return the raw reasoning for debugging
        console.log('❌ Could not parse values, returning raw reasoning')
        return NextResponse.json({
          suggestedInputs: {
            explanation: reasoningContent,
          },
          model: GLM_MODEL,
          timestamp: new Date().toISOString(),
          source: 'reasoning_raw',
          note: 'Could not parse numeric values',
        })
      } else {
        return NextResponse.json({ error: 'Invalid response from GLM' }, { status: 502 })
      }
    }

    // Parse JSON from response
    let suggestedInputs: SuggestedInputs
    try {
      // Try to extract JSON if wrapped in markdown code block
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
        content.match(/```\s*([\s\S]*?)```/) || [null, content]

      const jsonStr = jsonMatch[1].trim()
      suggestedInputs = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse GLM response:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response', rawContent: content },
        { status: 502 },
      )
    }

    // Ensure explanation exists
    if (!suggestedInputs.explanation) {
      suggestedInputs.explanation = 'AI แนะนำค่าตามสภาพรถและการใช้งาน'
    }

    console.log('✅ Successfully parsed:', suggestedInputs)

    return NextResponse.json({
      suggestedInputs,
      model: GLM_MODEL,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
