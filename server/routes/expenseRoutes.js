const express = require("express");
const {
  createExpense,
  getExpenses,
  deleteExpense,
  createExpenseCategory,
  getExpenseCategories,
  getExpenseBalances
} = require("../controllers/expenseController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireStoreFeature = require("../middleware/storeFeatureMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");
const logActivity = require("../middleware/activityLogger");

const router = express.Router();

router.use(
  authMiddleware,
  requireRole("STORE_OWNER", "STORE_STAFF"),
  storeScopeMiddleware,
  requireStoreFeature("expensesEnabled"),
  requireModulePermission("expenses")
);

/**
 * @swagger
 * /expenses/categories:
 *   post:
 *     tags: [Expenses]
 *     summary: Create an expense category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201: { description: Category created }
 *   get:
 *     tags: [Expenses]
 *     summary: List expense categories in the current store
 *     responses:
 *       200: { description: List of expense categories }
 */
router.post("/categories", createExpenseCategory);
router.get("/categories", getExpenseCategories);

/**
 * @swagger
 * /expenses/balances:
 *   get:
 *     tags: [Expenses]
 *     summary: Get every payment method's current available balance (collected minus refunds and expenses)
 *     responses:
 *       200: { description: List of balances by payment method }
 */
router.get("/balances", getExpenseBalances);

/**
 * @swagger
 * /expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Record a store expense — deducted from the payment method's available balance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, amount, paymentMethodId]
 *             properties:
 *               description: { type: string }
 *               category: { type: string, description: "ExpenseCategory id, optional" }
 *               amount: { type: number }
 *               paymentMethodId: { type: string }
 *     responses:
 *       201: { description: Expense recorded }
 *       409: { description: Amount exceeds the method's available balance }
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses in the current store
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: method
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of expenses }
 */
router.post("/", logActivity("expenses", "create", (req) => `Recorded an expense of ${req.body.amount} — ${req.body.description}`), createExpense);
router.get("/", getExpenses);

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Expense deleted }
 *       404: { description: Not found }
 */
router.delete(
  "/:id",
  requireModulePermission("expenses", "delete"),
  logActivity("expenses", "delete", (req) => `Deleted an expense`),
  deleteExpense
);

module.exports = router;
