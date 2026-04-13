'use client'

import { QRCodeSVG } from 'qrcode.react'

export type StickerData = {
  unitId: string
  serialNo: string       // e.g. US-20260412-00001
  unitNumber: number
  totalUnits: number
  productName: string
  sku: string
  reference: string
  installationDate: string
  location: string
  assignedTo: string
  notes: string
  issuedAt: string
  qrUrl: string          // URL that the QR code encodes → /units/[id]
}

function Sticker({ s }: { s: StickerData }) {
  return (
    <div className="sticker border border-dashed border-gray-300 rounded-lg p-3 flex gap-3 items-start bg-white w-full sm:w-[280px]">
      <div className="shrink-0">
        <QRCodeSVG value={s.qrUrl} size={88} level="M" />
      </div>
      <div className="flex-1 min-w-0 text-[10px] leading-relaxed text-gray-700 space-y-0.5">
        <p className="font-mono font-bold text-[10px] text-blue-600 bg-blue-50 px-1 rounded inline-block mb-0.5">{s.serialNo}</p>
        <p className="font-bold text-[11px] text-gray-900 truncate">{s.productName}</p>
        <p className="font-mono text-gray-500">{s.sku}</p>
        <div className="border-t border-gray-100 my-1" />
        <Row label="Unit"     value={`${s.unitNumber} / ${s.totalUnits}`} />
        {s.reference        && <Row label="Ref"      value={s.reference} />}
        {s.installationDate && <Row label="Install"  value={s.installationDate} />}
        {s.location         && <Row label="Location" value={s.location} />}
        {s.assignedTo       && <Row label="Assigned" value={s.assignedTo} />}
        <div className="border-t border-gray-100 my-1" />
        <p className="text-gray-400">Scan for full details</p>
        <p className="text-gray-400">{new Date(s.issuedAt).toLocaleDateString()}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-gray-400">{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
  )
}

export default function QRStickers({
  stickers,
  onClose,
}: {
  stickers: StickerData[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div>
            <h2 className="font-semibold text-gray-900">QR Stickers</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {stickers.length} sticker{stickers.length !== 1 ? 's' : ''} — scan to view unit details
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
              Print Stickers
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sticker grid */}
        <div id="sticker-sheet" className="p-3 sm:p-6 flex flex-wrap gap-3 sm:gap-4 justify-start overflow-x-auto">
          {stickers.map((s) => (
            <Sticker key={s.unitId} s={s} />
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sticker-sheet,
          #sticker-sheet * { visibility: visible !important; }
          #sticker-sheet {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 16px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
          }
          .sticker { break-inside: avoid; border: 1px dashed #ccc !important; }
        }
      `}</style>
    </div>
  )
}
