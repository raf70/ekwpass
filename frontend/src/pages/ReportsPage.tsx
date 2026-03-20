import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Users, ClipboardList, BarChart3, DollarSign, RefreshCw, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getCustomerReport,
  getWorkOrderReport,
  getSummaryReport,
  getARAgingReport,
  processARAging,
  applyARInterest,
  generateStatements,
  type CustomerReportRow,
  type WorkOrderReportRow,
  type SummaryReport,
} from '@/api/reports'

const TABS = [
  { id: 'customers', label: 'Customer Report', icon: Users },
  { id: 'work-orders', label: 'Work Order Report', icon: ClipboardList },
  { id: 'summary', label: 'Summary Report', icon: BarChart3 },
  { id: 'ar-aging', label: 'AR Aging', icon: DollarSign },
] as const

type TabId = (typeof TABS)[number]['id']

function fmt$(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA')
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
    voided: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

// ─── Customer Report ─────────────────────────────────────────

function CustomerReport() {
  const [arOnly, setArOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['report-customers', arOnly],
    queryFn: () => getCustomerReport(arOnly),
  })

  const rows: CustomerReportRow[] = data ?? []
  const totalAR = rows.reduce((s, r) => s + r.arBalance, 0)
  const totalYTD = rows.reduce((s, r) => s + r.ytdSales, 0)

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={arOnly}
            onChange={(e) => setArOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Only show customers with AR balance
        </label>
        <span className="ml-auto text-sm text-slate-500">{rows.length} customer(s)</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 font-medium text-slate-500">Phone</th>
                <th className="px-4 py-3 font-medium text-slate-500">City</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Current</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">30 Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">60 Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">90 Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">YTD Sales</th>
                <th className="px-4 py-3 font-medium text-slate-500">Last Service</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-400">No data</td></tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.city || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.arCurrent)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.ar30)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.ar60)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.ar90)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${r.arBalance > 0 ? 'text-red-600' : 'text-slate-900'}`}>{fmt$(r.arBalance)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(r.ytdSales)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.lastServiceDate)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td colSpan={7} className="px-4 py-2.5 text-slate-700">Totals</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(totalAR)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(totalYTD)}</td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Work Order Report ────────────────────────────────────────

function WorkOrderReport() {
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['report-work-orders', status, from, to],
    queryFn: () => getWorkOrderReport({ status: status || undefined, from: from || undefined, to: to || undefined }),
  })

  const rows: WorkOrderReportRow[] = data ?? []
  const totalJobs = rows.reduce((s, r) => s + r.jobsTotal, 0)
  const totalParts = rows.reduce((s, r) => s + r.partsTotal, 0)
  const totalTax = rows.reduce((s, r) => s + r.totalTax, 0)
  const grandTotal = rows.reduce((s, r) => s + r.grandTotal, 0)

  const inputClass = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
        <span className="ml-auto text-sm text-slate-500">{rows.length} order(s)</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-500">Invoice #</th>
                <th className="px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
                <th className="px-4 py-3 font-medium text-slate-500">Vehicle</th>
                <th className="px-4 py-3 font-medium text-slate-500">Plate</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Labour</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Parts</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Tax</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-400">No data</td></tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-sm font-medium text-slate-900">{r.invoiceNumber}</td>
                      <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.date)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-2.5 text-slate-900">{r.customerName || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.vehicleDesc || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.vehiclePlate || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.jobsTotal)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.partsTotal)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.totalTax)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">{fmt$(r.grandTotal)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td colSpan={6} className="px-4 py-2.5 text-slate-700">Totals</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(totalJobs)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(totalParts)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(totalTax)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(grandTotal)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Summary Report ──────────────────────────────────────────

function SummaryReportTab() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['report-summary', from, to],
    queryFn: () => getSummaryReport({ from: from || undefined, to: to || undefined }),
  })

  const inputClass = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

  function Row({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
    return (
      <div className="flex justify-between border-b border-slate-100 py-2.5 last:border-0">
        <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</span>
        <span className={`text-sm ${bold ? 'font-bold text-slate-900' : 'font-medium text-slate-900'}`}>
          {typeof value === 'number' ? fmt$(value) : value}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : !data ? (
        <p className="text-sm text-slate-400">No data</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order Counts */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Order Counts</h3>
            <Row label="Total Orders" value={data.totalOrders.toString()} />
            <Row label="Open" value={data.openOrders.toString()} />
            <Row label="Closed" value={data.closedOrders.toString()} />
            <Row label="Voided" value={data.voidedOrders.toString()} />
          </section>

          {/* Revenue */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Revenue</h3>
            <Row label="Labour (taxable)" value={data.jobsTaxable} />
            <Row label="Labour (non-taxable)" value={data.jobsNontaxable} />
            <Row label="Parts (taxable)" value={data.partsTaxable} />
            <Row label="Parts (non-taxable)" value={data.partsNontaxable} />
            <Row label="Shop Supplies" value={data.shopSupplies} />
          </section>

          {/* Taxes */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Taxes</h3>
            <Row label="PST Collected" value={data.totalPst} />
            <Row label="GST Collected" value={data.totalGst} />
            <Row label="Total Tax" value={data.totalTax} bold />
          </section>

          {/* Grand Total */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Total</h3>
            <Row label="Subtotal (before tax)" value={data.grandTotal - data.totalTax} />
            <Row label="Tax" value={data.totalTax} />
            <div className="mt-2 border-t-2 border-slate-300 pt-2">
              <Row label="Grand Total" value={data.grandTotal} bold />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

// ─── AR Aging Report ─────────────────────────────────────────

function ARAgingReport() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['report-ar-aging'],
    queryFn: () => getARAgingReport(),
  })

  const agingMutation = useMutation({
    mutationFn: processARAging,
    onSuccess: (result) => {
      setStatusMsg({ text: `Aging processed for ${result.customersProcessed} customer(s).`, ok: true })
      queryClient.invalidateQueries({ queryKey: ['report-ar-aging'] })
    },
    onError: () => {
      setStatusMsg({ text: 'Failed to process aging. Please try again.', ok: false })
    },
  })

  const interestMutation = useMutation({
    mutationFn: applyARInterest,
    onSuccess: (result) => {
      if (result.customersCharged === 0) {
        setStatusMsg({ text: 'No interest applied — either no overdue balances or interest rate is 0%.', ok: true })
      } else {
        setStatusMsg({ text: `Interest charged to ${result.customersCharged} customer(s).`, ok: true })
      }
      queryClient.invalidateQueries({ queryKey: ['report-ar-aging'] })
    },
    onError: () => {
      setStatusMsg({ text: 'Failed to apply interest. Please try again.', ok: false })
    },
  })

  function handleRunAging() {
    if (window.confirm('Run aging bucket processing? This will recalculate Current / 30 / 60 / 90+ day buckets for all customers based on their AR transaction dates.')) {
      setStatusMsg(null)
      agingMutation.mutate()
    }
  }

  const stmtMutation = useMutation({
    mutationFn: generateStatements,
    onSuccess: (result) => {
      setStatusMsg({ text: `Statements generated for ${result.statementsGenerated} customer(s).`, ok: true })
      queryClient.invalidateQueries({ queryKey: ['report-ar-aging'] })
    },
    onError: () => {
      setStatusMsg({ text: 'Failed to generate statements. Please try again.', ok: false })
    },
  })

  function handleApplyInterest() {
    if (window.confirm('Apply interest charges to all customers with overdue balances (30+ days)? The interest rate from Shop Settings will be used.')) {
      setStatusMsg(null)
      interestMutation.mutate()
    }
  }

  function handleGenerateStatements() {
    if (window.confirm('Mark statements for all customers with outstanding AR balances? This updates their statement balance and flag.')) {
      setStatusMsg(null)
      stmtMutation.mutate()
    }
  }

  const busy = agingMutation.isPending || interestMutation.isPending || stmtMutation.isPending

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          {statusMsg && (
            <span className={statusMsg.ok ? 'text-green-600' : 'text-red-600'}>
              {statusMsg.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAging}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {agingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Run Aging
          </button>
          <button
            onClick={handleApplyInterest}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            {interestMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            Apply Interest
          </button>
          <button
            onClick={handleGenerateStatements}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {stmtMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Generate Statements
          </button>
        </div>
      </div>

      {data && (
        <div className="mb-4 grid gap-3 sm:grid-cols-5">
          {[
            { label: 'Current', value: data.totalCurrent },
            { label: '30 Days', value: data.total30 },
            { label: '60 Days', value: data.total60 },
            { label: '90+ Days', value: data.total90 },
            { label: 'Total AR', value: data.grandTotal },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={`mt-1 text-lg font-bold ${s.value > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {fmt$(s.value)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
                <th className="px-4 py-3 font-medium text-slate-500">Phone</th>
                <th className="px-4 py-3 font-medium text-slate-500">City</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Current</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">30 Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">60 Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">90+ Days</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr>
              ) : !data || data.rows.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">No outstanding AR balances</td></tr>
              ) : (
                <>
                  {data.rows.map((r) => (
                    <tr
                      key={r.customerId}
                      onClick={() => navigate(`/customers/${r.customerId}`)}
                      className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.customerName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.city || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{fmt$(r.current)}</td>
                      <td className={`px-4 py-2.5 text-right ${r.days30 > 0 ? 'text-amber-600' : 'text-slate-600'}`}>{fmt$(r.days30)}</td>
                      <td className={`px-4 py-2.5 text-right ${r.days60 > 0 ? 'text-orange-600' : 'text-slate-600'}`}>{fmt$(r.days60)}</td>
                      <td className={`px-4 py-2.5 text-right ${r.days90 > 0 ? 'font-medium text-red-600' : 'text-slate-600'}`}>{fmt$(r.days90)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${r.total > 0 ? 'text-red-600' : 'text-slate-900'}`}>{fmt$(r.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2.5 text-slate-700">{data.customerCount} customer(s)</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(data.totalCurrent)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(data.total30)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(data.total60)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(data.total90)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">{fmt$(data.grandTotal)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Reports Page ───────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('customers')

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Reports</h1>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'customers' && <CustomerReport />}
      {tab === 'work-orders' && <WorkOrderReport />}
      {tab === 'summary' && <SummaryReportTab />}
      {tab === 'ar-aging' && <ARAgingReport />}
    </div>
  )
}
