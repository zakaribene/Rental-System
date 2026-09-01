const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");

// A payment method's balance is never stored — it's derived live from the
// same ledger /reports/summary and the dashboard's "All-time balance" cards
// already read (Payment, signed by type, minus Expense). Computing it here
// instead of maintaining a running counter means it's automatically correct
// for money collected before this feature existed, and never drifts out of
// sync with what's shown on screen.
async function getPaymentMethodBalance(storeId, paymentMethodId) {
  const match = {
    storeId: new mongoose.Types.ObjectId(storeId),
    paymentMethodId: new mongoose.Types.ObjectId(paymentMethodId)
  };

  const [paymentAgg] = await Payment.aggregate([
    { $match: match },
    { $project: { signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] } } },
    { $group: { _id: null, total: { $sum: "$signedAmount" } } }
  ]);
  const [expenseAgg] = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  return (paymentAgg?.total || 0) - (expenseAgg?.total || 0);
}

module.exports = { getPaymentMethodBalance };
