import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, WalletCards, BanknoteX } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getMethodVisual } from '../../lib/paymentMethodVisuals'

// Searchable payment method dropdown, with a colored icon per method (Cash,
// EVC, eDahab/Zaad, Premier Bank, ...) instead of a plain <select> list.
// `allowNone` pins a "No payment now" option that clears the selection —
// the only way to get back to "nothing chosen" once a method is picked.
export default function PaymentMethodPicker({
  methods,
  value,
  onChange,
  allowNone = false,
  placeholder = 'Search payment method...',
  className,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = methods.find((m) => m._id === value) || null

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return methods
    return methods.filter((m) => m.name?.toLowerCase().includes(q))
  }, [methods, query])

  const SelectedIcon = selected ? getMethodVisual(selected.name).icon : null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        {SelectedIcon && !open ? (
          <SelectedIcon size={16} className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2', getMethodVisual(selected.name).text)} />
        ) : (
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        )}
        <input
          value={open ? query : selected?.name || ''}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          placeholder={!open && allowNone && !selected ? 'No payment now' : placeholder}
          className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-800"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full min-w-[15rem] overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800">
          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setQuery('')
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-3 border-b border-ink-100 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-700',
                !value && 'bg-primary-50/60 dark:bg-primary-500/10'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-700">
                <BanknoteX size={16} className="text-ink-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900 dark:text-white">No payment now</p>
                <p className="truncate text-xs text-ink-400">Full amount owed by the customer</p>
              </div>
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <WalletCards size={18} className="text-ink-300" />
              <p className="text-sm text-ink-400">No payment methods match "{query}"</p>
            </div>
          ) : (
            filtered.map((m) => {
              const visual = getMethodVisual(m.name)
              const Icon = visual.icon
              return (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => {
                    onChange(m._id)
                    setQuery('')
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-ink-50 dark:hover:bg-ink-700',
                    m._id === value && 'bg-primary-50/60 dark:bg-primary-500/10'
                  )}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-4', visual.bg, visual.ring)}>
                    <Icon size={16} className={visual.text} strokeWidth={2.25} />
                  </div>
                  <span className="truncate font-medium text-ink-900 dark:text-white">{m.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
