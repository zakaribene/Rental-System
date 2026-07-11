import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Input, { Field } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Alert } from '../components/ui/Misc'
import { apiErrorMessage } from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(phone, password)
      navigate(user.role === 'SUPER_ADMIN' ? '/admin' : '/store', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid phone or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary-600 via-primary-700 to-ink-950 p-10 text-white md:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Sparkles size={20} />
            </div>
            <span className="font-display text-lg font-extrabold">Rental System</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight">
              Run every store from one beautiful console.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-primary-100">
              Track products, customers, rentals and payments in real time — built for store owners and
              super admins alike.
            </p>
          </div>
          <p className="text-xs text-primary-200">© {new Date().getFullYear()} Rental System</p>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-extrabold text-ink-900">Welcome back</h2>
            <p className="mt-1 text-sm text-ink-500">Sign in to continue to your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}

            <Field label="Phone number" required>
              <Input
                icon={Phone}
                type="tel"
                placeholder="612345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
            </Field>

            <Field label="Password" required>
              <Input
                icon={Lock}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
