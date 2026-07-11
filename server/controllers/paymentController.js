const PaymentMethod = require("../models/PaymentMethod");
const Payment = require("../models/Payment");
const RentalTransaction = require("../models/RentalTransaction");

// --- Payment Methods ---

const createPaymentMethod = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const method = await PaymentMethod.create({ storeId: req.storeId, name });
    res.status(201).json(method);
  } catch (err) {
    next(err);
  }
};

const getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.find({ storeId: req.storeId });
    res.json(methods);
  } catch (err) {
    next(err);
  }
};

const updatePaymentMethod = async (req, res, next) => {
  try {
    const { name, status } = req.body;
    const method = await PaymentMethod.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: { ...(name && { name }), ...(status && { status }) } },
      { new: true }
    );
    if (!method) return res.status(404).json({ message: "Payment method not found" });
    res.json(method);
  } catch (err) {
    next(err);
  }
};

// --- Payments (ledger) ---

const createPayment = async (req, res, next) => {
  try {
    const { transactionId, customerId, type, amount, paymentMethodId } = req.body;
    if (!type || amount === undefined || !paymentMethodId) {
      return res.status(400).json({ message: "type, amount and paymentMethodId are required" });
    }

    const payment = await Payment.create({
      storeId: req.storeId,
      transactionId,
      customerId,
      type,
      amount,
      paymentMethodId,
      recordedBy: req.user.id
    });

    if (type === "DEBT_SETTLEMENT" && transactionId) {
      const transaction = await RentalTransaction.findOne({ _id: transactionId, storeId: req.storeId });
      if (transaction && transaction.returnDetails) {
        transaction.returnDetails.remainingDebt = Math.max(
          0,
          (transaction.returnDetails.remainingDebt || 0) - amount
        );
        await transaction.save();
      }
    }

    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { from, to, method, product, customer } = req.query;
    const filter = { storeId: req.storeId };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (method) filter.paymentMethodId = method;
    if (customer) filter.customerId = customer;

    let query = Payment.find(filter).sort({ date: -1 });

    if (product) {
      const transactions = await RentalTransaction.find({
        storeId: req.storeId,
        "items.productId": product
      }).select("_id");
      filter.transactionId = { $in: transactions.map((t) => t._id) };
      query = Payment.find(filter).sort({ date: -1 });
    }

    const payments = await query;
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  createPayment,
  getPayments
};
