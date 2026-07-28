import { useEffect, useRef, useState } from 'react'
import { Bell, Megaphone, Building2, Globe, Trash2 } from 'lucide-react'
import { getUnreadCount, markAllRead, listStoreNotifications } from '../../api/notifications'
import { formatDateTime } from '../../lib/utils'

const POLL_INTERVAL = 10000

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [880, 1175]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.4)
    })
  } catch {
    // audio not available, ignore
  }
}

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [pulsing, setPulsing] = useState(false)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [toasts, setToasts] = useState([])
  const prevCount = useRef(0)
  const firstLoad = useRef(true)
  // Bumped on every clear-all so any poll request already in flight is
  // discarded when it resolves — otherwise a stale response can overwrite
  // the freshly-cleared count back to its old value.
  const requestToken = useRef(0)
  // Notification ids already shown as a toast (or seeded on first load), so
  // the same notification never pops up twice.
  const shownIds = useRef(new Set())

  const pushToast = (n) => {
    const id = n._id
    setToasts((t) => [...t, { id, message: n.message, leaving: false }])
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)))
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id))
      }, 250)
    }, 3000)
  }

  // On first load this just seeds `shownIds` so pre-existing unread
  // notifications don't all pop up as toasts at once; afterwards it toasts
  // only the notifications that are genuinely new.
  const syncNewNotifications = (announce) => {
    listStoreNotifications()
      .then((list) => {
        const fresh = list.filter((n) => !shownIds.current.has(n._id))
        fresh.forEach((n) => shownIds.current.add(n._id))
        if (announce) {
          fresh
            .slice()
            .reverse()
            .forEach((n) => pushToast(n))
        }
      })
      .catch(() => {})
  }

  const poll = () => {
    const token = ++requestToken.current
    getUnreadCount()
      .then(({ count: newCount }) => {
        if (token !== requestToken.current) return
        const isNew = !firstLoad.current && newCount > prevCount.current
        if (isNew) {
          playChime()
          setPulsing(true)
          setTimeout(() => setPulsing(false), 3000)
          syncNewNotifications(true)
        } else if (firstLoad.current) {
          syncNewNotifications(false)
        }
        firstLoad.current = false
        prevCount.current = newCount
        setCount(newCount)
      })
      .catch(() => {})
  }

  useEffect(() => {
    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const openPanel = () => {
    setOpen((v) => !v)
    if (!open) {
      setLoadingList(true)
      listStoreNotifications()
        .then(setNotifications)
        .finally(() => setLoadingList(false))
    }
  }

  const handleClearAll = async () => {
    // Invalidate any in-flight poll so it can't resurrect the old count.
    requestToken.current++
    prevCount.current = 0
    setCount(0)
    setNotifications([])
    setOpen(false)
    try {
      await markAllRead()
    } catch {
      // best-effort — local state is already cleared
    }
  }

  return (
    <>
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-3 shadow-pop dark:border-ink-800 dark:bg-ink-900 ${
              t.leaving ? 'animate-toastOut' : 'animate-toastIn'
            }`}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-500/15">
              <Bell size={15} className="text-primary-600 dark:text-primary-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">New notification</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={openPanel}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 ${
            pulsing ? 'animate-[wiggle_0.4s_ease-in-out_2]' : ''
          }`}
        >
          <Bell size={19} strokeWidth={2.25} />
          {count > 0 && (
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-ink-900 ${
                pulsing ? 'animate-[bounce_0.5s_ease-in-out_3]' : ''
              }`}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card animate-fadeIn dark:border-ink-800 dark:bg-ink-900">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                <p className="text-sm font-bold text-ink-900 dark:text-white">Notifications</p>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-xs font-semibold text-ink-400 transition-colors hover:text-danger-600"
                  >
                    <Trash2 size={12} />
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loadingList ? (
                  <div className="flex h-24 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Megaphone size={22} className="text-ink-300" />
                    <p className="text-sm text-ink-400">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-ink-50 dark:divide-ink-800">
                    {notifications.map((n) => (
                      <div key={n._id} className="flex items-start gap-2.5 px-4 py-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-500/15">
                          {n.targetStoreId ? (
                            <Building2 size={13} className="text-primary-600 dark:text-primary-300" />
                          ) : (
                            <Globe size={13} className="text-primary-600 dark:text-primary-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink-700 dark:text-ink-200">{n.message}</p>
                          <p className="mt-0.5 text-[11px] text-ink-400">{formatDateTime(n.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
