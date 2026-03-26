import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { getSupplier, createSupplier, updateSupplier } from '@/api/suppliers'

interface FormData {
  code: string
  name: string
  address1: string
  address2: string
  city: string
  province: string
  postalCode: string
  country: string
  phone1: string
  phone2: string
  gstNumber: string
  remark1: string
  remark2: string
  balance: number
  openingBalance: number
  isActive: boolean
  pstGstFlag: string
}

const emptyForm: FormData = {
  code: '',
  name: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  postalCode: '',
  country: '',
  phone1: '',
  phone2: '',
  gstNumber: '',
  remark1: '',
  remark2: '',
  balance: 0,
  openingBalance: 0,
  isActive: true,
  pstGstFlag: '',
}

export default function SupplierFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [error, setError] = useState('')

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (supplier) {
      setForm({
        code: supplier.code,
        name: supplier.name,
        address1: supplier.address1,
        address2: supplier.address2,
        city: supplier.city,
        province: supplier.province,
        postalCode: supplier.postalCode,
        country: supplier.country,
        phone1: supplier.phone1,
        phone2: supplier.phone2,
        gstNumber: supplier.gstNumber,
        remark1: supplier.remark1,
        remark2: supplier.remark2,
        balance: supplier.balance,
        openingBalance: supplier.openingBalance,
        isActive: supplier.isActive,
        pstGstFlag: supplier.pstGstFlag,
      })
    }
  }, [supplier])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updateSupplier(id!, { ...data, updatedAt: supplier?.updatedAt }) : createSupplier(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['supplier', id] })
      }
      navigate(`/suppliers/${saved.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to save supplier. Please check the form and try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) {
      setError('Supplier code is required.')
      return
    }
    if (!form.name.trim()) {
      setError('Supplier name is required.')
      return
    }
    saveMutation.mutate(form)
  }

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (isEdit && loadingSupplier) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const backTo = isEdit ? `/suppliers/${id}` : '/suppliers'
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
        {isEdit ? 'Back to Supplier' : 'Back to Suppliers'}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit Supplier' : 'New Supplier'}
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Supplier Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Phone (Primary)</label>
              <input
                type="text"
                value={form.phone1}
                onChange={(e) => set('phone1', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone (Secondary)</label>
              <input
                type="text"
                value={form.phone2}
                onChange={(e) => set('phone2', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Address Line 1</label>
              <input
                type="text"
                value={form.address1}
                onChange={(e) => set('address1', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address Line 2</label>
              <input
                type="text"
                value={form.address2}
                onChange={(e) => set('address2', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Province</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => set('province', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Postal Code</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => set('postalCode', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Tax & Financial</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>GST Number</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => set('gstNumber', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>PST/GST Flag</label>
              <input
                type="text"
                value={form.pstGstFlag}
                onChange={(e) => set('pstGstFlag', e.target.value)}
                className={inputCls}
              />
            </div>
            <div />
            <div>
              <label className={labelCls}>Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => set('balance', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Opening Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(e) => set('openingBalance', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Remarks</h2>
          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <label className={labelCls}>Remark 1</label>
              <input
                type="text"
                value={form.remark1}
                onChange={(e) => set('remark1', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Remark 2</label>
              <input
                type="text"
                value={form.remark2}
                onChange={(e) => set('remark2', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active supplier
            </label>
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
            {isEdit ? 'Save Changes' : 'Create Supplier'}
          </button>
        </div>
      </form>
    </div>
  )
}
