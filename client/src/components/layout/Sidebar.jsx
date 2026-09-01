import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  ClipboardList,
  ShoppingBag,
  Receipt,
  Wallet,
  BarChart3,
  UserCog,
  Sparkles,
  Megaphone,
  CalendarClock,
  History,
  Headphones,
  LifeBuoy,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { getMyStore } from '../../api/myStore'
import usePermissions from '../../hooks/usePermissions'
import useSupportUnread from '../../hooks/useSupportUnread'

const superAdminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/stores', label: 'Stores', icon: Building2 },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CalendarClock },
  { to: '/admin/notifications', label: 'Notifications', icon: Megaphone },
  { to: '/admin/activity-log', label: 'Activity Log', icon: History },
  { to: '/admin/support', label: 'Support', icon: Headphones, badge: 'support' },
]

const storeNav = [
  { to: '/store', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/store/products', label: 'Products', icon: Package, module: 'products' },
  { to: '/store/customers', label: 'Customers', icon: Users, module: 'customers' },
  { to: '/store/rentals', label: 'Rentals', icon: ClipboardList, module: 'rentals' },
  { to: '/store/payments', label: 'Payments', icon: Wallet, module: 'payments' },
  { to: '/store/sales', label: 'Sales', icon: ShoppingBag, module: 'sales', requiresSalesEnabled: true },
  { to: '/store/expenses', label: 'Expenses', icon: Receipt, module: 'expenses', requiresExpensesEnabled: true },
  { to: '/store/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  { to: '/store/users', label: 'Staff', icon: UserCog, ownerOnly: true },
  { to: '/store/activity-log', label: 'Activity Log', icon: History, module: 'activityLog' },
  { to: '/store/help', label: 'Help', icon: LifeBuoy, badge: 'support' },
]

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth()
  const { can } = usePermissions()
  const supportUnread = useSupportUnread()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const showUsers = user?.role === 'STORE_OWNER'
  const [salesEnabled, setSalesEnabled] = useState(false)
  const [expensesEnabled, setExpensesEnabled] = useState(false)
  const nav = (isSuperAdmin ? superAdminNav : storeNav).filter((item) => {
    if (item.module && !can(item.module)) return false
    if (item.requiresSalesEnabled && !salesEnabled) return false
    if (item.requiresExpensesEnabled && !expensesEnabled) return false
    if (item.ownerOnly && !showUsers) return false
    return true
  })

  useEffect(() => {
    if (isSuperAdmin) return
    getMyStore()
      .then((store) => {
        setSalesEnabled(!!store.salesEnabled)
        setExpensesEnabled(!!store.expensesEnabled)
      })
      .catch(() => {
        setSalesEnabled(false)
        setExpensesEnabled(false)
      })
  }, [isSuperAdmin])

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
              <p className="text-[11px] font-medium leading-tight text-ink-400 dark:text-ink-300">
                {isSuperAdmin ? 'Super Admin' : 'Store Console'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800 md:hidden"
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
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-100 dark:hover:bg-ink-800 dark:hover:text-white'
                )
              }
            >
              <item.icon size={18} strokeWidth={2.25} />
              <span className="flex-1">{item.label}</span>
              {item.badge === 'support' && supportUnread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                  {supportUnread > 99 ? '99+' : supportUnread}
                </span>
              )}
            </NavLink>
          ))}
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
