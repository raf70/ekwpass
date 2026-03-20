import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Trash2, Loader2, Package } from 'lucide-react'
import { getPart, deletePart } from '@/api/parts'
import { useState } from 'react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-CA')
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value || '—'}</dd>
    </div>
  )
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: part, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: () => getPart(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePart(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      navigate('/parts')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Package className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">Part not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/parts"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Parts
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{part.code}</h1>
          <p className="mt-1 text-slate-500">{part.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/parts/${id}/edit`)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Are you sure you want to delete this part? This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Part Information</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Part Number" value={<span className="font-mono">{part.code}</span>} />
            <Field label="Manufacturer" value={part.manufacturer} />
            <Field label="Description" value={part.description} />
            <Field label="Department" value={part.department || '—'} />
            <Field label="Location" value={part.location} />
            <Field label="Quantity on Hand" value={
              <span className={part.qtyOnHand <= 0 ? 'font-medium text-red-600' : part.qtyOnHand <= part.reorderQty ? 'font-medium text-amber-600' : ''}>
                {part.qtyOnHand}
              </span>
            } />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Alternate Parts</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Alt Code A" value={part.altCodeA ? `${part.altCodeA} (${part.altMfgrA})` : null} />
            <Field label="Alt Code B" value={part.altCodeB ? `${part.altCodeB} (${part.altMfgrB})` : null} />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Pricing</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Sell Price" value={formatCurrency(part.sellPrice)} />
            <Field label="List Price" value={formatCurrency(part.listPrice)} />
            <Field label="Wholesale Price" value={formatCurrency(part.wholesalePrice)} />
            <Field label="Average Cost" value={formatCurrency(part.avgPrice)} />
            <Field label="Core Value" value={formatCurrency(part.coreValue)} />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Discounts</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Discount 1" value={part.discount1 ? `${part.discount1}%` : '—'} />
            <Field label="Discount 2" value={part.discount2 ? `${part.discount2}%` : '—'} />
            <Field label="Discount 3" value={part.discount3 ? `${part.discount3}%` : '—'} />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Inventory & Sales</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Reorder Qty" value={part.reorderQty} />
            <Field label="Reorder Amount" value={formatCurrency(part.reorderAmount)} />
            <Field label="Turnover" value={part.turnover} />
            <Field label="YTD Sales" value={formatCurrency(part.ytdSales)} />
            <Field label="90-Day Sales" value={formatCurrency(part.sales90d)} />
            <Field label="Last Updated" value={formatDate(part.lastUpdated)} />
            <Field label="Last Sold" value={formatDate(part.lastSold)} />
            <Field label="No Auto-Update" value={part.noUpdate ? 'Yes' : 'No'} />
          </dl>
        </section>
      </div>
    </div>
  )
}
