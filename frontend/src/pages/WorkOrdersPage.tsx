import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ClipboardList, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getWorkOrders } from '@/api/workOrders'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'voided', label: 'Voided' },
]

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
    voided: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

export default function WorkOrdersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', page, pageSize, debouncedSearch, status],
    queryFn: () => getWorkOrders({ page, pageSize, search: debouncedSearch, status }),
  })

  const orders = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  function fmtDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-CA')
  }

  function vehicleLabel(wo: (typeof orders)[0]) {
    const parts = [wo.vehicleYear ? String(wo.vehicleYear) : '', wo.vehicleMake, wo.vehicleModel].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : '—'
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
        <button
          onClick={() => navigate('/work-orders/new')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-white">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                status === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-500">Invoice #</th>
                <th className="px-6 py-3 font-medium text-slate-500">Date</th>
                <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 font-medium text-slate-500">Customer</th>
                <th className="px-6 py-3 font-medium text-slate-500">Vehicle</th>
                <th className="px-6 py-3 font-medium text-slate-500">Plate</th>
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
                : orders.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => navigate(`/work-orders/${wo.id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">{wo.invoiceNumber}</td>
                      <td className="px-6 py-4 text-slate-600">{fmtDate(wo.date)}</td>
                      <td className="px-6 py-4"><StatusBadge status={wo.status} /></td>
                      <td className="px-6 py-4 text-slate-900">{wo.customerName || '—'}</td>
                      <td className="px-6 py-4 text-slate-600">{vehicleLabel(wo)}</td>
                      <td className="px-6 py-4 text-slate-600">{wo.vehiclePlate || '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardList className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">No work orders found</p>
            <p className="mt-1 text-sm">Try adjusting your search or create a new work order.</p>
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
