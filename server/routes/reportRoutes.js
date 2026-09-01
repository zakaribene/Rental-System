const express = require("express");
const { dailyTotals, summary, analytics, salesReport, expenseReport } = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireStoreFeature = require("../middleware/storeFeatureMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, requireModulePermission("reports"));

/**
 * @swagger
 * /reports/daily-totals:
 *   get:
 *     tags: [Reports]
 *     summary: Get total payments for a given day, grouped by payment method
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Daily totals by method + grand total }
 */
router.get("/daily-totals", dailyTotals);

/**
 * @swagger
 * /reports/summary:
 *   get:
 *     tags: [Reports]
 *     summary: Get a filtered summary report grouped by payment method
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: product
 *         schema: { type: string }
 *       - in: query
 *         name: method
 *         schema: { type: string }
 *       - in: query
 *         name: customer
 *         schema: { type: string }
 *     responses:
 *       200: { description: Summary grouped by payment method }
 */
router.get("/summary", summary);

/**
 * @swagger
 * /reports/analytics:
 *   get:
 *     tags: [Reports]
 *     summary: Get top products, top customers and a revenue trend
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [week, month] }
 *     responses:
 *       200: { description: Analytics data }
 */
router.get("/analytics", analytics);

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get sales revenue, top selling products and a per-staff breakdown
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Sales report }
 *       403: { description: Sales feature disabled for this store }
 */
router.get("/sales", requireStoreFeature("salesEnabled"), salesReport);

/**
 * @swagger
 * /reports/expenses:
 *   get:
 *     tags: [Reports]
 *     summary: Get total spent, broken down by category and by payment method
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Expense report }
 *       403: { description: Expenses feature disabled for this store }
 */
router.get("/expenses", requireStoreFeature("expensesEnabled"), expenseReport);

module.exports = router;
