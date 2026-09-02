import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, ArrowLeftRight, ArrowRight, Trash2, PiggyBank, StickyNote } from 'lucide-react'
import { listTransfers, createTransfer, deleteTransfer, getTransferBalances } from '../../api/transfers'
import { listPaymentMethods } from '../../api/payments'
import { getMyStore } from '../../api/myStore'
import usePermissions from '../../hooks/usePermissions'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field } from '../../components/ui/Input'
import PaymentMethodPicker from '../../components/ui/PaymentMethodPicker'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney, formatDateTime, cn } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'
import { getMethodVisual } from '../../lib/paymentMethodVisuals'

const emptyForm = { fromMethodId: '', toMethodId: '', amount: '', note: '' }

// Small "icon chip + name" used in the table for each side of a transfer.
function MethodTag({ name }) {
  const visual = getMethodVisual(name || 'Unknown')
  const Icon = visual.icon
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-2', visual.bg, visual.ring)}>
        <Icon size={13} className={visual.text} strokeWidth={2.25} />
      </span>
      <span className="font-medium text-ink-800 dark:text-ink-100">{name || 'Unknown'}</span>
    </span>
  )
}

export default function Transfers() {
  const { can, loaded } = usePermissions()
  const [transfers, setTransfers] = useState([])
  const [methods, setMethods] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState(null)
  const [storeChecked, setStoreChecked] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getMyStore()
      .then(setStore)
      .catch(() => setStore(null))
      .finally(() => setStoreChecked(true))
  }, [])

  const load = () => {
    setLoading(true)
    listTransfers()
      .then(setTransfers)
      .finally(() => setLoading(false))
  }

  const loadBalances = () => getTransferBalances().then(setBalances).catch(() => setBalances([]))

  useEffect(load, [])

  useEffect(() => {
    listPaymentMethods().then(setMethods).catch(() => setMethods([]))
    loadBalances()
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.fromMethodId && form.fromMethodId === form.toMethodId) {
      setError('The source and destination must be two different payment methods.')
      return
    }
    setSaving(true)
    try {
      await createTransfer({
        fromMethodId: form.fromMethodId,
        toMethodId: form.toMethodId,
        amount: Number(form.amount),
        note: form.note || undefined,
      })
      setModalOpen(false)
      load()
      loadBalances()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to record transfer'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTransfer(deleteTarget._id)
      setDeleteTarget(null)
      load()
      loadBalances()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete transfer'))
    } finally {
      setDeleting(false)
    }
  }

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(transfers, 10)
  const fromBalance = balances.find((b) => b._id === form.fromMethodId)
  const amountNum = Number(form.amount) || 0
  const overspent = fromBalance && amountNum > fromBalance.balance
  const canDelete = can('transfers', 'delete')

  if (storeChecked && !store?.transfersEnabled) return <Navigate to="/store" replace />
  if (loaded && !can('transfers')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Transfer Payments"
        subtitle="Move money between your payment methods — it leaves the source's balance and lands in the destination's."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New transfer
          </Button>
        }
      />

      {error && !modalOpen && !deleteTarget && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      {balances.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <PiggyBank size={18} className="text-ink-400" />
            <h2 className="font-display text-base font-bold text-ink-900 dark:text-white">Available balance by method</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((b) => {
              const visual = getMethodVisual(b.name)
              const Icon = visual.icon
              return (
                <div key={b._id} className="rounded-xl2 border border-ink-100 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{b.name}</p>
                      <p className={cn('mt-1 font-display text-xl font-extrabold', b.balance < 0 ? 'text-danger-600' : 'text-ink-900 dark:text-white')}>
                        {formatMoney(b.balance)}
                      </p>
                    </div>
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4', visual.bg, visual.ring)}>
                      <Icon size={18} className={visual.text} strokeWidth={2.25} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transfers yet"
            subtitle="Record a transfer whenever you move money from one method to another."
            action={
              <Button icon={Plus} onClick={openCreate} size="sm">
                New transfer
              </Button>
            }
          />
        ) : (
          <>
            <Table
              columns={[
                { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
                { key: 'from', header: 'From', render: (row) => <MethodTag name={row.fromMethodId?.name} /> },
                {
                  key: 'arrow',
                  header: '',
                  render: () => <ArrowRight size={16} className="text-ink-400" />,
                },
                { key: 'to', header: 'To', render: (row) => <MethodTag name={row.toMethodId?.name} /> },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (row) => <span className="font-semibold text-ink-900 dark:text-white">{formatMoney(row.amount)}</span>,
                },
                {
                  key: 'note',
                  header: 'Note',
                  className: 'max-w-xs whitespace-normal text-xs text-ink-500',
                  render: (row) => row.note || '—',
                },
                { key: 'staff', header: 'Recorded by', render: (row) => row.recordedBy?.name || '—' },
                ...(canDelete
                  ? [
                      {
                        key: 'actions',
                        header: '',
                        headerClassName: 'text-right',
                        className: 'text-right',
                        render: (row) => (
                          <RowActionsMenu
                            items={[
                              { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', onClick: () => setDeleteTarget(row) },
                            ]}
                          />
                        ),
                      },
                    ]
                  : []),
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
        title="New transfer"
        subtitle="Recorded with the current date and time automatically."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="transfer-form" type="submit" loading={saving} disabled={overspent}>
              Transfer money
            </Button>
          </>
        }
      >
        <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <Field
              label="From"
              required
              hint={fromBalance ? `Available: ${formatMoney(fromBalance.balance)}` : 'Money leaves this method'}
            >
              <PaymentMethodPicker
                methods={methods}
                value={form.fromMethodId}
                onChange={(id) => setForm((f) => ({ ...f, fromMethodId: id, toMethodId: f.toMethodId === id ? '' : f.toMethodId }))}
              />
            </Field>

            <div className="hidden self-center pt-7 sm:block">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-4 ring-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/20">
                <ArrowRight size={16} strokeWidth={2.5} />
              </div>
            </div>

            <Field label="To" required hint="Money lands in this method">
              <PaymentMethodPicker
                methods={methods.filter((m) => m._id !== form.fromMethodId)}
                value={form.toMethodId}
                onChange={(id) => setForm((f) => ({ ...f, toMethodId: id }))}
              />
            </Field>
          </div>

          <Field
            label="Amount"
            required
            error={overspent ? `Exceeds the available balance of ${formatMoney(fromBalance.balance)}` : undefined}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              error={overspent}
              required
            />
          </Field>

          <Field label="Note" hint="Optional — e.g. bank deposit, cash withdrawal">
            <Input
              icon={StickyNote}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Reason for this transfer"
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete transfer"
        subtitle={deleteTarget ? `${deleteTarget.fromMethodId?.name || '—'} → ${deleteTarget.toMethodId?.name || '—'}` : ''}
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
          This reverses the transfer — {formatMoney(deleteTarget?.amount || 0)} goes back to{' '}
          {deleteTarget?.fromMethodId?.name || 'the source method'} and leaves{' '}
          {deleteTarget?.toMethodId?.name || 'the destination method'}.
        </p>
      </Modal>
    </div>
  )
}
