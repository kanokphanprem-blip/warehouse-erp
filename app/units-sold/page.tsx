'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, Product, StockTransaction, UnitSold } from '@/lib/supabase'
import QRStickers, { StickerData } from '@/components/QRStickers'
import WarrantyCards, { WarrantyCardData } from '@/components/WarrantyCards'

const STATUS_STYLES: Record<UnitSold['status'], string> = {
  active:      'bg-green-100 text-green-700',
  returned:    'bg-gray-100 text-gray-600',
  maintenance: 'bg-amber-100 text-amber-700',
}

export default function UnitsSoldPage() {
  const [units, setUnits] = useState<UnitSold[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | UnitSold['status']>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [qrUnit, setQrUnit] = useState<UnitSold | null>(null)   // single QR preview
  const [editUnit, setEditUnit] = useState<UnitSold | null>(null)
  const [printStickers, setPrintStickers] = useState<StickerData[] | null>(null)
  const [printWarranty, setPrintWarranty] = useState<WarrantyCardData[] | null>(null)

  async function fetchData() {
    const [unitsRes, productsRes] = await Promise.all([
      supabase.from('units_sold').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ])
    setUnits(unitsRes.data ?? [])
    setProducts(productsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = units.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch =
      u.serial_no?.toLowerCase().includes(q) ||
      u.product_name.toLowerCase().includes(q) ||
      u.sku.toLowerCase().includes(q) ||
      u.location.toLowerCase().includes(q) ||
      u.assigned_to.toLowerCase().includes(q) ||
      u.customer_name?.toLowerCase().includes(q) ||
      u.reference.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    return matchSearch && matchStatus
  })

  function toStickerData(u: UnitSold): StickerData {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return {
      unitId: u.id,
      unitNumber: u.unit_number,
      totalUnits: u.total_units,
      serialNo: u.serial_no,
      productName: u.product_name,
      sku: u.sku,
      reference: u.reference,
      installationDate: u.installation_date,
      location: u.location,
      assignedTo: u.assigned_to,
      customerName: u.customer_name,
      notes: u.notes,
      issuedAt: u.created_at,
      qrUrl: `${origin}/units/${u.id}`,
    }
  }

  function toWarrantyCardData(u: UnitSold): WarrantyCardData {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return {
      unitId: u.id,
      serialNo: u.serial_no,
      productName: u.product_name,
      sku: u.sku,
      warrantyMonths: u.warranty_months ?? 12,
      installationDate: u.installation_date,
      issuedAt: u.created_at,
      location: u.location,
      assignedTo: u.assigned_to,
      customerName: u.customer_name,
      reference: u.reference,
      qrUrl: `${origin}/units/${u.id}`,
    }
  }

  async function updateStatus(id: string, status: UnitSold['status']) {
    await supabase.from('units_sold').update({ status }).eq('id', id)
    fetchData()
  }

  async function deleteUnit(id: string) {
    if (!confirm('Delete this unit? If it was the last unit from its stock-out transaction, that transaction will also be removed and stock restored.')) return

    const unit = units.find((u) => u.id === id)

    // Delete the unit first
    await supabase.from('units_sold').delete().eq('id', id)

    // If linked to a transaction, check if any siblings remain
    if (unit?.transaction_id) {
      const siblings = units.filter((u) => u.id !== id && u.transaction_id === unit.transaction_id)
      if (siblings.length === 0) {
        // Last unit — delete the transaction and reverse stock
        const { data: txData } = await supabase.from('stock_transactions').select('*').eq('id', unit.transaction_id)
        const tx = (txData as StockTransaction[] | null)?.[0]
        if (tx) {
          const { data: prods } = await supabase.from('products').select('*').eq('id', tx.product_id)
          const p = (prods as Product[] | null)?.[0]
          if (p) {
            await supabase.from('products').update({ current_stock: p.current_stock + tx.quantity }).eq('id', tx.product_id)
          }
          await supabase.from('stock_transactions').delete().eq('id', tx.id)
        }
      }
    }

    fetchData()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units Sold</h1>
          <p className="text-gray-500 text-sm mt-1">{units.length} unit{units.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Unit Manually
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by product, SKU, location, or assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="returned">Returned</option>
        </select>
        {filtered.length > 0 && (
          <>
            <button
              onClick={() => setPrintStickers(filtered.map(toStickerData))}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Stickers ({filtered.length})
            </button>
            <button
              onClick={() => setPrintWarranty(filtered.map(toWarrantyCardData))}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Warranty ({filtered.length})
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p className="text-sm">No units found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Serial No.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Install Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">QR</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Warranty</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr key={unit.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                        {unit.serial_no}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{unit.product_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{unit.sku}</p>
                      {unit.reference && <p className="text-xs text-blue-600">{unit.reference}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {unit.unit_number}/{unit.total_units}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{unit.location || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{unit.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{unit.assigned_to || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{unit.installation_date || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={unit.status}
                        onChange={(e) => updateStatus(unit.id, e.target.value as UnitSold['status'])}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-400 focus:outline-none ${STATUS_STYLES[unit.status]}`}
                      >
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="returned">Returned</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setQrUnit(unit)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="View QR code"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPrintWarranty([toWarrantyCardData(unit)])}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Print warranty card"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditUnit(unit)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single QR preview modal */}
      {qrUnit && (
        <QRPreviewModal
          unit={qrUnit}
          onPrint={() => { setPrintStickers([toStickerData(qrUnit)]); setQrUnit(null) }}
          onClose={() => setQrUnit(null)}
        />
      )}

      {/* Manual add modal */}
      {showAddModal && (
        <AddUnitModal
          products={products}
          onClose={() => setShowAddModal(false)}
          onAdded={(stickers, warrantyData) => {
            setShowAddModal(false)
            fetchData()
            setPrintStickers(stickers)
            setPrintWarranty(warrantyData)
          }}
        />
      )}

      {/* Print sticker sheet */}
      {printStickers && (
        <QRStickers stickers={printStickers} onClose={() => setPrintStickers(null)} />
      )}

      {/* Print warranty cards */}
      {printWarranty && (
        <WarrantyCards cards={printWarranty} onClose={() => setPrintWarranty(null)} />
      )}

      {/* Edit unit modal */}
      {editUnit && (
        <EditUnitModal
          unit={editUnit}
          onClose={() => setEditUnit(null)}
          onSaved={() => { setEditUnit(null); fetchData() }}
        />
      )}
    </div>
  )
}

// ── QR Preview Modal ──────────────────────────────────────────────────────────

function QRPreviewModal({
  unit,
  onPrint,
  onClose,
}: {
  unit: UnitSold
  onPrint: () => void
  onClose: () => void
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${origin}/units/${unit.id}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6 text-center">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Unit QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <QRCodeSVG value={url} size={180} level="M" />
        </div>
        <p className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2">{unit.serial_no}</p>
        <p className="font-medium text-gray-800 text-sm">{unit.product_name}</p>
        <p className="text-xs text-gray-400 font-mono mb-1">{unit.sku}</p>
        <p className="text-xs text-gray-400 mb-4">Unit {unit.unit_number}/{unit.total_units}</p>
        <p className="text-xs text-gray-400 break-all bg-gray-50 rounded px-2 py-1 mb-4">{url}</p>
        <button
          onClick={onPrint}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Print Sticker
        </button>
      </div>
    </div>
  )
}

// ── Add Unit Modal ────────────────────────────────────────────────────────────

function AddUnitModal({
  products,
  onClose,
  onAdded,
}: {
  products: Product[]
  onClose: () => void
  onAdded: (stickers: StickerData[], warrantyData: WarrantyCardData[]) => void
}) {
  const [form, setForm] = useState({
    product_id: '',
    quantity: 1,
    reference: '',
    installation_date: '',
    location: '',
    assigned_to: '',
    customer_name: '',
    notes: '',
    warranty_months: 12,
    warranty_preset: '12',
    status: 'active' as UnitSold['status'],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedProduct = products.find((p) => p.id === form.product_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const qty = Number(form.quantity)
    const unitRows = Array.from({ length: qty }, (_, i) => ({
      product_id: form.product_id,
      product_name: selectedProduct!.name,
      sku: selectedProduct!.sku,
      transaction_id: '',
      unit_number: i + 1,
      total_units: qty,
      reference: form.reference.trim(),
      installation_date: form.installation_date,
      location: form.location.trim(),
      assigned_to: form.assigned_to.trim(),
      customer_name: form.customer_name.trim(),
      notes: form.notes.trim(),
      warranty_months: Number(form.warranty_months),
      status: form.status,
    }))

    const { data: insertedUnits, error: err } = await supabase.from('units_sold').insert(unitRows).select()

    if (err) { setError(err.message); setSubmitting(false); return }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const stickers: StickerData[] = (insertedUnits as UnitSold[]).map((u) => ({
      unitId: u.id,
      serialNo: u.serial_no,
      unitNumber: u.unit_number,
      totalUnits: u.total_units,
      productName: u.product_name,
      sku: u.sku,
      reference: u.reference,
      installationDate: u.installation_date,
      location: u.location,
      assignedTo: u.assigned_to,
      customerName: u.customer_name,
      notes: u.notes,
      issuedAt: u.created_at,
      qrUrl: `${origin}/units/${u.id}`,
    }))

    const warrantyData: WarrantyCardData[] = (insertedUnits as UnitSold[]).map((u) => ({
      unitId: u.id,
      serialNo: u.serial_no,
      productName: u.product_name,
      sku: u.sku,
      warrantyMonths: u.warranty_months ?? 12,
      installationDate: u.installation_date,
      issuedAt: u.created_at,
      customerName: u.customer_name,
      location: u.location,
      assignedTo: u.assigned_to,
      reference: u.reference,
      qrUrl: `${origin}/units/${u.id}`,
    }))

    onAdded(stickers, warrantyData)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Unit Manually</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
            <select required value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
              <input required type="number" min={1} value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as UnitSold['status'] })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Installation Date</label>
              <input type="date" value={form.installation_date}
                onChange={(e) => setForm({ ...form, installation_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
              <input type="text" value={form.reference} placeholder="e.g. ORD-001"
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location / Site</label>
            <input type="text" value={form.location} placeholder="e.g. Building A, Floor 3"
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
            <input type="text" value={form.assigned_to} placeholder="e.g. John Smith"
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
            <input type="text" value={form.customer_name} placeholder="e.g. Acme Corp / John Smith"
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={2} placeholder="Optional notes..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Period</label>
            <select
              value={form.warranty_preset}
              onChange={(e) => {
                const v = e.target.value
                setForm({ ...form, warranty_preset: v, ...(v !== 'custom' ? { warranty_months: Number(v) } : {}) })
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="0">No warranty</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">1 year (12 months)</option>
              <option value="24">2 years (24 months)</option>
              <option value="36">3 years (36 months)</option>
              <option value="custom">Custom…</option>
            </select>
            {form.warranty_preset === 'custom' && (
              <input type="number" min={0} placeholder="Enter months"
                value={form.warranty_months}
                onChange={(e) => setForm({ ...form, warranty_months: Number(e.target.value) })}
                className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : 'Add & Generate QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Unit Modal ───────────────────────────────────────────────────────────

const WARRANTY_PRESETS = [0, 3, 6, 12, 24, 36]

function EditUnitModal({
  unit,
  onClose,
  onSaved,
}: {
  unit: UnitSold
  onClose: () => void
  onSaved: () => void
}) {
  const initPreset = WARRANTY_PRESETS.includes(unit.warranty_months ?? 12)
    ? String(unit.warranty_months ?? 12)
    : 'custom'

  const [form, setForm] = useState({
    product_name: unit.product_name,
    sku: unit.sku,
    reference: unit.reference ?? '',
    installation_date: unit.installation_date ?? '',
    location: unit.location ?? '',
    assigned_to: unit.assigned_to ?? '',
    customer_name: unit.customer_name ?? '',
    notes: unit.notes ?? '',
    warranty_months: unit.warranty_months ?? 12,
    warranty_preset: initPreset,
    status: unit.status,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('units_sold').update({
      product_name: form.product_name.trim(),
      sku: form.sku.trim(),
      reference: form.reference.trim(),
      installation_date: form.installation_date,
      location: form.location.trim(),
      assigned_to: form.assigned_to.trim(),
      customer_name: form.customer_name.trim(),
      notes: form.notes.trim(),
      warranty_months: Number(form.warranty_months),
      status: form.status,
    }).eq('id', unit.id)

    if (err) { setError(err.message); setSubmitting(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Edit Unit</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{unit.serial_no}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
              <input required type="text" value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
              <input type="text" value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as UnitSold['status'] })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Installation Date</label>
              <input type="date" value={form.installation_date}
                onChange={(e) => setForm({ ...form, installation_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
            <input type="text" value={form.customer_name} placeholder="e.g. Acme Corp"
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location / Site</label>
            <input type="text" value={form.location} placeholder="e.g. Building A"
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
            <input type="text" value={form.assigned_to} placeholder="e.g. John Smith"
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
            <input type="text" value={form.reference} placeholder="e.g. ORD-001"
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={2} placeholder="Optional notes..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Period</label>
            <select
              value={form.warranty_preset}
              onChange={(e) => {
                const v = e.target.value
                setForm({ ...form, warranty_preset: v, ...(v !== 'custom' ? { warranty_months: Number(v) } : {}) })
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="0">No warranty</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">1 year (12 months)</option>
              <option value="24">2 years (24 months)</option>
              <option value="36">3 years (36 months)</option>
              <option value="custom">Custom…</option>
            </select>
            {form.warranty_preset === 'custom' && (
              <input type="number" min={0} placeholder="Enter months"
                value={form.warranty_months}
                onChange={(e) => setForm({ ...form, warranty_months: Number(e.target.value) })}
                className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
