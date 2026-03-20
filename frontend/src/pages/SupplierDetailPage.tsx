import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Trash2, Loader2, Truck, Package } from 'lucide-react'
import { getSupplier, deleteSupplier, getSupplierParts, getSupplierAPTransactions } from '@/api/suppliers'
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

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: !!id,
  })

  const { data: parts } = useQuery({
    queryKey: ['supplier', id, 'parts'],
    queryFn: () => getSupplierParts(id!),
    enabled: !!id,
  })

  const { data: apTransactions } = useQuery({
    queryKey: ['supplier', id, 'ap-transactions'],
    queryFn: () => getSupplierAPTransactions(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSupplier(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/suppliers')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Truck className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">Supplier not found</p>
      </div>
    )
  }

  const address = [supplier.address1, supplier.address2].filter(Boolean).join(', ')
  const cityLine = [supplier.city, supplier.province, supplier.postalCode].filter(Boolean).join(', ')
  const fullAddress = [address, cityLine, supplier.country].filter(Boolean).join('\n')

  const apTotals = (apTransactions ?? []).reduce(
    (acc, t) => {
      const signed = t.crDr === 'CR' ? -t.amount : t.amount
      return { total: acc.total + signed, count: acc.count + 1 }
    },
    { total: 0, count: 0 },
  )

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/suppliers"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Suppliers
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                supplier.isActive
                  ? 'bg-green-50 text-green-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {supplier.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 font-mono text-slate-500">{supplier.code}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/suppliers/${id}/edit`)}
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
            Are you sure you want to delete this supplier? This action cannot be undone.
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
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Contact Information</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Code" value={<span className="font-mono">{supplier.code}</span>} />
            <Field label="Name" value={supplier.name} />
            <Field label="GST Number" value={supplier.gstNumber} />
            <Field label="Phone (Primary)" value={supplier.phone1} />
            <Field label="Phone (Secondary)" value={supplier.phone2} />
            <Field label="PST/GST Flag" value={supplier.pstGstFlag} />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Address</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" value={
              fullAddress ? (
                <span className="whitespace-pre-line">{fullAddress}</span>
              ) : null
            } />
          </dl>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Financial</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Current Balance" value={
              <span className={supplier.balance !== 0 ? 'font-medium text-blue-700' : ''}>
                {formatCurrency(supplier.balance)}
              </span>
            } />
            <Field label="Opening Balance" value={formatCurrency(supplier.openingBalance)} />
          </dl>
        </section>

        {(supplier.remark1 || supplier.remark2) && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Remarks</h2>
            <dl className="grid gap-4 sm:grid-cols-1">
              {supplier.remark1 && <Field label="Remark 1" value={supplier.remark1} />}
              {supplier.remark2 && <Field label="Remark 2" value={supplier.remark2} />}
            </dl>
          </section>
        )}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Parts from this Supplier
              {parts && parts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({parts.length})
                </span>
              )}
            </h2>
          </div>
          {parts && parts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-2 font-medium text-slate-500">Code</th>
                    <th className="px-4 py-2 font-medium text-slate-500">Description</th>
                    <th className="px-4 py-2 font-medium text-slate-500">Qty</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500">Sell Price</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500">Avg Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/parts/${p.id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-mono font-medium text-slate-900">{p.code}</td>
                      <td className="px-4 py-2 text-slate-600">{p.description}</td>
                      <td className="px-4 py-2">
                        <span className={
                          p.qtyOnHand <= 0
                            ? 'font-medium text-red-600'
                            : p.qtyOnHand <= p.reorderQty
                              ? 'font-medium text-amber-600'
                              : 'text-slate-900'
                        }>
                          {p.qtyOnHand}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(p.sellPrice)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(p.avgPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Package className="mb-2 h-8 w-8" />
              <p className="text-sm">No parts linked to this supplier</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Accounts Payable
              {apTotals.count > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({apTotals.count} transactions, net {formatCurrency(apTotals.total)})
                </span>
              )}
            </h2>
          </div>
          {apTransactions && apTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-2 font-medium text-slate-500">Date</th>
                    <th className="px-4 py-2 font-medium text-slate-500">Invoice</th>
                    <th className="px-4 py-2 font-medium text-slate-500">Type</th>
                    <th className="px-4 py-2 font-medium text-slate-500">Comment</th>
                    <th className="px-4 py-2 font-medium text-slate-500">DR/CR</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500">Amount</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500">GST</th>
                  </tr>
                </thead>
                <tbody>
                  {apTransactions.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="px-4 py-2 text-slate-900">{formatDate(t.date)}</td>
                      <td className="px-4 py-2 font-mono text-slate-600">{t.invoiceNumber || '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{t.type || '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{t.comment || '—'}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.crDr === 'CR'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {t.crDr}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-900">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {t.gstAmount ? formatCurrency(t.gstAmount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Truck className="mb-2 h-8 w-8" />
              <p className="text-sm">No AP transactions for this supplier</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
