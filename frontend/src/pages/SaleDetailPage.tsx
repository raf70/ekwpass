import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Trash2, Loader2, ShoppingCart } from 'lucide-react'
import { getSale, deleteSale } from '@/api/sales'
import { useState } from 'react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

function formatDate(dateStr: string) {
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

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSale(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSale(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      navigate('/sales')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <ShoppingCart className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">Sale not found</p>
      </div>
    )
  }

  const profit = sale.amount - sale.cost * sale.qty

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/sales"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sales
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Sale #{sale.saleNumber}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                sale.status === 'open'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {sale.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatDate(sale.date)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/sales/${id}/edit`)}
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
            Are you sure you want to delete this sale? This action cannot be undone.
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
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Sale Details</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Sale Number" value={<span className="font-mono">{sale.saleNumber}</span>} />
            <Field label="Date" value={formatDate(sale.date)} />
            <Field label="Time" value={sale.time || '—'} />
            <Field label="Description" value={sale.description} />
            <Field label="Sale Type" value={sale.saleType} />
            <Field label="Sale Info" value={sale.saleInfo} />
            <Field label="Quantity" value={sale.qty} />
            <Field label="Department" value={sale.department || '—'} />
            <Field label="Taxable" value={sale.isTaxable ? 'Yes' : 'No'} />
            <Field label="Payment Type" value={sale.paymentType} />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Part & Supplier</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Part Code" value={sale.partCode ? <span className="font-mono">{sale.partCode}</span> : null} />
            <Field label="Cost" value={formatCurrency(sale.cost)} />
            <Field label="List Price" value={formatCurrency(sale.listPrice)} />
            <Field label="Supplier Invoice" value={sale.supplierInvoice} />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Financial Summary</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Amount"
              value={
                <span className="text-lg font-semibold text-slate-900">
                  {formatCurrency(sale.amount)}
                </span>
              }
            />
            <Field label="Total Cost" value={formatCurrency(sale.cost * sale.qty)} />
            <Field
              label="Profit"
              value={
                <span className={profit >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-600'}>
                  {formatCurrency(profit)}
                </span>
              }
            />
          </dl>
        </section>
      </div>
    </div>
  )
}
