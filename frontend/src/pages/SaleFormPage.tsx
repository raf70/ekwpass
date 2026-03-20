import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { getSale, createSale, updateSale } from '@/api/sales'

interface FormData {
  customerId: string
  status: string
  saleType: string
  saleInfo: string
  date: string
  qty: number
  description: string
  department: number
  amount: number
  isTaxable: boolean
  paymentType: string
  supplierId: string
  supplierInvoice: string
  partCode: string
  cost: number
  listPrice: number
  technicianId: string
}

const emptyForm: FormData = {
  customerId: '',
  status: 'closed',
  saleType: '',
  saleInfo: '',
  date: new Date().toISOString().split('T')[0],
  qty: 1,
  description: '',
  department: 0,
  amount: 0,
  isTaxable: true,
  paymentType: '',
  supplierId: '',
  supplierInvoice: '',
  partCode: '',
  cost: 0,
  listPrice: 0,
  technicianId: '',
}

export default function SaleFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [error, setError] = useState('')

  const { data: sale, isLoading: loadingSale } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSale(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (sale) {
      setForm({
        customerId: sale.customerId ?? '',
        status: sale.status,
        saleType: sale.saleType,
        saleInfo: sale.saleInfo,
        date: sale.date ? sale.date.split('T')[0] : '',
        qty: sale.qty,
        description: sale.description,
        department: sale.department,
        amount: sale.amount,
        isTaxable: sale.isTaxable,
        paymentType: sale.paymentType,
        supplierId: sale.supplierId ?? '',
        supplierInvoice: sale.supplierInvoice,
        partCode: sale.partCode,
        cost: sale.cost,
        listPrice: sale.listPrice,
        technicianId: sale.technicianId ?? '',
      })
    }
  }, [sale])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        customerId: data.customerId || null,
        supplierId: data.supplierId || null,
        technicianId: data.technicianId || null,
      }
      return isEdit ? updateSale(id!, payload) : createSale(payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['sale', id] })
      }
      navigate(`/sales/${saved.id}`)
    },
    onError: () => {
      setError('Failed to save sale. Please check the form and try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.description.trim() && !form.partCode.trim()) {
      setError('Description or part code is required.')
      return
    }
    saveMutation.mutate(form)
  }

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (isEdit && loadingSale) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const backTo = isEdit ? `/sales/${id}` : '/sales'
  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? 'Back to Sale' : 'Back to Sales'}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit Sale' : 'New Sale'}
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Sale Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputCls}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className={inputCls}
                maxLength={50}
              />
            </div>
            <div>
              <label className={labelCls}>Sale Type</label>
              <input
                type="text"
                value={form.saleType}
                onChange={(e) => set('saleType', e.target.value)}
                className={inputCls}
                maxLength={5}
              />
            </div>
            <div>
              <label className={labelCls}>Sale Info</label>
              <input
                type="text"
                value={form.saleInfo}
                onChange={(e) => set('saleInfo', e.target.value)}
                className={inputCls}
                maxLength={5}
              />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <input
                type="number"
                value={form.department}
                onChange={(e) => set('department', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Payment Type</label>
              <input
                type="text"
                value={form.paymentType}
                onChange={(e) => set('paymentType', e.target.value)}
                className={inputCls}
                maxLength={5}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Part & Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Part Code</label>
              <input
                type="text"
                value={form.partCode}
                onChange={(e) => set('partCode', e.target.value.toUpperCase())}
                className={inputCls}
                maxLength={25}
              />
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                step="0.01"
                value={form.qty}
                onChange={(e) => set('qty', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => set('cost', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>List Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.listPrice}
                  onChange={(e) => set('listPrice', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 self-end rounded-lg bg-slate-50 px-4 py-2.5">
              <input
                type="checkbox"
                id="isTaxable"
                checked={form.isTaxable}
                onChange={(e) => set('isTaxable', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isTaxable" className="text-sm font-medium text-slate-700">
                Taxable
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Supplier</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Supplier Invoice</label>
              <input
                type="text"
                value={form.supplierInvoice}
                onChange={(e) => set('supplierInvoice', e.target.value)}
                className={inputCls}
                maxLength={10}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link
            to={backTo}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create Sale'}
          </button>
        </div>
      </form>
    </div>
  )
}
