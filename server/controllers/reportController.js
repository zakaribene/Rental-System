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
      { $project: { paymentMethodId: 1, signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] } } },
      { $group: { _id: "$paymentMethodId", total: { $sum: "$signedAmount" } } }
    ]);

    const grandTotal = await Payment.aggregate([
      { $match: { storeId, date: { $gte: startOfDay, $lte: endOfDay } } },
      { $project: { signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] } } },
      { $group: { _id: null, total: { $sum: "$signedAmount" } } }
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
      { $project: { paymentMethodId: 1, signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] } } },
      { $group: { _id: "$paymentMethodId", total: { $sum: "$signedAmount" }, count: { $sum: 1 } } }
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

const analytics = async (req, res, next) => {
  try {
    const storeId = new mongoose.Types.ObjectId(req.storeId);
    const period = req.query.period === "week" ? "week" : "month";

    const topProducts = await RentalTransaction.aggregate([
      { $match: { storeId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          rentals: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.unitRent", "$items.quantity"] } }
        }
      },
      { $sort: { rentals: -1 } },
      { $limit: 3 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, rentals: 1, revenue: 1, name: "$product.name" } }
    ]);

    const topCustomers = await RentalTransaction.aggregate([
      { $match: { storeId } },
      { $group: { _id: "$customerId", revenue: { $sum: "$totalRentFee" }, rentals: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 3 },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, revenue: 1, rentals: 1, fullName: "$customer.fullName" } }
    ]);

    const periods = period === "week" ? 8 : 6;
    const since = new Date();
    if (period === "week") since.setDate(since.getDate() - 7 * periods);
    else since.setMonth(since.getMonth() - periods);
    const dateFormat = period === "week" ? "%G-W%V" : "%Y-%m";

    const trendRaw = await Payment.aggregate([
      { $match: { storeId, date: { $gte: since } } },
      {
        $project: {
          period: { $dateToString: { format: dateFormat, date: "$date" } },
          signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] }
        }
      },
      { $group: { _id: "$period", total: { $sum: "$signedAmount" } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      topProducts,
      topCustomers,
      trend: trendRaw.map((t) => ({ period: t._id, total: t.total }))
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { dailyTotals, summary, analytics };
