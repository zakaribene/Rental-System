import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Settings2, Banknote } from 'lucide-react'
import { listPaymentMethods, createPaymentMethod, createPayment } from '../../api/payments'
import { listRentals } from '../../api/rentals'
import { listSales } from '../../api/sales'
import { getMyStore } from '../../api/myStore'
import { combineDebts } from '../../lib/debts'
import usePermissions from '../../hooks/usePermissions'
import Card, { CardHeader } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import PaymentMethodPicker from '../../components/ui/PaymentMethodPicker'
import Badge from '../../components/ui/Badge'
import { PageHeader, Alert } from '../../components/ui/Misc'
import { formatMoney } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

export default function Payments() {
  const { can, loaded } = usePermissions()
  const [methods, setMethods] = useState([])
  const [debts, setDebts] = useState([])
  const [salesEnabled, setSalesEnabled] = useState(false)
  const [methodModalOpen, setMethodModalOpen] = useState(false)
  const [settleDebt, setSettleDebt] = useState(null)

  const loadDebts = () => {
    Promise.all([listRentals(), salesEnabled ? listSales() : Promise.resolve([])]).then(([rentals, sales]) =>
      setDebts(combineDebts(rentals, sales))
    )
  }
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(debts, 10)

  useEffect(() => {
    listPaymentMethods().then(setMethods)
    getMyStore()
      .then((store) => setSalesEnabled(!!store.salesEnabled))
      .catch(() => setSalesEnabled(false))
  }, [])

  useEffect(loadDebts, [salesEnabled])

  if (loaded && !can('payments')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Payments"
        subtitle="Track and settle outstanding balances owed by customers."
        action={
          <Button variant="secondary" icon={Settings2} onClick={() => setMethodModalOpen(true)}>
            Payment methods
          </Button>
        }
      />

      {debts.length > 0 && (
        <Card className="mb-6 border-warning-200 bg-warning-50/40 dark:border-warning-500/20 dark:bg-warning-500/5">
          <CardHeader title="Outstanding debts" subtitle="Rentals and sales still owed by customers, settle in full or in part" />
          <Table
            columns={[
              {
                key: 'kind',
                header: 'Type',
                render: (row) => <Badge tone={row.kind === 'RENTAL' ? 'info' : 'primary'}>{row.kind === 'RENTAL' ? 'Rental' : 'Sale'}</Badge>,
              },
              { key: 'id', header: 'Ref', render: (row) => <span className="font-mono text-xs text-ink-500">#{row.id.slice(-6)}</span> },
              { key: 'customer', header: 'Customer', render: (row) => row.customer?.fullName || 'Walk-in' },
              { key: 'total', header: 'Total', render: (row) => formatMoney(row.total) },
              {
                key: 'debt',
                header: 'Balance owed',
                render: (row) => <span className="font-bold text-danger-600">{formatMoney(row.remainingDebt)}</span>,
              },
              {
                key: 'action',
                header: '',
                render: (row) => (
                  <Button size="sm" icon={Banknote} onClick={() => setSettleDebt(row)}>
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
        open={!!settleDebt}
        debt={settleDebt}
        methods={methods}
        onClose={() => setSettleDebt(null)}
        onSettled={() => {
          setSettleDebt(null)
          loadDebts()
        }}
      />
    </div>
  )
}

function SettleDebtModal({ open, debt, methods, onClose, onSettled }) {
  const [amount, setAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (debt) {
      setAmount(String(debt.remainingDebt))
      setPaymentMethodId('')
      setError('')
    }
  }, [debt])

  if (!open || !debt) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (Number(amount) > debt.remainingDebt) {
      setError(`Amount cannot exceed the remaining balance of ${formatMoney(debt.remainingDebt)}.`)
      return
    }
    if (!paymentMethodId) {
      setError('Select a payment method.')
      return
    }

    setSaving(true)
    try {
      await createPayment({
        type: debt.kind === 'RENTAL' ? 'DEBT_SETTLEMENT' : 'SALE_PAYMENT',
        transactionId: debt.kind === 'RENTAL' ? debt.id : undefined,
        saleId: debt.kind === 'SALE' ? debt.id : undefined,
        customerId: debt.customer?._id,
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
      subtitle={`${debt.customer?.fullName || 'Walk-in customer'} · ${debt.kind === 'RENTAL' ? 'rental' : 'sale'} #${debt.id.slice(-6)}`}
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
          Balance owed: <span className="font-bold text-danger-600">{formatMoney(debt.remainingDebt)}</span>
        </p>
        <Field label="Amount" required hint="Partial payments are allowed — the remaining balance stays visible here">
          <Input
            type="number"
            min="0"
            max={debt.remainingDebt}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Payment method" required>
          <PaymentMethodPicker methods={methods} value={paymentMethodId} onChange={setPaymentMethodId} />
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
