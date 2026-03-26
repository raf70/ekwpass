import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  Wrench,
  ShoppingCart,
  FileText,
  CalendarCheck,
  List,
  UserCog,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/parts', label: 'Parts', icon: Package },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/work-orders', label: 'Work Orders', icon: Wrench },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/reports', label: 'Reports', icon: FileText, adminOnly: true },
  { to: '/month-end', label: 'Month-End', icon: CalendarCheck, adminOnly: true },
  { to: '/lookup-codes', label: 'Lookup Codes', icon: List, adminOnly: true },
  { to: '/users', label: 'Users', icon: UserCog, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between p-6">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold">EKW-PASS</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Auto Shop Management</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-800 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
      </nav>
    </aside>
  )
}
