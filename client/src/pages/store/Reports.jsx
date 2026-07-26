import { useEffect, useState } from 'react'
import { BarChart3, Calendar, Filter, Wallet } from 'lucide-react'
import { getDailyTotals, getSummary } from '../../api/reports'
import { listPaymentMethods, listPayments } from '../../api/payments'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner } from '../../components/ui/Misc'
import { formatMoney, formatDateTime } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'

const typeTone = { DEPOSIT_COLLECTION: 'success', DEBT_SETTLEMENT: 'info', REFUND: 'warning' }

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
  const [filteredPayments, setFilteredPayments] = useState([])
  const [filterLoading, setFilterLoading] = useState(false)

  useEffect(() => {
    listPaymentMethods().then(setMethods)
    listCustomers().then(setCustomers)
    listProducts().then(setProducts)
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

  const currentBalance = filteredPayments.reduce((sum, p) => {
    if (p.type === 'REFUND') return sum - p.amount
    return sum + p.amount
  }, 0)

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Reports" subtitle="Filter transactions and track balances across your store." />

      <Card className="mb-6">
        <CardHeader title="Filter transactions" subtitle="Narrow down by date range, customer, product or payment method" />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Transactions matched" value={filteredPayments.length} icon={Filter} tone="primary" />
            <StatCard label="Current balance" value={formatMoney(currentBalance)} icon={Wallet} tone={currentBalance >= 0 ? 'success' : 'danger'} />
          </div>

          <div className="mt-5">
            {filterLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner size={26} />
              </div>
            ) : filteredPayments.length === 0 ? (
              <EmptyState icon={BarChart3} title="No transactions match these filters" />
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
                  { key: 'amount', header: 'Amount', render: (row) => formatMoney(row.amount) },
                  { key: 'method', header: 'Method', render: (row) => methodName(row.paymentMethodId) },
                  { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || '—' },
                  { key: 'note', header: 'Note', className: 'max-w-xs whitespace-normal text-xs text-ink-500', render: (row) => row.note || '—' },
                  { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
                ]}
                data={filteredPayments}
              />
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
              {daily?.byMethod?.length > 0 && (
                <div className="mt-5 space-y-2">
                  {daily.byMethod.map((m) => (
                    <div key={m._id} className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-2.5 text-sm dark:bg-ink-800/60">
                      <span className="font-medium text-ink-700 dark:text-ink-300">{methodName(m._id)}</span>
                      <span className="font-bold text-ink-900 dark:text-white">{formatMoney(m.total)}</span>
                    </div>
                  ))}
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
              {summary.map((s) => (
                <div key={s._id} className="rounded-xl border border-ink-100 p-4">
                  <p className="text-sm font-medium text-ink-500">{methodName(s._id)}</p>
                  <p className="mt-1 font-display text-xl font-extrabold text-ink-900 dark:text-white">{formatMoney(s.total)}</p>
                  <p className="mt-1 text-xs text-ink-400">{s.count} transaction(s)</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
