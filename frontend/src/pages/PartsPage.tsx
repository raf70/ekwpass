import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Package, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getParts } from '@/api/parts'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

export default function PartsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['parts', page, pageSize, debouncedSearch],
    queryFn: () => getParts({ page, pageSize, search: debouncedSearch }),
  })

  const parts = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Parts Inventory</h1>
        <button
          onClick={() => navigate('/parts/new')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Part
        </button>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by part number, description, or manufacturer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-500">Part #</th>
                <th className="px-6 py-3 font-medium text-slate-500">Description</th>
                <th className="px-6 py-3 font-medium text-slate-500">Manufacturer</th>
                <th className="px-6 py-3 font-medium text-slate-500">Location</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Qty</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Sell Price</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">List Price</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                : parts.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/parts/${p.id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-900">{p.code}</td>
                      <td className="px-6 py-4 text-slate-600">{p.description}</td>
                      <td className="px-6 py-4 text-slate-600">{p.manufacturer}</td>
                      <td className="px-6 py-4 text-slate-600">{p.location || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={
                            p.qtyOnHand <= 0
                              ? 'font-medium text-red-600'
                              : p.qtyOnHand <= p.reorderQty
                                ? 'font-medium text-amber-600'
                                : 'text-slate-900'
                          }
                        >
                          {p.qtyOnHand}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900">
                        {formatCurrency(p.sellPrice)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {formatCurrency(p.listPrice)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && parts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">No parts found</p>
            <p className="mt-1 text-sm">Try adjusting your search or add a new part.</p>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-sm text-slate-500">
              Showing {from} to {to} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
