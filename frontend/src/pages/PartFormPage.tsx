import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { getPart, createPart, updatePart } from '@/api/parts'
import { getLookupCodes } from '@/api/lookupCodes'

interface FormData {
  code: string
  manufacturer: string
  altCodeA: string
  altMfgrA: string
  altCodeB: string
  altMfgrB: string
  description: string
  department: number
  location: string
  qtyOnHand: number
  sellPrice: number
  listPrice: number
  wholesalePrice: number
  avgPrice: number
  coreValue: number
  reorderQty: number
  reorderAmount: number
  discount1: number
  discount2: number
  discount3: number
  noUpdate: boolean
}

const emptyForm: FormData = {
  code: '',
  manufacturer: '',
  altCodeA: '',
  altMfgrA: '',
  altCodeB: '',
  altMfgrB: '',
  description: '',
  department: 0,
  location: '',
  qtyOnHand: 0,
  sellPrice: 0,
  listPrice: 0,
  wholesalePrice: 0,
  avgPrice: 0,
  coreValue: 0,
  reorderQty: 0,
  reorderAmount: 0,
  discount1: 0,
  discount2: 0,
  discount3: 0,
  noUpdate: false,
}

export default function PartFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [error, setError] = useState('')

  const { data: departments } = useQuery({
    queryKey: ['lookup-codes', 'D'],
    queryFn: () => getLookupCodes('D'),
  })

  const { data: part, isLoading: loadingPart } = useQuery({
    queryKey: ['part', id],
    queryFn: () => getPart(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (part) {
      setForm({
        code: part.code,
        manufacturer: part.manufacturer,
        altCodeA: part.altCodeA,
        altMfgrA: part.altMfgrA,
        altCodeB: part.altCodeB,
        altMfgrB: part.altMfgrB,
        description: part.description,
        department: part.department,
        location: part.location,
        qtyOnHand: part.qtyOnHand,
        sellPrice: part.sellPrice,
        listPrice: part.listPrice,
        wholesalePrice: part.wholesalePrice,
        avgPrice: part.avgPrice,
        coreValue: part.coreValue,
        reorderQty: part.reorderQty,
        reorderAmount: part.reorderAmount,
        discount1: part.discount1,
        discount2: part.discount2,
        discount3: part.discount3,
        noUpdate: part.noUpdate,
      })
    }
  }, [part])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updatePart(id!, { ...data, updatedAt: part?.updatedAt }) : createPart(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['part', id] })
      }
      navigate(`/parts/${saved.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to save part. Please check the form and try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) {
      setError('Part number is required.')
      return
    }
    saveMutation.mutate(form)
  }

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (isEdit && loadingPart) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const backTo = isEdit ? `/parts/${id}` : '/parts'
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
        {isEdit ? 'Back to Part' : 'Back to Parts'}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit Part' : 'New Part'}
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Part Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Part Number <span className="text-red-500">*</span>
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
              <label className={labelCls}>Manufacturer</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => set('manufacturer', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select
                value={form.department}
                onChange={(e) => set('department', parseInt(e.target.value) || 0)}
                className={inputCls}
              >
                <option value={0}>— Select —</option>
                {(departments ?? []).filter(d => d.description.trim()).map((d) => (
                  <option key={d.keyValue} value={d.keyValue}>
                    {d.keyValue} — {d.description.trim()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Alternate Parts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Alt Code A</label>
              <input
                type="text"
                value={form.altCodeA}
                onChange={(e) => set('altCodeA', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Alt Manufacturer A</label>
              <input
                type="text"
                value={form.altMfgrA}
                onChange={(e) => set('altMfgrA', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Alt Code B</label>
              <input
                type="text"
                value={form.altCodeB}
                onChange={(e) => set('altCodeB', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Alt Manufacturer B</label>
              <input
                type="text"
                value={form.altMfgrB}
                onChange={(e) => set('altMfgrB', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Sell Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sellPrice}
                  onChange={(e) => set('sellPrice', parseFloat(e.target.value) || 0)}
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
                  min="0"
                  value={form.listPrice}
                  onChange={(e) => set('listPrice', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Wholesale Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.wholesalePrice}
                  onChange={(e) => set('wholesalePrice', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Average Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.avgPrice}
                  onChange={(e) => set('avgPrice', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Core Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.coreValue}
                  onChange={(e) => set('coreValue', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Discounts</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Discount 1 (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.discount1}
                onChange={(e) => set('discount1', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Discount 2 (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.discount2}
                onChange={(e) => set('discount2', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Discount 3 (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.discount3}
                onChange={(e) => set('discount3', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Inventory</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Quantity on Hand</label>
              <input
                type="number"
                step="1"
                value={form.qtyOnHand}
                onChange={(e) => set('qtyOnHand', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reorder Qty</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.reorderQty}
                onChange={(e) => set('reorderQty', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reorder Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.reorderAmount}
                  onChange={(e) => set('reorderAmount', parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              id="noUpdate"
              checked={form.noUpdate}
              onChange={(e) => set('noUpdate', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="noUpdate" className="text-sm font-medium text-slate-700">
              No auto-update (prevent automatic pricing/inventory changes)
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
            {isEdit ? 'Save Changes' : 'Create Part'}
          </button>
        </div>
      </form>
    </div>
  )
}
