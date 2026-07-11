import { cn } from '../../lib/utils'

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
          {label} {required && <span className="text-danger-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-danger-600">{error}</span>}
    </label>
  )
}

export default function Input({ className, icon: Icon, error, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />}
      <input
        className={cn(
          'h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400',
          'transition-colors focus:outline-none focus:ring-4',
          'dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500',
          error
            ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
            : 'border-ink-200 focus:border-primary-400 focus:ring-primary-100 dark:border-ink-700',
          Icon && 'pl-9',
          className
        )}
        {...props}
      />
    </div>
  )
}

export function Select({ className, children, error, ...props }) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink-900',
        'transition-colors focus:outline-none focus:ring-4',
        'dark:bg-ink-800 dark:text-ink-100',
        error
          ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
          : 'border-ink-200 focus:border-primary-400 focus:ring-primary-100 dark:border-ink-700',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, error, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400',
        'transition-colors focus:outline-none focus:ring-4',
        'dark:bg-ink-800 dark:text-ink-100 dark:placeholder:text-ink-500',
        error
          ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
          : 'border-ink-200 focus:border-primary-400 focus:ring-primary-100 dark:border-ink-700',
        className
      )}
      {...props}
    />
  )
}
