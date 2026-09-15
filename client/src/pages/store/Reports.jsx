import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  Filter,
  Wallet,
  Search,
  FileSpreadsheet,
  FileDown,
  ShoppingBag,
  Tag,
  Package,
  Users2,
  AlertCircle,
  Receipt,
  ClipboardList,
} from 'lucide-react'
import { getDailyTotals, getSummary, getSalesReport, getExpenseReport } from '../../api/reports'
import { listPaymentMethods, listPayments } from '../../api/payments'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
import { listSales } from '../../api/sales'
import { listRentals } from '../../api/rentals'
import { listExpenses, listExpenseCategories } from '../../api/expenses'
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
import {
  exportPaymentsToExcel,
  exportPaymentsToPdf,
  exportSalesToExcel,
  exportSalesToPdf,
  exportExpensesToExcel,
  exportExpensesToPdf,
} from '../../lib/reportExport'
import { getMethodVisual } from '../../lib/paymentMethodVisuals'
import usePermissions from '../../hooks/usePermissions'

const typeTone = { DEPOSIT_COLLECTION: 'success', DEBT_SETTLEMENT: 'info', REFUND: 'warning' }

// One small, self-contained "who owes money" card — reused by the Rentals
// and Sales tabs, each scoped to its own kind so a debt only ever shows up
// on the report page it actually belongs to.
function DebtsCard({ records, kind, title }) {
  const [search, setSearch] = useState('')
  const scoped = useMemo(() => records.filter((d) => d.kind === kind), [records, kind])
  const query = search.trim().toLowerCase()
  const filtered = query
    ? scoped.filter((d) => [d.customer?.fullName, d.customer?.phone].some((v) => v?.toLowerCase().includes(query)))
    : scoped
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, 10)
  const totalOwed = filtered.reduce((sum, d) => sum + d.remainingDebt, 0)

  return (
    <Card className="mb-6">
      <CardHeader title={title} subtitle="Customers who still owe money on this kind of transaction" />
      <CardBody>
        <Field label="Search by customer name or phone" className="mb-5 max-w-sm">
          <Input icon={Search} placeholder="e.g. Ahmed, 61..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Customers with debt" value={filtered.length} icon={AlertCircle} tone="danger" />
          <StatCard label="Total owed" value={formatMoney(totalOwed)} icon={Wallet} tone="warning" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={AlertCircle} title="No outstanding debts" />
        ) : (
          <>
            <Table
              columns={[
                { key: 'id', header: 'Ref', render: (row) => <span className="font-mono text-xs text-ink-500">#{row.id.slice(-6)}</span> },
                { key: 'customer', header: 'Customer', render: (row) => row.customer?.fullName || 'Walk-in' },
                { key: 'phone', header: 'Phone', render: (row) => row.customer?.phone || '—' },
                { key: 'total', header: 'Total', render: (row) => formatMoney(row.total) },
                { key: 'paid', header: 'Paid', render: (row) => formatMoney(row.total - row.remainingDebt) },
                { key: 'owed', header: 'Owed', render: (row) => <span className="font-bold text-danger-600">{formatMoney(row.remainingDebt)}</span> },
                { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
              ]}
              data={pageItems}
            />
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </CardBody>
    </Card>
  )
}

export default function Reports() {
  const { can, loaded } = usePermissions()
  const [store, setStore] = useState(null)
  const [methods, setMethods] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [activeTab, setActiveTab] = useState('rentals')

  // Shared date range — every tab's data narrows to this window.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [daily, setDaily] = useState(null)
  const [summary, setSummary] = useState([])
  const [balanceLoading, setBalanceLoading] = useState(true)

  const [debtRecords, setDebtRecords] = useState([])
  const [debtsLoading, setDebtsLoading] = useState(true)

  // --- Rentals tab ---
  const [customerFilter, setCustomerFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [rentalIdFilter, setRentalIdFilter] = useState('')
  const [filteredPayments, setFilteredPayments] = useState([])
  const [filterLoading, setFilterLoading] = useState(false)
  const [exporting, setExporting] = useState('')

  // --- Sales tab ---
  const [salesReport, setSalesReport] = useState(null)
  const [salesRows, setSalesRows] = useState([])
  const [salesPaymentRows, setSalesPaymentRows] = useState([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesExporting, setSalesExporting] = useState('')
  const [salesCustomerFilter, setSalesCustomerFilter] = useState('all')
  const [salesProductFilter, setSalesProductFilter] = useState('all')
  const [salesMethodFilter, setSalesMethodFilter] = useState('all')
  const [saleIdFilter, setSaleIdFilter] = useState('')

  // --- Expenses tab ---
  const [expenseReport, setExpenseReport] = useState(null)
  const [expenseRows, setExpenseRows] = useState([])
  const [expenseLoading, setExpenseLoading] = useState(true)
  const [expenseExporting, setExpenseExporting] = useState('')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all')
  const [expenseMethodFilter, setExpenseMethodFilter] = useState('all')
  const [expenseIdFilter, setExpenseIdFilter] = useState('')

  useEffect(() => {
    listPaymentMethods().then(setMethods)
    listCustomers().then(setCustomers)
    listProducts().then(setProducts)
    getMyStore().then(setStore).catch(() => setStore(null))
  }, [])

  useEffect(() => {
    setDebtsLoading(true)
    Promise.all([store?.rentalsEnabled ? listRentals() : Promise.resolve([]), store?.salesEnabled ? listSales() : Promise.resolve([])])
      .then(([rentals, sales]) => setDebtRecords(combineDebts(rentals, sales)))
      .finally(() => setDebtsLoading(false))
  }, [store?.rentalsEnabled, store?.salesEnabled])

  useEffect(() => {
    if (!store?.expensesEnabled) return
    listExpenseCategories().then(setExpenseCategories).catch(() => setExpenseCategories([]))
  }, [store?.expensesEnabled])

  // The store-wide "All-time balance" card at the top — the same
  // Payment-minus-refund-minus-expense number the Dashboard and Expenses
  // pages show, so it can never look stale next to them again.
  useEffect(() => {
    setBalanceLoading(true)
    Promise.all([getDailyTotals(date), getSummary({})])
      .then(([d, s]) => {
        setDaily(d)
        setSummary(s)
      })
      .finally(() => setBalanceLoading(false))
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
    if (!store?.expensesEnabled) return
    setExpenseLoading(true)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    Promise.all([getExpenseReport(params), listExpenses(params)])
      .then(([report, expenses]) => {
        setExpenseReport(report)
        setExpenseRows(expenses)
      })
      .finally(() => setExpenseLoading(false))
  }, [store?.expensesEnabled, from, to])

  const methodName = (id) => methods.find((m) => m._id === id)?.name || 'Unknown'

  // --- Rentals tab: rental-only ledger (excludes SALE_PAYMENT — that lives
  // on the Sales tab instead) narrowed further by the Rental ID search. ---
  const rentalIdQuery = rentalIdFilter.trim().toLowerCase()
  const visiblePayments = filteredPayments.filter((p) => {
    if (p.type === 'SALE_PAYMENT') return false
    if (!rentalIdQuery) return true
    return (p.transactionId || '').toLowerCase().includes(rentalIdQuery)
  })
  const { page, setPage, pageCount, pageItems, total: pagedTotal, pageSize } = usePagination(visiblePayments, 10)

  const currentBalance = visiblePayments.reduce((sum, p) => (p.type === 'REFUND' ? sum - p.amount : sum + p.amount), 0)

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

  // --- Sales tab: salesRows already covers the date range from the server;
  // customer/product/method/Sale ID narrow it further, all client-side. ---
  const saleIdQuery = saleIdFilter.trim().toLowerCase()
  const visibleSales = salesRows.filter((s) => {
    if (salesCustomerFilter !== 'all' && (s.customerId?._id || s.customerId) !== salesCustomerFilter) return false
    if (salesProductFilter !== 'all' && !s.items?.some((it) => (it.productId?._id || it.productId) === salesProductFilter)) return false
    if (salesMethodFilter !== 'all' && !s.paymentSplits?.some((sp) => (sp.paymentMethodId?._id || sp.paymentMethodId) === salesMethodFilter)) return false
    if (saleIdQuery && !s._id.toLowerCase().includes(saleIdQuery)) return false
    return true
  })
  const {
    page: salesPage,
    setPage: setSalesPage,
    pageCount: salesPageCount,
    pageItems: salesPageItems,
    total: salesTotal,
    pageSize: salesPageSize,
  } = usePagination(visibleSales, 10)
  const visibleSalesTotal = visibleSales.reduce((sum, s) => sum + s.totalAmount, 0)

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

  const handleSalesExport = async (format) => {
    setSalesExporting(format)
    try {
      const rows = visibleSales.map((s) => ({
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

  // --- Expenses tab: same "broad fetch, narrow client-side" pattern. ---
  const expenseIdQuery = expenseIdFilter.trim().toLowerCase()
  const visibleExpenses = expenseRows.filter((e) => {
    if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false
    if (expenseMethodFilter !== 'all' && (e.paymentMethodId?._id || e.paymentMethodId) !== expenseMethodFilter) return false
    if (expenseIdQuery && !e._id.toLowerCase().includes(expenseIdQuery)) return false
    return true
  })
  const {
    page: expensePage,
    setPage: setExpensePage,
    pageCount: expensePageCount,
    pageItems: expensePageItems,
    total: expenseTotal,
    pageSize: expensePageSize,
  } = usePagination(visibleExpenses, 10)
  const visibleExpensesSpent = visibleExpenses.reduce((sum, e) => sum + e.amount, 0)

  const handleExpenseExport = async (format) => {
    setExpenseExporting(format)
    try {
      const rows = visibleExpenses.map((e) => ({
        date: formatDateTime(e.date),
        description: e.description,
        category: e.category || '—',
        method: e.paymentMethodId?.name || 'Unknown',
        amount: formatMoney(e.amount),
        staff: e.recordedBy?.name || '—',
      }))
      if (format === 'excel') await exportExpensesToExcel(rows, store)
      else await exportExpensesToPdf(rows, store)
    } finally {
      setExpenseExporting('')
    }
  }

  if (loaded && !can('reports')) return <Navigate to="/store" replace />

  const tabs = [
    store?.rentalsEnabled && { key: 'rentals', label: 'Rentals', icon: ClipboardList },
    store?.salesEnabled && { key: 'sales', label: 'Sales', icon: ShoppingBag },
    store?.expensesEnabled && { key: 'expenses', label: 'Expenses', icon: Receipt },
  ].filter(Boolean)

  // The default activeTab assumes rentals is available — for the rare store
  // that has it disabled, land on the first tab that's actually enabled
  // instead of a blank pane with nothing selected.
  useEffect(() => {
    if (!store) return
    if (tabs.length > 0 && !tabs.some((t) => t.key === activeTab)) setActiveTab(tabs[0].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Reports" subtitle="Track balances across your store, then drill into rentals, sales or expenses." />

      <Card className="mb-6">
        <CardHeader title="All-time balance by payment method" subtitle="Net of refunds and expenses — always reflects money actually on hand" />
        <CardBody>
          {balanceLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner size={26} />
            </div>
          ) : summary.length === 0 ? (
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
                      <p className={cn('mt-1 font-display text-xl font-extrabold', s.total < 0 ? 'text-danger-600' : 'text-ink-900 dark:text-white')}>
                        {formatMoney(s.total)}
                      </p>
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

      <div className="mb-6 inline-flex gap-1 rounded-xl border border-ink-100 bg-white p-1 dark:border-ink-800 dark:bg-ink-900">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-300 dark:hover:bg-ink-800'
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'rentals' && store?.rentalsEnabled && (
        <>
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
                          render: (row) => <Badge tone={typeTone[row.type] || 'neutral'}>{row.type.replace(/_/g, ' ').toLowerCase()}</Badge>,
                        },
                        {
                          key: 'rental',
                          header: 'Rental',
                          render: (row) => (row.transactionId ? <span className="font-mono text-xs text-ink-500">#{row.transactionId.slice(-6)}</span> : '—'),
                        },
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

          <DebtsCard records={debtRecords} kind="RENTAL" title="Customers with rental debt" />

          {debtsLoading && (
            <div className="flex h-8 items-center justify-center text-xs text-ink-400">
              <Spinner size={16} />
            </div>
          )}

          <Card>
            <CardHeader
              title="Daily totals"
              action={
                <Field className="w-44">
                  <Input icon={Calendar} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              }
            />
            <CardBody>
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
            </CardBody>
          </Card>
        </>
      )}

      {activeTab === 'sales' && store?.salesEnabled && (
        <>
          <Card className="mb-6">
            <CardHeader
              title="Sales overview"
              subtitle="Revenue, top sellers and who made each sale — across the full date range"
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
                            <div key={p._id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
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
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Sales collected · by payment method</p>
                          <div className="grid grid-cols-3 gap-2">
                            {salesByMethod.map((m) => {
                              const visual = getMethodVisual(m.name)
                              const Icon = visual.icon
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 transition-colors hover:border-primary-200 dark:border-ink-800 dark:hover:border-primary-500/30"
                                >
                                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-2', visual.bg, visual.ring)}>
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
                </>
              )}
            </CardBody>
          </Card>

          <Card className="mb-6">
            <CardHeader
              title="Filter transactions"
              subtitle="Narrow down by date range, customer, product, payment method or sale ID"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Field label="From">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="To">
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
                <Field label="Customer">
                  <Select value={salesCustomerFilter} onChange={(e) => setSalesCustomerFilter(e.target.value)}>
                    <option value="all">All customers</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Product">
                  <Select value={salesProductFilter} onChange={(e) => setSalesProductFilter(e.target.value)}>
                    <option value="all">All products</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Payment method">
                  <Select value={salesMethodFilter} onChange={(e) => setSalesMethodFilter(e.target.value)}>
                    <option value="all">All methods</option>
                    {methods.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Sale ID">
                  <Input icon={Search} placeholder="e.g. cf0d12" value={saleIdFilter} onChange={(e) => setSaleIdFilter(e.target.value)} />
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard label="Sales matched" value={visibleSales.length} icon={Filter} tone="primary" />
                <StatCard label="Total (matched)" value={formatMoney(visibleSalesTotal)} icon={Wallet} tone="success" />
              </div>

              <div className="mt-5">
                {salesLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Spinner size={26} />
                  </div>
                ) : visibleSales.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title="No sales match these filters" />
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
            </CardBody>
          </Card>

          <DebtsCard records={debtRecords} kind="SALE" title="Customers with sale debt" />
        </>
      )}

      {activeTab === 'expenses' && store?.expensesEnabled && (
        <>
          <Card className="mb-6">
            <CardHeader title="Expenses overview" subtitle="What the store spent, by category and by payment method — across the full date range" />
            <CardBody>
              {expenseLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner size={26} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard label="Total spent" value={formatMoney(expenseReport?.totalSpent || 0)} icon={Receipt} tone="danger" />
                    <StatCard label="Total expenses" value={expenseReport?.totalCount || 0} icon={Filter} tone="info" />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Spent by category</p>
                      {!expenseReport?.byCategory?.length ? (
                        <EmptyState icon={Tag} title="No expenses in this range" />
                      ) : (
                        <div className="space-y-2">
                          {expenseReport.byCategory.map((c) => (
                            <div key={c._id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                              <div>
                                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{c.name}</p>
                                <p className="text-xs text-ink-400">{c.count} expense(s)</p>
                              </div>
                              <p className="font-semibold text-danger-600">{formatMoney(c.total)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Spent by payment method</p>
                      {!expenseReport?.byMethod?.length ? (
                        <EmptyState icon={Wallet} title="No expenses in this range" />
                      ) : (
                        <div className="space-y-2">
                          {expenseReport.byMethod.map((m) => {
                            const visual = getMethodVisual(m.name)
                            const Icon = visual.icon
                            return (
                              <div key={m._id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-4', visual.bg, visual.ring)}>
                                  <Icon size={16} className={visual.text} strokeWidth={2.25} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{m.name}</p>
                                  <p className="text-xs text-ink-400">{m.count} expense(s)</p>
                                </div>
                                <p className="shrink-0 font-semibold text-danger-600">{formatMoney(m.total)}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Filter transactions"
              subtitle="Narrow down by date range, category, payment method or expense ID"
              action={
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={expenseExporting === 'excel'} onClick={() => handleExpenseExport('excel')}>
                    Excel
                  </Button>
                  <Button variant="secondary" size="sm" icon={FileDown} loading={expenseExporting === 'pdf'} onClick={() => handleExpenseExport('pdf')}>
                    PDF
                  </Button>
                </div>
              }
            />
            <CardBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="From">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="To">
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
                <Field label="Category">
                  <Select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)}>
                    <option value="all">All categories</option>
                    {expenseCategories.map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Payment method">
                  <Select value={expenseMethodFilter} onChange={(e) => setExpenseMethodFilter(e.target.value)}>
                    <option value="all">All methods</option>
                    {methods.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Expense ID" className="sm:col-span-2 lg:col-span-1">
                  <Input icon={Search} placeholder="e.g. a1b2c3" value={expenseIdFilter} onChange={(e) => setExpenseIdFilter(e.target.value)} />
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard label="Expenses matched" value={visibleExpenses.length} icon={Filter} tone="primary" />
                <StatCard label="Total spent (matched)" value={formatMoney(visibleExpensesSpent)} icon={Receipt} tone="danger" />
              </div>

              <div className="mt-5">
                {expenseLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Spinner size={26} />
                  </div>
                ) : visibleExpenses.length === 0 ? (
                  <EmptyState icon={Receipt} title="No expenses match these filters" />
                ) : (
                  <>
                    <Table
                      columns={[
                        { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date) },
                        { key: 'description', header: 'Description', render: (row) => row.description },
                        { key: 'category', header: 'Category', render: (row) => (row.category ? <Badge tone="neutral">{row.category}</Badge> : '—') },
                        { key: 'method', header: 'Method', render: (row) => row.paymentMethodId?.name || 'Unknown' },
                        { key: 'amount', header: 'Amount', render: (row) => <span className="font-semibold text-danger-600">-{formatMoney(row.amount)}</span> },
                        { key: 'staff', header: 'Recorded by', render: (row) => row.recordedBy?.name || '—' },
                      ]}
                      data={expensePageItems}
                    />
                    <Pagination page={expensePage} pageCount={expensePageCount} total={expenseTotal} pageSize={expensePageSize} onChange={setExpensePage} />
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
