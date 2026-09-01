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
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { apiErrorMessage, getAccessToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { stashAdminSession } from '../../components/layout/ImpersonationBar'

const emptyForm = { storeName: '', ownerName: '', ownerPhone: '', password: '' }
const LIVE_REFRESH_INTERVAL = 4000

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
    setSaving(true)
    try {
      if (editing) {
        await updateStore(editing._id, { storeName: form.storeName, ownerName: form.ownerName })
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

  const toggleSalesFeature = async (store) => {
    await updateStore(store._id, { salesEnabled: !store.salesEnabled })
    load()
  }

  const toggleExpensesFeature = async (store) => {
    await updateStore(store._id, { expensesEnabled: !store.expensesEnabled })
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

      {error && !modalOpen && !resetTarget && (
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
                          key: 'sales',
                          label: row.salesEnabled ? 'Disable Sales' : 'Enable Sales',
                          icon: ShoppingBag,
                          onClick: () => toggleSalesFeature(row),
                        },
                        {
                          key: 'expenses',
                          label: row.expensesEnabled ? 'Disable Expenses' : 'Enable Expenses',
                          icon: Receipt,
                          onClick: () => toggleExpensesFeature(row),
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

          <Field label="Owner phone" required hint={editing ? 'Phone number cannot be changed here.' : undefined}>
            <Input
              icon={Phone}
              value={form.ownerPhone}
              onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))}
              placeholder="612345678"
              disabled={!!editing}
              required
            />
          </Field>

          {!editing && (
            <Field label="Password" required>
              <Input
                icon={Lock}
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Set an initial password"
                required
              />
            </Field>
          )}
        </form>
      </Modal>

      <ResetPasswordModal store={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
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
