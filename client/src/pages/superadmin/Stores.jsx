import { useEffect, useState } from 'react'
import { Plus, Building2, Search, Phone, User, Lock, Store as StoreIcon } from 'lucide-react'
import { listStores, createStore, updateStore } from '../../api/stores'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDate } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const emptyForm = { storeName: '', ownerName: '', ownerPhone: '', password: '' }

export default function Stores() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    listStores()
      .then(setStores)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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
                { key: 'createdAt', header: 'Joined', render: (row) => formatDate(row.createdAt) },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={row.status === 'active' ? 'ghost' : 'subtle'}
                        onClick={() => toggleStatus(row)}
                      >
                        {row.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
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
    </div>
  )
}
