const PaymentMethod = require("../models/PaymentMethod");
const Transfer = require("../models/Transfer");
const { getPaymentMethodBalance, getAllPaymentMethodBalances } = require("../utils/paymentMethodBalance");

const TRANSFER_POPULATE = [
  { path: "fromMethodId", select: "name" },
  { path: "toMethodId", select: "name" },
  { path: "recordedBy", select: "name" }
];

const createTransfer = async (req, res, next) => {
  try {
    const { fromMethodId, toMethodId, amount, note } = req.body;
    if (!fromMethodId || !toMethodId || amount === undefined) {
      return res.status(400).json({ message: "fromMethodId, toMethodId and amount are required" });
    }
    if (String(fromMethodId) === String(toMethodId)) {
      return res.status(400).json({ message: "Choose two different payment methods" });
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }

    const [fromMethod, toMethod] = await Promise.all([
      PaymentMethod.findOne({ _id: fromMethodId, storeId: req.storeId }),
      PaymentMethod.findOne({ _id: toMethodId, storeId: req.storeId })
    ]);
    if (!fromMethod || !toMethod) return res.status(404).json({ message: "Payment method not found" });

    // The source can only ever send money it actually holds — block rather
    // than let a method go negative, same rule the Expenses page enforces.
    const balance = await getPaymentMethodBalance(req.storeId, fromMethodId);
    if (numAmount > balance) {
      return res.status(409).json({
        message: `Amount exceeds ${fromMethod.name}'s available balance of ${balance}`,
        balance
      });
    }

    const transfer = await Transfer.create({
      storeId: req.storeId,
      fromMethodId,
      toMethodId,
      amount: numAmount,
      note: note || undefined,
      recordedBy: req.user.id
    });

    const populated = await Transfer.findById(transfer._id).populate(TRANSFER_POPULATE);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const getTransfers = async (req, res, next) => {
  try {
    const { from, to, method } = req.query;
    const filter = { storeId: req.storeId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (method) filter.$or = [{ fromMethodId: method }, { toMethodId: method }];

    const transfers = await Transfer.find(filter).populate(TRANSFER_POPULATE).sort({ date: -1 });
    res.json(transfers);
  } catch (err) {
    next(err);
  }
};

const deleteTransfer = async (req, res, next) => {
  try {
    const transfer = await Transfer.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!transfer) return res.status(404).json({ message: "Transfer not found" });
    res.json({ message: "Transfer deleted" });
  } catch (err) {
    next(err);
  }
};

// Every payment method's current available balance — powers the "available
// balance by method" cards and the "from" method hint on the transfer form.
const getTransferBalances = async (req, res, next) => {
  try {
    const balances = await getAllPaymentMethodBalances(req.storeId);
    res.json(balances);
  } catch (err) {
    next(err);
  }
};

module.exports = { createTransfer, getTransfers, deleteTransfer, getTransferBalances };
