import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  ClipboardList,
  Wallet,
  BarChart3,
  UserCog,
  Sparkles,
  Megaphone,
  CalendarClock,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

const superAdminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/stores', label: 'Stores', icon: Building2 },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CalendarClock },
  { to: '/admin/notifications', label: 'Notifications', icon: Megaphone },
]

const storeNav = [
  { to: '/store', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/store/products', label: 'Products', icon: Package },
  { to: '/store/customers', label: 'Customers', icon: Users },
  { to: '/store/rentals', label: 'Rentals', icon: ClipboardList },
  { to: '/store/payments', label: 'Payments', icon: Wallet },
  { to: '/store/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const nav = isSuperAdmin ? superAdminNav : storeNav
  const showUsers = user?.role === 'STORE_OWNER'

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-100 bg-white transition-transform duration-200 dark:border-ink-800 dark:bg-ink-900',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-ink-100 px-6 dark:border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-pop">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="font-display text-sm font-extrabold leading-tight text-ink-900 dark:text-white">Rental System</p>
              <p className="text-[11px] font-medium leading-tight text-ink-400">
                {isSuperAdmin ? 'Super Admin' : 'Store Console'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
                )
              }
            >
              <item.icon size={18} strokeWidth={2.25} />
              {item.label}
            </NavLink>
          ))}

          {showUsers && (
            <NavLink
              to="/store/users"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
                )
              }
            >
              <UserCog size={18} strokeWidth={2.25} />
              Staff
            </NavLink>
          )}
        </nav>

        <div className="border-t border-ink-100 p-4 dark:border-ink-800">
          <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white shadow-pop">
            <p className="text-xs font-semibold text-primary-100">Signed in as</p>
            <p className="mt-1 font-display text-sm font-bold">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
