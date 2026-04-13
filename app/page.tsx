'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, Product, StockTransaction } from '@/lib/supabase'
import Link from 'next/link'

type Stats = {
  totalProducts: number
  totalStock: number
  lowStockCount: number
  todayTransactions: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    todayTransactions: 0,
  })
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [productsRes, transactionsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase
          .from('stock_transactions')
          .select('*, products(name, sku)')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const products: Product[] = productsRes.data ?? []
      const transactions: StockTransaction[] = transactionsRes.data ?? []

      const lowStock = products.filter((p) => p.current_stock <= p.min_stock)
      const todayTx = transactions.filter(
        (t) => new Date(t.created_at) >= today
      )

      setStats({
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + p.current_stock, 0),
        lowStockCount: lowStock.length,
        todayTransactions: todayTx.length,
      })
      setLowStockProducts(lowStock.slice(0, 5))
      setRecentTransactions(transactions.slice(0, 8))
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Warehouse inventory overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          title="Total Units in Stock"
          value={stats.totalStock.toLocaleString()}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockCount}
          color="amber"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          title="Today's Transactions"
          value={stats.todayTransactions}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        tx.type === 'in'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tx.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.products?.name}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Low Stock Alerts</h2>
            <Link href="/products" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">All products are well-stocked</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">{product.current_stock} {product.unit}</p>
                    <p className="text-xs text-gray-400">Min: {product.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string
  value: number | string
  color: 'blue' | 'green' | 'amber' | 'purple'
  icon: React.ReactNode
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{title}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
