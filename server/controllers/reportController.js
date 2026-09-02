const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const RentalTransaction = require("../models/RentalTransaction");
const SaleTransaction = require("../models/SaleTransaction");
const Expense = require("../models/Expense");
const Transfer = require("../models/Transfer");

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

    // Expenses aren't tied to a customer/product, so only date range and
    // method narrow them — netted in here so "balance" reflects money still
    // actually on hand, the same number an expense gets blocked against.
    const expenseMatch = { storeId };
    if (match.date) expenseMatch.date = match.date;
    if (match.paymentMethodId) expenseMatch.paymentMethodId = match.paymentMethodId;
    const expenseTotals = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: "$paymentMethodId", total: { $sum: "$amount" } } }
    ]);
    const expenseMap = new Map(expenseTotals.map((e) => [e._id.toString(), e.total]));

    const merged = results.map((r) => ({ ...r, total: r.total - (expenseMap.get(r._id?.toString()) || 0) }));
    for (const [methodId, total] of expenseMap) {
      if (merged.some((r) => r._id?.toString() === methodId)) continue;
      merged.push({ _id: new mongoose.Types.ObjectId(methodId), total: -total, count: 0 });
    }

    // Transfers between the store's own methods net out to zero overall, but
    // shift the balance from one method to another — fold that shift in here
    // so these cards match the Transfer Payments page's per-method balances.
    const transferMatch = { storeId };
    if (match.date) transferMatch.date = match.date;
    if (match.paymentMethodId) {
      transferMatch.$or = [{ fromMethodId: match.paymentMethodId }, { toMethodId: match.paymentMethodId }];
    }
    const transferTotals = await Transfer.aggregate([
      { $match: transferMatch },
      {
        $facet: {
          incoming: [{ $group: { _id: "$toMethodId", total: { $sum: "$amount" } } }],
          outgoing: [{ $group: { _id: "$fromMethodId", total: { $sum: "$amount" } } }]
        }
      }
    ]);
    const transferMap = new Map();
    for (const row of transferTotals[0]?.incoming || []) {
      transferMap.set(row._id.toString(), (transferMap.get(row._id.toString()) || 0) + row.total);
    }
    for (const row of transferTotals[0]?.outgoing || []) {
      transferMap.set(row._id.toString(), (transferMap.get(row._id.toString()) || 0) - row.total);
    }
    for (const [methodId, delta] of transferMap) {
      const existing = merged.find((r) => r._id?.toString() === methodId);
      if (existing) existing.total += delta;
      else merged.push({ _id: new mongoose.Types.ObjectId(methodId), total: delta, count: 0 });
    }

    res.json(merged);
  } catch (err) {
    next(err);
  }
};

const analytics = async (req, res, next) => {
  try {
    const storeId = new mongoose.Types.ObjectId(req.storeId);
    const period = req.query.period === "week" ? "week" : "month";

    const topProducts = await RentalTransaction.aggregate([
      { $match: { storeId, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          rentals: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.unitRent", "$items.quantity", { $ifNull: ["$rentalDays", 1] }] } }
        }
      },
      { $sort: { rentals: -1 } },
      { $limit: 3 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, rentals: 1, revenue: 1, name: "$product.name" } }
    ]);

    const topCustomers = await RentalTransaction.aggregate([
      { $match: { storeId, status: { $ne: "cancelled" } } },
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

const salesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const storeId = new mongoose.Types.ObjectId(req.storeId);

    const match = { storeId };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const totals = await SaleTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalDiscount: { $sum: "$discountAmount" },
          totalSales: { $sum: 1 },
          unitsSold: { $sum: { $sum: "$items.quantity" } }
        }
      }
    ]);

    const topProducts = await SaleTransaction.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, unitsSold: 1, revenue: 1, name: "$product.name" } }
    ]);

    const byStaff = await SaleTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$staffUserId",
          totalSales: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { revenue: -1 } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, totalSales: 1, revenue: 1, name: "$user.name" } }
    ]);

    res.json({
      totalRevenue: totals[0]?.totalRevenue || 0,
      totalDiscount: totals[0]?.totalDiscount || 0,
      totalSales: totals[0]?.totalSales || 0,
      unitsSold: totals[0]?.unitsSold || 0,
      topProducts,
      byStaff
    });
  } catch (err) {
    next(err);
  }
};

const expenseReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const storeId = new mongoose.Types.ObjectId(req.storeId);

    const match = { storeId };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const totals = await Expense.aggregate([
      { $match: match },
      { $group: { _id: null, totalSpent: { $sum: "$amount" }, totalCount: { $sum: 1 } } }
    ]);

    const byCategory = await Expense.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $project: { _id: 1, total: 1, count: 1, name: "$_id" } }
    ]);

    const byMethod = await Expense.aggregate([
      { $match: match },
      { $group: { _id: "$paymentMethodId", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $lookup: { from: "paymentmethods", localField: "_id", foreignField: "_id", as: "method" } },
      { $unwind: { path: "$method", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, total: 1, count: 1, name: { $ifNull: ["$method.name", "Unknown"] } } }
    ]);

    res.json({
      totalSpent: totals[0]?.totalSpent || 0,
      totalCount: totals[0]?.totalCount || 0,
      byCategory,
      byMethod
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { dailyTotals, summary, analytics, salesReport, expenseReport };
