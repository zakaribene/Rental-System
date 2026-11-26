import { useEffect, useRef, useState } from 'react'
import { LogOut, ChevronDown, Sun, Moon, Menu, Phone, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import NotificationBell from './NotificationBell'
import AccountAvatar from './AccountAvatar'

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const isStoreUser = user?.role === 'STORE_OWNER' || user?.role === 'STORE_STAFF'

  useEffect(() => {
    if (!open) return undefined
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  const roleLabel = (user?.role || '').replace('_', ' ').toLowerCase()
  const displayName = user?.name || 'Super Admin'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')

  const today = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu size={18} />
        </button>
        <h2 className="truncate font-display text-sm font-bold text-slate-900 dark:text-white sm:text-base">{title}</h2>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Date badge */}
        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:flex">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {today}
        </span>

        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {isStoreUser && <NotificationBell />}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="tb-prof"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="tb-av" aria-hidden="true">{initials}<i /></span>
            <span className="tb-who hidden sm:flex">
              <b>{displayName}</b>
              <span>{user?.phone || roleLabel}</span>
            </span>
            <ChevronDown size={16} className="tb-chev hidden sm:block" />
          </button>

          {open && (
            <div className="tb-menu" role="menu">
              <div className="tb-mhead">
                <AccountAvatar size={42} />
                <span className="min-w-0">
                  <b className="truncate">{displayName}</b>
                  <small className="capitalize">{roleLabel}</small>
                </span>
              </div>
              <div className="tb-hr" />
              <div className="tb-mi">
                <Phone size={16} />
                Phone
                <span className="tb-mval">{user?.phone || '—'}</span>
              </div>
              <div className="tb-mi">
                <ShieldCheck size={16} />
                Role
                <span className="tb-mval capitalize">{roleLabel}</span>
              </div>
              <div className="tb-hr" />
              <div className="tb-mi">
                <Moon size={16} />
                Theme
                <span className="tb-seg">
                  <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => theme !== 'light' && toggleTheme()}>Light</button>
                  <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => theme !== 'dark' && toggleTheme()}>Dark</button>
                </span>
              </div>
              <div className="tb-hr" />
              <button type="button" role="menuitem" onClick={logout} className="tb-mi out">
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
