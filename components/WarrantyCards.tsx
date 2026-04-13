'use client'

import { QRCodeSVG } from 'qrcode.react'

export type WarrantyCardData = {
  unitId: string
  serialNo: string
  productName: string
  sku: string
  warrantyMonths: number
  installationDate: string  // YYYY-MM-DD or empty
  issuedAt: string          // ISO timestamp (used as fallback start)
  customerName: string
  location: string
  assignedTo: string
  reference: string
  qrUrl: string
}

function warrantyDates(d: WarrantyCardData): { start: string; expiry: string } {
  const base = d.installationDate
    ? new Date(d.installationDate + 'T00:00:00')
    : new Date(d.issuedAt)
  const exp = new Date(base)
  exp.setMonth(exp.getMonth() + d.warrantyMonths)
  const fmt = (dt: Date) =>
    dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  return { start: fmt(base), expiry: fmt(exp) }
}

function WarrantyCard({ d }: { d: WarrantyCardData }) {
  const { start, expiry } = warrantyDates(d)
  const hasDetails = d.customerName || d.location || d.assignedTo || d.reference

  return (
    <div className="warranty-card bg-white w-full sm:w-[420px] overflow-hidden" style={{ minHeight: '595px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-8 py-6">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest">Ignie ERP</p>
            <p className="text-white font-bold text-lg uppercase tracking-wide leading-none">Warranty Certificate</p>
          </div>
        </div>
      </div>

      {/* Product info */}
      <div className="px-8 py-5 border-b border-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Product</p>
        <p className="font-bold text-gray-900 text-lg leading-tight">{d.productName}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{d.sku}</span>
          <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{d.serialNo}</span>
        </div>
      </div>

      {/* Warranty period — prominent block */}
      <div className="mx-8 my-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-green-700 mb-4">
          Warranty Period — {d.warrantyMonths} Month{d.warrantyMonths !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600/70 mb-1">Valid From</p>
            <p className="font-semibold text-gray-800 text-sm">{start}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600/70 mb-1">Expires On</p>
            <p className="font-bold text-green-700 text-sm">{expiry}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      {hasDetails && (
        <div className="px-8 pb-5 border-b border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Details</p>
          <div className="space-y-2">
            {d.customerName && <DetailRow label="Customer"    value={d.customerName} />}
            {d.location     && <DetailRow label="Location"    value={d.location} />}
            {d.assignedTo   && <DetailRow label="Assigned To" value={d.assignedTo} />}
            {d.reference    && <DetailRow label="Reference"   value={d.reference} />}
          </div>
        </div>
      )}

      {/* Footer: QR + signature */}
      <div className="px-8 py-5 flex items-end justify-between gap-6 mt-auto">
        <div className="flex flex-col items-center gap-1.5">
          <QRCodeSVG value={d.qrUrl} size={80} level="M" />
          <p className="text-[9px] text-gray-400 text-center">Scan for full details</p>
        </div>
        <div className="flex-1">
          <div className="border-t-2 border-gray-300 pt-2 mt-10">
            <p className="text-xs font-medium text-gray-500">Authorized Signature</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Name / Title / Date</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 shrink-0 w-24">{label}</span>
      <span className="font-medium text-gray-700 truncate">{value}</span>
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="font-semibold text-gray-900">Warranty Cards</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {cards.length} card{cards.length !== 1 ? 's' : ''} · A5 size · one per page
            </p>
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

        {/* Card list */}
        <div id="warranty-sheet" className="p-4 sm:p-6 flex flex-col gap-6 items-center">
          {cards.map((d) => (
            <WarrantyCard key={d.unitId} d={d} />
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 8mm; }
          body * { visibility: hidden !important; }
          #warranty-sheet,
          #warranty-sheet * { visibility: visible !important; }
          #warranty-sheet {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            display: block !important;
          }
          .warranty-card {
            width: 100% !important;
            min-height: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  )
}
