import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Search, Store as StoreIcon, ChevronDown, Globe } from 'lucide-react'
import { listStores, updateSubscription, grantGracePeriod, clearGracePeriod } from '../../api/stores'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDateTime } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const BANNER_COLOR_PRESETS = ['#f59e0b', '#ef4444', '#6c4fff', '#3b82f6', '#10b981']

function defaultGraceMessage(days) {
  return `Subscription-kaagu wuu dhammaaday. Waxaa lagu siiyey ${days} maalmood oo dheeraad ah. Fadlan bixi lacagta Subscription-ka inta muddadan ay socoto si adeeggaagu u sii shaqeeyo.`
}

const ALL_STORES_ID = 'all'

function subscriptionTone(status) {
  if (status === 'grace') return 'warning'
  if (status === 'expired') return 'danger'
  return 'success'
}

function StoreSearchSelect({ stores, value, onChange }) {
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
    if (!q) return stores
    return stores.filter((s) => [s.storeName, s.ownerName, s.ownerPhone].some((v) => v?.toLowerCase().includes(q)))
  }, [stores, query])

  const showAllOption = 'all stores'.includes(query.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={open ? query : value?.storeName || ''}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          placeholder="Search store by name, owner or phone..."
          className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-800"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800">
          {showAllOption && (
            <button
              type="button"
              onClick={() => {
                onChange({ _id: ALL_STORES_ID, storeName: 'All stores', ownerName: `${stores.length} store(s)`, ownerPhone: '' })
                setQuery('')
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 border-b border-ink-100 px-4 py-2.5 text-left text-sm hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-700"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Globe size={14} className="text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900 dark:text-white">All stores</p>
                <p className="truncate text-xs text-ink-400">Apply the action below to every store ({stores.length})</p>
              </div>
            </button>
          )}
          {filtered.length === 0 ? (
            !showAllOption && <p className="px-4 py-3 text-sm text-ink-400">No stores match.</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => {
                  onChange(s)
                  setQuery('')
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-700"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                  <StoreIcon size={14} className="text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900 dark:text-white">{s.storeName}</p>
                  <p className="truncate text-xs text-ink-400">
                    {s.ownerName} · {s.ownerPhone}
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

export default function Subscriptions() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState('')
  const [graceDays, setGraceDays] = useState('3')
  const [bannerColor, setBannerColor] = useState('#f59e0b')
  const [graceMessage, setGraceMessage] = useState(defaultGraceMessage('3'))
  const [messageTouched, setMessageTouched] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const [saved, setSaved] = useState('')

  const load = () => {
    setLoading(true)
    listStores()
      .then(setStores)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // Keep the selected store's own details (status, dates) in sync after a refetch.
  useEffect(() => {
    if (!selected || selected._id === ALL_STORES_ID) return
    const fresh = stores.find((s) => s._id === selected._id)
    if (fresh) setSelected(fresh)
  }, [stores])

  const handleSelect = (store) => {
    setSelected(store)
    setSubscriptionEndsAt('')
    setGraceDays('3')
    setBannerColor(store.graceBannerColor || '#f59e0b')
    setGraceMessage(store.graceMessage || defaultGraceMessage('3'))
    setMessageTouched(false)
    setError('')
    setSaved('')
  }

  const handleGraceDaysChange = (value) => {
    setGraceDays(value)
    if (!messageTouched) setGraceMessage(defaultGraceMessage(value || '0'))
  }

  const handleRenew = async (e) => {
    e.preventDefault()
    setError('')
    setSaved('')
    if (!subscriptionEndsAt) {
      setError('Choose a subscription end date.')
      return
    }
    setSaving('renew')
    try {
      const isoDate = new Date(subscriptionEndsAt).toISOString()
      if (selected._id === ALL_STORES_ID) {
        await Promise.all(stores.map((s) => updateSubscription(s._id, isoDate)))
        load()
        setSaved(`Subscription renewed for ${stores.length} store(s).`)
      } else {
        const updated = await updateSubscription(selected._id, isoDate)
        setSelected(updated)
        setStores((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
        setSaved('Subscription renewed.')
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to renew subscription'))
    } finally {
      setSaving('')
    }
  }

  const handleGrantGrace = async (e) => {
    e.preventDefault()
    setError('')
    setSaved('')
    const days = Number(graceDays)
    if (!days || days <= 0) {
      setError('Enter a positive number of days.')
      return
    }
    setSaving('grace')
    try {
      const message = graceMessage.trim()
      if (selected._id === ALL_STORES_ID) {
        await Promise.all(stores.map((s) => grantGracePeriod(s._id, days, bannerColor, message)))
        load()
        setSaved(`Grace period granted to ${stores.length} store(s).`)
      } else {
        const updated = await grantGracePeriod(selected._id, days, bannerColor, message)
        setSelected(updated)
        setStores((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
        setSaved('Grace period granted.')
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to grant grace period'))
    } finally {
      setSaving('')
    }
  }

  const handleClearGrace = async () => {
    const isAll = selected._id === ALL_STORES_ID
    if (
      !confirm(
        isAll
          ? `Clear the grace period for all ${stores.length} store(s)? Use this once payment has been received.`
          : 'Clear the grace period and hide the banner for this store? Use this once payment has been received.'
      )
    )
      return
    setError('')
    setSaved('')
    setSaving('clear')
    try {
      if (isAll) {
        await Promise.all(stores.map((s) => clearGracePeriod(s._id)))
        load()
        setSaved(`Grace period cleared for ${stores.length} store(s).`)
      } else {
        const updated = await clearGracePeriod(selected._id)
        setSelected(updated)
        setStores((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
        setSaved('Grace period cleared.')
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to clear grace period'))
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Subscriptions"
        subtitle="Search for a store to renew its subscription, or grant/extend a grace period."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader title="Find a store" />
          <CardBody>
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Spinner size={24} />
              </div>
            ) : (
              <StoreSearchSelect stores={stores} value={selected} onChange={handleSelect} />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={selected ? selected.storeName : 'Subscription'} subtitle={selected ? `${selected.ownerName} · ${selected.ownerPhone}` : undefined} />
          <CardBody>
            {!selected ? (
              <EmptyState icon={CalendarClock} title="No store selected" subtitle="Search and pick a store to manage its subscription." />
            ) : (
              <div className="space-y-6">
                {error && <Alert>{error}</Alert>}
                {saved && <Alert tone="success">{saved}</Alert>}

                <div className="rounded-lg border border-ink-200 px-4 py-3 text-sm dark:border-ink-700">
                  {selected._id === ALL_STORES_ID ? (
                    <p className="text-ink-500">
                      Any action below is applied to <strong>every store</strong> ({stores.length} total) at once.
                    </p>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 text-ink-500">
                        Current status:
                        <Badge tone={subscriptionTone(selected.subscriptionStatus)}>{selected.subscriptionStatus || 'active'}</Badge>
                      </p>
                      {selected.subscriptionStatus === 'grace' && selected.gracePeriodEndsAt && (
                        <p className="mt-1 text-ink-500">Grace period ends {formatDateTime(selected.gracePeriodEndsAt)}</p>
                      )}
                      {selected.subscriptionEndsAt && (
                        <p className="mt-1 text-ink-500">Subscription ends {formatDateTime(selected.subscriptionEndsAt)}</p>
                      )}
                    </>
                  )}
                  {(selected._id === ALL_STORES_ID || selected.subscriptionStatus === 'grace') && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100 pt-3 dark:border-ink-800">
                      <p className="text-xs text-ink-400">Already paid? Clear the grace banner without setting a new end date.</p>
                      <Button size="sm" variant="ghost" loading={saving === 'clear'} onClick={handleClearGrace}>
                        Clear grace period
                      </Button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleRenew} className="space-y-4">
                  <p className="text-sm font-semibold text-ink-700 dark:text-ink-300">Renew subscription (payment received)</p>
                  <Field label="New subscription end date" required>
                    <Input
                      type="datetime-local"
                      value={subscriptionEndsAt}
                      onChange={(e) => setSubscriptionEndsAt(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" loading={saving === 'renew'}>
                    Renew subscription
                  </Button>
                </form>

                <div className="border-t border-ink-100 pt-5 dark:border-ink-800">
                  <form onSubmit={handleGrantGrace} className="space-y-4">
                    <p className="text-sm font-semibold text-ink-700 dark:text-ink-300">Grant grace period / reactivate</p>
                    <Field label="Grace days" required>
                      <Input type="number" min="1" value={graceDays} onChange={(e) => handleGraceDaysChange(e.target.value)} required />
                    </Field>
                    <Field label="Banner message" required hint="Shown to the store owner — edit it however you like.">
                      <Textarea
                        rows={3}
                        value={graceMessage}
                        onChange={(e) => {
                          setGraceMessage(e.target.value)
                          setMessageTouched(true)
                        }}
                        required
                      />
                    </Field>
                    <Field label="Banner color" hint="Shown to the store owner while the countdown is running.">
                      <div className="flex items-center gap-2">
                        {BANNER_COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBannerColor(c)}
                            className={`h-8 w-8 shrink-0 rounded-full ring-offset-2 ring-offset-white transition-all dark:ring-offset-ink-900 ${
                              bannerColor === c ? 'ring-2 ring-ink-800 dark:ring-white' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={bannerColor}
                          onChange={(e) => setBannerColor(e.target.value)}
                          className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-ink-200 bg-transparent p-0 dark:border-ink-700"
                          title="Custom color"
                        />
                      </div>
                    </Field>
                    <Button type="submit" variant="secondary" loading={saving === 'grace'}>
                      Grant grace period
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
