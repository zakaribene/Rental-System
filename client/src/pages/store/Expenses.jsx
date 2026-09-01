import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Receipt, Trash2, PiggyBank } from 'lucide-react'
import { listExpenses, createExpense, deleteExpense, listExpenseCategories, createExpenseCategory, getExpenseBalances } from '../../api/expenses'
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
import CategoryPicker from '../../components/ui/CategoryPicker'
import PaymentMethodPicker from '../../components/ui/PaymentMethodPicker'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney, formatDateTime, cn } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'
import { getMethodVisual } from '../../lib/paymentMethodVisuals'

const emptyForm = { description: '', category: '', amount: '', paymentMethodId: '' }

export default function Expenses() {
  const { can, loaded } = usePermissions()
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
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
    listExpenses()
      .then(setExpenses)
      .finally(() => setLoading(false))
  }

  const loadBalances = () => getExpenseBalances().then(setBalances).catch(() => setBalances([]))

  useEffect(load, [])

  useEffect(() => {
    listExpenseCategories().then(setCategories).catch(() => setCategories([]))
    listPaymentMethods().then(setMethods).catch(() => setMethods([]))
    loadBalances()
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const handleCreateCategory = async (name) => {
    const category = await createExpenseCategory({ name })
    setCategories((c) => [...c, category].sort((a, b) => a.name.localeCompare(b.name)))
    setForm((f) => ({ ...f, category: category.name }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createExpense({
        description: form.description,
        category: form.category || undefined,
        amount: Number(form.amount),
        paymentMethodId: form.paymentMethodId,
      })
      setModalOpen(false)
      load()
      loadBalances()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to record expense'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteExpense(deleteTarget._id)
      setDeleteTarget(null)
      load()
      loadBalances()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete expense'))
    } finally {
      setDeleting(false)
    }
  }

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(expenses, 10)
  const selectedBalance = balances.find((b) => b._id === form.paymentMethodId)
  const canDelete = can('expenses', 'delete')

  if (storeChecked && !store?.expensesEnabled) return <Navigate to="/store" replace />
  if (loaded && !can('expenses')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Expenses"
        subtitle="Track what your store spends — every expense is deducted straight from the method's balance."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New expense
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
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            subtitle="Record your store's spending as it happens."
            action={
              <Button icon={Plus} onClick={openCreate} size="sm">
                New expense
              </Button>
            }
          />
        ) : (
          <>
            <Table
              columns={[
                { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
                { key: 'description', header: 'Description', render: (row) => <span className="font-medium text-ink-800 dark:text-ink-100">{row.description}</span> },
                { key: 'category', header: 'Category', render: (row) => (row.category ? <Badge tone="neutral">{row.category}</Badge> : '—') },
                {
                  key: 'method',
                  header: 'Method',
                  render: (row) => {
                    const name = row.paymentMethodId?.name || 'Unknown'
                    const visual = getMethodVisual(name)
                    const Icon = visual.icon
                    return (
                      <span className="inline-flex items-center gap-2">
                        <Icon size={14} className={visual.text} />
                        {name}
                      </span>
                    )
                  },
                },
                { key: 'amount', header: 'Amount', render: (row) => <span className="font-semibold text-danger-600">-{formatMoney(row.amount)}</span> },
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
        title="New expense"
        subtitle="Recorded with the current date and time automatically."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="expense-form" type="submit" loading={saving}>
              Record expense
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Description" required>
            <Input
              icon={Receipt}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Shop rent, fuel, repairs"
              required
            />
          </Field>

          <Field label="Category" hint="Optional — pick an existing one or type a new name to create it">
            <CategoryPicker
              categories={categories}
              value={form.category}
              onChange={(name) => setForm((f) => ({ ...f, category: name }))}
              onCreate={handleCreateCategory}
              placeholder="Search or create category..."
            />
          </Field>

          <Field label="Amount" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </Field>

          <Field label="Paid from" required hint={selectedBalance ? `Available balance: ${formatMoney(selectedBalance.balance)}` : undefined}>
            <PaymentMethodPicker
              methods={methods}
              value={form.paymentMethodId}
              onChange={(id) => setForm((f) => ({ ...f, paymentMethodId: id }))}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete expense"
        subtitle={deleteTarget?.description}
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
          This permanently removes the expense and returns {formatMoney(deleteTarget?.amount || 0)} to{' '}
          {deleteTarget?.paymentMethodId?.name || 'the payment method'}'s available balance.
        </p>
      </Modal>
    </div>
  )
}
