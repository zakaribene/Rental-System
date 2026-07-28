import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { getActiveBanner } from '../../api/notifications'

const POLL_INTERVAL = 30000
const DISMISS_DURATION = 5 * 60 * 1000

function isDismissed(id) {
  const until = Number(localStorage.getItem(`banner-dismiss-${id}`) || 0)
  return Date.now() < until
}

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const poll = () => {
      getActiveBanner()
        .then((b) => {
          setBanner(b || null)
          setDismissed(b ? isDismissed(b._id) : false)
        })
        .catch(() => {
          setBanner(null)
        })
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = () => {
    if (!banner) return
    localStorage.setItem(`banner-dismiss-${banner._id}`, String(Date.now() + DISMISS_DURATION))
    setDismissed(true)
  }

  if (!banner || !banner.message || dismissed) return null

  return (
    <div className="relative isolate z-30 overflow-hidden bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 shadow-lg">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.35) 0, transparent 40%)',
        }}
      />
      <div className="relative mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-inset ring-white/30">
            <BellRing size={17} strokeWidth={2.25} color="#ffffff" />
          </span>
          <p className="hidden text-[11px] font-semibold uppercase tracking-wide text-white/70 sm:block">Announcement</p>
        </div>

        <div className="pointer-events-none absolute inset-x-16 top-1/2 -translate-y-1/2 text-center sm:inset-x-24">
          <p className="truncate text-base font-bold sm:whitespace-normal sm:text-lg" style={{ color: '#ffffff' }}>
            {banner.message}
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="relative ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          title="Dismiss for 5 minutes"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  )
}
