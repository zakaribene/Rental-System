import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, Calendar, Filter, Wallet, Search, FileSpreadsheet, FileDown, ShoppingBag, Tag, Package, Users2, AlertCircle } from 'lucide-react'
import { getDailyTotals, getSummary, getSalesReport } from '../../api/reports'
import { listPaymentMethods, listPayments } from '../../api/payments'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
import { listSales } from '../../api/sales'
import { listRentals } from '../../api/rentals'
import { getMyStore } from '../../api/myStore'
import { combineDebts } from '../../lib/debts'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Input, { Field, Select } from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner } from '../../components/ui/Misc'
import { formatMoney, formatDateTime, paymentSplitsLabel, cn } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import { exportPaymentsToExcel, exportPaymentsToPdf, exportSalesToExcel, exportSalesToPdf } from '../../lib/reportExport'
import { getMethodVisual } from '../../lib/paymentMethodVisuals'
import usePermissions from '../../hooks/usePermissions'

const typeTone = { DEPOSIT_COLLECTION: 'success', DEBT_SETTLEMENT: 'info', REFUND: 'warning' }

export default function Reports() {
  const { can, loaded } = usePermissions()
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
  const [salesReport, setSalesReport] = useState(null)
  const [salesRows, setSalesRows] = useState([])
  const [salesPaymentRows, setSalesPaymentRows] = useState([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesExporting, setSalesExporting] = useState('')
  const [debtRecords, setDebtRecords] = useState([])
  const [debtsLoading, setDebtsLoading] = useState(true)
  const [debtSearch, setDebtSearch] = useState('')

  useEffect(() => {
    listPaymentMethods().then(setMethods)
    listCustomers().then(setCustomers)
    listProducts().then(setProducts)
    getMyStore().then(setStore).catch(() => setStore(null))
  }, [])

  useEffect(() => {
    setDebtsLoading(true)
    Promise.all([listRentals(), store?.salesEnabled ? listSales() : Promise.resolve([])])
      .then(([rentals, sales]) => setDebtRecords(combineDebts(rentals, sales)))
      .finally(() => setDebtsLoading(false))
  }, [store?.salesEnabled])

  useEffect(() => {
    if (!store?.salesEnabled) return
    setSalesLoading(true)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    Promise.all([getSalesReport(params), listSales(params), listPayments(params)])
      .then(([report, sales, payments]) => {
        setSalesReport(report)
        setSalesRows(sales)
        setSalesPaymentRows(payments)
      })
      .finally(() => setSalesLoading(false))
  }, [store?.salesEnabled, from, to])

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
  const {
    page: salesPage,
    setPage: setSalesPage,
    pageCount: salesPageCount,
    pageItems: salesPageItems,
    total: salesTotal,
    pageSize: salesPageSize,
  } = usePagination(salesRows, 10)

  const debtQuery = debtSearch.trim().toLowerCase()
  const filteredDebts = debtQuery
    ? debtRecords.filter((d) => [d.customer?.fullName, d.customer?.phone].some((v) => v?.toLowerCase().includes(debtQuery)))
    : debtRecords
  const {
    page: debtPage,
    setPage: setDebtPage,
    pageCount: debtPageCount,
    pageItems: debtPageItems,
    total: debtTotal,
    pageSize: debtPageSize,
  } = usePagination(filteredDebts, 10)
  const totalOwed = filteredDebts.reduce((sum, d) => sum + d.remainingDebt, 0)

  // A sale's own `paymentSplits` only ever reflects what was paid at
  // creation — a later debt settlement (Payments page) tops up
  // `amountPaid` without touching that array. The Payment collection is
  // the only place both the initial and later SALE_PAYMENT rows live, so
  // that's the source of truth for "how much did each method actually
  // collect for sales" here.
  const salesByMethod = useMemo(() => {
    const map = new Map()
    salesPaymentRows
      .filter((p) => p.type === 'SALE_PAYMENT')
      .forEach((p) => {
        const id = p.paymentMethodId?._id || p.paymentMethodId
        if (!id) return
        const name = p.paymentMethodId?.name || methods.find((m) => m._id === id)?.name || 'Unknown'
        const existing = map.get(id) || { id, name, total: 0 }
        existing.total += p.amount || 0
        map.set(id, existing)
      })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [salesPaymentRows, methods])

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

  const handleSalesExport = async (format) => {
    setSalesExporting(format)
    try {
      const rows = salesRows.map((s) => ({
        sale: `#${s._id.slice(-6)}`,
        customer: s.customerId?.fullName || 'Walk-in',
        items: s.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0,
        staff: s.staffUserId?.name || '—',
        discount: s.discountAmount ? formatMoney(s.discountAmount) : '—',
        total: formatMoney(s.totalAmount),
        method: paymentSplitsLabel(s),
        date: formatDateTime(s.createdAt),
      }))
      if (format === 'excel') await exportSalesToExcel(rows, store)
      else await exportSalesToPdf(rows, store)
    } finally {
      setSalesExporting('')
    }
  }

  if (loaded && !can('reports')) return <Navigate to="/store" replace />

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
        <CardHeader title="Customers with debt" subtitle="Outstanding balances across rentals and sales, whichever they came from" />
        <CardBody>
          <Field label="Search by customer name or phone" className="mb-5 max-w-sm">
            <Input icon={Search} placeholder="e.g. Ahmed, 61..." value={debtSearch} onChange={(e) => setDebtSearch(e.target.value)} />
          </Field>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Customers with debt" value={filteredDebts.length} icon={AlertCircle} tone="danger" />
            <StatCard label="Total owed" value={formatMoney(totalOwed)} icon={Wallet} tone="warning" />
          </div>

          {debtsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner size={26} />
            </div>
          ) : filteredDebts.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No outstanding debts" subtitle="Every rental and sale is fully paid." />
          ) : (
            <>
              <Table
                columns={[
                  {
                    key: 'kind',
                    header: 'Type',
                    render: (row) => <Badge tone={row.kind === 'RENTAL' ? 'info' : 'primary'}>{row.kind === 'RENTAL' ? 'Rental' : 'Sale'}</Badge>,
                  },
                  { key: 'id', header: 'Ref', render: (row) => <span className="font-mono text-xs text-ink-500">#{row.id.slice(-6)}</span> },
                  { key: 'customer', header: 'Customer', render: (row) => row.customer?.fullName || 'Walk-in' },
                  { key: 'phone', header: 'Phone', render: (row) => row.customer?.phone || '—' },
                  { key: 'total', header: 'Total', render: (row) => formatMoney(row.total) },
                  { key: 'paid', header: 'Paid', render: (row) => formatMoney(row.total - row.remainingDebt) },
                  { key: 'owed', header: 'Owed', render: (row) => <span className="font-bold text-danger-600">{formatMoney(row.remainingDebt)}</span> },
                  { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
                ]}
                data={debtPageItems}
              />
              <Pagination page={debtPage} pageCount={debtPageCount} total={debtTotal} pageSize={debtPageSize} onChange={setDebtPage} />
            </>
          )}
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

      {store?.salesEnabled && (
        <Card className="mt-6">
          <CardHeader
            title="Sales"
            subtitle="Revenue, top sellers and who made each sale"
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={salesExporting === 'excel'} onClick={() => handleSalesExport('excel')}>
                  Excel
                </Button>
                <Button variant="secondary" size="sm" icon={FileDown} loading={salesExporting === 'pdf'} onClick={() => handleSalesExport('pdf')}>
                  PDF
                </Button>
              </div>
            }
          />
          <CardBody>
            {salesLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner size={26} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Sales revenue" value={formatMoney(salesReport?.totalRevenue || 0)} icon={ShoppingBag} tone="success" />
                  <StatCard label="Discount given" value={formatMoney(salesReport?.totalDiscount || 0)} icon={Tag} tone="warning" />
                  <StatCard label="Units sold" value={salesReport?.unitsSold || 0} icon={Package} tone="primary" />
                  <StatCard label="Total sales" value={salesReport?.totalSales || 0} icon={Filter} tone="info" />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Top selling products</p>
                      {salesReport?.topProducts?.length > 0 && <span className="text-xs font-medium text-ink-400">Top 3</span>}
                    </div>
                    {!salesReport?.topProducts?.length ? (
                      <EmptyState icon={Package} title="No sales yet" />
                    ) : (
                      <div className="space-y-2">
                        {salesReport.topProducts.slice(0, 3).map((p, i) => (
                          <div
                            key={p._id}
                            className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800"
                          >
                            <div
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold',
                                i === 0
                                  ? 'bg-primary-600 text-white'
                                  : i === 1
                                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                                  : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
                              )}
                            >
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{p.name || 'Deleted product'}</p>
                              <p className="text-xs text-ink-400">{p.unitsSold} unit(s) sold</p>
                            </div>
                            <p className="shrink-0 font-semibold text-ink-800 dark:text-ink-100">{formatMoney(p.revenue)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Sales by staff</p>
                    {!salesReport?.byStaff?.length ? (
                      <EmptyState icon={Users2} title="No sales yet" />
                    ) : (
                      <div className="space-y-2">
                        {salesReport.byStaff.map((s) => (
                          <div key={s._id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                            <div>
                              <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{s.name || 'Unknown'}</p>
                              <p className="text-xs text-ink-400">{s.totalSales} sale(s)</p>
                            </div>
                            <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(s.revenue)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {salesByMethod.length > 0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                          Sales collected · by payment method
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {salesByMethod.map((m) => {
                            const visual = getMethodVisual(m.name)
                            const Icon = visual.icon
                            return (
                              <div
                                key={m.id}
                                className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 transition-colors hover:border-primary-200 dark:border-ink-800 dark:hover:border-primary-500/30"
                              >
                                <div
                                  className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-2', visual.bg, visual.ring)}
                                >
                                  <Icon size={13} className={visual.text} strokeWidth={2.25} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-medium leading-tight text-ink-500 dark:text-ink-400">{m.name}</p>
                                  <p className="truncate text-sm font-bold leading-tight text-ink-900 dark:text-white">{formatMoney(m.total)}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">All sales</p>
                  {salesRows.length === 0 ? (
                    <EmptyState icon={ShoppingBag} title="No sales in this range" />
                  ) : (
                    <>
                      <Table
                        columns={[
                          { key: 'id', header: 'Sale', render: (row) => <span className="font-mono text-xs text-ink-500">#{row._id.slice(-6)}</span> },
                          { key: 'customer', header: 'Customer', render: (row) => row.customerId?.fullName || 'Walk-in' },
                          {
                            key: 'items',
                            header: 'Items',
                            render: (row) => `${row.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0} unit(s)`,
                          },
                          { key: 'staff', header: 'Sold by', render: (row) => row.staffUserId?.name || '—' },
                          { key: 'discount', header: 'Discount', render: (row) => (row.discountAmount ? formatMoney(row.discountAmount) : '—') },
                          { key: 'total', header: 'Total', render: (row) => formatMoney(row.totalAmount) },
                          { key: 'method', header: 'Method', render: (row) => paymentSplitsLabel(row) },
                          { key: 'date', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
                        ]}
                        data={salesPageItems}
                      />
                      <Pagination page={salesPage} pageCount={salesPageCount} total={salesTotal} pageSize={salesPageSize} onChange={setSalesPage} />
                    </>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
