const express = require("express");
const { dailyTotals, summary } = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware);

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

module.exports = router;
