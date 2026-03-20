import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Search, X, User, Car, Plus, Trash2 } from 'lucide-react'
import { getCustomers, getCustomerVehicles } from '@/api/customers'
import { createVehicle, deleteVehicle } from '@/api/vehicles'
import { getWorkOrder, createWorkOrder, updateWorkOrder } from '@/api/workOrders'
import type { Customer, Vehicle } from '@/types'

const STATUS_OPTIONS = ['open', 'closed', 'voided']

const EMPTY_NEW_VEHICLE = { make: '', model: '', year: '', vin: '', plate: '', color: '' }

export default function WorkOrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [odometer, setOdometer] = useState(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('open')
  const [remark1, setRemark1] = useState('')
  const [remark2, setRemark2] = useState('')
  const [remark3, setRemark3] = useState('')
  const [error, setError] = useState('')

  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custPhoneSec, setCustPhoneSec] = useState('')
  const [vehMake, setVehMake] = useState('')
  const [vehModel, setVehModel] = useState('')
  const [vehYear, setVehYear] = useState(0)
  const [vehVin, setVehVin] = useState('')
  const [vehPlate, setVehPlate] = useState('')
  const [vehColor, setVehColor] = useState('')
  const [custId, setCustId] = useState<string | null>(null)
  const [vehId, setVehId] = useState<string | null>(null)
  const [hstExempt, setHstExempt] = useState(false)

  const [custSearch, setCustSearch] = useState('')
  const [custDebounced, setCustDebounced] = useState('')
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const custRef = useRef<HTMLDivElement>(null)

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState(EMPTY_NEW_VEHICLE)

  const { data: existingWO, isLoading: loadingWO } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => getWorkOrder(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingWO) {
      setDate(existingWO.date ? new Date(existingWO.date).toISOString().slice(0, 10) : '')
      setStatus(existingWO.status)
      setOdometer(existingWO.vehicleOdometer)
      setRemark1(existingWO.remark1)
      setRemark2(existingWO.remark2)
      setRemark3(existingWO.remark3)
      setCustName(existingWO.customerName)
      setCustPhone(existingWO.customerPhone)
      setCustPhoneSec(existingWO.customerPhoneSecondary)
      setVehMake(existingWO.vehicleMake)
      setVehModel(existingWO.vehicleModel)
      setVehYear(existingWO.vehicleYear)
      setVehVin(existingWO.vehicleVin)
      setVehPlate(existingWO.vehiclePlate)
      setVehColor(existingWO.vehicleColor)
      setCustId(existingWO.customerId)
      setVehId(existingWO.vehicleId)
      setHstExempt(existingWO.gstExempt)
    }
  }, [existingWO])

  useEffect(() => {
    const t = setTimeout(() => setCustDebounced(custSearch), 250)
    return () => clearTimeout(t)
  }, [custSearch])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (custRef.current && !custRef.current.contains(e.target as Node)) {
        setShowCustDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const { data: custResults } = useQuery({
    queryKey: ['customers-search', custDebounced],
    queryFn: () => getCustomers({ page: 1, pageSize: 10, search: custDebounced }),
    enabled: custDebounced.length >= 2 && showCustDropdown,
  })

  const { data: vehicles } = useQuery({
    queryKey: ['customer-vehicles', customer?.id],
    queryFn: () => getCustomerVehicles(customer!.id),
    enabled: !!customer,
  })

  useEffect(() => {
    if (vehicle) {
      setOdometer(vehicle.odometer)
    }
  }, [vehicle])

  function selectCustomer(c: Customer) {
    setCustomer(c)
    setVehicle(null)
    setCustSearch('')
    setShowCustDropdown(false)
    setCustName(c.name)
    setCustPhone(c.phone)
    setCustPhoneSec(c.phoneSecondary)
    setCustId(c.id)
    setHstExempt(c.gstExempt || c.pstExempt)
    setVehId(null)
    setVehMake('')
    setVehModel('')
    setVehYear(0)
    setVehVin('')
    setVehPlate('')
    setVehColor('')
    setOdometer(0)
  }

  function clearCustomer() {
    setCustomer(null)
    setVehicle(null)
    setCustSearch('')
    setCustName('')
    setCustPhone('')
    setCustPhoneSec('')
    setCustId(null)
    setHstExempt(false)
    setVehId(null)
    setVehMake('')
    setVehModel('')
    setVehYear(0)
    setVehVin('')
    setVehPlate('')
    setVehColor('')
    setOdometer(0)
    setShowAddVehicle(false)
  }

  function doSelectVehicle(v: Vehicle | null) {
    setVehicle(v)
    if (v) {
      setVehId(v.id)
      setVehMake(v.make)
      setVehModel(v.model)
      setVehYear(v.year)
      setVehVin(v.vin)
      setVehPlate(v.plate)
      setVehColor(v.color)
    } else {
      setVehId(null)
      setVehMake('')
      setVehModel('')
      setVehYear(0)
      setVehVin('')
      setVehPlate('')
      setVehColor('')
    }
  }

  const addVehicleMutation = useMutation({
    mutationFn: () =>
      createVehicle({
        customerId: customer!.id,
        make: newVehicle.make,
        model: newVehicle.model,
        year: parseInt(newVehicle.year) || 0,
        vin: newVehicle.vin,
        plate: newVehicle.plate,
        color: newVehicle.color,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['customer-vehicles', customer!.id] })
      setNewVehicle(EMPTY_NEW_VEHICLE)
      setShowAddVehicle(false)
      doSelectVehicle(created)
    },
    onError: () => {
      setError('Failed to add vehicle.')
    },
  })

  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle(vehicleId),
    onSuccess: (_data, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ['customer-vehicles', customer!.id] })
      if (vehId === vehicleId) {
        doSelectVehicle(null)
      }
    },
    onError: () => {
      setError('Failed to remove vehicle.')
    },
  })

  function handleDeleteVehicle(e: React.MouseEvent, v: Vehicle) {
    e.stopPropagation()
    const label = [v.year ? String(v.year) : '', v.make, v.model].filter(Boolean).join(' ')
    if (window.confirm(`Remove ${label || 'this vehicle'} from the customer?`)) {
      deleteVehicleMutation.mutate(v.id)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        customerId: custId,
        vehicleId: vehId,
        date: date + 'T00:00:00Z',
        status,
        customerName: custName,
        customerPhone: custPhone,
        customerPhoneSecondary: custPhoneSec,
        vehicleMake: vehMake,
        vehicleModel: vehModel,
        vehicleYear: vehYear,
        vehicleVin: vehVin,
        vehicleOdometer: odometer,
        vehiclePlate: vehPlate,
        vehicleColor: vehColor,
        pstExempt: hstExempt,
        gstExempt: hstExempt,
        remark1,
        remark2,
        remark3,
      }
      return isEdit ? updateWorkOrder(id!, payload) : createWorkOrder(payload)
    },
    onSuccess: (wo) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      navigate(`/work-orders/${wo.id}`)
    },
    onError: () => {
      setError(`Failed to ${isEdit ? 'update' : 'create'} work order. Please try again.`)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    saveMutation.mutate()
  }

  if (isEdit && loadingWO) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const hasCustomer = !!customer || !!custName
  const vehicleLabel = [vehYear ? String(vehYear) : '', vehMake, vehModel].filter(Boolean).join(' ')

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={isEdit ? `/work-orders/${id}` : '/work-orders'}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? 'Back to Work Order' : 'Back to Work Orders'}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEdit ? `Edit Work Order #${existingWO?.invoiceNumber ?? ''}` : 'New Work Order'}
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <User className="h-5 w-5 text-slate-400" />
            Customer
          </h2>

          {hasCustomer ? (
            <div className="flex items-start justify-between rounded-lg bg-slate-50 p-4">
              <div>
                <p className="font-medium text-slate-900">{customer?.name ?? custName}</p>
                <p className="mt-0.5 text-sm text-slate-500">{customer?.phone ?? custPhone}</p>
                {customer?.city && (
                  <p className="text-sm text-slate-500">
                    {[customer.city, customer.province].filter(Boolean).join(', ')}
                  </p>
                )}
                {hstExempt && (
                  <div className="mt-1">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">HST Exempt</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearCustomer}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div ref={custRef} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={custSearch}
                onChange={(e) => { setCustSearch(e.target.value); setShowCustDropdown(true) }}
                onFocus={() => setShowCustDropdown(true)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {showCustDropdown && custDebounced.length >= 2 && custResults && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                  {custResults.data.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">No customers found</div>
                  ) : (
                    custResults.data.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{c.name}</span>
                          <span className="ml-2 text-slate-500">{c.phone}</span>
                        </div>
                        <span className="text-xs text-slate-400">{c.city}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Vehicle Selection */}
        {customer && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Car className="h-5 w-5 text-slate-400" />
                Vehicle
              </h2>
              {!showAddVehicle && (
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Vehicle
                </button>
              )}
            </div>

            {/* Add Vehicle Form */}
            {showAddVehicle && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">New Vehicle</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Make *"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Model *"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    placeholder="Year"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Plate"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="VIN"
                    value={newVehicle.vin}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Color"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddVehicle(false); setNewVehicle(EMPTY_NEW_VEHICLE) }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => addVehicleMutation.mutate()}
                    disabled={!newVehicle.make || !newVehicle.model || addVehicleMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addVehicleMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Save Vehicle
                  </button>
                </div>
              </div>
            )}

            {/* Vehicle List */}
            {vehicles && vehicles.length > 0 ? (
              <div className="space-y-2">
                {vehicles.map((v) => {
                  const label = [v.year ? String(v.year) : '', v.make, v.model].filter(Boolean).join(' ')
                  const selected = vehId === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => doSelectVehicle(selected ? null : v)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-slate-900">{label || 'Unknown vehicle'}</span>
                        {v.plate && <span className="ml-2 text-slate-500">{v.plate}</span>}
                        {v.vin && <span className="ml-2 text-xs text-slate-400">{v.vin}</span>}
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDeleteVehicle(e, v)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteVehicle(e as unknown as React.MouseEvent, v) }}
                        className="ml-2 rounded p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600"
                        title="Remove vehicle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : vehicles ? (
              <p className="text-sm text-slate-400">No vehicles on file for this customer.</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles...
              </div>
            )}
          </section>
        )}

        {/* Vehicle info (read-only) for edit mode when vehicle is from denormalized data */}
        {!customer && vehicleLabel && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Car className="h-5 w-5 text-slate-400" />
              Vehicle
            </h2>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-900">{vehicleLabel}</p>
              {vehPlate && <p className="mt-0.5 text-sm text-slate-500">Plate: {vehPlate}</p>}
              {vehVin && <p className="text-sm text-slate-500">VIN: {vehVin}</p>}
            </div>
          </section>
        )}

        {/* Work Order Details */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Odometer (km)</label>
              <input
                type="number"
                min="0"
                value={odometer}
                onChange={(e) => setOdometer(parseInt(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            {isEdit && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Remarks */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Remarks</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Remark 1"
              value={remark1}
              onChange={(e) => setRemark1(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Remark 2"
              value={remark2}
              onChange={(e) => setRemark2(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Remark 3"
              value={remark3}
              onChange={(e) => setRemark3(e.target.value)}
              className={inputClass}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to={isEdit ? `/work-orders/${id}` : '/work-orders'}
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
            {isEdit ? 'Save Changes' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
