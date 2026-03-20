import { useNavigate } from 'react-router-dom'
import { Wrench, DollarSign, Users, CreditCard, Plus, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const metrics = [
  {
    label: 'Open Work Orders',
    value: 'Coming Soon',
    icon: Wrench,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    label: "Today's Sales",
    value: 'Coming Soon',
    icon: DollarSign,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    label: 'Total Customers',
    value: 'Coming Soon',
    icon: Users,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    label: 'AR Outstanding',
    value: 'Coming Soon',
    icon: CreditCard,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-slate-500">{today}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border bg-white p-6 shadow-sm"
          >
            <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-lg', m.iconBg)}>
              <m.icon className={cn('h-5 w-5', m.iconColor)} />
            </div>
            <p className="text-sm font-medium text-slate-500">{m.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
          >
            <Users className="h-4 w-4" />
            Add Customer
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
          >
            <FileText className="h-4 w-4" />
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}
