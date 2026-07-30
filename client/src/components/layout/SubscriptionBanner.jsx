import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getMyStore } from '../../api/myStore'

const POLL_INTERVAL = 3000
const DEFAULT_COLOR = '#f59e0b'

// Lighten/darken a hex color by `percent` (-100 to 100) to build a gradient
// out of whatever single color the super admin picked (same technique as
// AnnouncementBanner.jsx).
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, (num >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
  return `rgb(${r}, ${g}, ${b})`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return '00:00:00'
  const totalSeconds = Math.floor(msRemaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  if (days >= 1) {
    return `${days} maalmood`
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export default function SubscriptionBanner() {
  const [store, setStore] = useState(null)
  const [now, setNow] = useState(Date.now())
  const expiredHandled = useRef(false)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      getMyStore()
        .then((s) => {
          if (!cancelled) setStore(s)
        })
        .catch(() => {
          if (!cancelled) setStore(null)
        })
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])

  const gracePeriodEndsAt = store?.subscriptionStatus === 'grace' && store.gracePeriodEndsAt ? new Date(store.gracePeriodEndsAt).getTime() : null
  const msRemaining = gracePeriodEndsAt ? gracePeriodEndsAt - now : null

  useEffect(() => {
    if (msRemaining !== null && msRemaining <= 0 && !expiredHandled.current) {
      expiredHandled.current = true
      // Re-poll immediately instead of waiting the full interval, so the
      // deactivation flip (done server-side by the cron sweep) reflects
      // without delay — if the store is now inactive the API layer already
      // logs the user out via the STORE_DEACTIVATED interceptor.
      getMyStore()
        .then(setStore)
        .catch(() => {})
    } else if (msRemaining !== null && msRemaining > 0) {
      expiredHandled.current = false
    }
  }, [msRemaining])

  if (!store || store.subscriptionStatus !== 'grace' || msRemaining === null) return null

  const baseColor = store.graceBannerColor || DEFAULT_COLOR
  const countdownText = formatCountdown(msRemaining)

  return (
    <div
      className="relative isolate z-30 overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(to right, ${shadeColor(baseColor, -15)}, ${baseColor}, ${shadeColor(baseColor, 12)})` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.35) 0, transparent 40%)',
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 py-3 text-center sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-inset ring-white/30">
            <AlertTriangle size={17} strokeWidth={2.25} color="#ffffff" />
          </span>
          <p className="text-base font-bold sm:text-lg" style={{ color: '#ffffff' }}>
            {store.graceMessage ||
              `Subscription-kaagu wuu dhammaaday. Waxaa lagu siiyey ${store.graceDays} maalmood oo dheeraad ah. Fadlan bixi lacagta Subscription-ka inta muddadan ay socoto si adeeggaagu u sii shaqeeyo.`}
          </p>
        </div>
        <p className="text-sm font-semibold text-white/90">Waxaa kuu haray: {countdownText}</p>
      </div>
    </div>
  )
}
