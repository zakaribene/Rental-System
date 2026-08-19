// Normalizes Rentals and Sales into a single shape for anywhere the app
// needs to show "who owes money" regardless of which kind of transaction
// created the debt (Payments' Outstanding debts table, Reports' Customers
// with debt card).
export function combineDebts(rentals = [], sales = []) {
  const rentalDebts = rentals
    .filter((r) => r.status !== 'cancelled' && (r.remainingDebt || 0) > 0)
    .map((r) => ({
      kind: 'RENTAL',
      id: r._id,
      customer: r.customerId,
      total: r.totalRentFee,
      remainingDebt: r.remainingDebt,
      date: r.dateOut,
      record: r,
    }))

  const saleDebts = sales
    .filter((s) => (s.remainingDebt || 0) > 0)
    .map((s) => ({
      kind: 'SALE',
      id: s._id,
      customer: s.customerId,
      total: s.totalAmount,
      remainingDebt: s.remainingDebt,
      date: s.createdAt,
      record: s,
    }))

  return [...rentalDebts, ...saleDebts].sort((a, b) => new Date(b.date) - new Date(a.date))
}
