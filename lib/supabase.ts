// ---------------------------------------------------------------------------
// Dual-mode client:
//   • NEXT_PUBLIC_SUPABASE_URL set to a real https:// URL → real Supabase
//   • Otherwise → localStorage mock (zero config, local dev)
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

// ── shared types ─────────────────────────────────────────────────────────────

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  current_stock: number
  min_stock: number
  created_at: string
}

export type StockTransaction = {
  id: string
  serial_no: string
  product_id: string
  type: 'in' | 'out'
  quantity: number
  notes: string
  reference: string
  installation_date: string
  location: string
  assigned_to: string
  created_at: string
  products?: Pick<Product, 'name' | 'sku'>
}

export type UnitSold = {
  id: string
  serial_no: string
  product_id: string
  product_name: string
  sku: string
  transaction_id: string
  unit_number: number
  total_units: number
  reference: string
  installation_date: string
  location: string
  assigned_to: string
  notes: string
  warranty_months: number
  status: 'active' | 'returned' | 'maintenance'
  created_at: string
}

// ── localStorage mock ─────────────────────────────────────────────────────────

const KEYS = {
  products: 'wh_products',
  transactions: 'wh_transactions',
  units: 'wh_units',
}

function tableKey(name: string): string {
  if (name === 'products') return KEYS.products
  if (name === 'stock_transactions') return KEYS.transactions
  if (name === 'units_sold') return KEYS.units
  return name
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}

function save(key: string, data: unknown[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

function uuid() { return crypto.randomUUID() }

function generateSerialNo(prefix: string, existingCount: number, rowIndex: number) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(existingCount + rowIndex + 1).padStart(5, '0')
  return `${prefix}-${date}-${seq}`
}

function seed() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('wh_seeded')) return
  const products: Product[] = [
    { id: uuid(), name: 'Laptop Dell XPS 15',     sku: 'LPT-001', category: 'Electronics', unit: 'pcs',  current_stock: 25,  min_stock: 5,  created_at: new Date().toISOString() },
    { id: uuid(), name: 'Office Chair Ergonomic',  sku: 'FRN-001', category: 'Furniture',   unit: 'pcs',  current_stock: 40,  min_stock: 10, created_at: new Date().toISOString() },
    { id: uuid(), name: 'A4 Paper Ream',            sku: 'STT-001', category: 'Stationery',  unit: 'ream', current_stock: 200, min_stock: 50, created_at: new Date().toISOString() },
    { id: uuid(), name: 'USB-C Hub 7-in-1',         sku: 'ACC-001', category: 'Accessories', unit: 'pcs',  current_stock: 60,  min_stock: 15, created_at: new Date().toISOString() },
    { id: uuid(), name: 'Monitor 27" 4K',           sku: 'MON-001', category: 'Electronics', unit: 'pcs',  current_stock: 4,   min_stock: 5,  created_at: new Date().toISOString() },
  ]
  save(KEYS.products, products)
  save(KEYS.transactions, [])
  save(KEYS.units, [])
  localStorage.setItem('wh_seeded', '1')
}

if (typeof window !== 'undefined') seed()

// A tiny "resolved builder" so .insert(rows).select() works the same as .insert(rows)
type InsertResult = Promise<{ data: Row[] | null; error: { message: string } | null }>
function withSelect(p: InsertResult) {
  return Object.assign(p, { select: () => p })
}

class QueryBuilder {
  private tableName: string
  private _select = '*'
  private _filters: Array<{ col: string; val: unknown }> = []
  private _order: { col: string; ascending: boolean } | null = null
  private _limit: number | null = null
  private _operation: 'select' | 'delete' | 'update' = 'select'
  private _updateData: Row = {}

  constructor(table: string) { this.tableName = table }

  select(cols = '*') { this._select = cols; return this }
  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, ascending: opts?.ascending ?? true }; return this
  }
  limit(n: number) { this._limit = n; return this }
  eq(col: string, val: unknown) { this._filters.push({ col, val }); return this }

  insert(rows: Row[]) { return withSelect(this._execInsert(rows)) }

  update(data: Row) { this._operation = 'update'; this._updateData = data; return this }
  delete() { this._operation = 'delete'; return this }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(resolve: (v: { data: any; error: any }) => void, reject: (e: unknown) => void) {
    this._exec().then(resolve, reject)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _exec(): Promise<{ data: any; error: any }> {
    if (this._operation === 'delete') return this._execDelete()
    if (this._operation === 'update') return this._execUpdate()
    return this._execSelect()
  }

  private async _execSelect() {
    const key = tableKey(this.tableName)
    let rows: Row[] = load<Row>(key)

    for (const { col, val } of this._filters) rows = rows.filter((r) => r[col] === val)

    if (this.tableName === 'stock_transactions' && this._select.includes('products(')) {
      const products = load<Product>(KEYS.products)
      rows = rows.map((tx) => {
        const p = products.find((pr) => pr.id === tx.product_id)
        return p ? { ...tx, products: { name: p.name, sku: p.sku } } : tx
      })
    }

    if (this._order) {
      const { col, ascending } = this._order
      rows = [...rows].sort((a, b) => {
        const av = String(a[col] ?? ''), bv = String(b[col] ?? '')
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }

    if (this._limit !== null) rows = rows.slice(0, this._limit)
    return { data: rows, error: null }
  }

  private async _execInsert(rows: Row[]): InsertResult {
    try {
      const key = tableKey(this.tableName)
      const existing = load<Row>(key)
      const now = new Date().toISOString()

      const serialPrefix =
        this.tableName === 'units_sold' ? 'US'
        : this.tableName === 'stock_transactions'
          ? (rows[0]?.type === 'in' ? 'SI' : 'SO')
          : null

      const newRows: Row[] = rows.map((r, i) => ({
        id: uuid(), created_at: now,
        ...(serialPrefix ? { serial_no: generateSerialNo(serialPrefix, existing.length, i) } : {}),
        ...r,
      }))

      if (this.tableName === 'stock_transactions') {
        const products = load<Product>(KEYS.products)
        for (const tx of newRows as unknown as StockTransaction[]) {
          const idx = products.findIndex((p) => p.id === tx.product_id)
          if (idx === -1) continue
          products[idx].current_stock += tx.type === 'in' ? Number(tx.quantity) : -Number(tx.quantity)
        }
        save(KEYS.products, products)
      }

      if (this.tableName === 'products') {
        for (const row of newRows) {
          if (existing.some((e) => e.sku === row.sku))
            return { data: null, error: { message: `SKU "${row.sku}" already exists.` } }
        }
      }

      save(key, [...existing, ...newRows])
      return { data: newRows, error: null }
    } catch (e) {
      return { data: null, error: { message: String(e) } }
    }
  }

  private async _execUpdate() {
    const key = tableKey(this.tableName)
    const rows = load<Row>(key).map((r) => {
      const matches = this._filters.every(({ col, val }) => r[col] === val)
      return matches ? { ...r, ...this._updateData } : r
    })
    save(key, rows)
    return { data: null, error: null }
  }

  private async _execDelete() {
    const key = tableKey(this.tableName)
    let rows = load<Row>(key)
    const deletedVals = this._filters.filter((f) => f.col === 'id').map((f) => f.val)
    for (const { col, val } of this._filters) rows = rows.filter((r) => r[col] !== val)

    if (this.tableName === 'products' && deletedVals.length) {
      const ids = new Set(deletedVals)
      save(KEYS.transactions, load<Row>(KEYS.transactions).filter((t) => !ids.has(t.product_id)))
      save(KEYS.units, load<Row>(KEYS.units).filter((u) => !ids.has(u.product_id)))
    }

    save(key, rows)
    return { data: null, error: null }
  }
}

const mockClient = { from: (table: string) => new QueryBuilder(table) }

// ── auto-switch: real Supabase when env vars are set ─────────────────────────

const _url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const _key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const _useReal = _url.startsWith('https://') && _key.length > 20

export const supabase = _useReal ? createClient(_url, _key) : mockClient
