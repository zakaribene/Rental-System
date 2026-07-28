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

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}
