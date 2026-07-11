import { cn } from '../../lib/utils'

const tones = {
  neutral: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300',
  success: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-400',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  info: 'bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-400',
}

const dotTones = {
  neutral: 'bg-ink-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  info: 'bg-info-500',
}

export default function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} />}
      {children}
    </span>
  )
}

const statusTone = {
  active: 'success',
  available: 'success',
  returned: 'success',
  inactive: 'neutral',
  rented: 'info',
  overdue: 'danger',
  damaged: 'warning',
  lost: 'danger',
}

export function StatusBadge({ status }) {
  return (
    <Badge tone={statusTone[status] || 'neutral'} dot>
      {status}
    </Badge>
  )
}
