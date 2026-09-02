const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const PaymentMethod = require("../models/PaymentMethod");
const Transfer = require("../models/Transfer");

// A payment method's balance is never stored — it's derived live from the
// same ledger /reports/summary and the dashboard's "All-time balance" cards
// already read (Payment, signed by type, minus Expense, plus money transferred
// in, minus money transferred out). Computing it here instead of maintaining a
// running counter means it's automatically correct for money collected before
// this feature existed, and never drifts out of sync with what's shown on screen.
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
  const [transferAgg] = await Transfer.aggregate([
    {
      $match: {
        storeId: match.storeId,
        $or: [{ fromMethodId: match.paymentMethodId }, { toMethodId: match.paymentMethodId }]
      }
    },
    {
      $project: {
        signedAmount: { $cond: [{ $eq: ["$toMethodId", match.paymentMethodId] }, "$amount", { $multiply: ["$amount", -1] }] }
      }
    },
    { $group: { _id: null, total: { $sum: "$signedAmount" } } }
  ]);

  return (paymentAgg?.total || 0) - (expenseAgg?.total || 0) + (transferAgg?.total || 0);
}

// Every payment method's current available balance in one shot — money
// collected (minus refunds), minus expenses, plus/minus transfers. Powers the
// "available balance by method" cards on the Expenses and Transfer Payments
// pages, so both always agree with getPaymentMethodBalance above.
async function getAllPaymentMethodBalances(storeId) {
  const storeObjectId = new mongoose.Types.ObjectId(storeId);
  const methods = await PaymentMethod.find({ storeId }).sort({ name: 1 });

  const paymentTotals = await Payment.aggregate([
    { $match: { storeId: storeObjectId } },
    { $project: { paymentMethodId: 1, signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] } } },
    { $group: { _id: "$paymentMethodId", total: { $sum: "$signedAmount" } } }
  ]);
  const expenseTotals = await Expense.aggregate([
    { $match: { storeId: storeObjectId } },
    { $group: { _id: "$paymentMethodId", total: { $sum: "$amount" } } }
  ]);
  const transfersOut = await Transfer.aggregate([
    { $match: { storeId: storeObjectId } },
    { $group: { _id: "$fromMethodId", total: { $sum: "$amount" } } }
  ]);
  const transfersIn = await Transfer.aggregate([
    { $match: { storeId: storeObjectId } },
    { $group: { _id: "$toMethodId", total: { $sum: "$amount" } } }
  ]);

  const paymentMap = new Map(paymentTotals.map((p) => [p._id?.toString(), p.total]));
  const expenseMap = new Map(expenseTotals.map((e) => [e._id?.toString(), e.total]));
  const outMap = new Map(transfersOut.map((t) => [t._id?.toString(), t.total]));
  const inMap = new Map(transfersIn.map((t) => [t._id?.toString(), t.total]));

  return methods.map((m) => {
    const id = m._id.toString();
    return {
      _id: m._id,
      name: m.name,
      balance:
        (paymentMap.get(id) || 0) -
        (expenseMap.get(id) || 0) +
        (inMap.get(id) || 0) -
        (outMap.get(id) || 0)
    };
  });
}

module.exports = { getPaymentMethodBalance, getAllPaymentMethodBalances };
