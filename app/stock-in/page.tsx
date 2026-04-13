'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Product, StockTransaction } from '@/lib/supabase'

export default function StockInPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [form, setForm] = useState({ product_id: '', quantity: 1, reference: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [editTx, setEditTx] = useState<StockTransaction | null>(null)

  async function fetchData() {
    const [productsRes, txRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase
        .from('stock_transactions')
        .select('*, products(name, sku)')
        .eq('type', 'in')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setProducts(productsRes.data ?? [])
    setTransactions(txRes.data ?? [])
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    const { error: insertError } = await supabase.from('stock_transactions').insert([{
      product_id: form.product_id,
      type: 'in',
      quantity: Number(form.quantity),
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    }])

    if (insertError) {
      setError(insertError.message)
    } else {
      const product = products.find((p) => p.id === form.product_id)
      setSuccess(`Successfully added ${form.quantity} ${product?.unit ?? 'units'} of "${product?.name}"`)
      setForm({ product_id: '', quantity: 1, reference: '', notes: '' })
      fetchData()
    }
    setSubmitting(false)
  }

  async function handleDelete(tx: StockTransaction) {
    if (!confirm('Delete this transaction? Stock will be adjusted accordingly.')) return
    // Reverse the stock effect (stock-in added stock, so subtract it back)
    const { data: prods } = await supabase.from('products').select('*').eq('id', tx.product_id)
    const p = (prods as Product[] | null)?.[0]
    if (p) {
      await supabase.from('products').update({ current_stock: p.current_stock - tx.quantity }).eq('id', tx.product_id)
    }
    await supabase.from('stock_transactions').delete().eq('id', tx.id)
    fetchData()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Stock In</h1>
        <p className="text-gray-500 text-sm mt-1">Record incoming inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">New Stock In Entry</h2>

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
              <select required value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.sku} (Current: {p.current_stock} {p.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
              <input required type="number" min={1} value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference / PO Number</label>
              <input type="text" value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="e.g. PO-2024-001"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} rows={3} placeholder="Optional notes..."
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Recording...' : 'Record Stock In'}
            </button>
          </form>
        </div>

        {/* Recent Stock In */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Recent Stock In</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No stock in records yet</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[480px]">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.products?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{tx.products?.sku}</p>
                    {tx.reference && <p className="text-xs text-blue-600 mt-0.5">{tx.reference}</p>}
                    {tx.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{tx.notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-sm font-bold text-green-600">+{tx.quantity}</span>
                    <button
                      onClick={() => setEditTx(tx)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(tx)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editTx && (
        <EditStockInModal
          tx={editTx}
          onClose={() => setEditTx(null)}
          onSaved={() => { setEditTx(null); fetchData() }}
        />
      )}
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditStockInModal({
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
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const newQty = Number(form.quantity)
    const diff = newQty - tx.quantity

    // Adjust product stock by the quantity difference
    if (diff !== 0) {
      const { data: prods } = await supabase.from('products').select('*').eq('id', tx.product_id)
      const p = (prods as Product[] | null)?.[0]
      if (p) {
        await supabase.from('products').update({ current_stock: p.current_stock + diff }).eq('id', tx.product_id)
      }
    }

    const { error: err } = await supabase.from('stock_transactions').update({
      quantity: newQty,
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    }).eq('id', tx.id)

    if (err) { setError(err.message); setSubmitting(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Edit Stock In</h2>
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
                Stock will {form.quantity > tx.quantity ? 'increase' : 'decrease'} by {Math.abs(form.quantity - tx.quantity)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference / PO Number</label>
            <input type="text" value={form.reference} placeholder="e.g. PO-2024-001"
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
