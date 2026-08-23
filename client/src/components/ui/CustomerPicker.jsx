import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, UserRound, UserX, UserPlus, Check, X } from 'lucide-react'
import { cn, initials } from '../../lib/utils'
import { createCustomer } from '../../api/customers'
import { apiErrorMessage } from '../../api/client'

// Searchable customer dropdown — swaps the plain <select> for a filterable
// list once the customer book gets too long to scan by eye. `allowWalkIn`
// pins a "Walk-in customer" option so the selection can be cleared back to
// none (used by Sales, where a customer is optional). `allowCreate` adds an
// inline "create new customer" flow for when a typed name has no match, so
// the user never has to leave the rental/sale form to add one.
export default function CustomerPicker({
  customers,
  value,
  onChange,
  allowWalkIn = false,
  allowCreate = false,
  onCreated,
  placeholder = 'Search customer by name or phone...',
  className,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const containerRef = useRef(null)

  const selected = customers.find((c) => c._id === value) || null

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => [c.fullName, c.phone].some((v) => v?.toLowerCase().includes(q)))
  }, [customers, query])

  const startCreate = () => {
    setCreateName(query.trim())
    setCreatePhone('')
    setCreateError('')
    setCreating(true)
  }

  const cancelCreate = () => {
    setCreating(false)
    setCreateError('')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!createName.trim() || !createPhone.trim()) {
      setCreateError('Name and phone are required.')
      return
    }
    setCreateSaving(true)
    setCreateError('')
    try {
      const customer = await createCustomer({ fullName: createName.trim(), phone: createPhone.trim() })
      onCreated?.(customer)
      onChange(customer._id)
      setCreating(false)
      setQuery('')
      setOpen(false)
    } catch (err) {
      setCreateError(apiErrorMessage(err, 'Failed to create customer'))
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={open ? query : selected?.fullName || ''}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          placeholder={!open && allowWalkIn && !selected ? 'Walk-in customer' : placeholder}
          className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-800"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 max-h-80 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800">
          {creating ? (
            <form onSubmit={handleCreate} className="space-y-2 p-3">
              <p className="text-xs font-semibold text-ink-500 dark:text-ink-300">New customer</p>
              <input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Full name"
                className="h-9 w-full rounded-md border border-ink-200 bg-white px-2.5 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-900"
              />
              <input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="Phone number"
                className="h-9 w-full rounded-md border border-ink-200 bg-white px-2.5 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-900"
              />
              {createError && <p className="text-xs font-medium text-danger-600">{createError}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={createSaving}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-success-600 text-xs font-semibold text-white transition-colors hover:bg-success-700 disabled:opacity-60"
                >
                  {createSaving ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Check size={14} />
                  )}
                  Create customer
                </button>
                <button
                  type="button"
                  onClick={cancelCreate}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-ink-200 px-2.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700"
                >
                  <X size={14} />
                </button>
              </div>
            </form>
          ) : (
            <>
              {allowWalkIn && (
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 dark:bg-ink-700">
                    <UserX size={14} className="text-ink-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900 dark:text-white">Walk-in customer</p>
                    <p className="truncate text-xs text-ink-400">No customer on record</p>
                  </div>
                </button>
              )}

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                  <UserRound size={18} className="text-ink-300" />
                  <p className="text-sm text-ink-400">No customers match "{query}"</p>
                  {allowCreate && query.trim() && (
                    <button
                      type="button"
                      onClick={startCreate}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700 transition-colors hover:bg-success-100 dark:bg-success-500/15 dark:text-success-300 dark:hover:bg-success-500/25"
                    >
                      <UserPlus size={14} />
                      Create "{query.trim()}" as new customer
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filtered.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        onChange(c._id)
                        setQuery('')
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-ink-50 dark:hover:bg-ink-700',
                        c._id === value && 'bg-primary-50/60 dark:bg-primary-500/10'
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                        {c.photoUrl ? (
                          <img src={c.photoUrl} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          initials(c.fullName) || <UserRound size={14} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink-900 dark:text-white">
                          {c.isRisky && <span className="mr-1 text-warning-500">⚠</span>}
                          {c.fullName}
                        </p>
                        <p className="truncate text-xs text-ink-400">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                  {allowCreate && query.trim() && (
                    <button
                      type="button"
                      onClick={startCreate}
                      className="flex w-full items-center gap-3 border-t border-ink-100 px-3.5 py-2.5 text-left text-sm font-semibold text-success-700 transition-colors hover:bg-success-50 dark:border-ink-700 dark:text-success-300 dark:hover:bg-success-500/10"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/15">
                        <UserPlus size={14} />
                      </div>
                      Create "{query.trim()}" as new customer
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
