import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Plus,
  ClipboardList,
  Trash2,
  PackageCheck,
  Upload,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Banknote,
  Search,
  Printer,
  Download,
  Eye,
  Pencil,
} from 'lucide-react'
import { listRentals, createRental, updateRental, getRental, addRentalDeposit, returnRental, cancelRental, uploadDepositDocument } from '../../api/rentals'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
import { listPaymentMethods } from '../../api/payments'
import { getMyStore } from '../../api/myStore'
import usePermissions from '../../hooks/usePermissions'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import ProductPicker from '../../components/ui/ProductPicker'
import CustomerPicker from '../../components/ui/CustomerPicker'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney, formatDateTime } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const DURATION_PRESETS = [
  { label: '1 hour', hours: 1 },
  { label: '6 hours', hours: 6 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
]

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function computeDurationValue(hours) {
  return toDatetimeLocalValue(new Date(Date.now() + hours * 60 * 60 * 1000))
}

// Mirrors the backend's ceiling-rounded day count (server/controllers/rentalController.js)
// so the "Estimated total" shown here matches what actually gets charged.
const DAY_MS = 24 * 60 * 60 * 1000
function daysBetween(start, end) {
  if (!end) return 1
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS))
}

export default function Rentals() {
  const { can, loaded } = usePermissions()
  const [rentals, setRentals] = useState([])
  const [customers, setCustomers] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const [formTarget, setFormTarget] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailAutoPrint, setDetailAutoPrint] = useState(false)
  const [store, setStore] = useState(null)

  const load = () => {
    setLoading(true)
    listRentals(statusFilter || undefined)
      .then(setRentals)
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const loadProducts = () => listProducts().then(setAllProducts)

  useEffect(() => {
    listCustomers().then(setCustomers)
    loadProducts()
    listPaymentMethods().then(setMethods).catch(() => setMethods([]))
    getMyStore().then(setStore).catch(() => setStore(null))
  }, [])

  const openDetail = async (rental, { autoPrint = false } = {}) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailAutoPrint(autoPrint)
    const data = await getRental(rental._id)
    setDetail(data)
  }

  const afterMutate = () => {
    load()
    loadProducts()
  }

  const rentableProducts = allProducts.filter((p) => p.listingType !== 'SALE')

  const openCreate = () => {
    setFormTarget({ mode: 'create', rental: null, products: rentableProducts.filter((p) => p.availableQty > 0) })
  }

  const openEdit = (row) => {
    // A product currently held by this rental has 0 units left free, so the
    // edit form's product list needs it too, not just the normally-available
    // ones — otherwise you couldn't even keep the same item.
    const rentedProductIds = new Set((row.items || []).map((it) => (it.productId?._id || it.productId)))
    const effectiveProducts = rentableProducts.filter((p) => p.availableQty > 0 || rentedProductIds.has(p._id))
    setFormTarget({ mode: 'edit', rental: row, products: effectiveProducts })
  }

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const confirmCancel = async () => {
    setCancelling(true)
    setCancelError('')
    try {
      await cancelRental(cancelTarget._id)
      setCancelTarget(null)
      afterMutate()
    } catch (err) {
      setCancelError(apiErrorMessage(err, 'Failed to cancel rental'))
    } finally {
      setCancelling(false)
    }
  }

  const query = search.trim().toLowerCase()
  const filteredRentals = query
    ? rentals.filter(
        (r) => r._id.toLowerCase().includes(query) || (r.customerId?.phone || '').toLowerCase().includes(query)
      )
    : rentals
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filteredRentals, 10)

  if (loaded && !can('rentals')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Rentals"
        subtitle="Track items out on rent and process returns."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New rental
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Input
          icon={Search}
          placeholder="Search by rental ID or customer number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <span className="text-sm font-medium text-ink-400">{total} rental(s)</span>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : rentals.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No rentals yet"
            subtitle="Create a rental once a customer picks up an item."
            action={
              <Button icon={Plus} size="sm" onClick={openCreate}>
                New rental
              </Button>
            }
          />
        ) : filteredRentals.length === 0 ? (
          <EmptyState icon={Search} title="No rentals match your search" />
        ) : (
          <>
            <Table
              onRowClick={(row) => openDetail(row)}
              columns={[
                { key: 'id', header: 'Rental', render: (row) => <span className="font-mono text-xs text-ink-500">#{row._id.slice(-6)}</span> },
                { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
                { key: 'phone', header: 'Phone', render: (row) => row.customerId?.phone || '—' },
                { key: 'items', header: 'Items', render: (row) => `${row.items?.length || 0} item(s)` },
                { key: 'totalRentFee', header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
                { key: 'dateOut', header: 'Date out', render: (row) => formatDateTime(row.dateOut) },
                { key: 'expectedReturnDate', header: 'Due', render: (row) => formatDateTime(row.expectedReturnDate) },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        items={[
                          { key: 'view', label: 'View', icon: Eye, onClick: () => openDetail(row) },
                          ...(can('rentals', 'edit') && row.status !== 'cancelled'
                            ? [{ key: 'edit', label: 'Edit', icon: Pencil, onClick: () => openEdit(row) }]
                            : []),
                          { key: 'print', label: 'Print', icon: Printer, onClick: () => openDetail(row, { autoPrint: true }) },
                          ...(can('rentals', 'delete') && (row.status === 'active' || row.status === 'overdue')
                            ? [{ key: 'cancel', label: 'Cancel', icon: Trash2, tone: 'danger', onClick: () => { setCancelError(''); setCancelTarget(row) } }]
                            : []),
                        ]}
                      />
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

      <RentalFormModal
        open={!!formTarget}
        mode={formTarget?.mode || 'create'}
        rental={formTarget?.rental}
        products={formTarget?.products || []}
        customers={customers}
        methods={methods}
        onClose={() => setFormTarget(null)}
        onSaved={() => {
          setFormTarget(null)
          afterMutate()
        }}
      />

      <RentalDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        detail={detail}
        autoPrint={detailAutoPrint}
        methods={methods}
        store={store}
        onReturned={() => {
          setDetailOpen(false)
          afterMutate()
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => (cancelling ? null : setCancelTarget(null))}
        onConfirm={confirmCancel}
        loading={cancelling}
        error={cancelError}
        title="Cancel rental?"
        message={
          cancelTarget && (
            <>
              Cancel rental <span className="font-mono font-semibold text-ink-800 dark:text-ink-100">#{cancelTarget._id.slice(-6)}</span>{' '}
              for {cancelTarget.customerId?.fullName || 'this customer'}? This releases its items back to available stock.
            </>
          )
        }
        confirmLabel="Cancel rental"
        cancelLabel="Keep it"
      />
    </div>
  )
}

function RentalFormModal({ open, mode, rental, onClose, customers, products, methods, onSaved }) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([{ productId: '', quantity: 1 }])
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [depositType, setDepositType] = useState('NONE')
  const [cashAmount, setCashAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [guarantorName, setGuarantorName] = useState('')
  const [guarantorPhone, setGuarantorPhone] = useState('')
  const [documentImageUrl, setDocumentImageUrl] = useState('')
  const [existingDeposits, setExistingDeposits] = useState([])
  const [depositsLoading, setDepositsLoading] = useState(false)
  const [addingDeposit, setAddingDeposit] = useState(false)
  const [documentUploading, setDocumentUploading] = useState(false)
  const documentInputRef = useRef(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedCustomer = customers.find((c) => c._id === customerId)

  const reset = () => {
    setCustomerId('')
    setItems([{ productId: '', quantity: 1 }])
    setExpectedReturnDate('')
    setDepositType('NONE')
    setCashAmount('')
    setPaymentMethodId('')
    setGuarantorName('')
    setGuarantorPhone('')
    setDocumentImageUrl('')
    setError('')
  }

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && rental) {
      setCustomerId(rental.customerId?._id || rental.customerId || '')
      setItems((rental.items || []).map((it) => ({ productId: it.productId?._id || it.productId, quantity: it.quantity })))
      setExpectedReturnDate(rental.expectedReturnDate ? toDatetimeLocalValue(new Date(rental.expectedReturnDate)) : '')
      setDepositType('NONE')
      setCashAmount('')
      setPaymentMethodId('')
      setGuarantorName('')
      setGuarantorPhone('')
      setDocumentImageUrl('')
      setDepositsLoading(true)
      getRental(rental._id)
        .then((data) => setExistingDeposits(data.deposits))
        .finally(() => setDepositsLoading(false))
    } else {
      reset()
      setExistingDeposits([])
    }
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, rental])

  const handleAddDeposit = async () => {
    setError('')
    let payload = null
    if (depositType === 'CASH' && cashAmount) payload = { depositType: 'CASH', cashAmount: Number(cashAmount), paymentMethodId }
    else if (depositType === 'GUARANTOR' && guarantorName) payload = { depositType: 'GUARANTOR', guarantorName, guarantorPhone }
    else if (depositType === 'DOCUMENT' && documentImageUrl) payload = { depositType: 'DOCUMENT', documentImageUrl }
    if (!payload) {
      setError('Fill in the deposit details before adding it.')
      return
    }

    setAddingDeposit(true)
    try {
      await addRentalDeposit(rental._id, payload)
      const data = await getRental(rental._id)
      setExistingDeposits(data.deposits)
      setDepositType('NONE')
      setCashAmount('')
      setPaymentMethodId('')
      setGuarantorName('')
      setGuarantorPhone('')
      setDocumentImageUrl('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add deposit'))
    } finally {
      setAddingDeposit(false)
    }
  }

  const handleDocumentSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setDocumentUploading(true)
    try {
      const { url } = await uploadDepositDocument(file)
      setDocumentImageUrl(url)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload document'))
    } finally {
      setDocumentUploading(false)
      if (documentInputRef.current) documentInputRef.current.value = ''
    }
  }

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }])
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const selectedProducts = items
    .map((it) => products.find((p) => p._id === it.productId))
    .filter(Boolean)
  const rentalDays = daysBetween(mode === 'edit' && rental ? rental.dateOut : new Date(), expectedReturnDate)
  const estimatedSubtotal = selectedProducts.reduce((sum, p, i) => sum + p.rentPrice * (Number(items[i]?.quantity) || 1), 0)
  const estimatedTotal = estimatedSubtotal * rentalDays

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanItems = items.filter((it) => it.productId).map((it) => ({ productId: it.productId, quantity: Number(it.quantity) || 1 }))
    if (!customerId || cleanItems.length === 0) {
      setError('Select a customer and at least one product.')
      return
    }

    setSaving(true)
    try {
      if (mode === 'edit') {
        await updateRental(rental._id, {
          customerId,
          items: cleanItems,
          expectedReturnDate: expectedReturnDate || undefined,
        })
      } else {
        const deposits = []
        if (depositType === 'CASH' && cashAmount) {
          deposits.push({ depositType: 'CASH', cashAmount: Number(cashAmount), paymentMethodId })
        } else if (depositType === 'GUARANTOR' && guarantorName) {
          deposits.push({ depositType: 'GUARANTOR', guarantorName, guarantorPhone })
        } else if (depositType === 'DOCUMENT' && documentImageUrl) {
          deposits.push({ depositType: 'DOCUMENT', documentImageUrl })
        }
        await createRental({
          customerId,
          items: cleanItems,
          expectedReturnDate: expectedReturnDate || undefined,
          deposits: deposits.length ? deposits : undefined,
        })
      }
      reset()
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err, mode === 'edit' ? 'Failed to update rental' : 'Failed to create rental'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose()
        reset()
      }}
      title={mode === 'edit' ? `Edit rental #${rental?._id?.slice(-6)}` : 'New rental'}
      subtitle={mode === 'edit' ? 'Update items, customer or due date.' : 'Hand out items and record the rental.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="rental-form" type="submit" loading={saving}>
            {mode === 'edit' ? 'Save changes' : 'Create rental'}
          </Button>
        </>
      }
    >
      <form id="rental-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <Field label="Customer" required>
          <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
          {selectedCustomer?.isRisky && (
            <div className="mt-2">
              <Alert tone="warning">
                Heads up — {selectedCustomer.fullName} has {selectedCustomer.lateReturns} late return(s) and{' '}
                {selectedCustomer.damageIncidents} damage/missing incident(s) on record.
              </Alert>
            </div>
          )}
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-700">Items</span>
            <Button type="button" size="sm" variant="subtle" icon={Plus} onClick={addItem}>
              Add item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <ProductPicker
                  products={products}
                  value={it.productId}
                  onChange={(id) => updateItem(idx, { productId: id })}
                  priceKey="rentPrice"
                  placeholder="Search product to rent..."
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  className="w-20"
                />
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={() => removeItem(idx)} />
                )}
              </div>
            ))}
          </div>
          {estimatedTotal > 0 && (
            <p className="mt-2 text-sm font-medium text-ink-600">
              Estimated total ({rentalDays} day{rentalDays === 1 ? '' : 's'}):{' '}
              <span className="font-bold text-primary-700">{formatMoney(estimatedTotal)}</span>
            </p>
          )}
        </div>

        <Field label="Expected return" hint="Optional — pick a quick duration or set an exact date & time">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setExpectedReturnDate(computeDurationValue(preset.hours))}
                className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-primary-500/10"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Input type="datetime-local" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-ink-700">Deposit</span>

          {mode === 'edit' && (
            <div className="mb-3 space-y-2">
              {depositsLoading ? (
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <Spinner size={14} /> Loading deposits...
                </div>
              ) : existingDeposits.length === 0 ? (
                <p className="text-xs text-ink-400">No deposit recorded yet.</p>
              ) : (
                existingDeposits.map((d) => (
                  <div key={d._id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-xs dark:border-ink-700">
                    <span className="font-medium text-ink-700 dark:text-ink-200">
                      {d.depositType === 'CASH'
                        ? `Cash · ${formatMoney(d.cashAmount)}`
                        : d.depositType === 'GUARANTOR'
                        ? `Guarantor · ${d.guarantorName}${d.guarantorPhone ? ` · ${d.guarantorPhone}` : ''}`
                        : 'Document / ID held'}
                    </span>
                    <span className="text-ink-400">{formatDateTime(d.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          <Select value={depositType} onChange={(e) => setDepositType(e.target.value)}>
            <option value="NONE">{mode === 'edit' ? 'No new deposit' : 'No deposit'}</option>
            <option value="CASH">Cash</option>
            <option value="GUARANTOR">Guarantor</option>
            <option value="DOCUMENT">Document / ID (e.g. passport)</option>
          </Select>

          {depositType === 'CASH' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Amount">
                <Input type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
              </Field>
              <Field label="Payment method">
                <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                  <option value="">Select method</option>
                  {methods.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {depositType === 'GUARANTOR' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Guarantor name">
                <Input value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
              </Field>
              <Field label="Guarantor phone">
                <Input value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
              </Field>
            </div>
          )}

          {depositType === 'DOCUMENT' && (
            <div className="mt-3">
              <input
                ref={documentInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleDocumentSelect}
                className="hidden"
              />
              {documentImageUrl ? (
                <div className="flex items-center gap-3 rounded-lg border border-ink-200 p-2">
                  <img src={documentImageUrl} alt="Document" className="h-16 w-16 rounded-md object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-800">Document uploaded</p>
                    <p className="text-xs text-ink-400">Held as collateral for this rental</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => setDocumentImageUrl('')} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={documentUploading}
                  className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-ink-200 text-ink-400 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
                >
                  {documentUploading ? (
                    <Spinner size={18} />
                  ) : (
                    <>
                      <Upload size={16} />
                      <span className="text-xs font-medium">Upload a photo of the passport / ID</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {mode === 'edit' && depositType !== 'NONE' && (
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" loading={addingDeposit} onClick={handleAddDeposit}>
                Add deposit
              </Button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

function RentalDetailModal({ open, onClose, detail, autoPrint, methods, store, onReturned }) {
  const [selection, setSelection] = useState({})
  const [damageCosts, setDamageCosts] = useState({})
  const [refundMethodId, setRefundMethodId] = useState('')
  const [lateFee, setLateFee] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  useEffect(() => {
    if (detail?.transaction) {
      const initial = {}
      detail.transaction.items.forEach((it) => {
        const id = it.productId?._id || it.productId
        initial[id] = 'ok'
      })
      setSelection(initial)
      setDamageCosts({})
      setLateFee('')
      setError('')
    }
  }, [detail])

  useEffect(() => {
    if (open && autoPrint && detail?.transaction) {
      const t = setTimeout(() => window.print(), 150)
      return () => clearTimeout(t)
    }
  }, [open, autoPrint, detail])

  if (!open) return null

  const transaction = detail?.transaction
  const canReturn = transaction?.status === 'active' || transaction?.status === 'overdue'
  const isOverdue =
    transaction?.status === 'overdue' ||
    (canReturn && transaction?.expectedReturnDate && new Date(transaction.expectedReturnDate) < new Date())

  const handleReturn = async (e) => {
    e.preventDefault()
    setError('')

    const itemsReturnedOk = []
    const itemsMissing = []
    const itemsDamaged = []
    Object.entries(selection).forEach(([id, state]) => {
      if (state === 'ok') itemsReturnedOk.push(id)
      else if (state === 'missing') itemsMissing.push(id)
      else if (state === 'damaged') itemsDamaged.push(id)
    })

    setSaving(true)
    try {
      await returnRental(transaction._id, {
        itemsReturnedOk,
        itemsMissing,
        itemsDamaged,
        damageCosts,
        refundPaymentMethodId: refundMethodId || undefined,
        lateFee: isOverdue ? Number(lateFee) || 0 : 0,
      })
      onReturned()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to process return'))
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    setPdfGenerating(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const node = document.getElementById('print-receipt')
      const canvas = await html2canvas(node, {
        scale: 2,
        onclone: (clonedDoc) => {
          const header = clonedDoc.getElementById('print-only-header')
          if (header) header.classList.remove('hidden')

          // Match the print output: escape the modal card's own
          // max-h-[90vh]/overflow-y-auto clipping so the full receipt
          // renders, instead of whatever fit in the on-screen scroll area.
          const receipt = clonedDoc.getElementById('print-receipt')
          if (receipt) {
            receipt.style.width = '760px'
            receipt.style.maxHeight = 'none'
            receipt.style.overflow = 'visible'
            let ancestor = receipt.parentElement
            while (ancestor) {
              ancestor.style.maxHeight = 'none'
              ancestor.style.height = 'auto'
              ancestor.style.overflow = 'visible'
              ancestor = ancestor.parentElement
            }
          }
        },
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 48
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 24, 24, imgWidth, imgHeight)
      pdf.save(`rental-${transaction._id.slice(-6)}.pdf`)
    } catch {
      setError('Failed to generate PDF')
    } finally {
      setPdfGenerating(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={transaction ? `Rental #${transaction._id.slice(-6)}` : 'Rental'}
      subtitle={transaction ? `${transaction.customerId?.fullName || 'Customer'} · ${transaction.status}` : ''}
      footer={
        transaction ? (
          <>
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>
              Print
            </Button>
            <Button variant="secondary" icon={Download} loading={pdfGenerating} onClick={handleDownloadPdf}>
              PDF
            </Button>
            {canReturn && (
              <Button form="return-form" type="submit" icon={PackageCheck} loading={saving}>
                Process return
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {!detail ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size={26} />
        </div>
      ) : (
        <div className="space-y-5" id="print-receipt">
          <div id="print-only-header" className="hidden items-start justify-between border-b-2 border-ink-800 pb-4 print:flex">
            <div className="flex items-center gap-3">
              {store?.logoUrl ? (
                <img src={store.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
                  <span className="font-display text-lg font-extrabold text-white">
                    {(store?.storeName || 'RS').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-display text-lg font-extrabold text-ink-900">{store?.storeName || 'Rental System'}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Rental Receipt</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-ink-900">#{transaction._id.slice(-6)}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink-800">{transaction.customerId?.fullName || 'Customer'}</p>
              <p className="text-xs text-ink-400">
                {transaction.status} · {formatDateTime(new Date())}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ink-400">Date out</p>
              <p className="font-semibold text-ink-800">{formatDateTime(transaction.dateOut)}</p>
            </div>
            <div>
              <p className="text-ink-400">Expected return</p>
              <p className="font-semibold text-ink-800">{formatDateTime(transaction.expectedReturnDate)}</p>
            </div>
            <div>
              <p className="text-ink-400">Total rent fee</p>
              <p className="font-semibold text-ink-800">
                {formatMoney(transaction.totalRentFee)}
                <span className="ml-1 text-xs font-normal text-ink-400">
                  ({transaction.rentalDays || 1} day{(transaction.rentalDays || 1) === 1 ? '' : 's'})
                </span>
              </p>
            </div>
            <div>
              <p className="text-ink-400">Status</p>
              <StatusBadge status={transaction.status} />
            </div>
            <div>
              <p className="text-ink-400">Balance owed</p>
              <p className={`font-semibold ${transaction.remainingDebt > 0 ? 'text-danger-600' : 'text-ink-800'}`}>
                {formatMoney(transaction.remainingDebt)}
              </p>
            </div>
            <div>
              <p className="text-ink-400">Handled by</p>
              <p className="font-semibold text-ink-800">{transaction.staffUserId?.name || '—'}</p>
            </div>
          </div>

          <RentedItems transaction={transaction} />

          <DepositTicker deposits={detail.deposits} returnDetails={transaction.returnDetails} payments={detail.payments} />

          <RentalHistory payments={detail.payments} deposits={detail.deposits} returnDetails={transaction.returnDetails} />

          {canReturn ? (
            <form id="return-form" onSubmit={handleReturn} className="space-y-4">
              {error && <Alert>{error}</Alert>}
              {isOverdue && (
                <Alert tone="warning">This rental is overdue. You may optionally charge a late fee below, or leave it at 0 to waive it.</Alert>
              )}
              <div>
                <span className="mb-2 block text-sm font-medium text-ink-700">Items condition</span>
                <div className="space-y-3">
                  {transaction.items.map((it) => {
                    const product = it.productId
                    const id = product?._id || product
                    const state = selection[id] || 'ok'
                    return (
                      <div key={id} className="rounded-lg border border-ink-100 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink-800">{product?.name || 'Item'}</p>
                          <Select
                            value={state}
                            onChange={(e) => setSelection((s) => ({ ...s, [id]: e.target.value }))}
                            className="w-40"
                          >
                            <option value="ok">Returned OK</option>
                            <option value="damaged">Damaged</option>
                            <option value="missing">Missing</option>
                          </Select>
                        </div>
                        {(state === 'damaged' || state === 'missing') && (
                          <div className="mt-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Damage / replacement cost"
                              value={damageCosts[id] || ''}
                              onChange={(e) =>
                                setDamageCosts((d) => ({ ...d, [id]: Number(e.target.value) }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <Field label="Refund payment method" hint="Used only if a deposit refund is due">
                <Select value={refundMethodId} onChange={(e) => setRefundMethodId(e.target.value)}>
                  <option value="">Select method</option>
                  {methods.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {isOverdue && (
                <Field label="Late fee" hint="Optional — leave empty or 0 to waive it">
                  <Input type="number" min="0" step="0.01" placeholder="0" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
                </Field>
              )}
            </form>
          ) : (
            transaction.returnDetails && (
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-ink-50 p-4 text-sm dark:bg-ink-800/60">
                <div>
                  <p className="text-ink-400">Deposit refunded</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(transaction.returnDetails.depositRefunded)}</p>
                </div>
                <div>
                  <p className="text-ink-400">Remaining debt</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(transaction.remainingDebt)}</p>
                </div>
                <div>
                  <p className="text-ink-400">Returned</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{formatDateTime(transaction.returnDetails.returnDate)}</p>
                </div>
                {transaction.returnDetails.lateFee > 0 && (
                  <div>
                    <p className="text-ink-400">Late fee charged</p>
                    <p className="font-semibold text-danger-600">{formatMoney(transaction.returnDetails.lateFee)}</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  )
}

const itemConditionMeta = {
  ok: { label: 'Returned OK', tone: 'success' },
  damaged: { label: 'Damaged', tone: 'warning' },
  missing: { label: 'Missing', tone: 'danger' },
}

function RentedItems({ transaction }) {
  const { itemsDamaged = [], itemsMissing = [] } = transaction.returnDetails || {}

  const conditionFor = (productId) => {
    if (itemsDamaged.some((id) => (id?._id || id) === productId)) return 'damaged'
    if (itemsMissing.some((id) => (id?._id || id) === productId)) return 'missing'
    return transaction.status === 'returned' ? 'ok' : null
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-ink-700">Items</p>
      <div className="space-y-2">
        {transaction.items.map((it, i) => {
          const product = it.productId
          const productId = product?._id || product
          const condition = conditionFor(productId)
          return (
            <div key={productId || i} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-800">{product?.name || 'Item'}</p>
                <p className="text-xs text-ink-400">
                  Qty {it.quantity} · {formatMoney(it.unitRent)}/day · {transaction.rentalDays || 1} day
                  {(transaction.rentalDays || 1) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {condition && <Badge tone={itemConditionMeta[condition].tone}>{itemConditionMeta[condition].label}</Badge>}
                <p className="font-semibold text-ink-800">{formatMoney(it.unitRent * it.quantity * (transaction.rentalDays || 1))}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DepositTicker({ deposits, returnDetails, payments }) {
  const cashDeposits = (deposits || []).filter((d) => d.depositType === 'CASH')
  const totalCollected = cashDeposits.reduce((sum, d) => sum + (d.cashAmount || 0), 0)
  const documentDeposits = (deposits || []).filter((d) => d.depositType === 'DOCUMENT')
  const guarantorDeposits = (deposits || []).filter((d) => d.depositType === 'GUARANTOR')
  const refunded = returnDetails?.depositRefunded || 0

  const methodNames = (type) =>
    [...new Set((payments || []).filter((p) => p.type === type).map((p) => p.paymentMethodId?.name).filter(Boolean))].join(', ')
  const receivedMethods = methodNames('DEPOSIT_COLLECTION')
  const refundedMethods = methodNames('REFUND')

  if (!deposits || deposits.length === 0) return null

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-ink-700">Deposit activity</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-success-50 px-3 py-2.5">
          <ArrowUpCircle size={20} className="shrink-0 text-success-600" />
          <div>
            <p className="text-xs font-medium text-success-700">Received</p>
            <p className="font-display text-lg font-extrabold text-success-700">{formatMoney(totalCollected)}</p>
            {receivedMethods && <p className="text-xs text-success-600">via {receivedMethods}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 px-3 py-2.5">
          <ArrowDownCircle size={20} className="shrink-0 text-danger-600" />
          <div>
            <p className="text-xs font-medium text-danger-700">Refunded</p>
            <p className="font-display text-lg font-extrabold text-danger-700">{formatMoney(refunded)}</p>
            {refundedMethods && <p className="text-xs text-danger-600">via {refundedMethods}</p>}
          </div>
        </div>
      </div>

      {documentDeposits.length > 0 && (
        <div className="mt-3 space-y-2">
          {documentDeposits.map((d) => (
            <div key={d._id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-2">
              {d.documentImageUrl ? (
                <img src={d.documentImageUrl} alt="Document" className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <FileText size={18} className="text-ink-400" />
              )}
              <p className="text-xs font-medium text-ink-600">Document / ID held as collateral</p>
            </div>
          ))}
        </div>
      )}

      {guarantorDeposits.length > 0 && (
        <div className="mt-3 space-y-2">
          {guarantorDeposits.map((d) => (
            <div key={d._id} className="rounded-lg border border-ink-100 p-2 text-xs">
              <span className="font-semibold text-ink-700">Guarantor:</span>{' '}
              <span className="text-ink-600">
                {d.guarantorName} {d.guarantorPhone && `· ${d.guarantorPhone}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const historyEventStyle = {
  DEPOSIT_COLLECTION: { icon: ArrowUpCircle, tone: 'text-success-600', bg: 'bg-success-50', label: 'Deposit collected' },
  REFUND: { icon: ArrowDownCircle, tone: 'text-danger-600', bg: 'bg-danger-50', label: 'Deposit refunded' },
  DEBT_SETTLEMENT: { icon: Banknote, tone: 'text-primary-600', bg: 'bg-primary-50', label: 'Rent payment' },
}

function RentalHistory({ payments, deposits, returnDetails }) {
  const nonCashDeposits = (deposits || []).filter((d) => d.depositType !== 'CASH')
  const events = [
    ...(payments || []).map((p) => ({
      key: p._id,
      date: p.date,
      ...historyEventStyle[p.type],
      amount: p.amount,
      note: p.note,
      methodName: p.paymentMethodId?.name,
      staffName: p.recordedBy?.name,
    })),
    ...nonCashDeposits.map((d) => ({
      key: d._id,
      date: d.createdAt,
      icon: FileText,
      tone: 'text-ink-500',
      bg: 'bg-ink-100',
      label: d.depositType === 'GUARANTOR' ? 'Guarantor held' : 'Document held',
      note: d.depositType === 'GUARANTOR' ? `${d.guarantorName || ''} ${d.guarantorPhone || ''}`.trim() : 'ID / passport as collateral',
      staffName: d.createdBy?.name,
    })),
    ...(returnDetails?.lateFee > 0
      ? [
          {
            key: 'late-fee',
            date: returnDetails.returnDate,
            icon: Banknote,
            tone: 'text-danger-600',
            bg: 'bg-danger-50',
            label: 'Late fee charged',
            amount: returnDetails.lateFee,
            staffName: returnDetails.returnedBy?.name,
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  if (events.length === 0) return null

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-ink-700">History</p>
      <div className="space-y-2">
        {events.map((ev) => {
          const Icon = ev.icon
          return (
            <div key={ev.key} className="flex items-start gap-3 rounded-lg border border-ink-100 p-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ev.bg}`}>
                <Icon size={16} className={ev.tone} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-800">{ev.label}</p>
                  {ev.amount !== undefined && <p className={`font-display text-sm font-bold ${ev.tone}`}>{formatMoney(ev.amount)}</p>}
                </div>
                {ev.note && <p className="mt-0.5 text-xs text-ink-500">{ev.note}</p>}
                <p className="mt-0.5 text-xs text-ink-400">
                  {formatDateTime(ev.date)}
                  {ev.methodName && (
                    <>
                      {' '}
                      · <span className="font-medium text-ink-500">{ev.methodName}</span>
                    </>
                  )}
                  {ev.staffName && (
                    <>
                      {' '}
                      · by <span className="font-medium text-ink-500">{ev.staffName}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
