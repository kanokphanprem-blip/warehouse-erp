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

  return (
    <div className="warranty-card bg-white border border-gray-200 rounded-xl w-full sm:w-[320px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Ignie ERP</span>
        </div>
        <p className="text-white font-bold text-sm uppercase tracking-wide">Warranty Certificate</p>
      </div>

      {/* Product info */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <p className="font-bold text-gray-900 text-sm leading-tight">{d.productName}</p>
        <p className="text-xs font-mono text-gray-400 mt-0.5">{d.sku}</p>
        <span className="mt-1.5 inline-block text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
          {d.serialNo}
        </span>
      </div>

      {/* Warranty period */}
      <div className="px-5 py-3 bg-green-50 border-b border-green-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-2">
          Warranty Period — {d.warrantyMonths} Month{d.warrantyMonths !== 1 ? 's' : ''}
        </p>
        <div className="flex items-start justify-between gap-2 text-xs">
          <div>
            <p className="text-gray-400 text-[10px]">Valid From</p>
            <p className="font-semibold text-gray-800">{start}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-[10px]">Expires On</p>
            <p className="font-semibold text-green-700">{expiry}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-3 space-y-1.5 border-b border-gray-100 text-xs">
        {d.location   && <CardRow label="Location"   value={d.location} />}
        {d.assignedTo && <CardRow label="Assigned To" value={d.assignedTo} />}
        {d.reference  && <CardRow label="Reference"  value={d.reference} />}
      </div>

      {/* Footer: QR + signature */}
      <div className="px-5 py-4 flex items-end justify-between gap-4">
        <div className="flex flex-col items-center gap-1">
          <QRCodeSVG value={d.qrUrl} size={64} level="M" />
          <p className="text-[9px] text-gray-400 text-center">Scan for details</p>
        </div>
        <div className="flex-1 text-right">
          <div className="border-t border-gray-400 pt-1 mt-8">
            <p className="text-[10px] text-gray-400">Authorized Signature</p>
            <p className="text-[9px] text-gray-400">Name / Title / Date</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-1">
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="font-medium text-gray-700 truncate">{value}</span>
    </p>
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="font-semibold text-gray-900">Warranty Cards</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {cards.length} card{cards.length !== 1 ? 's' : ''} — print and hand to the customer
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

        {/* Card grid */}
        <div id="warranty-sheet" className="p-3 sm:p-6 flex flex-wrap gap-4 justify-start">
          {cards.map((d) => (
            <WarrantyCard key={d.unitId} d={d} />
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #warranty-sheet,
          #warranty-sheet * { visibility: visible !important; }
          #warranty-sheet {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 16px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 16px !important;
          }
          .warranty-card { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
