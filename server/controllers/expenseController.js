const Expense = require("../models/Expense");
const ExpenseCategory = require("../models/ExpenseCategory");
const PaymentMethod = require("../models/PaymentMethod");
const { getPaymentMethodBalance, getAllPaymentMethodBalances } = require("../utils/paymentMethodBalance");

const EXPENSE_POPULATE = [
  { path: "paymentMethodId", select: "name" },
  { path: "recordedBy", select: "name" }
];

const createExpense = async (req, res, next) => {
  try {
    const { description, category, amount, paymentMethodId } = req.body;
    if (!description || amount === undefined || !paymentMethodId) {
      return res.status(400).json({ message: "description, amount and paymentMethodId are required" });
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }

    const method = await PaymentMethod.findOne({ _id: paymentMethodId, storeId: req.storeId });
    if (!method) return res.status(404).json({ message: "Payment method not found" });

    // Block rather than let a method go negative — the store only ever
    // spends money it actually collected through that method.
    const balance = await getPaymentMethodBalance(req.storeId, paymentMethodId);
    if (numAmount > balance) {
      return res.status(409).json({
        message: `Amount exceeds ${method.name}'s available balance of ${balance}`,
        balance
      });
    }

    const expense = await Expense.create({
      storeId: req.storeId,
      description,
      category: category || undefined,
      amount: numAmount,
      paymentMethodId,
      recordedBy: req.user.id
    });

    const populated = await Expense.findById(expense._id).populate(EXPENSE_POPULATE);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { from, to, category, method } = req.query;
    const filter = { storeId: req.storeId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (category) filter.category = category;
    if (method) filter.paymentMethodId = method;

    const expenses = await Expense.find(filter).populate(EXPENSE_POPULATE).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (err) {
    next(err);
  }
};

const createExpenseCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const category = await ExpenseCategory.create({ storeId: req.storeId, name });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

const getExpenseCategories = async (req, res, next) => {
  try {
    const categories = await ExpenseCategory.find({ storeId: req.storeId }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

// Every payment method's current available balance (money collected minus
// refunds and expenses, net of transfers) — powers the "available balance"
// hint next to the method picker on the expense form, live as the store's
// ledger changes. Shared with the Transfer Payments page so they always agree.
const getExpenseBalances = async (req, res, next) => {
  try {
    const balances = await getAllPaymentMethodBalances(req.storeId);
    res.json(balances);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  deleteExpense,
  createExpenseCategory,
  getExpenseCategories,
  getExpenseBalances
};
