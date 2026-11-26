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
  ArrowLeftRight,
  Wallet,
  BarChart3,
  UserCog,
  ShieldCheck,
  Sparkles,
  Megaphone,
  CalendarClock,
  History,
  Headphones,
  LifeBuoy,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { getMyStore } from '../../api/myStore'
import usePermissions from '../../hooks/usePermissions'
import useSupportUnread from '../../hooks/useSupportUnread'

const superAdminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/stores', label: 'Stores', icon: Building2 },
  { to: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CalendarClock },
  { to: '/admin/notifications', label: 'Notifications', icon: Megaphone },
  { to: '/admin/activity-log', label: 'Activity Log', icon: History },
  { to: '/admin/support', label: 'Support', icon: Headphones, badge: 'support' },
]

const storeNav = [
  { to: '/store', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/store/products', label: 'Products', icon: Package, module: 'products' },
  { to: '/store/customers', label: 'Customers', icon: Users, module: 'customers' },
  { to: '/store/rentals', label: 'Rentals', icon: ClipboardList, module: 'rentals', requiresRentalsEnabled: true },
  { to: '/store/payments', label: 'Payments', icon: Wallet, module: 'payments' },
  { to: '/store/sales', label: 'Sales', icon: ShoppingBag, module: 'sales', requiresSalesEnabled: true },
  { to: '/store/expenses', label: 'Expenses', icon: Receipt, module: 'expenses', requiresExpensesEnabled: true },
  { to: '/store/transfers', label: 'Transfer Payments', icon: ArrowLeftRight, module: 'transfers', requiresTransfersEnabled: true },
  { to: '/store/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  { to: '/store/users', label: 'Staff', icon: UserCog, ownerOnly: true },
  { to: '/store/activity-log', label: 'Activity Log', icon: History, module: 'activityLog' },
  { to: '/store/help', label: 'Help', icon: LifeBuoy, badge: 'support' },
]

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth()
  const { can } = usePermissions()
  const supportUnread = useSupportUnread()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const showUsers = user?.role === 'STORE_OWNER'
  // Defaults true (unlike the others) — the system started rentals-only, so
  // the nav item should show immediately rather than flicker away while the
  // store's actual flag is still loading.
  const [rentalsEnabled, setRentalsEnabled] = useState(true)
  const [salesEnabled, setSalesEnabled] = useState(false)
  const [expensesEnabled, setExpensesEnabled] = useState(false)
  const [transfersEnabled, setTransfersEnabled] = useState(false)
  const nav = (isSuperAdmin ? superAdminNav : storeNav).filter((item) => {
    if (item.module && !can(item.module)) return false
    if (item.requiresRentalsEnabled && !rentalsEnabled) return false
    if (item.requiresSalesEnabled && !salesEnabled) return false
    if (item.requiresExpensesEnabled && !expensesEnabled) return false
    if (item.requiresTransfersEnabled && !transfersEnabled) return false
    if (item.ownerOnly && !showUsers) return false
    return true
  })

  useEffect(() => {
    if (isSuperAdmin) return
    getMyStore()
      .then((store) => {
        setRentalsEnabled(!!store.rentalsEnabled)
        setSalesEnabled(!!store.salesEnabled)
        setExpensesEnabled(!!store.expensesEnabled)
        setTransfersEnabled(!!store.transfersEnabled)
      })
      .catch(() => {
        setRentalsEnabled(false)
        setSalesEnabled(false)
        setExpensesEnabled(false)
        setTransfersEnabled(false)
      })
  }, [isSuperAdmin])

  const roleLabel = user?.role?.replace('_', ' ').toLowerCase()
  const initial = (user?.name || roleLabel || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'sb fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="sb-brand">
          <NavLink to={isSuperAdmin ? '/admin' : '/store'} className="sb-brand-link">
            <span className="sb-logo">
              <Sparkles size={17} />
            </span>
            <span className="sb-brand-text">
              <span className="sb-brand-name">Rental System</span>
              <span className="sb-brand-sub">{isSuperAdmin ? 'Super Admin' : 'Store Console'}</span>
            </span>
          </NavLink>
          <button onClick={onClose} className="sb-close md:hidden" aria-label="Close menu">
            <X size={17} />
          </button>
        </div>

        {/* Nav */}
        <div className="sb-scroll">
          <p className="sb-title">Navigation</p>
          <nav className="sb-nav">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn('sb-link', isActive && 'active')}
              >
                <item.icon size={18} strokeWidth={1.9} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge === 'support' && supportUnread > 0 && (
                  <span className="sb-badge">{supportUnread > 99 ? '99+' : supportUnread}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User + logout */}
        <div className="sb-foot">
          <div className="sb-foot-divider" />
          <div className="sb-user">
            <span className="sb-user-av" aria-hidden="true">{initial}<i /></span>
            <span className="min-w-0">
              <b>{user?.name || roleLabel}</b>
              <span>{roleLabel}</span>
            </span>
          </div>
          <button type="button" onClick={logout} className="sb-logout">
            <LogOut size={17} />
            <span className="flex-1">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
