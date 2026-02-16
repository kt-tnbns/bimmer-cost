import Calculator from '@/app/components/Calculator'

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              BMW Cost Calculator
            </h1>
            <p className="mt-2 text-sm text-bmw-muted sm:text-base">
              {`คำนวณค่าใช้จ่าย "รายเดือน" แบบละเอียด: ค่างวด • น้ำมัน • บำรุงรักษา • ค่าเสื่อม • ค่าใช้จ่ายคงที่`}
            </p>
          </div>
        </div>

        {/* BMW-ish stripes */}
        <div className="mt-5 overflow-hidden rounded-xl border border-bmw-line">
          <div className="h-2 bg-bmw-blue" />
          <div className="h-2 bg-white/80" />
          <div className="h-2 bg-bmw-red" />
        </div>
      </header>

      <Calculator />

      <footer className="mt-10 text-xs text-bmw-muted">
        * ตัวเลขเป็นการประมาณเพื่อช่วยตัดสินใจ — คุณปรับสมมติฐานให้ตรงกับบริบทจริงได้เสมอ
      </footer>
    </main>
  )
}
