import { useEffect, useState } from 'react'
import { Plus, UserCog, Phone, User, Lock, Pencil, ShieldCheck } from 'lucide-react'
import { listUsers, createUser, updateUser } from '../../api/users'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import SectionLabel from '../../components/ui/SectionLabel'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { Avatar, PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { apiErrorMessage } from '../../api/client'

// Modules a store owner can gate for a STORE_STAFF account. `edit`/`delete`
// only render a checkbox where that action actually exists on the page.
const PERMISSION_MODULES = [
  { key: 'products', label: 'Products', edit: true, delete: true },
  { key: 'customers', label: 'Customers', edit: true, delete: false },
  { key: 'rentals', label: 'Rentals', edit: true, delete: true },
  { key: 'sales', label: 'Sales', edit: true, delete: false },
  { key: 'expenses', label: 'Expenses', edit: false, delete: true },
  { key: 'transfers', label: 'Transfer Payments', edit: false, delete: true },
  { key: 'payments', label: 'Payments', edit: false, delete: false },
  { key: 'reports', label: 'Reports', edit: false, delete: false },
  { key: 'activityLog', label: 'Activity Log', edit: false, delete: false },
]

// New staff start with everything open — the owner opts specific things
// *out* rather than having to opt every module in from zero.
function defaultPermissions() {
  const perms = {}
  PERMISSION_MODULES.forEach((m) => {
    perms[m.key] = { enabled: true, edit: true, delete: true }
  })
  return perms
}

const emptyForm = { name: '', phone: '', password: '', role: 'STORE_STAFF', permissions: defaultPermissions() }

export default function StaffUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    listUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      name: user.name,
      phone: user.phone,
      password: '',
      role: user.role,
      permissions: { ...defaultPermissions(), ...user.permissions },
    })
    setError('')
    setModalOpen(true)
  }

  const updatePermission = (moduleKey, field, value) => {
    setForm((f) => ({
      ...f,
      permissions: {
        ...f.permissions,
        [moduleKey]: { ...f.permissions[moduleKey], [field]: value },
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await updateUser(editing._id, { name: form.name, role: form.role, permissions: form.permissions })
      } else {
        await createUser(form)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, editing ? 'Failed to update staff member' : 'Failed to add staff member'))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (user) => {
    await updateUser(user._id, { status: user.status === 'active' ? 'inactive' : 'active' })
    load()
  }

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(users, 10)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Staff"
        subtitle="Manage who has access to your store."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New staff member
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UserCog} title="No staff members yet" />
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
                    </div>
                  ),
                },
                { key: 'phone', header: 'Phone' },
                { key: 'role', header: 'Role', render: (row) => <Badge tone="primary">{row.role.replace('_', ' ')}</Badge> },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(row)} />
                      <Button size="sm" variant={row.status === 'active' ? 'ghost' : 'subtle'} onClick={() => toggleStatus(row)}>
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
        title={editing ? `Edit ${editing.name}` : 'Add a staff member'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="staff-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Add staff'}
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Full name" required>
            <Input icon={User} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </Field>

          <Field label="Phone" required hint={editing ? 'Phone number cannot be changed here.' : undefined}>
            <Input
              icon={Phone}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
                required
              />
            </Field>
          )}

          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="STORE_STAFF">Staff</option>
              <option value="STORE_OWNER">Owner</option>
            </Select>
          </Field>

          {form.role === 'STORE_STAFF' && (
            <>
              <SectionLabel>Page access & permissions</SectionLabel>
              <div className="overflow-hidden rounded-lg border border-ink-100 dark:border-ink-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:bg-ink-800/50">
                      <th className="px-3 py-2 text-left">Page</th>
                      <th className="px-3 py-2 text-center">Enabled</th>
                      <th className="px-3 py-2 text-center">Edit</th>
                      <th className="px-3 py-2 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.map((m) => {
                      const perm = form.permissions[m.key] || {}
                      const enabled = perm.enabled !== false
                      return (
                        <tr key={m.key} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                          <td className="px-3 py-2 font-medium text-ink-700 dark:text-ink-200">{m.label}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => updatePermission(m.key, 'enabled', e.target.checked)}
                              className="h-4 w-4 accent-primary-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {m.edit ? (
                              <input
                                type="checkbox"
                                checked={perm.edit !== false}
                                disabled={!enabled}
                                onChange={(e) => updatePermission(m.key, 'edit', e.target.checked)}
                                className="h-4 w-4 accent-primary-600 disabled:opacity-30"
                              />
                            ) : (
                              <span className="text-ink-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {m.delete ? (
                              <input
                                type="checkbox"
                                checked={perm.delete !== false}
                                disabled={!enabled}
                                onChange={(e) => updatePermission(m.key, 'delete', e.target.checked)}
                                className="h-4 w-4 accent-primary-600 disabled:opacity-30"
                              />
                            ) : (
                              <span className="text-ink-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-ink-400">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                Print always stays available, even on pages with Edit/Delete turned off.
              </p>
            </>
          )}
        </form>
      </Modal>
    </div>
  )
}
