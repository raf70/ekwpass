import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer } from 'lucide-react'
import { getWorkOrder, getShopInfo } from '@/api/workOrders'
import { getWorkOrderLines, type WorkOrderLine } from '@/api/workOrderLines'

function fmt$(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA')
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()

  const { data: shop } = useQuery({ queryKey: ['shop-info'], queryFn: getShopInfo })
  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => getWorkOrder(id!),
    enabled: !!id,
  })
  const { data: lines } = useQuery({
    queryKey: ['work-order-lines', id],
    queryFn: () => getWorkOrderLines(id!),
    enabled: !!id,
  })

  if (isLoading || !wo) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const partLines = (lines ?? []).filter((l) => l.lineType === 'part')
  const jobLines = (lines ?? []).filter((l) => l.lineType === 'job')

  const jobsTotal = wo.jobsTaxable + wo.jobsNontaxable
  const partsTotal = wo.partsTaxable + wo.partsNontaxable
  const subtotal = jobsTotal + partsTotal + wo.shopSuppliesAmt
  const grandTotal = subtotal + wo.totalTax

  const vehicleLabel = [wo.vehicleYear ? String(wo.vehicleYear) : '', wo.vehicleMake, wo.vehicleModel]
    .filter(Boolean)
    .join(' ')

  function lineTotal(l: WorkOrderLine) {
    return l.qty * l.price
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print Invoice
        </button>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="flex justify-between border-b pb-6">
          <div>
            {shop && (
              <>
                <h1 className="text-xl font-bold text-slate-900">{shop.name}</h1>
                {shop.address && <p className="text-sm text-slate-600">{shop.address}</p>}
                <p className="text-sm text-slate-600">
                  {[shop.city, shop.province, shop.postalCode].filter(Boolean).join(', ')}
                </p>
                {shop.phone && <p className="text-sm text-slate-600">Tel: {shop.phone}</p>}
                {shop.gstNumber && <p className="text-sm text-slate-600">GST#: {shop.gstNumber}</p>}
              </>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-900">INVOICE</h2>
            <p className="mt-1 text-sm text-slate-600">Invoice #: <span className="font-semibold text-slate-900">{wo.invoiceNumber}</span></p>
            <p className="text-sm text-slate-600">Date: {fmtDate(wo.date)}</p>
            <p className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                wo.status === 'closed' ? 'bg-green-100 text-green-800' :
                wo.status === 'voided' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {wo.status}
              </span>
            </p>
          </div>
        </div>

        {/* Customer & Vehicle */}
        <div className="mt-6 mb-6 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Bill To</p>
            <p className="font-medium text-slate-900">{wo.customerName || '—'}</p>
            {wo.customerPhone && <p className="text-sm text-slate-600">Tel: {wo.customerPhone}</p>}
            {wo.customerPhoneSecondary && <p className="text-sm text-slate-600">Alt: {wo.customerPhoneSecondary}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</p>
            <p className="font-medium text-slate-900">{vehicleLabel || '—'}</p>
            {wo.vehiclePlate && <p className="text-sm text-slate-600">Plate: {wo.vehiclePlate}</p>}
            {wo.vehicleVin && <p className="text-sm text-slate-600">VIN: {wo.vehicleVin}</p>}
            {wo.vehicleOdometer > 0 && <p className="text-sm text-slate-600">Odometer: {wo.vehicleOdometer.toLocaleString()} km</p>}
          </div>
        </div>

        {/* Labour */}
        {jobLines.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Labour</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left font-medium text-slate-500">Description</th>
                  <th className="py-2 text-right font-medium text-slate-500">Qty</th>
                  <th className="py-2 text-right font-medium text-slate-500">Rate</th>
                  <th className="py-2 text-right font-medium text-slate-500">Amount</th>
                  <th className="py-2 text-center font-medium text-slate-500">Tax</th>
                </tr>
              </thead>
              <tbody>
                {jobLines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{l.description}</td>
                    <td className="py-2 text-right text-slate-600">{l.qty}</td>
                    <td className="py-2 text-right text-slate-600">{fmt$(l.price)}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{fmt$(lineTotal(l))}</td>
                    <td className="py-2 text-center text-slate-500">{l.isTaxable ? 'T' : ''}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={3} className="py-2 text-right font-semibold text-slate-700">Labour Subtotal</td>
                  <td className="py-2 text-right font-semibold text-slate-900">{fmt$(jobsTotal)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Parts */}
        {partLines.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Parts</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left font-medium text-slate-500">Part #</th>
                  <th className="py-2 text-left font-medium text-slate-500">Description</th>
                  <th className="py-2 text-right font-medium text-slate-500">Qty</th>
                  <th className="py-2 text-right font-medium text-slate-500">Price</th>
                  <th className="py-2 text-right font-medium text-slate-500">Amount</th>
                  <th className="py-2 text-center font-medium text-slate-500">Tax</th>
                </tr>
              </thead>
              <tbody>
                {partLines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-500">{l.partCode || '—'}</td>
                    <td className="py-2 text-slate-700">{l.description}</td>
                    <td className="py-2 text-right text-slate-600">{l.qty}</td>
                    <td className="py-2 text-right text-slate-600">{fmt$(l.price)}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{fmt$(lineTotal(l))}</td>
                    <td className="py-2 text-center text-slate-500">{l.isTaxable ? 'T' : ''}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={4} className="py-2 text-right font-semibold text-slate-700">Parts Subtotal</td>
                  <td className="py-2 text-right font-semibold text-slate-900">{fmt$(partsTotal)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="mt-6 border-t pt-4">
          <table className="ml-auto w-72 text-sm">
            <tbody>
              {jobsTotal > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">Labour</td>
                  <td className="py-1 text-right text-slate-900">{fmt$(jobsTotal)}</td>
                </tr>
              )}
              {wo.jobsDiscountAmt > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">Labour Discount</td>
                  <td className="py-1 text-right text-green-700">−{fmt$(wo.jobsDiscountAmt)}</td>
                </tr>
              )}
              {partsTotal > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">Parts</td>
                  <td className="py-1 text-right text-slate-900">{fmt$(partsTotal)}</td>
                </tr>
              )}
              {wo.partsDiscountAmt > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">Parts Discount</td>
                  <td className="py-1 text-right text-green-700">−{fmt$(wo.partsDiscountAmt)}</td>
                </tr>
              )}
              {wo.shopSuppliesAmt > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">Shop Supplies</td>
                  <td className="py-1 text-right text-slate-900">{fmt$(wo.shopSuppliesAmt)}</td>
                </tr>
              )}
              <tr className="border-t">
                <td className="py-1 font-medium text-slate-700">Subtotal</td>
                <td className="py-1 text-right font-medium text-slate-900">{fmt$(subtotal)}</td>
              </tr>
              {wo.gstAmount > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">{wo.pstAmount > 0 ? 'GST' : 'HST'}</td>
                  <td className="py-1 text-right text-slate-900">{fmt$(wo.gstAmount)}</td>
                </tr>
              )}
              {wo.pstAmount > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">PST</td>
                  <td className="py-1 text-right text-slate-900">{fmt$(wo.pstAmount)}</td>
                </tr>
              )}
              {wo.gstExempt && (
                <tr>
                  <td colSpan={2} className="py-0.5 text-right text-xs text-green-700">Tax Exempt</td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-900">
                <td className="py-2 text-base font-bold text-slate-900">TOTAL</td>
                <td className="py-2 text-right text-base font-bold text-slate-900">{fmt$(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Remarks */}
        {(wo.remark1 || wo.remark2 || wo.remark3) && (
          <div className="mt-6 border-t pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
            {wo.remark1 && <p className="text-sm text-slate-600">{wo.remark1}</p>}
            {wo.remark2 && <p className="text-sm text-slate-600">{wo.remark2}</p>}
            {wo.remark3 && <p className="text-sm text-slate-600">{wo.remark3}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t pt-4 text-center">
          <p className="text-xs text-slate-400">Thank you for your business.</p>
        </div>
      </div>
    </div>
  )
}
