import { useEffect, useState } from 'react'
import { Plus, Wallet, Settings2, CheckCircle2 } from 'lucide-react'
import { listPayments, createPayment, listPaymentMethods, createPaymentMethod } from '../../api/payments'
import { listCustomers } from '../../api/customers'
import { listRentals } from '../../api/rentals'
import Card, { CardHeader } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney, formatDateTime } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const typeTone = { DEPOSIT_COLLECTION: 'success', DEBT_SETTLEMENT: 'info', REFUND: 'warning' }

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [methods, setMethods] = useState([])
  const [customers, setCustomers] = useState([])
  const [debtRentals, setDebtRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [methodModalOpen, setMethodModalOpen] = useState(false)

  const load = () => {
    setLoading(true)
    listPayments()
      .then(setPayments)
      .finally(() => setLoading(false))
  }

  const loadDebtRentals = () => {
    listRentals('returned').then((rentals) =>
      setDebtRentals(rentals.filter((r) => (r.returnDetails?.remainingDebt || 0) > 0))
    )
  }

  useEffect(load, [])
  useEffect(() => {
    listPaymentMethods().then(setMethods)
    listCustomers().then(setCustomers)
    loadDebtRentals()
  }, [])

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Payments"
        subtitle="Every deposit, settlement and refund recorded by your store."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Settings2} onClick={() => setMethodModalOpen(true)}>
              Payment methods
            </Button>
            <Button icon={Plus} onClick={() => setPayModalOpen(true)}>
              Record payment
            </Button>
          </div>
        }
      />

      {debtRentals.length > 0 && (
        <Card className="mb-6 border-warning-200 bg-warning-50/40 dark:border-warning-500/20 dark:bg-warning-500/5">
          <CardHeader title="Outstanding debts" subtitle="Rentals with unpaid balance after return" />
          <Table
            columns={[
              { key: 'id', header: 'Rental', render: (row) => <span className="font-mono text-xs text-ink-500">#{row._id.slice(-6)}</span> },
              { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
              { key: 'totalRentFee', header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
              {
                key: 'debt',
                header: 'Balance owed',
                render: (row) => (
                  <span className="font-bold text-danger-600">{formatMoney(row.returnDetails.remainingDebt)}</span>
                ),
              },
            ]}
            data={debtRentals}
          />
        </Card>
      )}

      <Card>
        <CardHeader title="Transaction history" />
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments recorded yet" />
        ) : (
          <Table
            columns={[
              {
                key: 'type',
                header: 'Type',
                render: (row) => (
                  <Badge tone={typeTone[row.type] || 'neutral'}>{row.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                ),
              },
              { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
              { key: 'amount', header: 'Amount', render: (row) => formatMoney(row.amount) },
              { key: 'note', header: 'Note', className: 'max-w-xs whitespace-normal text-xs text-ink-500', render: (row) => row.note || '—' },
              { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
            ]}
            data={payments}
          />
        )}
      </Card>

      <RecordPaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        methods={methods}
        customers={customers}
        debtRentals={debtRentals}
        onCreated={() => {
          setPayModalOpen(false)
          load()
          loadDebtRentals()
        }}
      />

      <PaymentMethodsModal
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        methods={methods}
        reload={() => listPaymentMethods().then(setMethods)}
      />
    </div>
  )
}

function RecordPaymentModal({ open, onClose, methods, customers, debtRentals, onCreated }) {
  const [type, setType] = useState('DEBT_SETTLEMENT')
  const [transactionId, setTransactionId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [successBalance, setSuccessBalance] = useState(null)

  const selectedRental = debtRentals.find((r) => r._id === transactionId)
  const remainingDebt = selectedRental?.returnDetails?.remainingDebt || 0

  const reset = () => {
    setAmount('')
    setTransactionId('')
    setCustomerId('')
    setError('')
    setSuccessBalance(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessBalance(null)

    if (type === 'DEBT_SETTLEMENT') {
      if (!transactionId) {
        setError('Select which rental this payment settles.')
        return
      }
      if (Number(amount) > remainingDebt) {
        setError(`Amount cannot exceed the remaining balance of ${formatMoney(remainingDebt)}.`)
        return
      }
    }

    setSaving(true)
    try {
      const { remainingDebt: newBalance } = await createPayment({
        type,
        transactionId: type === 'DEBT_SETTLEMENT' ? transactionId : undefined,
        amount: Number(amount),
        paymentMethodId,
        customerId: (type === 'DEBT_SETTLEMENT' ? selectedRental?.customerId?._id : customerId) || undefined,
      })

      if (type === 'DEBT_SETTLEMENT' && newBalance > 0) {
        setSuccessBalance(newBalance)
        setAmount('')
      } else {
        reset()
        onCreated()
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to record payment'))
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
      title="Record a payment"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              onClose()
              reset()
            }}
          >
            {successBalance !== null ? 'Close' : 'Cancel'}
          </Button>
          {successBalance === null && (
            <Button form="payment-form" type="submit" loading={saving}>
              Record
            </Button>
          )}
        </>
      }
    >
      {successBalance !== null ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
            <CheckCircle2 size={28} className="text-success-600" />
          </div>
          <p className="font-semibold text-ink-800">Payment recorded</p>
          <p className="text-sm text-ink-500">
            {selectedRental?.customerId?.fullName || 'Customer'} still owes{' '}
            <span className="font-bold text-danger-600">{formatMoney(successBalance)}</span> on this rental
          </p>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              reset()
              onCreated()
            }}
          >
            Record another payment
          </Button>
        </div>
      ) : (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Type" required>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setTransactionId('')
                setAmount('')
              }}
            >
              <option value="DEBT_SETTLEMENT">Debt settlement</option>
              <option value="DEPOSIT_COLLECTION">Deposit collection</option>
              <option value="REFUND">Refund</option>
            </Select>
          </Field>

          {type === 'DEBT_SETTLEMENT' && (
            <Field label="Rental with debt" required hint={debtRentals.length === 0 ? 'No outstanding debts right now.' : undefined}>
              <Select value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required>
                <option value="">Select a rental</option>
                {debtRentals.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.customerId?.fullName || 'Customer'} · #{r._id.slice(-6)} · owes {formatMoney(r.returnDetails.remainingDebt)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field
            label="Amount"
            required
            hint={type === 'DEBT_SETTLEMENT' && transactionId ? `Balance owed: ${formatMoney(remainingDebt)}` : undefined}
          >
            <Input
              type="number"
              min="0"
              max={type === 'DEBT_SETTLEMENT' && transactionId ? remainingDebt : undefined}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>

          <Field label="Payment method" required>
            <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} required>
              <option value="">Select method</option>
              {methods.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

          {type !== 'DEBT_SETTLEMENT' && (
            <Field label="Customer" hint="Optional">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">No customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </form>
      )}
    </Modal>
  )
}

function PaymentMethodsModal({ open, onClose, methods, reload }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createPaymentMethod({ name })
      setName('')
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add method'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Payment methods" subtitle="Ways your store accepts money">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cash, EVC Plus" className="flex-1" />
          <Button type="submit" loading={saving}>
            Add
          </Button>
        </form>
        <div className="space-y-2">
          {methods.length === 0 && <p className="text-sm text-ink-400">No payment methods yet.</p>}
          {methods.map((m) => (
            <div key={m._id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
              <span className="text-sm font-medium text-ink-800">{m.name}</span>
              <Badge tone={m.status === 'active' ? 'success' : 'neutral'}>{m.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
