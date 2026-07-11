import { cn } from '../../lib/utils'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl2 border border-ink-100 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, title, subtitle, action, children }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-4 dark:border-ink-800',
        className
      )}
    >
      <div>
        {title && <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{title}</h3>}
        {subtitle && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
        {children}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('p-6', className)}>{children}</div>
}
