'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, UnitSold } from '@/lib/supabase'

const STATUS_CONFIG: Record<UnitSold['status'], { label: string; color: string; dot: string }> = {
  active:      { label: 'Active',      color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  returned:    { label: 'Returned',    color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
}

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [unit, setUnit] = useState<UnitSold | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase.from('units_sold').select('*').eq('id', id).then(({ data }) => {
      const rows = data as UnitSold[] | null
      if (!rows || rows.length === 0) setNotFound(true)
      else setUnit(rows[0])
      setLoading(false)
    }, () => { setNotFound(true); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !unit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Unit Not Found</h1>
        <p className="text-gray-500 text-sm">This QR code does not match any registered unit.</p>
      </div>
    )
  }

  const status = STATUS_CONFIG[unit.status]
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${origin}/units/${unit.id}`

  // Warranty expiry
  const warrantyMonths = unit.warranty_months ?? 0
  const warrantyExpiry = (() => {
    if (!warrantyMonths) return null
    const base = unit.installation_date
      ? new Date(unit.installation_date + 'T00:00:00')
      : new Date(unit.created_at)
    const exp = new Date(base)
    exp.setMonth(exp.getMonth() + warrantyMonths)
    return exp
  })()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1.5">
                {unit.serial_no}
              </p>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{unit.product_name}</h1>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{unit.sku}</p>
            </div>
            <span className={`ml-3 shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2">
            Unit {unit.unit_number} of {unit.total_units}
          </div>
        </div>

        {/* Detail fields */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {unit.installation_date && (
            <DetailRow
              icon={<CalendarIcon />}
              label="Installation Date"
              value={new Date(unit.installation_date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            />
          )}
          {unit.location && (
            <DetailRow
              icon={<LocationIcon />}
              label="Location / Site"
              value={unit.location}
            />
          )}
          {unit.assigned_to && (
            <DetailRow
              icon={<PersonIcon />}
              label="Assigned To"
              value={unit.assigned_to}
            />
          )}
          {unit.reference && (
            <DetailRow
              icon={<RefIcon />}
              label="Reference"
              value={unit.reference}
            />
          )}
          {unit.notes && (
            <DetailRow
              icon={<NoteIcon />}
              label="Notes"
              value={unit.notes}
            />
          )}
          {warrantyExpiry && (
            <DetailRow
              icon={<ShieldIcon />}
              label={`Warranty — ${warrantyMonths} month${warrantyMonths !== 1 ? 's' : ''}`}
              value={`Expires ${warrantyExpiry.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`}
              highlight={warrantyExpiry < new Date() ? 'expired' : 'active'}
            />
          )}
          <DetailRow
            icon={<ClockIcon />}
            label="Registered"
            value={new Date(unit.created_at).toLocaleString()}
          />
        </div>

        {/* QR code */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3">
          <QRCodeSVG value={url} size={160} level="M" />
          <p className="text-xs text-gray-400 text-center break-all">{url}</p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Warehouse ERP · Unit ID: <span className="font-mono">{unit.id.slice(0, 8)}…</span>
        </p>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: 'active' | 'expired' }) {
  const valueColor =
    highlight === 'expired' ? 'text-red-600' :
    highlight === 'active'  ? 'text-green-700' :
    'text-gray-800'
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${highlight === 'expired' ? 'bg-red-50 text-red-500' : highlight === 'active' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-medium mt-0.5 break-words ${valueColor}`}>{value}</p>
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function LocationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function RefIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function NoteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
