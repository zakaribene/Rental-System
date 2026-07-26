const PaymentMethod = require("../models/PaymentMethod");
const Payment = require("../models/Payment");
const RentalTransaction = require("../models/RentalTransaction");
const Customer = require("../models/Customer");

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
    if (amount <= 0) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }

    let transaction = null;
    if (type === "DEBT_SETTLEMENT") {
      if (!transactionId) {
        return res.status(400).json({ message: "transactionId is required for a debt settlement" });
      }
      transaction = await RentalTransaction.findOne({ _id: transactionId, storeId: req.storeId });
      if (!transaction) {
        return res.status(404).json({ message: "Rental not found" });
      }
      const remainingDebt = transaction.remainingDebt;
      if (remainingDebt <= 0) {
        return res.status(409).json({ message: "This rental has no remaining debt", remainingDebt: 0 });
      }
      if (amount > remainingDebt) {
        return res.status(409).json({
          message: `Amount exceeds the remaining debt of ${remainingDebt}`,
          remainingDebt
        });
      }
    }

    const customer = customerId ? await Customer.findById(customerId) : null;
    const customerLabel = customer?.fullName || "customer";
    const rentalLabel = transactionId ? `rental #${transactionId.toString().slice(-6)}` : "no linked rental";

    let note;
    if (type === "DEBT_SETTLEMENT") {
      const remainingAfter = Math.max(0, transaction.remainingDebt - amount);
      note =
        remainingAfter > 0
          ? `${customerLabel} paid ${amount} toward ${rentalLabel} — ${remainingAfter} still owed`
          : `${customerLabel} paid ${amount} toward ${rentalLabel} — debt fully settled`;
    } else if (type === "DEPOSIT_COLLECTION") {
      note = `Deposit of ${amount} collected from ${customerLabel} for ${rentalLabel}`;
    } else if (type === "REFUND") {
      note = `Refund of ${amount} paid to ${customerLabel} for ${rentalLabel}`;
    }

    const payment = await Payment.create({
      storeId: req.storeId,
      transactionId,
      customerId,
      type,
      amount,
      paymentMethodId,
      recordedBy: req.user.id,
      note
    });

    let remainingDebt;
    if (type === "DEBT_SETTLEMENT" && transaction) {
      transaction.rentPaid = (transaction.rentPaid || 0) + amount;
      await transaction.save();
      remainingDebt = transaction.remainingDebt;
    }

    res.status(201).json({ payment, remainingDebt });
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

    if (product) {
      const transactions = await RentalTransaction.find({
        storeId: req.storeId,
        "items.productId": product
      }).select("_id");
      filter.transactionId = { $in: transactions.map((t) => t._id) };
    }

    const payments = await Payment.find(filter).populate("customerId", "fullName phone").sort({ date: -1 });
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
