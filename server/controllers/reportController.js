const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const RentalTransaction = require("../models/RentalTransaction");

const dailyTotals = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    const storeId = new mongoose.Types.ObjectId(req.storeId);

    const byMethod = await Payment.aggregate([
      { $match: { storeId, date: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: "$paymentMethodId", total: { $sum: "$amount" } } }
    ]);

    const grandTotal = await Payment.aggregate([
      { $match: { storeId, date: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      date,
      byMethod,
      grandTotal: grandTotal[0]?.total || 0
    });
  } catch (err) {
    next(err);
  }
};

const summary = async (req, res, next) => {
  try {
    const { from, to, product, method, customer } = req.query;
    const storeId = new mongoose.Types.ObjectId(req.storeId);

    const match = { storeId };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    if (method) match.paymentMethodId = new mongoose.Types.ObjectId(method);
    if (customer) match.customerId = new mongoose.Types.ObjectId(customer);

    if (product) {
      const transactions = await RentalTransaction.find({
        storeId,
        "items.productId": new mongoose.Types.ObjectId(product)
      }).select("_id");
      match.transactionId = { $in: transactions.map((t) => t._id) };
    }

    const results = await Payment.aggregate([
      { $match: match },
      { $group: { _id: "$paymentMethodId", total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

module.exports = { dailyTotals, summary };
