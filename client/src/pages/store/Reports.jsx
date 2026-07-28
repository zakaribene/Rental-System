import { useEffect, useState } from 'react'
import { BarChart3, Calendar, Filter, Wallet, Smartphone, Landmark, Coins, Banknote, Search, FileSpreadsheet, FileDown } from 'lucide-react'
import { getDailyTotals, getSummary } from '../../api/reports'
import { listPaymentMethods, listPayments } from '../../api/payments'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
import { getMyStore } from '../../api/myStore'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner } from '../../components/ui/Misc'
import { formatMoney, formatDateTime } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import { exportPaymentsToExcel, exportPaymentsToPdf } from '../../lib/reportExport'

const typeTone = { DEPOSIT_COLLECTION: 'success', DEBT_SETTLEMENT: 'info', REFUND: 'warning' }

const methodVisuals = [
  { match: /evc/i, icon: Smartphone, bg: 'bg-green-50 dark:bg-green-500/15', text: 'text-green-600 dark:text-green-300', ring: 'ring-green-100 dark:ring-green-500/20' },
  { match: /premier/i, icon: Landmark, bg: 'bg-sky-50 dark:bg-sky-500/15', text: 'text-sky-600 dark:text-sky-300', ring: 'ring-sky-100 dark:ring-sky-500/20' },
  { match: /dahab|zaad/i, icon: Coins, bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300', ring: 'ring-amber-100 dark:ring-amber-500/20' },
  { match: /cash/i, icon: Banknote, bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-100 dark:ring-emerald-500/20' },
]
const defaultMethodVisual = { icon: Wallet, bg: 'bg-primary-50 dark:bg-primary-500/15', text: 'text-primary-600 dark:text-primary-300', ring: 'ring-primary-100 dark:ring-primary-500/20' }

const getMethodVisual = (name = '') => methodVisuals.find((v) => v.match.test(name)) || defaultMethodVisual

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [daily, setDaily] = useState(null)
  const [summary, setSummary] = useState([])
  const [methods, setMethods] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [rentalIdFilter, setRentalIdFilter] = useState('')
  const [filteredPayments, setFilteredPayments] = useState([])
  const [filterLoading, setFilterLoading] = useState(false)
  const [store, setStore] = useState(null)
  const [exporting, setExporting] = useState('')

  useEffect(() => {
    listPaymentMethods().then(setMethods)
    listCustomers().then(setCustomers)
    listProducts().then(setProducts)
    getMyStore().then(setStore).catch(() => setStore(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([getDailyTotals(date), getSummary({})])
      .then(([d, s]) => {
        setDaily(d)
        setSummary(s)
      })
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => {
    setFilterLoading(true)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    if (customerFilter !== 'all') params.customer = customerFilter
    if (productFilter !== 'all') params.product = productFilter
    if (methodFilter !== 'all') params.method = methodFilter

    listPayments(params)
      .then(setFilteredPayments)
      .finally(() => setFilterLoading(false))
  }, [from, to, customerFilter, productFilter, methodFilter])

  const methodName = (id) => methods.find((m) => m._id === id)?.name || 'Unknown'

  const rentalIdQuery = rentalIdFilter.trim().toLowerCase()
  const visiblePayments = rentalIdQuery
    ? filteredPayments.filter((p) => (p.transactionId || '').toLowerCase().includes(rentalIdQuery))
    : filteredPayments
  const { page, setPage, pageCount, pageItems, total: pagedTotal, pageSize } = usePagination(visiblePayments, 10)

  const currentBalance = visiblePayments.reduce((sum, p) => {
    if (p.type === 'REFUND') return sum - p.amount
    return sum + p.amount
  }, 0)

  const handleExport = async (format) => {
    setExporting(format)
    try {
      const rows = visiblePayments.map((p) => ({
        type: p.type.replace(/_/g, ' ').toLowerCase(),
        amount: p.amount,
        method: methodName(p.paymentMethodId),
        customer: p.customerId?.fullName || '—',
        rental: p.transactionId ? `#${p.transactionId.slice(-6)}` : '—',
        staff: p.recordedBy?.name || '—',
        note: p.note || '—',
        date: formatDateTime(p.date),
      }))
      if (format === 'excel') await exportPaymentsToExcel(rows, store)
      else await exportPaymentsToPdf(rows, store)
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Reports" subtitle="Filter transactions and track balances across your store." />

      <Card className="mb-6">
        <CardHeader
          title="Filter transactions"
          subtitle="Narrow down by date range, customer, product, payment method or rental ID"
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={exporting === 'excel'} onClick={() => handleExport('excel')}>
                Excel
              </Button>
              <Button variant="secondary" size="sm" icon={FileDown} loading={exporting === 'pdf'} onClick={() => handleExport('pdf')}>
                PDF
              </Button>
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Customer">
              <Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                <option value="all">All customers</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product">
              <Select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                <option value="all">All products</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment method">
              <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                <option value="all">All methods</option>
                {methods.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rental ID">
              <Input icon={Search} placeholder="e.g. c496a2" value={rentalIdFilter} onChange={(e) => setRentalIdFilter(e.target.value)} />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Transactions matched" value={visiblePayments.length} icon={Filter} tone="primary" />
            <StatCard label="Current balance" value={formatMoney(currentBalance)} icon={Wallet} tone={currentBalance >= 0 ? 'success' : 'danger'} />
          </div>

          <div className="mt-5">
            {filterLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner size={26} />
              </div>
            ) : visiblePayments.length === 0 ? (
              <EmptyState icon={BarChart3} title="No transactions match these filters" />
            ) : (
              <>
                <Table
                  columns={[
                    {
                      key: 'type',
                      header: 'Type',
                      render: (row) => (
                        <Badge tone={typeTone[row.type] || 'neutral'}>{row.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                      ),
                    },
                    { key: 'rental', header: 'Rental', render: (row) => (row.transactionId ? <span className="font-mono text-xs text-ink-500">#{row.transactionId.slice(-6)}</span> : '—') },
                    { key: 'amount', header: 'Amount', render: (row) => formatMoney(row.amount) },
                    { key: 'method', header: 'Method', render: (row) => methodName(row.paymentMethodId) },
                    { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
                    { key: 'staff', header: 'Staff', render: (row) => row.recordedBy?.name || '—' },
                    { key: 'note', header: 'Note', className: 'max-w-xs whitespace-normal text-xs text-ink-500', render: (row) => row.note || '—' },
                    { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
                  ]}
                  data={pageItems}
                />
                <Pagination page={page} pageCount={pageCount} total={pagedTotal} pageSize={pageSize} onChange={setPage} />
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Daily totals"
          action={
            <Field className="w-44">
              <Input icon={Calendar} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          }
        />
        <CardBody>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner size={26} />
            </div>
          ) : (
            <>
              <StatCard label={`Collected on ${date}`} value={formatMoney(daily?.grandTotal || 0)} icon={BarChart3} tone="success" className="max-w-xs" />
              {methods.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {methods.map((method) => {
                    const total = daily?.byMethod?.find((m) => m._id === method._id)?.total || 0
                    const visual = getMethodVisual(method.name)
                    const Icon = visual.icon
                    return (
                      <div key={method._id} className="flex items-start justify-between rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                        <div>
                          <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{method.name}</p>
                          <p className="mt-1 font-display text-xl font-extrabold text-ink-900 dark:text-white">{formatMoney(total)}</p>
                        </div>
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-4 ${visual.bg} ${visual.ring}`}>
                          <Icon size={20} className={visual.text} strokeWidth={2.25} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All-time summary by payment method" subtitle="Total collected and transaction count" />
        <CardBody>
          {summary.length === 0 ? (
            <EmptyState icon={BarChart3} title="No payment data yet" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summary.map((s) => {
                const visual = getMethodVisual(methodName(s._id))
                const Icon = visual.icon
                return (
                  <div key={s._id} className="flex items-start justify-between rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                    <div>
                      <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{methodName(s._id)}</p>
                      <p className="mt-1 font-display text-xl font-extrabold text-ink-900 dark:text-white">{formatMoney(s.total)}</p>
                      <p className="mt-1 text-xs text-ink-400">{s.count} transaction(s)</p>
                    </div>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-4 ${visual.bg} ${visual.ring}`}>
                      <Icon size={20} className={visual.text} strokeWidth={2.25} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
