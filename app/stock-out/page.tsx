'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Product, StockTransaction, UnitSold } from '@/lib/supabase'
import QRStickers, { StickerData } from '@/components/QRStickers'
import WarrantyCards, { WarrantyCardData } from '@/components/WarrantyCards'

export default function StockOutPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({
    product_id: '',
    quantity: 1,
    reference: '',
    notes: '',
    installation_date: '',
    location: '',
    assigned_to: '',
    customer_name: '',
    warranty_months: 12,
    warranty_preset: '12',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [stickers, setStickers] = useState<StickerData[] | null>(null)
  const [warrantyCards, setWarrantyCards] = useState<WarrantyCardData[] | null>(null)
  const [editTx, setEditTx] = useState<StockTransaction | null>(null)

  async function fetchData() {
    const [productsRes, txRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase
        .from('stock_transactions')
        .select('*, products(name, sku)')
        .eq('type', 'out')
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    setProducts(productsRes.data ?? [])
    setTransactions(txRes.data ?? [])
  }

  useEffect(() => { fetchData() }, [])

  function handleProductChange(id: string) {
    setSelectedProduct(products.find((p) => p.id === id) ?? null)
    setForm((f) => ({ ...f, product_id: id, quantity: 1 }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (selectedProduct && form.quantity > selectedProduct.current_stock) {
      setError(`Insufficient stock. Available: ${selectedProduct.current_stock} ${selectedProduct.unit}`)
      setSubmitting(false)
      return
    }

    const qty = Number(form.quantity)

    // 1. Record the stock transaction — use .select() to get the inserted ID
    const { data: txData, error: txError } = await supabase.from('stock_transactions').insert([{
      product_id: form.product_id,
      type: 'out',
      quantity: qty,
      reference: form.reference.trim(),
      notes: form.notes.trim(),
      installation_date: form.installation_date,
      location: form.location.trim(),
      assigned_to: form.assigned_to.trim(),
    }]).select()

    if (txError) { setError(txError.message); setSubmitting(false); return }
    const txId = (txData as StockTransaction[] | null)?.[0]?.id ?? ''

    // 2. Create one UnitSold record per unit — insert returns the rows with their IDs
    const unitRows = Array.from({ length: qty }, (_, i) => ({
      product_id: form.product_id,
      product_name: selectedProduct!.name,
      sku: selectedProduct!.sku,
      transaction_id: txId,
      unit_number: i + 1,
      total_units: qty,
      reference: form.reference.trim(),
      installation_date: form.installation_date,
      location: form.location.trim(),
      assigned_to: form.assigned_to.trim(),
      customer_name: form.customer_name.trim(),
      notes: form.notes.trim(),
      warranty_months: Number(form.warranty_months),
      status: 'active',
    }))

    const { data: insertedUnits, error: unitError } = await supabase
      .from('units_sold')
      .insert(unitRows)
      .select()

    if (unitError) { setError(unitError.message); setSubmitting(false); return }

    const units = insertedUnits as UnitSold[]
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    // 3. Build sticker data — QR encodes the full unit detail URL
    const generated: StickerData[] = units.map((u) => ({
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

    const generatedWarranty: WarrantyCardData[] = units.map((u) => ({
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
    }))

    setStickers(generated)
    setWarrantyCards(generatedWarranty)
    setForm({ product_id: '', quantity: 1, reference: '', notes: '', installation_date: '', location: '', assigned_to: '', customer_name: '', warranty_months: 12, warranty_preset: '12' })
    setSelectedProduct(null)
    fetchData()
    setSubmitting(false)
  }

  async function handleDeleteTx(tx: StockTransaction) {
    if (!confirm('Delete this transaction? Stock will be adjusted accordingly.')) return
    // Reverse the stock effect (stock-out removed stock, so add it back)
    const { data: prods } = await supabase.from('products').select('*').eq('id', tx.product_id)
    const p = (prods as Product[] | null)?.[0]
    if (p) {
      await supabase.from('products').update({ current_stock: p.current_stock + tx.quantity }).eq('id', tx.product_id)
    }
    await supabase.from('stock_transactions').delete().eq('id', tx.id)
    fetchData()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Stock Out</h1>
        <p className="text-gray-500 text-sm mt-1">Record outgoing inventory &amp; generate QR stickers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New Stock Out Entry</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
              <select
                required
                value={form.product_id}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.current_stock === 0}>
                    {p.name} — {p.sku} (Stock: {p.current_stock} {p.unit}){p.current_stock === 0 ? ' — OUT OF STOCK' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                selectedProduct.current_stock === 0 ? 'bg-red-50 text-red-700'
                : selectedProduct.current_stock <= selectedProduct.min_stock ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700'
              }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Available: <strong>{selectedProduct.current_stock} {selectedProduct.unit}</strong>
                {selectedProduct.current_stock <= selectedProduct.min_stock && selectedProduct.current_stock > 0 && ' (Low stock)'}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
              <input
                required type="number" min={1}
                max={selectedProduct?.current_stock ?? undefined}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="border-t border-gray-100 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Unit / Sticker Info</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Installation Date</label>
                    <input type="date" value={form.installation_date}
                      onChange={(e) => setForm({ ...form, installation_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Order No.</label>
                    <input type="text" value={form.reference} placeholder="e.g. ORD-2024-001"
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                  <input type="text" value={form.customer_name} placeholder="e.g. Acme Corp / John Smith"
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location / Site</label>
                  <input type="text" value={form.location} placeholder="e.g. Building A, Floor 3, Room 301"
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                  <input type="text" value={form.assigned_to} placeholder="e.g. John Smith / IT Dept"
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
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
              </div>
            </div>

            <button type="submit"
              disabled={submitting || selectedProduct?.current_stock === 0}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {submitting ? 'Recording...' : 'Record & Generate QR Stickers'}
            </button>
          </form>
        </div>

        {/* Recent Stock Out */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Recent Stock Out</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No stock out records yet</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[560px]">
              {transactions.map((tx) => (
                <div key={tx.id} className="py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                          {tx.serial_no}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.products?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{tx.products?.sku}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-red-500">-{tx.quantity}</span>
                      <button onClick={() => setEditTx(tx)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteTx(tx)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {tx.reference && <Detail icon="📋" text={tx.reference} />}
                    {tx.location && <Detail icon="📍" text={tx.location} />}
                    {tx.assigned_to && <Detail icon="👤" text={tx.assigned_to} />}
                    {tx.installation_date && <Detail icon="🗓" text={tx.installation_date} />}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stickers && <QRStickers stickers={stickers} onClose={() => setStickers(null)} />}
      {warrantyCards && <WarrantyCards cards={warrantyCards} onClose={() => setWarrantyCards(null)} />}
      {editTx && (
        <EditStockOutModal
          tx={editTx}
          onClose={() => setEditTx(null)}
          onSaved={() => { setEditTx(null); fetchData() }}
        />
      )}
    </div>
  )
}

function Detail({ icon, text }: { icon: string; text: string }) {
  return <span className="text-xs text-gray-500">{icon} {text}</span>
}

// ── Edit Stock Out Modal ──────────────────────────────────────────────────────

function EditStockOutModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: StockTransaction
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    quantity: tx.quantity,
    reference: tx.reference ?? '',
    notes: tx.notes ?? '',
    installation_date: tx.installation_date ?? '',
    location: tx.location ?? '',
    assigned_to: tx.assigned_to ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const newQty = Number(form.quantity)
    const diff = newQty - tx.quantity

    // Adjust product stock: stock-out reduces stock, so diff is inverted
    if (diff !== 0) {
      const { data: prods } = await supabase.from('products').select('*').eq('id', tx.product_id)
      const p = (prods as Product[] | null)?.[0]
      if (p) {
        await supabase.from('products').update({ current_stock: p.current_stock - diff }).eq('id', tx.product_id)
      }
    }

    const { error: err } = await supabase.from('stock_transactions').update({
      quantity: newQty,
      reference: form.reference.trim(),
      notes: form.notes.trim(),
      installation_date: form.installation_date,
      location: form.location.trim(),
      assigned_to: form.assigned_to.trim(),
    }).eq('id', tx.id)

    if (err) { setError(err.message); setSubmitting(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Edit Stock Out</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{tx.serial_no}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
            <span className="font-medium">{tx.products?.name}</span>
            <span className="text-gray-400 font-mono text-xs ml-2">{tx.products?.sku}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
            <input required type="number" min={1} value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.quantity !== tx.quantity && (
              <p className="text-xs text-amber-600 mt-1">
                Stock will {form.quantity < tx.quantity ? 'increase' : 'decrease'} by {Math.abs(form.quantity - tx.quantity)}
              </p>
            )}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={2} placeholder="Optional notes..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
