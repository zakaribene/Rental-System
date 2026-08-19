import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, ImageOff, PackageX } from 'lucide-react'
import { cn, formatMoney } from '../../lib/utils'

// A searchable product dropdown — swaps the plain <select> for a filterable
// list once the product catalog gets too long to scan by eye. Used by both
// the Rentals and Sales "new transaction" forms.
export default function ProductPicker({
  products,
  value,
  onChange,
  priceKey = 'rentPrice',
  showStock = false,
  placeholder = 'Search product...',
  className,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = products.find((p) => p._id === value) || null

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => [p.name, p.category, p.plateNumber].some((v) => v?.toLowerCase().includes(q)))
  }, [products, query])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
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
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-800"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <PackageX size={18} className="text-ink-300" />
              <p className="text-sm text-ink-400">No products match "{query}"</p>
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => {
                  onChange(p._id)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink-50 dark:hover:bg-ink-700',
                  p._id === value && 'bg-primary-50/60 dark:bg-primary-500/10'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-700">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <ImageOff size={14} className="text-ink-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900 dark:text-white">{p.name}</p>
                  <p className="truncate text-xs text-ink-400">
                    {formatMoney(p[priceKey])}
                    {showStock && <> · {p.stockQty} in stock</>}
                    {priceKey === 'rentPrice' && p.availableQty !== undefined && <> · {p.availableQty} available</>}
                    {p.category && <> · <span className="capitalize">{p.category}</span></>}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
