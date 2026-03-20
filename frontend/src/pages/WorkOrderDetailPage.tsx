import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, Pencil, Phone, Car,
  DollarSign, FileText, Calendar, Plus, Trash2, Wrench,
  Lock, Unlock, Ban, Printer,
} from 'lucide-react'
import { getWorkOrder, updateWorkOrder } from '@/api/workOrders'
import {
  getWorkOrderLines, createWorkOrderLine, deleteWorkOrderLine,
  type WorkOrderLine,
} from '@/api/workOrderLines'
import { searchParts } from '@/api/parts'
import type { Part } from '@/types'

function fmt$(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA')
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || '—'}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
    voided: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

const EMPTY_LINE = { partCode: '', description: '', qty: '1', price: '', isTaxable: true }

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [showAddPart, setShowAddPart] = useState(false)
  const [newLine, setNewLine] = useState(EMPTY_LINE)
  const [lineError, setLineError] = useState('')

  const [codeSearch, setCodeSearch] = useState('')
  const [codeDebounced, setCodeDebounced] = useState('')
  const [showCodeDropdown, setShowCodeDropdown] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)

  const [descSearch, setDescSearch] = useState('')
  const [descDebounced, setDescDebounced] = useState('')
  const [showDescDropdown, setShowDescDropdown] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setCodeDebounced(codeSearch), 250)
    return () => clearTimeout(t)
  }, [codeSearch])

  useEffect(() => {
    const t = setTimeout(() => setDescDebounced(descSearch), 250)
    return () => clearTimeout(t)
  }, [descSearch])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (codeRef.current && !codeRef.current.contains(e.target as Node)) setShowCodeDropdown(false)
      if (descRef.current && !descRef.current.contains(e.target as Node)) setShowDescDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { data: codeResults } = useQuery({
    queryKey: ['parts-search-code', codeDebounced],
    queryFn: () => searchParts({ code: codeDebounced, limit: 10 }),
    enabled: codeDebounced.length >= 1 && showCodeDropdown,
  })

  const { data: descResults } = useQuery({
    queryKey: ['parts-search-desc', descDebounced],
    queryFn: () => searchParts({ description: descDebounced, limit: 10 }),
    enabled: descDebounced.length >= 2 && showDescDropdown,
  })

  function selectPart(p: Part) {
    setNewLine({
      partCode: p.code,
      description: p.description,
      qty: '1',
      price: String(p.sellPrice),
      isTaxable: true,
    })
    setCodeSearch('')
    setDescSearch('')
    setShowCodeDropdown(false)
    setShowDescDropdown(false)
  }

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

  const addLineMutation = useMutation({
    mutationFn: () =>
      createWorkOrderLine(id!, {
        lineType: 'part',
        partCode: newLine.partCode,
        description: newLine.description,
        qty: parseFloat(newLine.qty) || 1,
        price: parseFloat(newLine.price) || 0,
        isTaxable: newLine.isTaxable,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-lines', id] })
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      setNewLine(EMPTY_LINE)
      setShowAddPart(false)
      setLineError('')
    },
    onError: () => setLineError('Failed to add part.'),
  })

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) => deleteWorkOrderLine(id!, lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-lines', id] })
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => {
      if (!wo) throw new Error('no work order')
      return updateWorkOrder(id!, { ...wo, status: newStatus })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
    },
  })

  function handleStatusChange(newStatus: string, confirmMsg: string) {
    if (window.confirm(confirmMsg)) {
      statusMutation.mutate(newStatus)
    }
  }

  function handleDeleteLine(line: WorkOrderLine) {
    const label = line.description || line.partCode || 'this part'
    if (window.confirm(`Remove "${label}" from work order?`)) {
      deleteLineMutation.mutate(line.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!wo) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-slate-500">Work order not found.</p>
        <Link to="/work-orders" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to Work Orders
        </Link>
      </div>
    )
  }

  const vehicleLabel = [wo.vehicleYear ? String(wo.vehicleYear) : '', wo.vehicleMake, wo.vehicleModel]
    .filter(Boolean)
    .join(' ')

  const partLines = (lines ?? []).filter((l) => l.lineType === 'part')
  const jobLines = (lines ?? []).filter((l) => l.lineType === 'job')

  const jobsTotal = wo.jobsTaxable + wo.jobsNontaxable
  const partsTotal = wo.partsTaxable + wo.partsNontaxable
  const subtotal = jobsTotal + partsTotal + wo.shopSuppliesAmt
  const grandTotal = subtotal + wo.totalTax

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/work-orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Work Orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Invoice #{wo.invoiceNumber}
            </h1>
            <StatusBadge status={wo.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(wo.date)}
            </span>
            {wo.customerName && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {wo.customerName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {wo.status === 'open' && (
            <>
              <button
                onClick={() => handleStatusChange('closed', 'Close this work order? If the customer has a charge account, an AR transaction will be posted automatically.')}
                disabled={statusMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Close Work Order
              </button>
              <button
                onClick={() => handleStatusChange('voided', 'Void this work order? This cannot be easily undone.')}
                disabled={statusMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                Void
              </button>
            </>
          )}
          {wo.status === 'closed' && (
            <button
              onClick={() => handleStatusChange('open', 'Reopen this work order? Any auto-posted AR transaction will be reversed.')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              Reopen
            </button>
          )}
          {wo.status === 'voided' && (
            <button
              onClick={() => handleStatusChange('open', 'Reopen this voided work order?')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              Reopen
            </button>
          )}
          <Link
            to={`/work-orders/${id}/invoice`}
            className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Printer className="h-4 w-4" />
            Invoice
          </Link>
          <Link
            to={`/work-orders/${id}/edit`}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {statusMutation.isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to update work order status. Please try again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Phone className="h-4 w-4 text-slate-400" />
            Customer
          </h2>
          <InfoRow label="Name" value={wo.customerName} />
          <InfoRow label="Phone" value={wo.customerPhone} />
          <InfoRow label="Secondary Phone" value={wo.customerPhoneSecondary} />
          {wo.gstExempt && <InfoRow label="HST Exempt" value="Yes" />}
          {wo.customerId && (
            <div className="mt-3">
              <Link
                to={`/customers/${wo.customerId}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View Customer Profile
              </Link>
            </div>
          )}
        </section>

        {/* Vehicle */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Car className="h-4 w-4 text-slate-400" />
            Vehicle
          </h2>
          <InfoRow label="Vehicle" value={vehicleLabel} />
          <InfoRow label="Plate" value={wo.vehiclePlate} />
          <InfoRow label="VIN" value={wo.vehicleVin} />
          <InfoRow label="Color" value={wo.vehicleColor} />
          <InfoRow label="Odometer" value={wo.vehicleOdometer ? `${wo.vehicleOdometer.toLocaleString()} km` : null} />
        </section>
      </div>

      {/* Parts Table */}
      <section className="mt-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Wrench className="h-4 w-4 text-slate-400" />
            Parts
            <span className="ml-1 text-sm font-normal text-slate-400">({partLines.length})</span>
          </h2>
          {!showAddPart && (
            <button
              onClick={() => setShowAddPart(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </button>
          )}
        </div>

        {/* Add Part Form */}
        {showAddPart && (
          <div className="border-b px-6 py-4">
            {lineError && (
              <p className="mb-2 text-sm text-red-600">{lineError}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-6">
              <div ref={codeRef} className="relative">
                <input
                  type="text"
                  placeholder="Part #"
                  value={newLine.partCode}
                  onChange={(e) => {
                    const v = e.target.value
                    setNewLine({ ...newLine, partCode: v })
                    setCodeSearch(v)
                    setShowCodeDropdown(true)
                  }}
                  onFocus={() => { if (newLine.partCode) { setCodeSearch(newLine.partCode); setShowCodeDropdown(true) } }}
                  className={inputClass}
                />
                {showCodeDropdown && codeDebounced.length >= 1 && codeResults && (
                  <div className="absolute z-20 mt-1 max-h-60 w-72 overflow-auto rounded-lg border bg-white shadow-lg">
                    {codeResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">No parts match</div>
                    ) : (
                      codeResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPart(p)}
                          className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                        >
                          <span className="shrink-0 font-mono font-medium text-slate-900">{p.code}</span>
                          <span className="truncate text-slate-500">{p.description}</span>
                          <span className="ml-auto shrink-0 text-xs text-slate-400">{fmt$(p.sellPrice)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div ref={descRef} className="relative sm:col-span-2">
                <input
                  type="text"
                  placeholder="Description *"
                  value={newLine.description}
                  onChange={(e) => {
                    const v = e.target.value
                    setNewLine({ ...newLine, description: v })
                    setDescSearch(v)
                    setShowDescDropdown(true)
                  }}
                  onFocus={() => { if (newLine.description.length >= 2) { setDescSearch(newLine.description); setShowDescDropdown(true) } }}
                  className={inputClass}
                />
                {showDescDropdown && descDebounced.length >= 2 && descResults && (
                  <div className="absolute z-20 mt-1 max-h-60 w-80 overflow-auto rounded-lg border bg-white shadow-lg">
                    {descResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">No parts match</div>
                    ) : (
                      descResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPart(p)}
                          className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                        >
                          <span className="shrink-0 font-mono text-xs text-slate-500">{p.code}</span>
                          <span className="truncate font-medium text-slate-900">{p.description}</span>
                          <span className="ml-auto shrink-0 text-xs text-slate-400">{fmt$(p.sellPrice)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <input
                type="number"
                placeholder="Qty"
                min="0"
                step="0.01"
                value={newLine.qty}
                onChange={(e) => setNewLine({ ...newLine, qty: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Price"
                min="0"
                step="0.01"
                value={newLine.price}
                onChange={(e) => setNewLine({ ...newLine, price: e.target.value })}
                className={inputClass}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={newLine.isTaxable}
                    onChange={(e) => setNewLine({ ...newLine, isTaxable: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Taxable
                </label>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowAddPart(false); setNewLine(EMPTY_LINE); setCodeSearch(''); setDescSearch(''); setLineError('') }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => addLineMutation.mutate()}
                disabled={!newLine.description || !newLine.price || addLineMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {addLineMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
            </div>
          </div>
        )}

        {partLines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">Part #</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Description</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Qty</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Price</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Total</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Tax</th>
                  <th className="w-12 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {partLines.map((l) => (
                  <tr key={l.id} className="group border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{l.partCode || '—'}</td>
                    <td className="px-6 py-3 text-slate-900">{l.description}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{l.qty}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{fmt$(l.price)}</td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">{fmt$(l.qty * l.price)}</td>
                    <td className="px-6 py-3">
                      {l.isTaxable ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Yes</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleDeleteLine(l)}
                        disabled={deleteLineMutation.isPending}
                        className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                        title="Remove part"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td colSpan={4} className="px-6 py-3 text-slate-700">Parts Total</td>
                  <td className="px-6 py-3 text-right text-slate-900">{fmt$(partsTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">
            <Wrench className="mx-auto mb-2 h-8 w-8" />
            No parts added yet
          </div>
        )}
      </section>

      {/* Financials */}
      <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <DollarSign className="h-4 w-4 text-slate-400" />
          Financials
        </h2>
        <InfoRow label="Labour (taxable)" value={fmt$(wo.jobsTaxable)} />
        <InfoRow label="Labour (non-taxable)" value={fmt$(wo.jobsNontaxable)} />
        {wo.jobsDiscountAmt > 0 && <InfoRow label="Labour Discount" value={`-${fmt$(wo.jobsDiscountAmt)}`} />}
        <InfoRow label="Parts (taxable)" value={fmt$(wo.partsTaxable)} />
        <InfoRow label="Parts (non-taxable)" value={fmt$(wo.partsNontaxable)} />
        {wo.partsDiscountAmt > 0 && <InfoRow label="Parts Discount" value={`-${fmt$(wo.partsDiscountAmt)}`} />}
        {wo.shopSuppliesAmt > 0 && <InfoRow label="Shop Supplies" value={fmt$(wo.shopSuppliesAmt)} />}
        <div className="my-2 border-t border-slate-200" />
        <InfoRow label="Subtotal" value={fmt$(subtotal)} />
        <InfoRow label="HST (13%)" value={fmt$(wo.gstAmount)} />
        <div className="flex justify-between py-2">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-sm font-bold text-slate-900">{fmt$(grandTotal)}</span>
        </div>
      </section>

      {/* Jobs Table (if any exist from legacy data) */}
      {jobLines.length > 0 && (
        <section className="mt-6 rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Wrench className="h-4 w-4 text-slate-400" />
              Labour
              <span className="ml-1 text-sm font-normal text-slate-400">({jobLines.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">Code</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Description</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Qty</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Price</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Total</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Tax</th>
                </tr>
              </thead>
              <tbody>
                {jobLines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{l.partCode || '—'}</td>
                    <td className="px-6 py-3 text-slate-900">{l.description}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{l.qty}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{fmt$(l.price)}</td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">{fmt$(l.qty * l.price)}</td>
                    <td className="px-6 py-3">
                      {l.isTaxable ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Yes</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">No</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td colSpan={4} className="px-6 py-3 text-slate-700">Labour Total</td>
                  <td className="px-6 py-3 text-right text-slate-900">{fmt$(jobsTotal)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Remarks */}
      {(wo.remark1 || wo.remark2 || wo.remark3) && (
        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-slate-400" />
            Remarks
          </h2>
          <div className="space-y-2">
            {wo.remark1 && <p className="text-sm text-slate-700">{wo.remark1}</p>}
            {wo.remark2 && <p className="text-sm text-slate-700">{wo.remark2}</p>}
            {wo.remark3 && <p className="text-sm text-slate-700">{wo.remark3}</p>}
          </div>
        </section>
      )}
    </div>
  )
}
