import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Wrench, DollarSign, Users, CreditCard, Plus, FileText, Package, Truck, Settings, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { getSummaryReport } from '@/api/reports'
import { getCustomers } from '@/api/customers'
import { getARAgingReport } from '@/api/reports'

function fmt$(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => getSummaryReport({}),
  })

  const { data: customers } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => getCustomers({ page: 1, pageSize: 1 }),
  })

  const { data: arAging } = useQuery({
    queryKey: ['dashboard-ar'],
    queryFn: () => getARAgingReport(),
  })

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const metrics = [
    {
      label: 'Open Work Orders',
      value: summary ? String(summary.openOrders) : null,
      icon: Wrench,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      to: '/work-orders?status=open',
    },
    {
      label: 'Closed Work Orders',
      value: summary ? String(summary.closedOrders) : null,
      icon: DollarSign,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      to: '/work-orders?status=closed',
    },
    {
      label: 'Total Customers',
      value: customers ? String(customers.total) : null,
      icon: Users,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      to: '/customers',
    },
    {
      label: 'AR Outstanding',
      value: arAging ? fmt$(arAging.grandTotal) : null,
      icon: CreditCard,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      to: '/reports',
    },
  ]

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-slate-500">{today}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Link
            key={m.label}
            to={m.to}
            className="rounded-xl border bg-white p-6 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-lg', m.iconBg)}>
              <m.icon className={cn('h-5 w-5', m.iconColor)} />
            </div>
            <p className="text-sm font-medium text-slate-500">{m.label}</p>
            {m.value !== null ? (
              <p className="mt-1 text-lg font-semibold text-slate-900">{m.value}</p>
            ) : (
              <Loader2 className="mt-2 h-5 w-5 animate-spin text-slate-300" />
            )}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/work-orders/new')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </button>
          <button
            onClick={() => navigate('/customers/new')}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
          <button
            onClick={() => navigate('/parts')}
            className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <Package className="h-4 w-4" />
            Parts
          </button>
          <button
            onClick={() => navigate('/suppliers')}
            className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <Truck className="h-4 w-4" />
            Suppliers
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <FileText className="h-4 w-4" />
            Reports
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}
