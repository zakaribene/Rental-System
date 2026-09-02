import { useEffect, useState } from 'react'
import { Plus, ShieldCheck, User, Phone, Lock, Pencil, Power, Trash2 } from 'lucide-react'
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../api/adminUsers'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { Avatar, PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const MIN_PASSWORD_LENGTH = 6
const emptyForm = { name: '', phone: '', password: '' }

export default function Admins() {
  const { user: me, updateUser } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    listAdmins()
      .then(setAdmins)
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load admins')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (admin) => {
    setEditing(admin)
    setForm({ name: admin.name, phone: admin.phone, password: '' })
    setError('')
    setModalOpen(true)
  }

  const isMe = (admin) => admin._id === me?.id

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
        const updated = await updateAdmin(editing._id, {
          name: form.name,
          phone: form.phone,
          ...(form.password ? { password: form.password } : {}),
        })
        if (isMe(editing)) updateUser({ name: updated.name, phone: updated.phone })
      } else {
        await createAdmin(form)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, editing ? 'Failed to update admin' : 'Failed to create admin'))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (admin) => {
    setError('')
    try {
      await updateAdmin(admin._id, { status: admin.status === 'active' ? 'inactive' : 'active' })
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to change status'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAdmin(deleteTarget._id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete admin'))
    } finally {
      setDeleting(false)
    }
  }

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(admins, 10)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Admins"
        subtitle="Create super admin accounts and change any username or password — no old password needed."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New admin
          </Button>
        }
      />

      {error && !modalOpen && !deleteTarget && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-4 dark:border-ink-800">
          <span className="text-sm font-medium text-ink-400">{total} total</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : admins.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No admins found" />
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} size={32} />
                      <span className="font-semibold text-ink-900 dark:text-white">{row.name}</span>
                      {isMe(row) && <Badge tone="primary">You</Badge>}
                    </div>
                  ),
                },
                { key: 'phone', header: 'Username', render: (row) => <span className="font-mono text-sm">{row.phone}</span> },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'lastLogin',
                  header: 'Last login',
                  render: (row) => {
                    const lastSeen = row.lastActiveAt || row.lastLoginAt
                    return lastSeen ? (
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
                      items={[
                        { key: 'edit', label: isMe(row) ? 'Edit my account' : 'Edit', icon: Pencil, onClick: () => openEdit(row) },
                        ...(isMe(row)
                          ? []
                          : [
                              {
                                key: 'status',
                                label: row.status === 'active' ? 'Deactivate' : 'Activate',
                                icon: Power,
                                tone: row.status === 'active' ? 'danger' : 'success',
                                onClick: () => toggleStatus(row),
                              },
                              {
                                key: 'delete',
                                label: 'Delete',
                                icon: Trash2,
                                tone: 'danger',
                                divider: true,
                                onClick: () => setDeleteTarget(row),
                              },
                            ]),
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
        title={editing ? (isMe(editing) ? 'Edit my account' : `Edit ${editing.name}`) : 'Create a new admin'}
        subtitle={editing ? editing.phone : 'This admin can sign in with its own username and password.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="admin-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create admin'}
            </Button>
          </>
        }
      >
        <form id="admin-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          {editing && !isMe(editing) && (
            <Alert tone="warning">
              Changing this admin's username or password logs them out of any active session.
            </Alert>
          )}

          <Field label="Full name" required>
            <Input
              icon={User}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Zakaria Elmi"
              required
            />
          </Field>

          <Field label="Username" required hint="Used to sign in, together with the password.">
            <Input
              icon={Phone}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 612345678"
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
              placeholder={editing ? 'Set a new password' : 'Set a password'}
              required={!editing}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete admin"
        subtitle={deleteTarget ? `${deleteTarget.name} · ${deleteTarget.phone}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-ink-600 dark:text-ink-300">
          This permanently removes {deleteTarget?.name}'s super admin account. They'll no longer be able to sign in.
        </p>
      </Modal>
    </div>
  )
}
