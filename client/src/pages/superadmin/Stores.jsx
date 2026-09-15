import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Building2,
  Search,
  Phone,
  User,
  Lock,
  Store as StoreIcon,
  KeyRound,
  LogIn,
  Pencil,
  Power,
  ShoppingBag,
  Receipt,
  ArrowLeftRight,
  ClipboardList,
  SlidersHorizontal,
  Check,
} from 'lucide-react'
import { listStores, createStore, updateStore, resetStorePassword, impersonateStore } from '../../api/stores'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDate, formatRelativeTime, cn } from '../../lib/utils'
import { apiErrorMessage, getAccessToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { stashAdminSession } from '../../components/layout/ImpersonationBar'

const emptyForm = { storeName: '', ownerName: '', ownerPhone: '', password: '' }
const MIN_PASSWORD_LENGTH = 6
const LIVE_REFRESH_INTERVAL = 4000

// Every per-store feature the Super Admin can switch on/off from one place.
// Add a new row here and it shows up in the "Manage features" modal — no
// other wiring on this page needed.
const STORE_FEATURES = [
  {
    key: 'rentalsEnabled',
    label: 'Rentals',
    icon: ClipboardList,
    description: 'Rent items out to customers — deposits, due dates, returns and damage tracking.',
  },
  {
    key: 'salesEnabled',
    label: 'Sales',
    icon: ShoppingBag,
    description: 'Point-of-sale — sell products outright and track sales revenue.',
  },
  {
    key: 'expensesEnabled',
    label: 'Expenses',
    icon: Receipt,
    description: "Record store spending, deducted from each payment method's balance.",
  },
  {
    key: 'transfersEnabled',
    label: 'Transfer Payments',
    icon: ArrowLeftRight,
    description: 'Move money between payment methods (e.g. Cash → Bank).',
  },
]

export default function Stores() {
  const navigate = useNavigate()
  const { user: adminUser, impersonate } = useAuth()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [featuresTarget, setFeaturesTarget] = useState(null)
  const [impersonatingId, setImpersonatingId] = useState('')

  const load = (silent) => {
    if (!silent) setLoading(true)
    listStores()
      .then(setStores)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Keep "Online" status feeling live without a full page refresh.
    const interval = setInterval(() => load(true), LIVE_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const handleImpersonate = async (store) => {
    setImpersonatingId(store._id)
    try {
      const { accessToken, user: storeUser } = await impersonateStore(store._id)
      stashAdminSession(getAccessToken(), adminUser, store.storeName, storeUser.name)
      impersonate(accessToken, storeUser)
      navigate('/store')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to log in as this store'))
    } finally {
      setImpersonatingId('')
    }
  }

  const filtered = stores.filter((s) =>
    [s.storeName, s.ownerName, s.ownerPhone].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  )
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, 10)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (store) => {
    setEditing(store)
    setForm({ storeName: store.storeName, ownerName: store.ownerName, ownerPhone: store.ownerPhone, password: '' })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password && form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateStore(editing._id, {
          storeName: form.storeName,
          ownerName: form.ownerName,
          ownerPhone: form.ownerPhone,
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await createStore(form)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save store'))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (store) => {
    await updateStore(store._id, { status: store.status === 'active' ? 'inactive' : 'active' })
    load()
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Stores"
        subtitle="Create and manage every store on the platform."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New store
          </Button>
        }
      />

      {error && !modalOpen && !resetTarget && !featuresTarget && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores..."
              className="h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <span className="text-sm font-medium text-ink-400">{total} total</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No stores found"
            subtitle="Create your first store to get started."
            action={
              <Button icon={Plus} onClick={openCreate} size="sm">
                New store
              </Button>
            }
          />
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'storeName',
                  header: 'Store',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                        <StoreIcon size={16} className="text-primary-600" />
                      </div>
                      <span className="font-semibold text-ink-900 dark:text-white">{row.storeName}</span>
                    </div>
                  ),
                },
                { key: 'ownerName', header: 'Owner' },
                { key: 'ownerPhone', header: 'Phone' },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'rentals',
                  header: 'Rentals',
                  render: (row) => (
                    <Badge tone={row.rentalsEnabled ? 'success' : 'neutral'}>{row.rentalsEnabled ? 'Enabled' : 'Disabled'}</Badge>
                  ),
                },
                {
                  key: 'sales',
                  header: 'Sales',
                  render: (row) => (
                    <Badge tone={row.salesEnabled ? 'success' : 'neutral'}>{row.salesEnabled ? 'Enabled' : 'Disabled'}</Badge>
                  ),
                },
                {
                  key: 'expenses',
                  header: 'Expenses',
                  render: (row) => (
                    <Badge tone={row.expensesEnabled ? 'success' : 'neutral'}>{row.expensesEnabled ? 'Enabled' : 'Disabled'}</Badge>
                  ),
                },
                {
                  key: 'transfers',
                  header: 'Transfers',
                  render: (row) => (
                    <Badge tone={row.transfersEnabled ? 'success' : 'neutral'}>{row.transfersEnabled ? 'Enabled' : 'Disabled'}</Badge>
                  ),
                },
                {
                  key: 'subscription',
                  header: 'Subscription',
                  render: (row) => (
                    <div className="flex flex-col gap-0.5">
                      <Badge tone={row.subscriptionStatus === 'grace' ? 'warning' : row.subscriptionStatus === 'expired' ? 'danger' : 'success'}>
                        {row.subscriptionStatus || 'active'}
                      </Badge>
                      {row.subscriptionStatus === 'grace' && row.gracePeriodEndsAt && (
                        <span className="text-xs text-ink-400">until {formatDate(row.gracePeriodEndsAt)}</span>
                      )}
                      {row.subscriptionStatus === 'active' && row.subscriptionEndsAt && (
                        <span className="text-xs text-ink-400">ends {formatDate(row.subscriptionEndsAt)}</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'lastLogin',
                  header: 'Last login',
                  render: (row) => {
                    // Prefer lastActiveAt ("last seen") — it's touched on every
                    // request, so it reflects how long ago they actually
                    // stopped using the system (e.g. logged out), not just
                    // when they last typed their password in.
                    const lastSeen = row.lastActiveAt || row.lastLoginAt
                    return row.isOnline ? (
                      <Badge tone="success" dot>
                        Online now
                      </Badge>
                    ) : lastSeen ? (
                      <span className="text-ink-500">{formatRelativeTime(lastSeen)}</span>
                    ) : (
                      <span className="text-ink-300">Never</span>
                    )
                  },
                },
                { key: 'createdAt', header: 'Joined', render: (row) => formatDate(row.createdAt) },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <RowActionsMenu
                      loading={impersonatingId === row._id}
                      items={[
                        { key: 'impersonate', label: 'Login as store', icon: LogIn, onClick: () => handleImpersonate(row) },
                        { key: 'edit', label: 'Edit', icon: Pencil, onClick: () => openEdit(row) },
                        { key: 'reset', label: 'Reset password', icon: KeyRound, onClick: () => setResetTarget(row) },
                        {
                          key: 'features',
                          label: 'Manage features',
                          icon: SlidersHorizontal,
                          onClick: () => setFeaturesTarget(row),
                        },
                        {
                          key: 'status',
                          label: row.status === 'active' ? 'Deactivate' : 'Activate',
                          icon: Power,
                          tone: row.status === 'active' ? 'danger' : 'success',
                          divider: true,
                          onClick: () => toggleStatus(row),
                        },
                      ]}
                    />
                  ),
                },
              ]}
              data={pageItems}
            />
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit store' : 'Create a new store'}
        subtitle={editing ? editing.storeName : 'This will also create the store owner account.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="store-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create store'}
            </Button>
          </>
        }
      >
        <form id="store-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Store name" required>
            <Input
              icon={Building2}
              value={form.storeName}
              onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
              placeholder="Downtown Rentals"
              required
            />
          </Field>

          <Field label="Owner name" required>
            <Input
              icon={User}
              value={form.ownerName}
              onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
              placeholder="Owner full name"
              required
            />
          </Field>

          <Field
            label="Owner phone"
            required
            hint={editing ? "This is the owner's login username — changing it logs them out." : undefined}
          >
            <Input
              icon={Phone}
              value={form.ownerPhone}
              onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))}
              placeholder="612345678"
              required
            />
          </Field>

          <Field
            label={editing ? 'New password' : 'Password'}
            required={!editing}
            hint={editing ? 'Leave blank to keep the current password. No need for the old one.' : undefined}
          >
            <Input
              icon={Lock}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editing ? 'Set a new password' : 'Set an initial password'}
              required={!editing}
            />
          </Field>
        </form>
      </Modal>

      <ResetPasswordModal store={resetTarget} onClose={() => setResetTarget(null)} />

      <FeaturesModal store={featuresTarget} onClose={() => setFeaturesTarget(null)} onChanged={() => load(true)} />
    </div>
  )
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-primary-500/20',
        checked ? 'bg-primary-600' : 'bg-ink-200 dark:bg-ink-700'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

function FeaturesModal({ store, onClose, onChanged }) {
  const [flags, setFlags] = useState({})
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (store) {
      setFlags(Object.fromEntries(STORE_FEATURES.map((f) => [f.key, !!store[f.key]])))
      setError('')
      setSavingKey('')
    }
  }, [store])

  if (!store) return null

  const enabledCount = STORE_FEATURES.filter((f) => flags[f.key]).length

  const toggle = async (key, next) => {
    setError('')
    setSavingKey(key)
    setFlags((f) => ({ ...f, [key]: next })) // optimistic
    try {
      await updateStore(store._id, { [key]: next })
      onChanged?.()
    } catch (err) {
      setFlags((f) => ({ ...f, [key]: !next })) // revert on failure
      setError(apiErrorMessage(err, 'Failed to update feature'))
    } finally {
      setSavingKey('')
    }
  }

  return (
    <Modal
      open={!!store}
      onClose={onClose}
      title="Manage features"
      subtitle={`${store.storeName} · ${enabledCount}/${STORE_FEATURES.length} enabled`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-3">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Turn a module on to make it available inside this store. Changes apply immediately.
        </p>

        <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 dark:divide-ink-800 dark:border-ink-800">
          {STORE_FEATURES.map((f) => {
            const on = !!flags[f.key]
            const busy = savingKey === f.key
            return (
              <div key={f.key} className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 transition-colors',
                    on
                      ? 'bg-primary-50 text-primary-600 ring-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/20'
                      : 'bg-ink-50 text-ink-400 ring-ink-100 dark:bg-ink-800 dark:ring-ink-800'
                  )}
                >
                  <f.icon size={18} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink-900 dark:text-white">{f.label}</p>
                    {on && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-success-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-600 dark:bg-success-500/15 dark:text-success-300">
                        <Check size={10} strokeWidth={3} /> On
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{f.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {busy && <Spinner size={14} />}
                  <Switch checked={on} disabled={busy} onChange={(next) => toggle(f.key, next)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ store, onClose }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (store) {
      setPassword('')
      setError('')
      setDone(false)
    }
  }, [store])

  if (!store) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSaving(true)
    try {
      await resetStorePassword(store._id, password)
      setDone(true)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to reset password'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!store}
      onClose={onClose}
      title="Reset password"
      subtitle={`${store.ownerName} · ${store.storeName}`}
      footer={
        done ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button form="reset-password-form" type="submit" loading={saving}>
              Reset password
            </Button>
          </>
        )
      }
    >
      {done ? (
        <Alert tone="success">
          Password reset. Share the new password with {store.ownerName} — they'll need to log in again with it.
        </Alert>
      ) : (
        <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Alert tone="warning">
            This immediately replaces the owner's current password — no need to know the old one. Their existing session
            will be logged out.
          </Alert>
          <Field label="New password" required>
            <Input
              icon={Lock}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a new password"
              required
            />
          </Field>
        </form>
      )}
    </Modal>
  )
}
