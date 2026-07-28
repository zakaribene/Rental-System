import { formatMoney, formatDateTime } from '../../lib/utils'

// Plain, always-light-theme printable receipt. Rendered off-screen at all
// times so html2canvas can capture it for "Download PDF", and shown via the
// print media query in index.css for the "Print" button (window.print()).
export default function RentalReceipt({ id, transaction, deposits, payments, store }) {
  if (!transaction) return null

  const cashDeposits = (deposits || []).filter((d) => d.depositType === 'CASH')
  const totalDeposit = cashDeposits.reduce((sum, d) => sum + (d.cashAmount || 0), 0)

  return (
    <div
      id={id}
      style={{ position: 'fixed', top: 0, left: -9999, width: 640 }}
      className="bg-white p-8 font-sans text-ink-900"
    >
      <div className="flex items-center justify-between border-b border-ink-200 pb-4">
        <div className="flex items-center gap-3">
          {store?.logoUrl && <img src={store.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}
          <div>
            <p className="font-display text-lg font-extrabold">{store?.storeName || 'Rental System'}</p>
            <p className="text-xs text-ink-500">Rental receipt</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold">#{transaction._id.slice(-6)}</p>
          <p className="text-xs text-ink-500">{formatDateTime(transaction.dateOut)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-ink-400">Customer</p>
          <p className="font-semibold">{transaction.customerId?.fullName || '—'}</p>
          <p className="text-ink-500">{transaction.customerId?.phone || ''}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-400">Handled by</p>
          <p className="font-semibold">{transaction.staffUserId?.name || '—'}</p>
        </div>
      </div>

      <div className="mt-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
              <th className="py-1.5 font-medium">Item</th>
              <th className="py-1.5 font-medium">Qty</th>
              <th className="py-1.5 text-right font-medium">Rent</th>
            </tr>
          </thead>
          <tbody>
            {(transaction.items || []).map((it, i) => (
              <tr key={i} className="border-b border-ink-100">
                <td className="py-1.5">{it.productId?.name || 'Item'}</td>
                <td className="py-1.5">{it.quantity}</td>
                <td className="py-1.5 text-right">{formatMoney(it.unitRent * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">Total rent fee</span>
              <span className="font-semibold">{formatMoney(transaction.totalRentFee)}</span>
            </div>
            {totalDeposit > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-500">Deposit collected</span>
                <span className="font-semibold">{formatMoney(totalDeposit)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-ink-200 pt-1">
              <span className="font-semibold">Balance owed</span>
              <span className="font-bold">{formatMoney(transaction.remainingDebt || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {payments?.length > 0 && (
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-semibold text-ink-500">Payment history</p>
          <table className="w-full text-xs">
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-ink-100">
                  <td className="py-1 text-ink-500">{formatDateTime(p.date)}</td>
                  <td className="py-1">{p.type.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="py-1">{p.paymentMethodId?.name || ''}</td>
                  <td className="py-1 text-right font-medium">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-ink-400">Thank you for your business — {store?.storeName || 'Rental System'}</p>
    </div>
  )
}
