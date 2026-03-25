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
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/parts', label: 'Parts', icon: Package },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/work-orders', label: 'Work Orders', icon: Wrench },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/month-end', label: 'Month-End', icon: CalendarCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
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
        {navItems.map((item) => (
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
