import { useEffect, useRef, useState } from 'react'
import { Plus, ClipboardList, Trash2, PackageCheck, Upload, ArrowUpCircle, ArrowDownCircle, FileText, Banknote } from 'lucide-react'
import { listRentals, createRental, getRental, returnRental, uploadDepositDocument } from '../../api/rentals'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
import { listPaymentMethods } from '../../api/payments'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney, formatDate, formatDateTime } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

export default function Rentals() {
  const [rentals, setRentals] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = () => {
    setLoading(true)
    listRentals(statusFilter || undefined)
      .then(setRentals)
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  useEffect(() => {
    listCustomers().then(setCustomers)
    listProducts('available').then(setProducts)
    listPaymentMethods().then(setMethods).catch(() => setMethods([]))
  }, [])

  const openDetail = async (rental) => {
    setDetailOpen(true)
    setDetail(null)
    const data = await getRental(rental._id)
    setDetail(data)
  }

  const afterMutate = () => {
    load()
    listProducts('available').then(setProducts)
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Rentals"
        subtitle="Track items out on rent and process returns."
        action={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New rental
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </Select>
        <span className="text-sm font-medium text-ink-400">{rentals.length} rental(s)</span>
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
              <Button icon={Plus} size="sm" onClick={() => setCreateOpen(true)}>
                New rental
              </Button>
            }
          />
        ) : (
          <Table
            onRowClick={openDetail}
            columns={[
              { key: 'id', header: 'Rental', render: (row) => <span className="font-mono text-xs text-ink-500">#{row._id.slice(-6)}</span> },
              { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
              { key: 'items', header: 'Items', render: (row) => `${row.items?.length || 0} item(s)` },
              { key: 'totalRentFee', header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
              { key: 'dateOut', header: 'Date out', render: (row) => formatDate(row.dateOut) },
              { key: 'expectedReturnDate', header: 'Due', render: (row) => formatDate(row.expectedReturnDate) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
            data={rentals}
          />
        )}
      </Card>

      <NewRentalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        customers={customers}
        products={products}
        methods={methods}
        onCreated={() => {
          setCreateOpen(false)
          afterMutate()
        }}
      />

      <RentalDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        detail={detail}
        methods={methods}
        onReturned={() => {
          setDetailOpen(false)
          afterMutate()
        }}
      />
    </div>
  )
}

function NewRentalModal({ open, onClose, customers, products, methods, onCreated }) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([{ productId: '', quantity: 1 }])
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [depositType, setDepositType] = useState('NONE')
  const [cashAmount, setCashAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [guarantorName, setGuarantorName] = useState('')
  const [guarantorPhone, setGuarantorPhone] = useState('')
  const [documentImageUrl, setDocumentImageUrl] = useState('')
  const [documentUploading, setDocumentUploading] = useState(false)
  const documentInputRef = useRef(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
  const estimatedTotal = selectedProducts.reduce((sum, p, i) => sum + p.rentPrice * (Number(items[i]?.quantity) || 1), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanItems = items.filter((it) => it.productId).map((it) => ({ productId: it.productId, quantity: Number(it.quantity) || 1 }))
    if (!customerId || cleanItems.length === 0) {
      setError('Select a customer and at least one product.')
      return
    }

    const deposits = []
    if (depositType === 'CASH' && cashAmount) {
      deposits.push({ depositType: 'CASH', cashAmount: Number(cashAmount), paymentMethodId })
    } else if (depositType === 'GUARANTOR' && guarantorName) {
      deposits.push({ depositType: 'GUARANTOR', guarantorName, guarantorPhone })
    } else if (depositType === 'DOCUMENT' && documentImageUrl) {
      deposits.push({ depositType: 'DOCUMENT', documentImageUrl })
    }

    setSaving(true)
    try {
      await createRental({
        customerId,
        items: cleanItems,
        expectedReturnDate: expectedReturnDate || undefined,
        deposits: deposits.length ? deposits : undefined,
      })
      reset()
      onCreated()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create rental'))
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
      title="New rental"
      subtitle="Hand out items and record the rental."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="rental-form" type="submit" loading={saving}>
            Create rental
          </Button>
        </>
      }
    >
      <form id="rental-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <Field label="Customer" required>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.fullName} · {c.phone}
              </option>
            ))}
          </Select>
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
                <Select
                  value={it.productId}
                  onChange={(e) => updateItem(idx, { productId: e.target.value })}
                  className="flex-1"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} · {formatMoney(p.rentPrice)}
                    </option>
                  ))}
                </Select>
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
              Estimated total: <span className="font-bold text-primary-700">{formatMoney(estimatedTotal)}</span>
            </p>
          )}
        </div>

        <Field label="Expected return date" hint="Optional">
          <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-ink-700">Deposit</span>
          <Select value={depositType} onChange={(e) => setDepositType(e.target.value)}>
            <option value="NONE">No deposit</option>
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
        </div>
      </form>
    </Modal>
  )
}

function RentalDetailModal({ open, onClose, detail, methods, onReturned }) {
  const [selection, setSelection] = useState({})
  const [damageCosts, setDamageCosts] = useState({})
  const [refundMethodId, setRefundMethodId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (detail?.transaction) {
      const initial = {}
      detail.transaction.items.forEach((it) => {
        const id = it.productId?._id || it.productId
        initial[id] = 'ok'
      })
      setSelection(initial)
      setDamageCosts({})
      setError('')
    }
  }, [detail])

  if (!open) return null

  const transaction = detail?.transaction

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
      })
      onReturned()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to process return'))
    } finally {
      setSaving(false)
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
        transaction?.status === 'active' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button form="return-form" type="submit" icon={PackageCheck} loading={saving}>
              Process return
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
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-ink-400">Date out</p>
              <p className="font-semibold text-ink-800">{formatDateTime(transaction.dateOut)}</p>
            </div>
            <div>
              <p className="text-ink-400">Expected return</p>
              <p className="font-semibold text-ink-800">{formatDate(transaction.expectedReturnDate)}</p>
            </div>
            <div>
              <p className="text-ink-400">Total rent fee</p>
              <p className="font-semibold text-ink-800">{formatMoney(transaction.totalRentFee)}</p>
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
          </div>

          <DepositTicker deposits={detail.deposits} returnDetails={transaction.returnDetails} />

          <RentalHistory payments={detail.payments} deposits={detail.deposits} />

          {transaction.status === 'active' ? (
            <form id="return-form" onSubmit={handleReturn} className="space-y-4">
              {error && <Alert>{error}</Alert>}
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
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  )
}

function DepositTicker({ deposits, returnDetails }) {
  const cashDeposits = (deposits || []).filter((d) => d.depositType === 'CASH')
  const totalCollected = cashDeposits.reduce((sum, d) => sum + (d.cashAmount || 0), 0)
  const documentDeposits = (deposits || []).filter((d) => d.depositType === 'DOCUMENT')
  const guarantorDeposits = (deposits || []).filter((d) => d.depositType === 'GUARANTOR')
  const refunded = returnDetails?.depositRefunded || 0

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
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-danger-50 px-3 py-2.5">
          <ArrowDownCircle size={20} className="shrink-0 text-danger-600" />
          <div>
            <p className="text-xs font-medium text-danger-700">Refunded</p>
            <p className="font-display text-lg font-extrabold text-danger-700">{formatMoney(refunded)}</p>
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

function RentalHistory({ payments, deposits }) {
  const nonCashDeposits = (deposits || []).filter((d) => d.depositType !== 'CASH')
  const events = [
    ...(payments || []).map((p) => ({
      key: p._id,
      date: p.date,
      ...historyEventStyle[p.type],
      amount: p.amount,
      note: p.note,
    })),
    ...nonCashDeposits.map((d) => ({
      key: d._id,
      date: d.createdAt,
      icon: FileText,
      tone: 'text-ink-500',
      bg: 'bg-ink-100',
      label: d.depositType === 'GUARANTOR' ? 'Guarantor held' : 'Document held',
      note: d.depositType === 'GUARANTOR' ? `${d.guarantorName || ''} ${d.guarantorPhone || ''}`.trim() : 'ID / passport as collateral',
    })),
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
                <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(ev.date)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
