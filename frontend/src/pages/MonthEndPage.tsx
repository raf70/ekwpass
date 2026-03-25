import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Loader2, Play, CheckCircle2, AlertTriangle,
  Users, DollarSign, FileText, ArrowRight,
} from 'lucide-react'
import { getMonthEndPreview, runMonthEnd, type MonthEndResult } from '@/api/monthEnd'

function fmt$(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

export default function MonthEndPage() {
  const queryClient = useQueryClient()
  const [result, setResult] = useState<MonthEndResult | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: preview, isLoading } = useQuery({
    queryKey: ['month-end-preview'],
    queryFn: getMonthEndPreview,
  })

  const processMutation = useMutation({
    mutationFn: runMonthEnd,
    onSuccess: (data) => {
      setResult(data)
      setShowConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['month-end-preview'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  if (isLoading || !preview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Month-End Processing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Process AR aging, apply interest charges, generate statements, and advance the system month.
        </p>
      </div>

      {/* Results */}
      {result && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            Month-End Complete
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">AR Aging</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{result.agingProcessed}</p>
              <p className="text-sm text-slate-500">customers processed</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Interest Charges</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{result.interestCharged}</p>
              <p className="text-sm text-slate-500">charges applied</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Statements</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{result.statementsGenerated}</p>
              <p className="text-sm text-slate-500">statements generated</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">New Period</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{result.newMonthName}</p>
              <p className="text-sm text-slate-500">system month advanced</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Period */}
      <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Calendar className="h-4 w-4 text-slate-400" />
          Current Period
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100">
            <span className="text-2xl font-bold text-blue-700">{preview.systemMonth}</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{preview.monthName}</p>
            <p className="text-sm text-slate-500">
              Processing will close this month and advance to the next period
            </p>
          </div>
        </div>
      </section>

      {/* Preview Summary */}
      <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Processing Summary</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
            <Users className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">AR Aging</p>
                <span className="text-sm font-semibold text-slate-700">{preview.totalARCustomers} customers</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Recompute aging buckets (current, 30, 60, 90 days) for all customers with AR balances
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
            <DollarSign className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">Interest Charges</p>
                <span className="text-sm font-semibold text-slate-700">
                  {preview.arInterestRate > 0
                    ? `${preview.arInterestRate}% on ${preview.overdueCustomers} overdue`
                    : 'Disabled (rate is 0%)'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Apply interest on balances overdue 30+ days
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
            <FileText className="mt-0.5 h-5 w-5 text-green-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">Statements</p>
                <span className="text-sm font-semibold text-slate-700">{preview.totalARCustomers} to generate</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Snapshot current AR balances for statement printing
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
            <ArrowRight className="mt-0.5 h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">Advance Period</p>
                <span className="text-sm font-semibold text-slate-700">
                  {preview.monthName} &rarr; {preview.systemMonth === 12 ? 'January' : ''}
                  {preview.systemMonth < 12 &&
                    ['', 'February', 'March', 'April', 'May', 'June', 'July',
                     'August', 'September', 'October', 'November', 'December'][preview.systemMonth + 1]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Move system month forward to the next period
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action */}
      {!showConfirm ? (
        <div className="flex justify-end">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={processMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run Month-End Processing
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Confirm Month-End Processing</h3>
              <p className="mt-1 text-sm text-amber-800">
                This will process AR aging, apply interest charges to overdue accounts,
                generate statements, and advance the system month from{' '}
                <strong>{preview.monthName}</strong> to the next period.
                This action cannot be easily undone.
              </p>
              {processMutation.isError && (
                <p className="mt-2 text-sm font-medium text-red-700">
                  Processing failed. Please try again or check the server logs.
                </p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => processMutation.mutate()}
                  disabled={processMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {processMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm &amp; Process
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={processMutation.isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
