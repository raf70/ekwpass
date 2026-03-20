import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Users, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getCustomers } from '@/api/customers'

export default function CustomersPage() {
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
    queryKey: ['customers', page, pageSize, debouncedSearch],
    queryFn: () => getCustomers({ page, pageSize, search: debouncedSearch }),
  })

  const customers = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-CA')
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <button
          onClick={() => navigate('/customers/new')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or city..."
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
                <th className="px-6 py-3 font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 font-medium text-slate-500">Phone</th>
                <th className="px-6 py-3 font-medium text-slate-500">City</th>
                <th className="px-6 py-3 font-medium text-slate-500">Province</th>
                <th className="px-6 py-3 font-medium text-slate-500">Last Service</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">AR Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                : customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                      <td className="px-6 py-4 text-slate-600">{c.phone}</td>
                      <td className="px-6 py-4 text-slate-600">{c.city}</td>
                      <td className="px-6 py-4 text-slate-600">{c.province}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(c.lastServiceDate)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(c.arBalance)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && customers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="mt-1 text-sm">Try adjusting your search or add a new customer.</p>
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
