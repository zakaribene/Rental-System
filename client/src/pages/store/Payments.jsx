import { useEffect, useState } from 'react'
import { Settings2, Banknote } from 'lucide-react'
import { listPaymentMethods, createPaymentMethod, createPayment } from '../../api/payments'
import { listRentals } from '../../api/rentals'
import Card, { CardHeader } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, Alert } from '../../components/ui/Misc'
import { formatMoney } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

export default function Payments() {
  const [methods, setMethods] = useState([])
  const [debtRentals, setDebtRentals] = useState([])
  const [methodModalOpen, setMethodModalOpen] = useState(false)
  const [settleRental, setSettleRental] = useState(null)

  const loadDebtRentals = () => {
    listRentals().then((rentals) => setDebtRentals(rentals.filter((r) => (r.remainingDebt || 0) > 0)))
  }
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(debtRentals, 10)

  useEffect(() => {
    listPaymentMethods().then(setMethods)
    loadDebtRentals()
  }, [])

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Payments"
        subtitle="Track and settle outstanding rent fee debts."
        action={
          <Button variant="secondary" icon={Settings2} onClick={() => setMethodModalOpen(true)}>
            Payment methods
          </Button>
        }
      />

      {debtRentals.length > 0 && (
        <Card className="mb-6 border-warning-200 bg-warning-50/40 dark:border-warning-500/20 dark:bg-warning-500/5">
          <CardHeader title="Outstanding debts" subtitle="Rent fee still owed by customers, settle in full or in part" />
          <Table
            columns={[
              { key: 'id', header: 'Rental', render: (row) => <span className="font-mono text-xs text-ink-500">#{row._id.slice(-6)}</span> },
              { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
              { key: 'totalRentFee', header: 'Rent fee', render: (row) => formatMoney(row.totalRentFee) },
              { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'returned' ? 'neutral' : 'info'}>{row.status}</Badge> },
              {
                key: 'debt',
                header: 'Balance owed',
                render: (row) => <span className="font-bold text-danger-600">{formatMoney(row.remainingDebt)}</span>,
              },
              {
                key: 'action',
                header: '',
                render: (row) => (
                  <Button size="sm" icon={Banknote} onClick={() => setSettleRental(row)}>
                    Settle
                  </Button>
                ),
              },
            ]}
            data={pageItems}
          />
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
        </Card>
      )}

      <PaymentMethodsModal
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        methods={methods}
        reload={() => listPaymentMethods().then(setMethods)}
      />

      <SettleDebtModal
        open={!!settleRental}
        rental={settleRental}
        methods={methods}
        onClose={() => setSettleRental(null)}
        onSettled={() => {
          setSettleRental(null)
          loadDebtRentals()
        }}
      />
    </div>
  )
}

function SettleDebtModal({ open, rental, methods, onClose, onSettled }) {
  const [amount, setAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (rental) {
      setAmount(String(rental.remainingDebt))
      setPaymentMethodId('')
      setError('')
    }
  }, [rental])

  if (!open || !rental) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (Number(amount) > rental.remainingDebt) {
      setError(`Amount cannot exceed the remaining balance of ${formatMoney(rental.remainingDebt)}.`)
      return
    }

    setSaving(true)
    try {
      await createPayment({
        type: 'DEBT_SETTLEMENT',
        transactionId: rental._id,
        customerId: rental.customerId?._id,
        amount: Number(amount),
        paymentMethodId,
      })
      onSettled()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to settle debt'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settle debt"
      subtitle={`${rental.customerId?.fullName || 'Customer'} · rental #${rental._id.slice(-6)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="settle-debt-form" type="submit" loading={saving}>
            Settle
          </Button>
        </>
      }
    >
      <form id="settle-debt-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-ink-500">
          Balance owed: <span className="font-bold text-danger-600">{formatMoney(rental.remainingDebt)}</span>
        </p>
        <Field label="Amount" required hint="Partial payments are allowed — the remaining balance stays visible here">
          <Input
            type="number"
            min="0"
            max={rental.remainingDebt}
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
      </form>
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
            <div key={m._id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-700">
              <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{m.name}</span>
              <Badge tone={m.status === 'active' ? 'success' : 'neutral'}>{m.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
