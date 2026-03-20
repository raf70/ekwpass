import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { getCustomer, createCustomer, updateCustomer } from '@/api/customers'
import type { Customer } from '@/types'

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

type FormData = Omit<Customer, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'lastServiceDate' | 'ytdSales' | 'ytdGst' | 'arBalance' | 'arCurrent' | 'ar30' | 'ar60' | 'ar90' | 'arStmtBalance' | 'arStmtFlag'>

const emptyForm: FormData = {
  name: '',
  phone: '',
  phoneSecondary: '',
  street: '',
  city: '',
  province: 'ON',
  postalCode: '',
  attention: '',
  creditLimit: 0,
  pstExempt: false,
  pstNumber: '',
  gstExempt: false,
  gstNumber: '',
  isWholesale: false,
  priceClass: '',
  remarks: '',
  gender: '',
  category1: '',
  category2: '',
}

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [error, setError] = useState('')

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        phoneSecondary: customer.phoneSecondary,
        street: customer.street,
        city: customer.city,
        province: customer.province || 'ON',
        postalCode: customer.postalCode,
        attention: customer.attention,
        creditLimit: customer.creditLimit,
        pstExempt: customer.pstExempt,
        pstNumber: customer.pstNumber,
        gstExempt: customer.gstExempt,
        gstNumber: customer.gstNumber,
        isWholesale: customer.isWholesale,
        priceClass: customer.priceClass,
        remarks: customer.remarks,
        gender: customer.gender,
        category1: customer.category1,
        category2: customer.category2,
      })
    }
  }, [customer])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updateCustomer(id!, data) : createCustomer(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['customer', id] })
      }
      navigate(`/customers/${saved.id}`)
    },
    onError: () => {
      setError('Failed to save customer. Please check the form and try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Customer name is required.')
      return
    }
    saveMutation.mutate(form)
  }

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (isEdit && loadingCustomer) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const backTo = isEdit ? `/customers/${id}` : '/customers'

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? 'Back to Customer' : 'Back to Customers'}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit Customer' : 'New Customer'}
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contact Information */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Contact Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Secondary Phone</label>
              <input
                type="tel"
                value={form.phoneSecondary}
                onChange={(e) => set('phoneSecondary', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Street Address</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => set('street', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">—</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Postal Code</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => set('postalCode', e.target.value.toUpperCase())}
                  placeholder="A1A 1A1"
                  maxLength={7}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Attention</label>
              <input
                type="text"
                value={form.attention}
                onChange={(e) => set('attention', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </section>

        {/* Tax & Pricing */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Tax & Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                id="pstExempt"
                checked={form.pstExempt}
                onChange={(e) => set('pstExempt', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="pstExempt" className="text-sm font-medium text-slate-700">PST Exempt</label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">PST Number</label>
              <input
                type="text"
                value={form.pstNumber}
                onChange={(e) => set('pstNumber', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                id="gstExempt"
                checked={form.gstExempt}
                onChange={(e) => set('gstExempt', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="gstExempt" className="text-sm font-medium text-slate-700">GST Exempt</label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => set('gstNumber', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                id="isWholesale"
                checked={form.isWholesale}
                onChange={(e) => set('isWholesale', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isWholesale" className="text-sm font-medium text-slate-700">Wholesale Customer</label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Price Class</label>
              <input
                type="text"
                value={form.priceClass}
                onChange={(e) => set('priceClass', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Credit Limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.creditLimit}
                  onChange={(e) => set('creditLimit', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Additional Details */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Additional Details</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category 1</label>
              <input
                type="text"
                value={form.category1}
                onChange={(e) => set('category1', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category 2</label>
              <input
                type="text"
                value={form.category2}
                onChange={(e) => set('category2', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </section>

        {/* Actions */}
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
            {isEdit ? 'Save Changes' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}
