const express = require("express");
const {
  getAllActivityLogs,
  getActivityLogSettings,
  updateActivityLogSettings
} = require("../controllers/adminActivityLogController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("SUPER_ADMIN"));

/**
 * @swagger
 * /admin/activity-logs:
 *   get:
 *     tags: [Activity Log]
 *     summary: List activity log entries across all stores (SUPER_ADMIN only)
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: module
 *         schema: { type: string, enum: [products, categories, customers, rentals, sales, payments, staff, auth] }
 *     responses:
 *       200: { description: List of activity log entries across stores }
 */
router.get("/", getAllActivityLogs);

/**
 * @swagger
 * /admin/activity-logs/settings:
 *   get:
 *     tags: [Activity Log]
 *     summary: Get the global activity log retention policy (SUPER_ADMIN only)
 *     responses:
 *       200: { description: Retention settings }
 *   patch:
 *     tags: [Activity Log]
 *     summary: Update the global activity log retention policy (SUPER_ADMIN only)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoDeleteEnabled: { type: boolean }
 *               retentionDays: { type: number }
 *     responses:
 *       200: { description: Updated retention settings }
 */
router.get("/settings", getActivityLogSettings);
router.patch("/settings", updateActivityLogSettings);

module.exports = router;
