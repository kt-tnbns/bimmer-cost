# BMW Cost Calculator

คำนวณค่าใช้จ่ายรถยนต์ BMW แบบละเอียด พร้อม AI วิเคราะห์ความเหมาะสมในการซื้อ

## Features

- **คำนวณค่าใช้จ่ายรายเดือน** ครบถ้วน:
  - ค่างวดผ่อนรถ (Flat Rate)
  - ค่าน้ำมัน
  - ค่าบำรุงรักษา (ตามโปรไฟล์รุ่น)
  - ค่าเสื่อมราคา
  - ค่าใช้จ่ายคงที่ (ประกัน ภาษี ค่าจอด)

- **ตัวเลือกความเป็นจริง**:
  - เลือกสถานที่ซ่อม: ศูนย์บริการ (x1.0) หรืออู่นอก (x0.65)
  - เลือกสภาพรถ: ดีมาก (x0.7), ปกติ (x1.0), โทรม (x1.5) - ส่งผลต่อ risk reserve

- **AI Analysis** (GLM/Zhipu AI):
  - วิเคราะห์ความเหมาะสมในการซื้อตามรายได้
  - ประเมินความเสี่ยง
  - ให้คำแนะนำเฉพาะบุคคล
  - เปรียบเทียบกับเกณฑ์มาตรฐาน

- **จัดการข้อมูล**:
  - บันทึก/โหลด/ลบข้อมูลที่คำนวณไว้ (localStorage)
  - รองรับหลายเวอร์ชัน

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (BMW Theme)
- **Forms**: React Hook Form
- **AI**: GLM-4 (Zhipu AI)
- **Font**: Prompt (Thai, Google Fonts)

## Getting Started

### Prerequisites

- Node.js 18+
- GLM API Key (จาก https://open.bigmodel.cn/)

### Installation

1. Clone repository:
```bash
git clone <your-repo-url>
cd bimmer-cost
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
GLM_API_KEY=your_glm_api_key_here
GLM_MODEL=glm-4-flash  # หรือโมเดลอื่นที่ต้องการ
```

4. Run development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## Usage

### 1. กรอกข้อมูลรถ
- เลือกรุ่น BMW (F30 320d, 328i, G20 330e, etc.)
- กรอกปีรถ ไมล์ปัจจุบัน
- เลือกสภาพรถ (ดีมาก/ปกติ/โทรม)

### 2. กรอกรายได้
- เงินเดือนรายเดือน
- รายได้ต่อปี (optional)

### 3. กรอกข้อมูลไฟแนนซ์
- ราคารถ
- เงินดาวน์ (บาท)
- ระยะเวลาผ่อน (เดือน)
- อัตราดอกเบี้ย (% ต่อปี Flat Rate)

### 4. กรอกค่าใช้จ่ายอื่นๆ
- ราคาน้ำมันและอัตราสิ้นเปลือง
- ค่าประกัน ภาษี ค่าจอดรถ
- เลือกสถานที่ซ่อม (ศูนย์/อู่นอก)

### 5. ดูผลลัพธ์
- รวมค่าใช้จ่ายรายเดือน
- สัดส่วนต่อรายได้ (%)
- ระดับความเหมาะสม (ไหว/ตึง/เสี่ยง)

### 6. วิเคราะห์ด้วย AI
- กดปุ่ม "วิเคราะห์ความเหมาะสม"
- AI จะประเมินว่าควรซื้อหรือไม่ พร้อมเหตุผล
- ดูความเสี่ยงและคำแนะนำจาก AI

### 7. บันทึกข้อมูล
- กดปุ่ม "บันทึก"
- ตั้งชื่อการบันทึก (หรือใช้ชื่ออัตโนมัติ)
- สามารถโหลดหรือลบข้อมูลที่บันทึกไว้ได้

## BMW Profiles

รองรับรุ่น BMW ยอดนิยมในประเทศไทย:

- **F30 320d** - Diesel ประหยัด แต่ระวัง EGR/DPF
- **F30 328i** - Petrol แรงขึ้น แต่กินน้ำมันกว่า
- **G20 330e** - PHEV ประหยัดถ้าชาร์จบ่อย
- **F10 520d** - 5 Series ตัวถังใหญ่
- **F48 X1 20d** - SUV เล็ก
- **G01 X3 20d** - SUV กลาง

แต่ละรุ่นมี:
- ค่าเริ่มต้น km/L
- อัตราเสื่อมราคา
- ค่าบำรุงรักษาพื้นฐาน
- รายการความเสี่ยงตามไมล์/อายุ

## Maintenance Calculation

คำนวณค่าบำรุงรักษาประกอบด้วย:

1. **Base Service**: ค่าเช็คระยะ + เปลี่ยนถ่ายของเหลว
2. **Wear Items**: ยาง + ผ้าเบรก (คิดตามระยะทาง)
3. **Risk Reserve**: กันเงินสำหรับอะไหล่ที่อาจเสียตามอายุ/ไมล์

คูณด้วยตัวเลือก:
- Service Location: ศูนย์ (x1.0) หรืออู่นอก (x0.65)
- Car Condition: ดีมาก (x0.7), ปกติ (x1.0), โทรม (x1.5)

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## Acknowledgments

- BMW profile data based on Thailand market research
- AI powered by GLM-4 (Zhipu AI)
