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
  customer_name: string
  notes: string
  warranty_months: number
  status: 'active' | 'returned' | 'maintenance'
  created_at: string
}

export type CrmContact = {
  id: string
  name: string
  company: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
}

export type CrmProject = {
  id: string
  title: string
  contact_id: string
  status: 'lead' | 'quoted' | 'won' | 'in_progress' | 'completed' | 'lost'
  product_lines: string   // comma-separated product line names
  value: number
  location: string
  assigned_to: string
  notes: string
  created_at: string
  crm_contacts?: Pick<CrmContact, 'name' | 'company' | 'phone'>
}

// ── localStorage mock ─────────────────────────────────────────────────────────

const KEYS = {
  products: 'wh_products',
  transactions: 'wh_transactions',
  units: 'wh_units',
  crm_contacts: 'wh_crm_contacts',
  crm_projects: 'wh_crm_projects',
}

function tableKey(name: string): string {
  if (name === 'products') return KEYS.products
  if (name === 'stock_transactions') return KEYS.transactions
  if (name === 'units_sold') return KEYS.units
  if (name === 'crm_contacts') return KEYS.crm_contacts
  if (name === 'crm_projects') return KEYS.crm_projects
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
  const now = new Date().toISOString()
  const products: Product[] = [
    // PoolComfort Inverter
    { id: uuid(), name: 'PoolComfort PC-010',      sku: 'PC-010',      category: 'PoolComfort Inverter',    unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-020',      sku: 'PC-020',      category: 'PoolComfort Inverter',    unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-030',      sku: 'PC-030',      category: 'PoolComfort Inverter',    unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-045',      sku: 'PC-045',      category: 'PoolComfort Inverter',    unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-060',      sku: 'PC-060',      category: 'PoolComfort Inverter',    unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-080',      sku: 'PC-080',      category: 'PoolComfort Inverter',    unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    // PoolComfort Commercial
    { id: uuid(), name: 'PoolComfort PC-100-INVT', sku: 'PC-100-INVT', category: 'PoolComfort Commercial',  unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-150-INVT', sku: 'PC-150-INVT', category: 'PoolComfort Commercial',  unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-200-INVT', sku: 'PC-200-INVT', category: 'PoolComfort Commercial',  unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'PoolComfort PC-300-INVT', sku: 'PC-300-INVT', category: 'PoolComfort Commercial',  unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    // HeatPump All-in-One
    { id: uuid(), name: 'HeatPump All-in-One 200L',    sku: 'AHP-200',     category: 'HeatPump All-in-One',     unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'HeatPump All-in-One 300L',    sku: 'AHP-300',     category: 'HeatPump All-in-One',     unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    // HeatPump Eco (Small)
    { id: uuid(), name: 'HeatPump Eco 4kW',            sku: 'HP-004',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 6kW',            sku: 'HP-006',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 8kW',            sku: 'HP-008',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 12kW',           sku: 'HP-012',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 18kW',           sku: 'HP-018',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    // HeatPump Eco (Large)
    { id: uuid(), name: 'HeatPump Eco 13kW',           sku: 'HP-013',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 20kW',           sku: 'HP-020',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 28kW',           sku: 'HP-028',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 35kW',           sku: 'HP-035',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 44kW',           sku: 'HP-044',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 52kW',           sku: 'HP-052',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump Eco 76kW',           sku: 'HP-076',      category: 'HeatPump Eco',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    // HeatPump High Temp
    { id: uuid(), name: 'HeatPump High Temp 15kW',     sku: 'HPT-015',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump High Temp 20kW',     sku: 'HPT-020',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump High Temp 27kW',     sku: 'HPT-027',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump High Temp 37kW',     sku: 'HPT-037',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump High Temp 56kW',     sku: 'HPT-056',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump High Temp 64kW',     sku: 'HPT-064',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'HeatPump High Temp 72kW',     sku: 'HPT-072',     category: 'HeatPump High Temp',      unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    // Storage Tank
    { id: uuid(), name: 'Storage Tank 150L',           sku: 'AH-150',      category: 'Storage Tank',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'Storage Tank 300L',           sku: 'AH-300',      category: 'Storage Tank',            unit: 'unit', current_stock: 0, min_stock: 2, created_at: now },
    { id: uuid(), name: 'Storage Tank 500L',           sku: 'AH-500',      category: 'Storage Tank',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'Storage Tank 600L',           sku: 'AH-600',      category: 'Storage Tank',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
    { id: uuid(), name: 'Storage Tank 1000L',          sku: 'AH-1000',     category: 'Storage Tank',            unit: 'unit', current_stock: 0, min_stock: 1, created_at: now },
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

    if (this.tableName === 'crm_projects' && this._select.includes('crm_contacts(')) {
      const contacts = load<CrmContact>(KEYS.crm_contacts)
      rows = rows.map((proj) => {
        const c = contacts.find((ct) => ct.id === proj.contact_id)
        return c ? { ...proj, crm_contacts: { name: c.name, company: c.company, phone: c.phone } } : proj
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
