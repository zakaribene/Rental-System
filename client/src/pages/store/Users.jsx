import { useEffect, useState } from 'react'
import { Plus, UserCog, Phone, User, Lock } from 'lucide-react'
import { listUsers, createUser, updateUser } from '../../api/users'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { Avatar, PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { apiErrorMessage } from '../../api/client'

const emptyForm = { name: '', phone: '', password: '', role: 'STORE_STAFF' }

export default function StaffUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
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
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createUser(form)
      setModalOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add staff member'))
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
                    <Button size="sm" variant={row.status === 'active' ? 'ghost' : 'subtle'} onClick={() => toggleStatus(row)}>
                      {row.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
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
        title="Add a staff member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="staff-form" type="submit" loading={saving}>
              Add staff
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Full name" required>
            <Input icon={User} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </Field>

          <Field label="Phone" required>
            <Input icon={Phone} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
          </Field>

          <Field label="Password" required>
            <Input
              icon={Lock}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </Field>

          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="STORE_STAFF">Staff</option>
              <option value="STORE_OWNER">Owner</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  )
}
