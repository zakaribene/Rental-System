import { useEffect, useState } from 'react'
import { Plus, Users, Search, Phone, User, IdCard } from 'lucide-react'
import { listCustomers, createCustomer, updateCustomer } from '../../api/customers'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import { Avatar, PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDate } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const emptyForm = { fullName: '', phone: '', idDocumentNumber: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    listCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = customers.filter((c) =>
    [c.fullName, c.phone, c.idDocumentNumber].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (customer) => {
    setEditing(customer)
    setForm({
      fullName: customer.fullName,
      phone: customer.phone,
      idDocumentNumber: customer.idDocumentNumber || '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await updateCustomer(editing._id, form)
      } else {
        await createCustomer(form)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save customer'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Customers"
        subtitle="Everyone who has rented from your store."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New customer
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
              placeholder="Search customers..."
              className="h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100"
            />
          </div>
          <span className="text-sm font-medium text-ink-400">{filtered.length} total</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            subtitle="Add a customer before creating a rental for them."
            action={
              <Button icon={Plus} onClick={openCreate} size="sm">
                New customer
              </Button>
            }
          />
        ) : (
          <Table
            columns={[
              {
                key: 'fullName',
                header: 'Customer',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={row.fullName} size={32} />
                    <span className="font-semibold text-ink-900">{row.fullName}</span>
                  </div>
                ),
              },
              { key: 'phone', header: 'Phone' },
              { key: 'idDocumentNumber', header: 'ID document', render: (row) => row.idDocumentNumber || '—' },
              { key: 'createdAt', header: 'Added', render: (row) => formatDate(row.createdAt) },
              {
                key: 'actions',
                header: '',
                headerClassName: 'text-right',
                className: 'text-right',
                render: (row) => (
                  <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                ),
              },
            ]}
            data={filtered}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit customer' : 'Add a new customer'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="customer-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Add customer'}
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Full name" required>
            <Input
              icon={User}
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Customer full name"
              required
            />
          </Field>

          <Field label="Phone" required>
            <Input
              icon={Phone}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="612345678"
              required
            />
          </Field>

          <Field label="ID document number" hint="Optional">
            <Input
              icon={IdCard}
              value={form.idDocumentNumber}
              onChange={(e) => setForm((f) => ({ ...f, idDocumentNumber: e.target.value }))}
              placeholder="Passport / ID number"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
