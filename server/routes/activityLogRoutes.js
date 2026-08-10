const express = require("express");
const { getActivityLogs } = require("../controllers/activityLogController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");

const router = express.Router();

router.use(
  authMiddleware,
  requireRole("STORE_OWNER", "STORE_STAFF"),
  storeScopeMiddleware,
  requireModulePermission("activityLog")
);

/**
 * @swagger
 * /activity-logs:
 *   get:
 *     tags: [Activity Log]
 *     summary: List the current store's activity log (audit trail)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: module
 *         schema: { type: string, enum: [products, categories, customers, rentals, sales, payments, staff, auth] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of activity log entries }
 */
router.get("/", getActivityLogs);

module.exports = router;
