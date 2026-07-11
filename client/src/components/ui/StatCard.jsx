import { cn } from '../../lib/utils'

const tones = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-100' },
  success: { bg: 'bg-success-50', text: 'text-success-600', ring: 'ring-success-100' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', ring: 'ring-warning-100' },
  info: { bg: 'bg-info-50', text: 'text-info-600', ring: 'ring-info-100' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', ring: 'ring-danger-100' },
}

export default function StatCard({ label, value, icon: Icon, tone = 'primary', trend, className }) {
  const t = tones[tone]
  return (
    <div className={cn('group rounded-xl2 border border-ink-100 bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5 dark:border-ink-800 dark:bg-ink-900', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink-900 dark:text-white">{value}</p>
        </div>
        {Icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-4', t.bg, t.ring)}>
            <Icon size={20} className={t.text} strokeWidth={2.25} />
          </div>
        )}
      </div>
      {trend && (
        <p className={cn('mt-3 text-xs font-semibold', trend.positive ? 'text-success-600' : 'text-danger-600')}>
          {trend.label}
        </p>
      )}
    </div>
  )
}
