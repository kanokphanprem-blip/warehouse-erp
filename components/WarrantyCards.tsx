'use client'

import { QRCodeSVG } from 'qrcode.react'

export type WarrantyCardData = {
  unitId: string
  serialNo: string
  productName: string
  sku: string
  warrantyMonths: number
  installationDate: string
  issuedAt: string
  customerName: string
  location: string
  assignedTo: string
  reference: string
  qrUrl: string
}

const WARRANTY_TERMS =
  'บริษัท อิกนี่ จำกัด จะรับประกันให้กับผู้ใช้ผลิตภัณฑ์ของอิกนี่เท่านั้น ที่ได้รับความเสียหายอันเกิดจากความผิดพลาดในกระบวนการผลิตงานติดตั้ง หรือวัสดุที่ใช้ในการผลิต หรือจากการชำรุดของอะไหล่ในสภาพการใช้งานปกติ เป็นเวลาตามที่ปรากฎบนใบรับประกัน และรับประกันคอมเพรสเซอร์และตัวแลกเปลี่ยนความร้อนไทเทเนียม เป็นระยะเวลา 60 เดือน นับตั้งแต่วันที่ติดตั้งและได้รับเงินเต็มจำนวน โดยไม่ครอบคลุมในกรณีที่เกิดจากสาเหตุดังต่อไปนี้ 1.การชำรุดเสียหายอันเกิดจากปัจจัยภายนอก เช่น อุบัติเหตุ ภัยธรรมชาติ อัคคีภัย คุณภาพน้ำที่ผิดปกติ เช่น มีกรวดทราย ตะกอน น้ำแห้ง การสูบจากท่อประปาโดยตรง แรงดันไฟฟ้าขาด/เกิน 2.การติดตั้งหรือการใช้งาน การซ่อมแซมแก้ไขที่ผิดวิธี หรือไม่ถูกต้องตามคำแนะนำ และไม่ใช้ช่างที่ได้รับการอบรมจากบริษัทฯ 3.การขาดการดูแลบำรุงรักษาตามคำแนะนำ การประมาทจนเป็นผลทำให้เกิดความเสียหาย 4.การซ่อม ดัดแปลงการติดตั้งอุปกรณ์ใด ๆ ที่ผิดจากมาตรฐานเดิม หรือถูกแก้ไขซ่อมแซมโดยไม่ใช่ช่างที่ได้รับการอบรมจากบริษัทฯ 5.ค่าใช้จ่ายในการขนส่ง การถอดและติดตั้ง หรือความเสียหายต่อเนื่องที่เกิดจากผลิตภัณฑ์ของอิกนี่ 6.การเสียหายอันเกิดจาก สัตว์ หรือแมลงต่าง ๆ 7.ถอดรื้อผลิตภัณฑ์ โดยไม่ได้รับความยินยอมหรืออนุมัติจากทางบริษัทฯ ก่อนส่งคืนเพื่อตรวจสอบสาเหตุและขอรับประกันสินค้า'

function warrantyDates(d: WarrantyCardData): { start: string; expiry: string } {
  const base = d.installationDate
    ? new Date(d.installationDate + 'T00:00:00')
    : new Date(d.issuedAt)
  const exp = new Date(base)
  exp.setMonth(exp.getMonth() + d.warrantyMonths)
  const fmt = (dt: Date) =>
    dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  return { start: fmt(base), expiry: fmt(exp) }
}

function WarrantyCard({ d }: { d: WarrantyCardData }) {
  const { start, expiry } = warrantyDates(d)

  return (
    /* Outer certificate frame */
    <div className="warranty-card w-full sm:w-[460px]" style={{ border: '3px solid #1e3a8a', borderRadius: '10px', padding: '5px', background: 'white' }}>
      <div style={{ border: '1px solid #93c5fd', borderRadius: '6px', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
                <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>IGNIE ERP · บริษัท อิกนี่ จำกัด</p>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, lineHeight: 1.2 }}>WARRANTY CERTIFICATE</p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', margin: 0, marginTop: '2px' }}>ใบรับประกันสินค้า</p>
              </div>
            </div>
            {/* Cert number badge */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Certificate No.</p>
              <p style={{ color: 'white', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>{d.serialNo}</p>
            </div>
          </div>
        </div>

        {/* Gold accent stripe */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)' }} />

        {/* ── Product section ── */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 6px 0' }}>Product / ผลิตภัณฑ์</p>
          <p style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0', lineHeight: 1.2 }}>{d.productName}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{d.sku}</span>
          </div>
        </div>

        {/* ── Warranty period ── */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e7eb', background: '#f0fdf4' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#15803d', margin: '0 0 10px 0' }}>
            Warranty Period · รับประกัน {d.warrantyMonths} เดือน
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px' }}>
              <p style={{ fontSize: '9px', color: '#16a34a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 3px 0' }}>วันที่ติดตั้ง / Start</p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{start}</p>
            </div>
            <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px' }}>
              <p style={{ fontSize: '9px', color: '#16a34a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 3px 0' }}>หมดประกัน / Expires</p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', margin: 0 }}>{expiry}</p>
            </div>
          </div>
        </div>

        {/* ── Details ── */}
        {(d.customerName || d.location || d.assignedTo || d.reference) && (
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px 0' }}>Installation Details / รายละเอียด</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {d.customerName && <InfoRow label="ลูกค้า / Customer" value={d.customerName} />}
              {d.location     && <InfoRow label="สถานที่ / Location" value={d.location} />}
              {d.assignedTo   && <InfoRow label="ผู้รับ / Assigned"  value={d.assignedTo} />}
              {d.reference    && <InfoRow label="อ้างอิง / Ref"      value={d.reference} />}
            </div>
          </div>
        )}

        {/* ── Thai warranty terms ── */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 6px 0' }}>เงื่อนไขการรับประกัน</p>
          <p style={{ fontSize: '8.5px', lineHeight: '1.6', color: '#4b5563', margin: 0 }}>{WARRANTY_TERMS}</p>
        </div>

        {/* ── Footer: QR + signature ── */}
        <div style={{ padding: '14px 24px', background: 'white', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <QRCodeSVG value={d.qrUrl} size={72} level="M" />
            <p style={{ fontSize: '8px', color: '#9ca3af', textAlign: 'center', margin: 0 }}>สแกนดูรายละเอียด</p>
          </div>
          <div style={{ flex: 1, marginLeft: '16px' }}>
            <div style={{ borderTop: '2px solid #374151', paddingTop: '6px', marginTop: '36px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#374151', margin: 0 }}>ลายมือชื่อ / Authorized Signature</p>
              <p style={{ fontSize: '9px', color: '#9ca3af', margin: '2px 0 0 0' }}>ชื่อ / ตำแหน่ง / วันที่</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '8px', color: '#d1d5db', margin: 0 }}>IGNIE ERP</p>
            <p style={{ fontSize: '7px', color: '#e5e7eb', fontFamily: 'monospace', margin: '2px 0 0 0' }}>{d.unitId.slice(0, 8)}</p>
          </div>
        </div>

      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 600, margin: '0 0 1px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  )
}

export default function WarrantyCards({
  cards,
  onClose,
}: {
  cards: WarrantyCardData[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="font-semibold text-gray-900">Warranty Cards</h2>
            <p className="text-xs text-gray-400 mt-0.5">{cards.length} card{cards.length !== 1 ? 's' : ''} · A5 · one per page</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Cards
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div id="warranty-sheet" className="p-4 sm:p-6 flex flex-col gap-6 items-center">
          {cards.map((d) => <WarrantyCard key={d.unitId} d={d} />)}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #warranty-sheet, #warranty-sheet * { visibility: visible !important; }
          #warranty-sheet {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            display: block !important;
          }
          .warranty-card {
            width: 100% !important;
            border: 3px solid #1e3a8a !important;
            border-radius: 6px !important;
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  )
}
