import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Check } from 'lucide-react'
import { getSettings, updateSettings, type ShopSettings } from '@/api/settings'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ShopSettings | null>(null)
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form!),
    onSuccess: (updated) => {
      setForm(updated)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function set<K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  if (isLoading || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Shop Settings</h1>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      {saveMutation.isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to save settings. Please try again.
        </div>
      )}

      <div className="space-y-6">
        {/* Tax Rates */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Tax Rates</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GST/HST Number" hint="Federal tax registration number">
              <input type="text" value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value)} className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Toggle label="Use HST (combined tax)" checked={form.useHst} onChange={(v) => set('useHst', v)} />
            </div>
            <Field label="Federal Tax Rate (%)" hint="GST or federal portion of HST">
              <input type="number" step="0.001" min="0" value={form.federalTaxRate} onChange={(e) => set('federalTaxRate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
            <Field label="Provincial Tax Rate (%)" hint="PST — set to 0 if using HST">
              <input type="number" step="0.001" min="0" value={form.provincialTaxRate} onChange={(e) => set('provincialTaxRate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* Shop Supplies & Fees */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Shop Supplies &amp; Fees</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop Supplies Rate (%)" hint="Applied as percentage of labour">
              <input type="number" step="0.01" min="0" value={form.shopSuppliesRate} onChange={(e) => set('shopSuppliesRate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Toggle label="Shop supplies are taxable" checked={form.shopSuppliesTaxable} onChange={(v) => set('shopSuppliesTaxable', v)} />
            </div>
            <Field label="Doc / Environmental Fee ($)" hint="Flat fee added to each work order">
              <input type="number" step="0.01" min="0" value={form.docRate} onChange={(e) => set('docRate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
            <Field label="Shop Rate ($/hr)" hint="Default hourly labour rate">
              <input type="number" step="0.01" min="0" value={form.shopRate} onChange={(e) => set('shopRate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* Accounts Receivable */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Accounts Receivable</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="AR Interest Rate (%)" hint="Monthly rate applied to overdue balances (30+ days)">
              <input type="number" step="0.01" min="0" value={form.arInterestRate} onChange={(e) => set('arInterestRate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
            <div className="flex items-end">
              <Toggle label="Delay AR processing" checked={form.arDelayProcessing} onChange={(v) => set('arDelayProcessing', v)} />
            </div>
          </div>
        </section>

        {/* Defaults */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Defaults</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default City">
              <input type="text" value={form.defaultCity} onChange={(e) => set('defaultCity', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Default Province">
              <input type="text" value={form.defaultProvince} onChange={(e) => set('defaultProvince', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Default Comment" hint="Pre-filled on new work orders">
              <input type="text" value={form.defaultComment} onChange={(e) => set('defaultComment', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Reminder Interval (days)" hint="Service reminder period for vehicles">
              <input type="number" min="0" value={form.reminderIntervalDays} onChange={(e) => set('reminderIntervalDays', parseInt(e.target.value) || 0)} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* Payment Types */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Payment Types</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {([1, 2, 3, 4, 5] as const).map((n) => {
              const key = `paymentType${n}` as keyof ShopSettings
              return (
                <Field key={n} label={`Type ${n}`}>
                  <input type="text" value={form[key] as string} onChange={(e) => set(key, e.target.value as never)} className={inputClass} />
                </Field>
              )
            })}
          </div>
        </section>

        {/* Print Options */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Print / Invoice Options</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Print technician detail on invoice" checked={form.printTechDetail} onChange={(v) => set('printTechDetail', v)} />
            <Toggle label="Print hours on invoice" checked={form.printInvoiceHours} onChange={(v) => set('printInvoiceHours', v)} />
            <Toggle label="Print supplier info on invoice" checked={form.printInvoiceSupplier} onChange={(v) => set('printInvoiceSupplier', v)} />
            <Toggle label="Supplier processing enabled" checked={form.supplierProcessing} onChange={(v) => set('supplierProcessing', v)} />
            <Toggle label="Core add-on enabled" checked={form.coreAddOn} onChange={(v) => set('coreAddOn', v)} />
          </div>
        </section>

        {/* Numbering (read-only info) */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Numbering</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Next Invoice #</p>
              <p className="text-lg font-semibold text-slate-900">{form.nextInvoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Next Sale #</p>
              <p className="text-lg font-semibold text-slate-900">{form.nextSaleNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Next Ref #</p>
              <p className="text-lg font-semibold text-slate-900">{form.nextRefNumber}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
