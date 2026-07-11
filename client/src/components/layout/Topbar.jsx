import { useState } from 'react'
import { LogOut, ChevronDown, Sun, Moon, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import NotificationBell from './NotificationBell'
import AccountAvatar from './AccountAvatar'

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const isStoreUser = user?.role === 'STORE_OWNER' || user?.role === 'STORE_STAFF'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 md:hidden"
        >
          <Menu size={20} />
        </button>
        <h2 className="truncate font-display text-base font-bold text-ink-900 dark:text-white sm:text-lg">{title}</h2>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          onClick={toggleTheme}
          className="hidden h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 sm:flex"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isStoreUser && <NotificationBell />}

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800 sm:gap-2.5 sm:pr-2"
          >
            <AccountAvatar size={34} />
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{user?.name || 'Super Admin'}</p>
              <p className="text-xs text-ink-400">{user?.phone || '—'}</p>
            </div>
            <ChevronDown size={16} className="hidden text-ink-400 sm:block" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 shadow-card animate-fadeIn dark:border-ink-800 dark:bg-ink-900">
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800 sm:hidden"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50 dark:hover:bg-danger-500/10"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
