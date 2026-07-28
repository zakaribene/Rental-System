import { useEffect, useRef, useState } from 'react'
import { Plus, Users, Search, Phone, User, IdCard, Eye, Upload, Trash2, ClipboardList, Wallet, AlertTriangle, FileText } from 'lucide-react'
import { listCustomers, createCustomer, updateCustomer, uploadCustomerPhoto, uploadCustomerIdDocument } from '../../api/customers'
import { listRentals } from '../../api/rentals'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { Avatar, PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatDate, formatDateTime, formatMoney } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const emptyForm = { fullName: '', phone: '', idDocumentNumber: '', photoUrl: '', idDocumentImageUrl: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [idDocUploading, setIdDocUploading] = useState(false)
  const photoInputRef = useRef(null)
  const idDocInputRef = useRef(null)

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
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, 10)

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
      photoUrl: customer.photoUrl || '',
      idDocumentImageUrl: customer.idDocumentImageUrl || '',
    })
    setError('')
    setModalOpen(true)
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setPhotoUploading(true)
    try {
      const { url } = await uploadCustomerPhoto(file)
      setForm((f) => ({ ...f, photoUrl: url }))
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload photo'))
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handleIdDocSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setIdDocUploading(true)
    try {
      const { url } = await uploadCustomerIdDocument(file)
      setForm((f) => ({ ...f, idDocumentImageUrl: url }))
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload document'))
    } finally {
      setIdDocUploading(false)
      if (idDocInputRef.current) idDocInputRef.current.value = ''
    }
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
          <span className="text-sm font-medium text-ink-400">{total} total</span>
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
          <>
            <Table
              columns={[
                {
                  key: 'fullName',
                  header: 'Customer',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={row.fullName} imageUrl={row.photoUrl} size={32} />
                      <span className="font-semibold text-ink-900 dark:text-white">{row.fullName}</span>
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
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewCustomer(row)}>
                        View
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                        Edit
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Photo (optional)</span>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoSelect} className="hidden" />
              {form.photoUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-ink-200 p-2">
                  <img src={form.photoUrl} alt="Customer" className="h-12 w-12 rounded-md object-cover" />
                  <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-200 text-ink-400 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
                >
                  {photoUploading ? <Spinner size={16} /> : (
                    <>
                      <Upload size={14} />
                      <span className="text-xs font-medium">Upload photo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-700">ID / passport document (optional)</span>
              <input ref={idDocInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={handleIdDocSelect} className="hidden" />
              {form.idDocumentImageUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-ink-200 p-2">
                  {form.idDocumentImageUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-ink-100">
                      <FileText size={20} className="text-ink-400" />
                    </div>
                  ) : (
                    <img src={form.idDocumentImageUrl} alt="ID document" className="h-12 w-12 rounded-md object-cover" />
                  )}
                  <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => setForm((f) => ({ ...f, idDocumentImageUrl: '' }))} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => idDocInputRef.current?.click()}
                  disabled={idDocUploading}
                  className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-200 text-ink-400 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
                >
                  {idDocUploading ? <Spinner size={16} /> : (
                    <>
                      <Upload size={14} />
                      <span className="text-xs font-medium">Upload image or PDF</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <CustomerDetailModal customer={viewCustomer} onClose={() => setViewCustomer(null)} />
    </div>
  )
}

function CustomerDetailModal({ customer, onClose }) {
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customer) return
    setLoading(true)
    listRentals({ customerId: customer._id })
      .then(setRentals)
      .finally(() => setLoading(false))
  }, [customer])

  if (!customer) return null

  const totalDebt = rentals.reduce((sum, r) => sum + (r.remainingDebt || 0), 0)
  const damageIncidents = rentals.reduce(
    (sum, r) => sum + (r.returnDetails?.itemsDamaged?.length || 0) + (r.returnDetails?.itemsMissing?.length || 0),
    0
  )

  return (
    <Modal open={!!customer} onClose={onClose} size="lg" title={customer.fullName} subtitle="Customer overview">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={customer.fullName} imageUrl={customer.photoUrl} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900 dark:text-white">{customer.fullName}</p>
            <p className="text-sm text-ink-500 dark:text-ink-400">{customer.phone}</p>
            {customer.idDocumentNumber && <p className="text-xs text-ink-400">ID: {customer.idDocumentNumber}</p>}
          </div>
          {customer.idDocumentImageUrl && (
            <a
              href={customer.idDocumentImageUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-primary-300 hover:text-primary-600 dark:border-ink-700 dark:text-ink-300"
            >
              <FileText size={14} />
              View ID document
            </a>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
            <div className="flex items-center gap-1.5 text-ink-400">
              <ClipboardList size={14} />
              <p className="text-xs font-medium">Rentals</p>
            </div>
            <p className="mt-1 font-display text-lg font-extrabold text-ink-900 dark:text-white">{rentals.length}</p>
          </div>
          <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
            <div className="flex items-center gap-1.5 text-ink-400">
              <Wallet size={14} />
              <p className="text-xs font-medium">Total owed</p>
            </div>
            <p className={`mt-1 font-display text-lg font-extrabold ${totalDebt > 0 ? 'text-danger-600' : 'text-ink-900 dark:text-white'}`}>
              {formatMoney(totalDebt)}
            </p>
          </div>
          <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
            <div className="flex items-center gap-1.5 text-ink-400">
              <AlertTriangle size={14} />
              <p className="text-xs font-medium">Damage/missing</p>
            </div>
            <p className="mt-1 font-display text-lg font-extrabold text-ink-900 dark:text-white">{damageIncidents}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-300">Rental history</p>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner size={24} />
            </div>
          ) : rentals.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No rentals yet.</p>
          ) : (
            <Table
              columns={[
                { key: 'id', header: 'Rental', render: (row) => <span className="font-mono text-xs text-ink-500">#{row._id.slice(-6)}</span> },
                { key: 'items', header: 'Items', render: (row) => `${row.items?.length || 0} item(s)` },
                { key: 'totalRentFee', header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
                { key: 'dateOut', header: 'Date out', render: (row) => formatDateTime(row.dateOut) },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'debt',
                  header: 'Balance',
                  render: (row) => (
                    <span className={row.remainingDebt > 0 ? 'font-semibold text-danger-600' : 'text-ink-500'}>
                      {formatMoney(row.remainingDebt)}
                    </span>
                  ),
                },
              ]}
              data={rentals}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
