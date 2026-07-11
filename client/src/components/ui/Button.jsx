import { cn } from '../../lib/utils'

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 shadow-soft focus-visible:ring-primary-300 disabled:bg-primary-300',
  secondary:
    'bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 focus-visible:ring-ink-200 dark:bg-ink-800 dark:text-ink-100 dark:border-ink-700 dark:hover:bg-ink-700',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 focus-visible:ring-ink-200 dark:text-ink-300 dark:hover:bg-ink-800',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-300 disabled:bg-danger-300',
  subtle: 'bg-primary-50 text-primary-700 hover:bg-primary-100 focus-visible:ring-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25',
}

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className,
  icon: Icon,
  loading = false,
  children,
  disabled,
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon size={16} strokeWidth={2.25} />
      )}
      {children}
    </Component>
  )
}
