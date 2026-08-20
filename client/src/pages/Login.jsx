import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone,
  Lock,
  ArrowRight,
  UserX,
  Car,
  ChevronRight,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  Headphones,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Alert } from '../components/ui/Misc'
import { apiErrorMessage } from '../api/client'

const FEATURES = [
  { icon: TrendingUp, title: 'Real-time Insights', subtitle: 'Live stats and performance at a glance' },
  { icon: Users, title: 'Customer Management', subtitle: 'Track and manage all your customers' },
  { icon: ShieldCheck, title: 'Secure & Reliable', subtitle: 'Your data is safe with enterprise-grade security' },
]

function SceneArt() {
  return (
    <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMax slice" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1245" />
          <stop offset="55%" stopColor="#160f38" />
          <stop offset="100%" stopColor="#0b0818" />
        </linearGradient>
        <radialGradient id="glowGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#8b7bff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8b7bff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241a52" />
          <stop offset="100%" stopColor="#07060f" />
        </linearGradient>
        <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0818" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b0818" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="headlight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#c9e8ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c9e8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="taillight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ff5fa8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff5fa8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="600" height="800" fill="url(#skyGrad)" />
      <circle cx="470" cy="150" r="180" fill="url(#glowGrad)" />

      <g opacity="0.75">
        <rect x="330" y="260" width="46" height="360" fill="#1c1440" />
        <rect x="384" y="200" width="58" height="420" fill="#211a4d" />
        <rect x="450" y="300" width="42" height="320" fill="#1c1440" />
        <rect x="500" y="230" width="66" height="390" fill="#241d55" />
        <rect x="260" y="330" width="50" height="290" fill="#191238" />
        {Array.from({ length: 60 }).map((_, i) => {
          const buildings = [
            { x: 330, w: 46, y: 260, h: 360 },
            { x: 384, w: 58, y: 200, h: 420 },
            { x: 450, w: 42, y: 300, h: 320 },
            { x: 500, w: 66, y: 230, h: 390 },
            { x: 260, w: 50, y: 330, h: 290 },
          ]
          const b = buildings[i % buildings.length]
          const cols = Math.max(2, Math.floor(b.w / 14))
          const col = i % cols
          const row = Math.floor(i / cols) % 10
          const wx = b.x + 6 + col * 13
          const wy = b.y + 16 + row * 30
          if (wy > b.y + b.h - 10) return null
          const lit = (i * 7) % 3 !== 0
          return (
            <rect
              key={i}
              x={wx}
              y={wy}
              width="6"
              height="9"
              fill={lit ? '#ffd88a' : '#3a3170'}
              opacity={lit ? 0.85 : 0.4}
            />
          )
        })}
      </g>

      <rect x="0" y="560" width="600" height="240" fill="url(#roadGrad)" />
      <rect x="0" y="600" width="600" height="3" fill="#4b3ea3" opacity="0.5" />
      <ellipse cx="230" cy="640" rx="260" ry="60" fill="url(#glowGrad)" opacity="0.6" />

      <g transform="translate(60,540)">
        <ellipse cx="150" cy="118" rx="150" ry="16" fill="#000" opacity="0.45" />
        <path
          d="M8 96 C4 74 20 62 46 58 L74 40 C88 30 112 24 140 24 L206 24 C230 24 244 32 256 46 L276 60 C292 64 300 74 300 88 L300 100 C300 108 294 114 286 114 L20 114 C12 114 8 106 8 96 Z"
          fill="#120c2c"
          stroke="#5a4bd6"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path d="M92 42 C100 32 116 28 140 28 L188 28 C206 28 216 34 226 44 L232 58 L86 58 Z" fill="#1c1444" stroke="#7c6ff2" strokeOpacity="0.4" strokeWidth="1" />
        <circle cx="82" cy="114" r="24" fill="#0a0818" stroke="#4b3ea3" strokeWidth="3" />
        <circle cx="82" cy="114" r="9" fill="#241d55" />
        <circle cx="246" cy="114" r="24" fill="#0a0818" stroke="#4b3ea3" strokeWidth="3" />
        <circle cx="246" cy="114" r="9" fill="#241d55" />
        <rect x="4" y="70" width="14" height="10" rx="3" fill="#dff1ff" />
        <circle cx="0" cy="75" r="26" fill="url(#headlight)" />
        <rect x="292" y="72" width="12" height="9" rx="3" fill="#ff5fa8" />
        <circle cx="300" cy="76" r="22" fill="url(#taillight)" />
      </g>

      <rect x="0" y="0" width="600" height="800" fill="url(#fadeBottom)" />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [waking, setWaking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrorCode('')
    setLoading(true)
    try {
      let user
      try {
        user = await login(phone, password)
      } catch (err) {
        // Render's free tier spins the backend down after inactivity, so the first
        // request from a fresh visitor can fail with a plain network error while it
        // wakes up. Retry once after a short wait instead of showing a false failure.
        if (!err.response) {
          setWaking(true)
          await new Promise((resolve) => setTimeout(resolve, 8000))
          user = await login(phone, password)
        } else {
          throw err
        }
      }
      navigate(user.role === 'SUPER_ADMIN' ? '/admin' : '/store', { replace: true })
    } catch (err) {
      setErrorCode(err.response?.data?.code || '')
      setError(
        !err.response
          ? 'Server-ku ma jawaabin. Fadlan sug daqiiqad kadibna isku day mar kale.'
          : apiErrorMessage(err, 'Invalid phone or password')
      )
    } finally {
      setWaking(false)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-50 px-4 py-8 dark:bg-ink-950">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl dark:bg-primary-600/25" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-400/15" />

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900 md:grid-cols-2">
        {/* Left: brand / illustrated panel */}
        <div className="relative hidden min-h-[820px] flex-col justify-between overflow-hidden p-10 text-white md:flex">
          <div className="absolute inset-0">
            <SceneArt />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 shadow-pop">
              <Car size={20} />
            </div>
            <span className="font-display text-lg font-extrabold">Rental System</span>
          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-primary-100 backdrop-blur">
              All-in-one. Simple. Powerful. <ChevronRight size={14} />
            </span>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight">
              Run your business.
              <br />
              Grow{' '}
              <span className="bg-gradient-to-r from-primary-300 to-primary-500 bg-clip-text text-transparent">
                without limits.
              </span>
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-200">
              Track products, customers, rentals and payments in real time — built for store owners and
              super admins alike.
            </p>

            <div className="mt-7 space-y-3">
              {FEATURES.map(({ icon: Icon, title, subtitle }) => (
                <div key={title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/25 text-primary-200">
                    <Icon size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-ink-300">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 flex items-center gap-1.5 text-xs text-ink-300">
            <ShieldCheck size={14} /> © {new Date().getFullYear()} Rental System. All rights reserved.
          </p>
        </div>

        {/* Right: sign-in form */}
        <div className="relative flex flex-col justify-center gap-6 p-8 sm:p-12">
          <button
            type="button"
            onClick={toggleTheme}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/10"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-primary-700/20 ring-1 ring-primary-400/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700">
                <Lock size={18} className="text-white" />
              </div>
            </div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Welcome back!</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Sign in to continue to your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && errorCode === 'ACCOUNT_DEACTIVATED' ? (
              <div className="flex items-start gap-3 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3.5 dark:border-danger-500/20 dark:bg-danger-500/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-500/20">
                  <UserX size={18} className="text-danger-600 dark:text-danger-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-danger-700 dark:text-danger-400">Account deactivated</p>
                  <p className="mt-0.5 text-sm text-danger-600 dark:text-danger-300">{error}</p>
                </div>
              </div>
            ) : (
              error && <Alert>{error}</Alert>
            )}
            {waking && (
              <Alert tone="info">Server-ku wuu soo baraarugayaa, fadlan sug ilaa 10 sekan...</Alert>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Phone number</span>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="tel"
                  placeholder="612345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                  className="h-11 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-ink-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Password</span>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-10 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-ink-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 transition-colors hover:text-ink-600 dark:hover:text-ink-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 bg-white text-primary-500 focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-0 dark:border-white/20 dark:bg-white/5"
                />
                Remember me
              </label>
              <button
                type="button"
                className="font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 text-base font-semibold text-white shadow-pop transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Your security is our priority</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                We use industry-standard encryption to keep your data safe and secure.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-ink-500 dark:text-ink-400 sm:gap-x-6">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-primary-500 dark:text-primary-400" /> Fast &amp; Easy Access
            </span>
            <span className="h-1 w-1 rounded-full bg-ink-300 dark:bg-ink-700" />
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-primary-500 dark:text-primary-400" /> 99.9% Uptime
            </span>
            <span className="h-1 w-1 rounded-full bg-ink-300 dark:bg-ink-700" />
            <span className="flex items-center gap-1.5">
              <Headphones size={14} className="text-primary-500 dark:text-primary-400" /> 24/7 Support
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
