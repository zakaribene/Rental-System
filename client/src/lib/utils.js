import { clsx } from 'clsx'

export function cn(...inputs) {
  return clsx(inputs)
}

export function formatMoney(amount) {
  const value = Number(amount) || 0
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}`
}

export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const RELATIVE_UNITS = [
  { limit: 60, divisor: 1, unit: 's' },
  { limit: 3600, divisor: 60, unit: 'm' },
  { limit: 86400, divisor: 3600, unit: 'h' },
  { limit: 604800, divisor: 86400, unit: 'd' },
  { limit: 2629800, divisor: 604800, unit: 'w' },
  { limit: 31557600, divisor: 2629800, unit: 'mo' },
  { limit: Infinity, divisor: 31557600, unit: 'y' },
]

// "just now" / "5m ago" / "3d ago" / "2y ago" ...
export function formatRelativeTime(date) {
  if (!date) return '—'
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 45) return 'just now'

  const { divisor, unit } = RELATIVE_UNITS.find((u) => seconds < u.limit)
  const value = Math.round(seconds / divisor)
  return `${value}${unit} ago`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}
