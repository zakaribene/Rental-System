import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Tag, TagsIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

// Searchable category dropdown for the product form — categories are
// store-defined (via the Categories modal) rather than a hardcoded list, so
// this needs to filter instead of a plain <select> once a store has many.
export default function CategoryPicker({ categories, value, onChange, placeholder = 'Search category...', className }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, query])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={open ? query : value || ''}
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
        <div className="absolute z-20 mt-1.5 max-h-64 w-full min-w-[14rem] overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <TagsIcon size={18} className="text-ink-300" />
              <p className="text-sm text-ink-400">No categories yet — add one from "Categories" above.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-400">No categories match "{query}"</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => {
                  onChange(c.name)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-ink-50 dark:hover:bg-ink-700',
                  c.name === value && 'bg-primary-50/60 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                )}
              >
                <Tag size={14} className="shrink-0 text-ink-400" />
                <span className="truncate font-medium text-ink-800 dark:text-ink-100">{c.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
