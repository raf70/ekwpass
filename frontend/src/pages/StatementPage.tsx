import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer } from 'lucide-react'
import { getCustomerStatement } from '@/api/customers'

function fmt$(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA')
}

export default function StatementPage() {
  const { id } = useParams<{ id: string }>()

  const { data: stmt, isLoading } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => getCustomerStatement(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!stmt) {
    return <div className="py-16 text-center text-slate-500">Statement not found.</div>
  }

  let runningBalance = 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="flex justify-between border-b pb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{stmt.shopName}</h1>
            {stmt.shopAddress && <p className="text-sm text-slate-600">{stmt.shopAddress}</p>}
            <p className="text-sm text-slate-600">
              {[stmt.shopCity, stmt.shopProvince, stmt.shopPostalCode].filter(Boolean).join(', ')}
            </p>
            {stmt.shopPhone && <p className="text-sm text-slate-600">Tel: {stmt.shopPhone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-900">STATEMENT</h2>
            <p className="text-sm text-slate-600">Date: {fmtDate(stmt.statementDate)}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mt-6 mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Bill To</p>
          <p className="font-medium text-slate-900">{stmt.customerName}</p>
          {stmt.customerStreet && <p className="text-sm text-slate-600">{stmt.customerStreet}</p>}
          <p className="text-sm text-slate-600">
            {[stmt.customerCity, stmt.customerProvince, stmt.customerPostalCode].filter(Boolean).join(', ')}
          </p>
          {stmt.customerPhone && <p className="text-sm text-slate-600">Tel: {stmt.customerPhone}</p>}
        </div>

        {/* Transactions */}
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 font-medium text-slate-500">Date</th>
              <th className="py-2 pr-4 font-medium text-slate-500">Description</th>
              <th className="py-2 pr-4 text-right font-medium text-slate-500">Charges</th>
              <th className="py-2 pr-4 text-right font-medium text-slate-500">Payments</th>
              <th className="py-2 text-right font-medium text-slate-500">Balance</th>
            </tr>
          </thead>
          <tbody>
            {[...stmt.transactions].reverse().map((t) => {
              if (t.crDr === 'DR') {
                runningBalance += t.amount
              } else {
                runningBalance -= t.amount
              }
              return (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">{fmtDate(t.date)}</td>
                  <td className="py-2 pr-4 text-slate-700">{t.description}</td>
                  <td className="py-2 pr-4 text-right text-slate-700">
                    {t.crDr === 'DR' ? fmt$(t.amount) : ''}
                  </td>
                  <td className="py-2 pr-4 text-right text-green-700">
                    {t.crDr === 'CR' ? fmt$(t.amount) : ''}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-900">{fmt$(runningBalance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Aging Summary */}
        <div className="mt-8 border-t pt-6">
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { label: 'Current', value: stmt.arCurrent },
              { label: '30 Days', value: stmt.ar30 },
              { label: '60 Days', value: stmt.ar60 },
              { label: '90+ Days', value: stmt.ar90 },
              { label: 'Total Due', value: stmt.arBalance },
            ].map((b) => (
              <div key={b.label} className="rounded-lg border p-3">
                <p className="text-xs font-medium text-slate-500">{b.label}</p>
                <p className={`mt-1 text-sm font-bold ${b.value > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {fmt$(b.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t pt-4 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Amount Due: {fmt$(stmt.arBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Please remit payment within 30 days. Thank you for your business.
          </p>
        </div>
      </div>
    </div>
  )
}
