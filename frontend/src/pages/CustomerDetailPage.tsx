import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, Pencil, Trash2, Phone, MapPin, Car,
  Shield, DollarSign, FileText, Plus,
} from 'lucide-react'
import { getCustomer, deleteCustomer, getCustomerVehicles, getCustomerARTransactions, createARTransaction } from '@/api/customers'
import { createVehicle, deleteVehicle } from '@/api/vehicles'

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

function Badge({ children, color }: { children: React.ReactNode; color: 'green' | 'blue' | 'amber' | 'slate' }) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  })

  const { data: vehicles } = useQuery({
    queryKey: ['customer-vehicles', id],
    queryFn: () => getCustomerVehicles(id!),
    enabled: !!id,
  })

  const { data: arTransactions } = useQuery({
    queryKey: ['customer-ar', id],
    queryFn: () => getCustomerARTransactions(id!),
    enabled: !!id,
  })

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newVeh, setNewVeh] = useState({ make: '', model: '', year: '', vin: '', plate: '', color: '' })
  const [showARForm, setShowARForm] = useState(false)
  const [arForm, setARForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', crDr: 'CR' as 'CR' | 'DR', amount: '' })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
  })

  const addVehicleMutation = useMutation({
    mutationFn: () =>
      createVehicle({
        customerId: id!,
        make: newVeh.make,
        model: newVeh.model,
        year: parseInt(newVeh.year) || 0,
        vin: newVeh.vin,
        plate: newVeh.plate,
        color: newVeh.color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-vehicles', id] })
      setNewVeh({ make: '', model: '', year: '', vin: '', plate: '', color: '' })
      setShowAddVehicle(false)
    },
  })

  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-vehicles', id] })
    },
  })

  const addARMutation = useMutation({
    mutationFn: () =>
      createARTransaction(id!, {
        date: arForm.date,
        description: arForm.description,
        crDr: arForm.crDr,
        amount: parseFloat(arForm.amount) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-ar', id] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      setARForm({ date: new Date().toISOString().slice(0, 10), description: '', crDr: 'CR', amount: '' })
      setShowARForm(false)
    },
  })

  function handleDelete() {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      deleteMutation.mutate()
    }
  }

  function handleDeleteVehicle(vehicleId: string, label: string) {
    if (window.confirm(`Remove ${label || 'this vehicle'}? This cannot be undone.`)) {
      deleteVehicleMutation.mutate(vehicleId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-slate-500">Customer not found.</p>
        <Link to="/customers" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to Customers
        </Link>
      </div>
    )
  }

  const address = [customer.street, customer.city, customer.province, customer.postalCode]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/customers"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {customer.phone && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Phone className="h-3.5 w-3.5" />
                {customer.phone}
              </span>
            )}
            {address && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {address}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {customer.isWholesale && <Badge color="blue">Wholesale</Badge>}
            {customer.pstExempt && <Badge color="green">PST Exempt</Badge>}
            {customer.gstExempt && <Badge color="green">GST Exempt</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/customers/${id}/edit`}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Details */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Phone className="h-4 w-4 text-slate-400" />
            Contact Details
          </h2>
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Secondary Phone" value={customer.phoneSecondary} />
          <InfoRow label="Street" value={customer.street} />
          <InfoRow label="City" value={customer.city} />
          <InfoRow label="Province" value={customer.province} />
          <InfoRow label="Postal Code" value={customer.postalCode} />
          <InfoRow label="Attention" value={customer.attention} />
        </section>

        {/* Tax & Pricing */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-slate-400" />
            Tax & Pricing
          </h2>
          <InfoRow label="PST Exempt" value={customer.pstExempt ? 'Yes' : 'No'} />
          <InfoRow label="PST Number" value={customer.pstNumber} />
          <InfoRow label="GST Exempt" value={customer.gstExempt ? 'Yes' : 'No'} />
          <InfoRow label="GST Number" value={customer.gstNumber} />
          <InfoRow label="Wholesale" value={customer.isWholesale ? 'Yes' : 'No'} />
          <InfoRow label="Price Class" value={customer.priceClass} />
          <InfoRow label="Credit Limit" value={fmt$(customer.creditLimit)} />
        </section>

        {/* Financials */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <DollarSign className="h-4 w-4 text-slate-400" />
            Financials
          </h2>
          <InfoRow label="AR Balance" value={fmt$(customer.arBalance)} />
          <InfoRow label="Current" value={fmt$(customer.arCurrent)} />
          <InfoRow label="30 Days" value={fmt$(customer.ar30)} />
          <InfoRow label="60 Days" value={fmt$(customer.ar60)} />
          <InfoRow label="90 Days" value={fmt$(customer.ar90)} />
          <InfoRow label="YTD Sales" value={fmt$(customer.ytdSales)} />
          <InfoRow label="YTD GST" value={fmt$(customer.ytdGst)} />
          <InfoRow label="Last Service" value={fmtDate(customer.lastServiceDate)} />
        </section>

        {/* Additional */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-slate-400" />
            Additional
          </h2>
          <InfoRow label="Gender" value={customer.gender === 'M' ? 'Male' : customer.gender === 'F' ? 'Female' : customer.gender} />
          <InfoRow label="Category 1" value={customer.category1} />
          <InfoRow label="Category 2" value={customer.category2} />
          <InfoRow label="Created" value={fmtDate(customer.createdAt)} />
          <InfoRow label="Updated" value={fmtDate(customer.updatedAt)} />
          {customer.remarks && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Remarks</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.remarks}</p>
            </div>
          )}
        </section>
      </div>

      {/* Vehicles */}
      <section className="mt-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Car className="h-4 w-4 text-slate-400" />
            Vehicles
            <span className="ml-1 text-sm font-normal text-slate-400">({vehicles?.length ?? 0})</span>
          </h2>
          {!showAddVehicle && (
            <button
              onClick={() => setShowAddVehicle(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </button>
          )}
        </div>

        {/* Add Vehicle Form */}
        {showAddVehicle && (
          <div className="border-b px-6 py-4">
            <p className="mb-3 text-sm font-medium text-slate-700">New Vehicle</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Make *"
                value={newVeh.make}
                onChange={(e) => setNewVeh({ ...newVeh, make: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="Model *"
                value={newVeh.model}
                onChange={(e) => setNewVeh({ ...newVeh, model: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="number"
                placeholder="Year"
                value={newVeh.year}
                onChange={(e) => setNewVeh({ ...newVeh, year: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="Plate"
                value={newVeh.plate}
                onChange={(e) => setNewVeh({ ...newVeh, plate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="VIN"
                value={newVeh.vin}
                onChange={(e) => setNewVeh({ ...newVeh, vin: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="Color"
                value={newVeh.color}
                onChange={(e) => setNewVeh({ ...newVeh, color: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowAddVehicle(false); setNewVeh({ make: '', model: '', year: '', vin: '', plate: '', color: '' }) }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => addVehicleMutation.mutate()}
                disabled={!newVeh.make || !newVeh.model || addVehicleMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {addVehicleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Save Vehicle
              </button>
            </div>
          </div>
        )}

        {vehicles && vehicles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">Year</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Make</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Model</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Plate</th>
                  <th className="px-6 py-3 font-medium text-slate-500">VIN</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Odometer</th>
                  <th className="w-12 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const label = [v.year ? String(v.year) : '', v.make, v.model].filter(Boolean).join(' ')
                  return (
                    <tr key={v.id} className="border-b last:border-0 group">
                      <td className="px-6 py-3 text-slate-900">{v.year || '—'}</td>
                      <td className="px-6 py-3 text-slate-900">{v.make}</td>
                      <td className="px-6 py-3 text-slate-900">{v.model}</td>
                      <td className="px-6 py-3 text-slate-600">{v.plate || '—'}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">{v.vin || '—'}</td>
                      <td className="px-6 py-3 text-slate-600">
                        {v.odometer ? v.odometer.toLocaleString() + ' km' : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDeleteVehicle(v.id, label)}
                          disabled={deleteVehicleMutation.isPending}
                          className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove vehicle"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">
            <Car className="mx-auto mb-2 h-8 w-8" />
            No vehicles on file
          </div>
        )}
      </section>

      {/* AR Transactions */}
      <section className="mt-6 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <DollarSign className="h-4 w-4 text-slate-400" />
            AR Transactions
            <span className="ml-1 text-sm font-normal text-slate-400">({arTransactions?.length ?? 0})</span>
          </h2>
          {!showARForm && (
            <button
              onClick={() => setShowARForm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Record Transaction
            </button>
          )}
        </div>

        {showARForm && (
          <div className="border-b px-6 py-4">
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setARForm((f) => ({ ...f, crDr: 'CR' }))}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  arForm.crDr === 'CR'
                    ? 'bg-green-600 text-white'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Payment (CR)
              </button>
              <button
                onClick={() => setARForm((f) => ({ ...f, crDr: 'DR' }))}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  arForm.crDr === 'DR'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Charge (DR)
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="date"
                value={arForm.date}
                onChange={(e) => setARForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="Description *"
                value={arForm.description}
                onChange={(e) => setARForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Amount *"
                  value={arForm.amount}
                  onChange={(e) => setARForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowARForm(false); setARForm({ date: new Date().toISOString().slice(0, 10), description: '', crDr: 'CR', amount: '' }) }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => addARMutation.mutate()}
                disabled={!arForm.description || !arForm.amount || addARMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {addARMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Save
              </button>
            </div>
          </div>
        )}

        {arTransactions && arTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">Date</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Description</th>
                  <th className="px-6 py-3 font-medium text-slate-500">Type</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {arTransactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-6 py-3 text-slate-900">{fmtDate(t.date)}</td>
                    <td className="px-6 py-3 text-slate-600">{t.description}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.crDr === 'CR'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {t.crDr === 'CR' ? 'Payment' : 'Charge'}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${t.crDr === 'CR' ? 'text-green-700' : 'text-slate-900'}`}>
                      {t.crDr === 'CR' ? '−' : ''}{fmt$(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">
            <DollarSign className="mx-auto mb-2 h-8 w-8" />
            No AR transactions
          </div>
        )}
      </section>
    </div>
  )
}
