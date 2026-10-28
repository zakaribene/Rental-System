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
  const { user } = useAuth()
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
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#1e2b3c] bg-[#0f1623] transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-[#1e2b3c] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-900/40">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight text-white">Rental System</p>
              <p className="text-[10px] font-medium uppercase tracking-wider leading-tight text-slate-500">
                {isSuperAdmin ? 'Super Admin' : 'Store Console'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white md:hidden"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nav */}
        <style>{`
          @keyframes navCircle {
            0%   { left: -24px; opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { left: calc(100% + 8px); opacity: 0; }
          }
        `}</style>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600/20 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* White circle gliding across active item */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.28)',
                        filter: 'blur(6px)',
                        animation: 'navCircle 2.4s ease-in-out infinite',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <span className="relative flex shrink-0 items-center justify-center">
                    <item.icon size={17} strokeWidth={2} className={isActive ? 'text-blue-400' : ''} />
                    {isActive && (
                      <span className="absolute -inset-1 animate-ping rounded-full bg-blue-400/30" />
                    )}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'support' && supportUnread > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {supportUnread > 99 ? '99+' : supportUnread}
                    </span>
                  ) : isActive ? (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user card */}
        <div className="border-t border-[#1e2b3c] p-4">
          <div className="rounded-xl bg-slate-800/60 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signed in as</p>
            <p className="mt-1 font-display text-sm font-bold text-white">{user?.name || user?.role?.replace('_', ' ')}</p>
            <p className="text-[11px] text-slate-500">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
