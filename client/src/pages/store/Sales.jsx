import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, ShoppingBag, Trash2, Search, Receipt, CreditCard, ShieldAlert, Eye, Pencil, Printer, Download, Banknote } from 'lucide-react'
import { listSales, createSale, updateSale, getSale } from '../../api/sales'
import { listCustomers } from '../../api/customers'
import { listProducts } from '../../api/products'
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
import ProductPicker from '../../components/ui/ProductPicker'
import CustomerPicker from '../../components/ui/CustomerPicker'
import PaymentMethodPicker from '../../components/ui/PaymentMethodPicker'
import SectionLabel from '../../components/ui/SectionLabel'
import RowActionsMenu from '../../components/ui/RowActionsMenu'
import Badge from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney, formatDateTime, paymentSplitsLabel } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'
import { downloadReceiptPdf, receiptBadge } from '../../lib/receiptPdf'

function paidStatus(sale) {
  const paid = sale.amountPaid || 0
  if (paid <= 0) return { label: 'Debt', tone: 'danger' }
  if ((sale.remainingDebt ?? sale.totalAmount - paid) > 0) return { label: 'Partial', tone: 'warning' }
  return { label: 'Paid', tone: 'success' }
}

export default function Sales() {
  const { can, loaded } = usePermissions()
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [saleTypeProducts, setSaleTypeProducts] = useState([])
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formTarget, setFormTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [store, setStore] = useState(null)
  const [storeChecked, setStoreChecked] = useState(false)

  useEffect(() => {
    getMyStore()
      .then(setStore)
      .catch(() => setStore(null))
      .finally(() => setStoreChecked(true))
  }, [])

  const load = () => {
    setLoading(true)
    listSales()
      .then(setSales)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const loadSaleProducts = () => {
    listProducts().then((all) => setSaleTypeProducts(all.filter((p) => p.listingType === 'SALE')))
  }

  useEffect(() => {
    listCustomers().then(setCustomers)
    loadSaleProducts()
    listPaymentMethods().then(setMethods).catch(() => setMethods([]))
  }, [])

  const afterMutate = () => {
    load()
    loadSaleProducts()
  }

  const openCreate = () => {
    setFormTarget({ mode: 'create', sale: null, products: saleTypeProducts.filter((p) => p.stockQty > 0) })
  }

  const openEdit = (row) => {
    // A product currently held by this sale has already had its stock
    // deducted, so the edit form's "available" figure needs it added back —
    // otherwise you couldn't even keep the same quantity once stock is tight.
    const oldQtyByProduct = {}
    ;(row.items || []).forEach((it) => {
      const id = it.productId?._id || it.productId
      oldQtyByProduct[id] = (oldQtyByProduct[id] || 0) + it.quantity
    })
    const effectiveProducts = saleTypeProducts
      .map((p) => ({ ...p, stockQty: p.stockQty + (oldQtyByProduct[p._id] || 0) }))
      .filter((p) => p.stockQty > 0)
    setFormTarget({ mode: 'edit', sale: row, products: effectiveProducts })
  }

  const query = search.trim().toLowerCase()
  const filteredSales = query
    ? sales.filter(
        (s) =>
          s._id.toLowerCase().includes(query) ||
          (s.customerId?.fullName || '').toLowerCase().includes(query) ||
          (s.staffUserId?.name || '').toLowerCase().includes(query)
      )
    : sales
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filteredSales, 10)

  if (storeChecked && !store?.salesEnabled) return <Navigate to="/store" replace />
  if (loaded && !can('sales')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Sales"
        subtitle="Record items sold and keep stock in sync."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New sale
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          icon={Search}
          placeholder="Search by sale ID, customer or staff"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <span className="text-sm font-medium text-ink-400">{total} sale(s)</span>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No sales yet"
            subtitle="Record a sale once a customer buys an item."
            action={
              <Button icon={Plus} size="sm" onClick={openCreate}>
                New sale
              </Button>
            }
          />
        ) : filteredSales.length === 0 ? (
          <EmptyState icon={Search} title="No sales match your search" />
        ) : (
          <>
            <Table
              onRowClick={(row) => setDetailTarget({ sale: row, autoPrint: false })}
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
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => {
                    const s = paidStatus(row)
                    return <Badge tone={s.tone}>{s.label}</Badge>
                  },
                },
                {
                  key: 'owed',
                  header: 'Owed',
                  render: (row) => (row.remainingDebt > 0 ? <span className="font-semibold text-danger-600">{formatMoney(row.remainingDebt)}</span> : '—'),
                },
                { key: 'method', header: 'Payment', render: (row) => paymentSplitsLabel(row) },
                { key: 'createdAt', header: 'Date', render: (row) => formatDateTime(row.createdAt) },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        items={[
                          { key: 'view', label: 'View', icon: Eye, onClick: () => setDetailTarget({ sale: row, autoPrint: false }) },
                          ...(can('sales', 'edit')
                            ? [{ key: 'edit', label: 'Edit', icon: Pencil, onClick: () => openEdit(row) }]
                            : []),
                          { key: 'print', label: 'Print', icon: Printer, onClick: () => setDetailTarget({ sale: row, autoPrint: true }) },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
              data={pageItems}
            />
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </Card>

      <SaleFormModal
        open={!!formTarget}
        mode={formTarget?.mode || 'create'}
        sale={formTarget?.sale}
        products={formTarget?.products || []}
        customers={customers}
        methods={methods}
        onClose={() => setFormTarget(null)}
        onSaved={() => {
          setFormTarget(null)
          afterMutate()
        }}
        onCustomerCreated={(c) => setCustomers((prev) => [...prev, c])}
      />

      <SaleDetailModal target={detailTarget} store={store} onClose={() => setDetailTarget(null)} />
    </div>
  )
}

function SaleFormModal({ open, mode, sale, onClose, customers, products, methods, onSaved, onCustomerCreated }) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([{ productId: '', quantity: 1 }])
  const [discountAmount, setDiscountAmount] = useState('')
  const [payments, setPayments] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCustomerId('')
    setItems([{ productId: '', quantity: 1 }])
    setDiscountAmount('')
    setPayments([])
    setError('')
  }

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && sale) {
      setCustomerId(sale.customerId?._id || sale.customerId || '')
      setItems((sale.items || []).map((it) => ({ productId: it.productId?._id || it.productId, quantity: it.quantity })))
      setDiscountAmount(sale.discountAmount ? String(sale.discountAmount) : '')
      setPayments((sale.paymentSplits || []).map((p) => ({ paymentMethodId: p.paymentMethodId?._id || p.paymentMethodId, amount: String(p.amount) })))
    } else {
      reset()
    }
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, sale])

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }])
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const selectedProducts = items.map((it) => products.find((p) => p._id === it.productId)).filter(Boolean)
  const subtotal = selectedProducts.reduce((sum, p, i) => sum + p.salePrice * (Number(items[i]?.quantity) || 1), 0)
  const resolvedDiscount = Math.max(0, Number(discountAmount) || 0)
  const total = Math.max(0, subtotal - resolvedDiscount)

  // Two rows can pick the same product — check the combined quantity against
  // stock, not each row in isolation, so splitting one product across rows
  // can't sneak past the per-row max on the quantity input.
  const stockIssues = (() => {
    const requestedByProduct = new Map()
    for (const it of items) {
      if (!it.productId) continue
      requestedByProduct.set(it.productId, (requestedByProduct.get(it.productId) || 0) + (Number(it.quantity) || 0))
    }
    const issues = []
    for (const [productId, requested] of requestedByProduct) {
      const product = products.find((p) => p._id === productId)
      if (product && requested > product.stockQty) {
        issues.push({ name: product.name, available: product.stockQty, requested })
      }
    }
    return issues
  })()

  const allocated = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const unallocated = Math.max(0, total - allocated)
  const owedAfter = Math.max(0, total - allocated)

  const updatePayment = (idx, patch) => {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  const addPayment = () => setPayments((prev) => [...prev, { paymentMethodId: '', amount: unallocated > 0 ? String(unallocated) : '' }])
  const removePayment = (idx) => setPayments((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanItems = items.filter((it) => it.productId).map((it) => ({ productId: it.productId, quantity: Number(it.quantity) || 1 }))
    if (cleanItems.length === 0) {
      setError('Select at least one product.')
      return
    }
    if (stockIssues.length > 0) {
      const issue = stockIssues[0]
      setError(
        issue.available === 0
          ? `${issue.name} is out of stock.`
          : `${issue.name} is out of stock — only ${issue.available} left, but ${issue.requested} were requested.`
      )
      return
    }
    const cleanPayments = payments.filter((p) => p.paymentMethodId || p.amount)
    if (cleanPayments.some((p) => !p.paymentMethodId || !(Number(p.amount) > 0))) {
      setError('Every payment split needs a method and an amount greater than 0.')
      return
    }
    if (allocated > total) {
      setError('The payment splits add up to more than the total.')
      return
    }

    const payload = {
      customerId: customerId || undefined,
      items: cleanItems,
      discountAmount: resolvedDiscount || undefined,
      payments: cleanPayments.map((p) => ({ paymentMethodId: p.paymentMethodId, amount: Number(p.amount) })),
    }

    setSaving(true)
    try {
      if (mode === 'edit') {
        await updateSale(sale._id, payload)
      } else {
        await createSale(payload)
      }
      reset()
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err, mode === 'edit' ? 'Failed to update sale' : 'Failed to record sale'))
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
      title={mode === 'edit' ? `Edit sale #${sale?._id?.slice(-6)}` : 'New sale'}
      subtitle="Sell items, split payment across methods if needed, and keep stock in sync."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="sale-form" type="submit" loading={saving} disabled={stockIssues.length > 0}>
            {mode === 'edit' ? 'Save changes' : 'Record sale'}
          </Button>
        </>
      }
    >
      <form id="sale-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <SectionLabel>Customer</SectionLabel>
        <Field hint="Optional — leave blank for a walk-in sale">
          <CustomerPicker
            customers={customers}
            value={customerId}
            onChange={setCustomerId}
            allowWalkIn
            allowCreate
            onCreated={onCustomerCreated}
          />
        </Field>

        <SectionLabel>Items</SectionLabel>
        <div>
          <div className="space-y-2">
            {items.map((it, idx) => {
              const product = products.find((p) => p._id === it.productId)
              return (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/40 p-2 dark:border-ink-800 dark:bg-ink-800/30">
                  <ProductPicker
                    products={products}
                    value={it.productId}
                    onChange={(id) => updateItem(idx, { productId: id })}
                    priceKey="salePrice"
                    showStock
                    placeholder="Search product to sell..."
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    max={product?.stockQty || undefined}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    disabled={items.length === 1}
                    onClick={() => removeItem(idx)}
                  />
                </div>
              )
            })}
          </div>
          <Button type="button" size="sm" variant="subtle" icon={Plus} className="mt-2" onClick={addItem}>
            Add item
          </Button>
          {products.length === 0 && <p className="mt-2 text-xs text-ink-400">No sale products with stock available. Add one from the Products page first.</p>}
          {stockIssues.length > 0 && (
            <div className="mt-3">
              <Alert>
                {stockIssues.map((issue, i) => (
                  <p key={issue.name} className={i > 0 ? 'mt-1' : ''}>
                    {issue.available === 0
                      ? `${issue.name} is out of stock.`
                      : `${issue.name} is out of stock — only ${issue.available} left, but ${issue.requested} were requested.`}
                  </p>
                ))}
              </Alert>
            </div>
          )}
        </div>

        <Field label="Discount" hint="Optional — fixed amount off the subtotal">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>

        <SectionLabel>Payment</SectionLabel>
        <div>
          {payments.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-3 dark:border-ink-700 dark:bg-ink-800/30">
              <ShieldAlert size={18} className="shrink-0 text-warning-500" />
              <p className="text-xs text-ink-500 dark:text-ink-400">
                No payment added yet — this sale will be recorded as <span className="font-semibold text-danger-600">full debt</span> owed by the customer.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/40 p-2 dark:border-ink-800 dark:bg-ink-800/30">
                  <PaymentMethodPicker
                    methods={methods}
                    value={p.paymentMethodId}
                    onChange={(id) => updatePayment(idx, { paymentMethodId: id })}
                    placeholder="Search method..."
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={p.amount}
                    onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                    placeholder="0.00"
                    className="w-28"
                  />
                  <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={() => removePayment(idx)} />
                </div>
              ))}
            </div>
          )}
          <Button type="button" size="sm" variant="subtle" icon={Plus} className="mt-2" onClick={addPayment}>
            Add payment {payments.length > 0 ? 'method' : ''}
          </Button>
          <p className="mt-1.5 text-xs text-ink-400">
            Split across as many methods as you need — e.g. part eDahab, part EVC, part cash. Leave empty for a fully-on-credit sale.
          </p>
        </div>

        {subtotal > 0 && (
          <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
            <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-800/50">
              <Receipt size={15} className="text-ink-400" />
              <span className="text-xs font-bold uppercase tracking-wide text-ink-500">Summary</span>
            </div>
            <div className="space-y-1.5 p-4 text-sm">
              <div className="flex items-center justify-between text-ink-500">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {resolvedDiscount > 0 && (
                <div className="flex items-center justify-between text-danger-600">
                  <span>Discount</span>
                  <span>-{formatMoney(resolvedDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-ink-100 pt-1.5 font-semibold text-ink-800 dark:border-ink-700 dark:text-ink-100">
                <span>Total</span>
                <span className="font-display text-base text-primary-700 dark:text-primary-400">{formatMoney(total)}</span>
              </div>
              {allocated > 0 && (
                <div className="flex items-center justify-between text-success-600">
                  <span className="inline-flex items-center gap-1.5">
                    <CreditCard size={13} /> Paid now
                  </span>
                  <span>{formatMoney(allocated)}</span>
                </div>
              )}
              {owedAfter > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-danger-50 px-2.5 py-1.5 font-semibold text-danger-600 dark:bg-danger-500/10">
                  <span>{allocated > 0 ? 'Owed after this payment' : 'Owed by customer (full debt)'}</span>
                  <span>{formatMoney(owedAfter)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}

function SaleDetailModal({ target, store, onClose }) {
  const [error, setError] = useState('')
  const [logoFailed, setLogoFailed] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [payments, setPayments] = useState([])

  const sale = target?.sale

  useEffect(() => {
    if (!target) return
    setError('')
    setLogoFailed(false)
    setPayments([])
    // The sale row from the list only carries its *initial* payment
    // split(s) — a later debt settlement never touches that array — so
    // fetch the real payment history to show who collected what, via
    // which method, and when (mirrors the rental receipt's History).
    if (sale?._id) {
      getSale(sale._id)
        .then((data) => setPayments(data.payments || []))
        .catch(() => setPayments([]))
    }
    if (target.autoPrint) {
      const t = setTimeout(() => window.print(), 150)
      return () => clearTimeout(t)
    }
  }, [target])

  if (!sale) return null

  const status = paidStatus(sale)

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    setError('')
    setPdfGenerating(true)
    try {
      const totals = [{ label: 'Subtotal', value: formatMoney(sale.subtotal) }]
      if (sale.discountAmount > 0) {
        totals.push({ label: 'Discount', value: `-${formatMoney(sale.discountAmount)}`, tone: 'danger' })
      }
      totals.push({ label: 'Total', value: formatMoney(sale.totalAmount), emphasize: true })
      totals.push({ label: 'Paid', value: formatMoney(sale.amountPaid || 0), tone: 'success' })
      if (sale.remainingDebt > 0) {
        totals.push({ label: 'Owed', value: formatMoney(sale.remainingDebt), highlight: true })
      }

      await downloadReceiptPdf(
        {
          docLabel: 'Sale Receipt',
          store: { name: store?.storeName, logoUrl: store?.logoUrl },
          receiptId: sale._id.slice(-6),
          headerRight: [sale.customerId?.fullName || 'Walk-in customer', formatDateTime(sale.createdAt)],
          grid: [
            [
              { label: 'Date', value: formatDateTime(sale.createdAt) },
              { label: 'Status', value: status.label, badge: receiptBadge[status.tone] },
            ],
            [
              { label: 'Customer', value: sale.customerId?.fullName || 'Walk-in customer' },
              { label: 'Sold by', value: sale.staffUserId?.name || '—' },
            ],
          ],
          items: {
            title: 'Items',
            rows: sale.items.map((it) => ({
              name: it.productId?.name || 'Item',
              meta: `Qty ${it.quantity} · ${formatMoney(it.unitPrice)} each`,
              amount: formatMoney(it.unitPrice * it.quantity),
            })),
          },
          extraSections:
            payments.length > 0
              ? [
                  {
                    title: 'Payment history',
                    rows: payments.map((p) => ({
                      left: `${formatDateTime(p.date)} · ${p.paymentMethodId?.name || 'Unknown'}${
                        p.recordedBy?.name ? ` · by ${p.recordedBy.name}` : ''
                      }`,
                      right: formatMoney(p.amount),
                    })),
                  },
                ]
              : [],
          totals,
        },
        `sale-${sale._id.slice(-6)}.pdf`
      )
    } catch {
      setError('Failed to generate PDF')
    } finally {
      setPdfGenerating(false)
    }
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      size="lg"
      title={`Sale #${sale._id.slice(-6)}`}
      subtitle={`${sale.customerId?.fullName || 'Walk-in customer'} · ${formatDateTime(sale.createdAt)}`}
      footer={
        <>
          <Button variant="secondary" icon={Printer} onClick={handlePrint}>
            Print
          </Button>
          <Button variant="secondary" icon={Download} loading={pdfGenerating} onClick={handleDownloadPdf}>
            PDF
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5" id="print-receipt">
        <div id="print-only-header" className="hidden items-start justify-between border-b-2 border-ink-800 pb-4 print:flex">
          <div className="flex items-center gap-3">
            {store?.logoUrl && !logoFailed ? (
              <img
                src={store.logoUrl}
                alt=""
                className="h-12 w-12 rounded-xl object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
                <span className="font-display text-lg font-extrabold text-white">
                  {(store?.storeName || 'RS').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-display text-lg font-extrabold text-ink-900">{store?.storeName || 'Rental System'}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Sale Receipt</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-ink-900">#{sale._id.slice(-6)}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-800">{sale.customerId?.fullName || 'Walk-in customer'}</p>
            <p className="text-xs text-ink-400">{formatDateTime(sale.createdAt)}</p>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-400">Date</p>
            <p className="font-semibold text-ink-800 dark:text-ink-100">{formatDateTime(sale.createdAt)}</p>
          </div>
          <div>
            <p className="text-ink-400">Status</p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <div>
            <p className="text-ink-400">Customer</p>
            <p className="font-semibold text-ink-800 dark:text-ink-100">{sale.customerId?.fullName || 'Walk-in customer'}</p>
          </div>
          <div>
            <p className="text-ink-400">Sold by</p>
            <p className="font-semibold text-ink-800 dark:text-ink-100">{sale.staffUserId?.name || '—'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
          <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Items</p>
          <div className="space-y-2">
            {sale.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 p-2.5 dark:border-ink-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{it.productId?.name || 'Item'}</p>
                  <p className="text-xs text-ink-400">
                    Qty {it.quantity} · {formatMoney(it.unitPrice)} each
                  </p>
                </div>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(it.unitPrice * it.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        <SaleHistory payments={payments} />

        <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 text-sm dark:border-ink-800 dark:bg-ink-800/40">
          <div className="flex items-center justify-between text-ink-500">
            <span>Subtotal</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex items-center justify-between text-danger-600">
              <span>Discount</span>
              <span>-{formatMoney(sale.discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-ink-100 pt-1.5 font-semibold text-ink-800 dark:border-ink-700 dark:text-ink-100">
            <span>Total</span>
            <span className="font-display text-base text-primary-700 dark:text-primary-400">{formatMoney(sale.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-success-600">
            <span>Paid</span>
            <span>{formatMoney(sale.amountPaid || 0)}</span>
          </div>
          {sale.remainingDebt > 0 && (
            <div className="mt-1 flex items-center justify-between rounded-lg bg-danger-50 px-2.5 py-1.5 font-semibold text-danger-600 dark:bg-danger-500/10">
              <span>Owed</span>
              <span>{formatMoney(sale.remainingDebt)}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// Mirrors Rentals' RentalHistory — one small card per payment, showing the
// amount, method, who collected it, and when. Unlike `paymentSplits` (which
// only ever reflects what was paid at creation), this covers every
// SALE_PAYMENT row including later debt settlements.
function SaleHistory({ payments }) {
  if (!payments || payments.length === 0) return null

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <p className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Payment history</p>
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p._id} className="flex items-start gap-3 rounded-lg border border-ink-100 p-2.5 dark:border-ink-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/15">
              <Banknote size={16} className="text-success-600 dark:text-success-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Payment received</p>
                <p className="font-display text-sm font-bold text-success-600 dark:text-success-400">{formatMoney(p.amount)}</p>
              </div>
              <p className="mt-0.5 text-xs text-ink-400">
                {formatDateTime(p.date)}
                {p.paymentMethodId?.name && (
                  <>
                    {' '}
                    · <span className="font-medium text-ink-500 dark:text-ink-300">{p.paymentMethodId.name}</span>
                  </>
                )}
                {p.recordedBy?.name && (
                  <>
                    {' '}
                    · by <span className="font-medium text-ink-500 dark:text-ink-300">{p.recordedBy.name}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
