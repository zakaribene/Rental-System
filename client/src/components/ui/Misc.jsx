import { cn } from '../../lib/utils'

export function Spinner({ className, size = 24 }) {
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-primary-200 border-t-primary-600', className)}
      style={{ width: size, height: size }}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-ink-50 dark:bg-ink-950">
      <Spinner size={36} />
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-500/15">
          <Icon size={26} className="text-primary-500" />
        </div>
      )}
      <div>
        <p className="font-semibold text-ink-800 dark:text-ink-100">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Avatar({ name, imageUrl, className, size = 36 }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')

  if (imageUrl) {
    return (
      <div
        className={cn('shrink-0 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800', className)}
        style={{ width: size, height: size }}
      >
        <img src={imageUrl} alt={name || 'Avatar'} className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 font-semibold text-white',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
}

export function Alert({ tone = 'danger', children }) {
  const tones = {
    danger: 'bg-danger-50 text-danger-700 border-danger-100 dark:bg-danger-500/10 dark:border-danger-500/20 dark:text-danger-400',
    success: 'bg-success-50 text-success-700 border-success-100 dark:bg-success-500/10 dark:border-success-500/20 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-700 border-warning-100 dark:bg-warning-500/10 dark:border-warning-500/20 dark:text-warning-400',
    info: 'bg-info-50 text-info-700 border-info-100 dark:bg-info-500/10 dark:border-info-500/20 dark:text-info-400',
  }
  return <div className={cn('rounded-lg border px-4 py-3 text-sm font-medium', tones[tone])}>{children}</div>
}
