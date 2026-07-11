const express = require("express");
const {
  sendNotification,
  listAllNotifications,
  listStoreNotifications,
  getUnreadCount,
  markAllRead
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a notification to one store or all stores (SUPER_ADMIN only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               targetStoreId: { type: string, description: "Omit or null to broadcast to all stores" }
 *     responses:
 *       201: { description: Notification sent }
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications visible to the current store
 *     responses:
 *       200: { description: List of notifications }
 */
router.post("/", requireRole("SUPER_ADMIN"), sendNotification);
router.get("/admin", requireRole("SUPER_ADMIN"), listAllNotifications);

router.get("/", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, listStoreNotifications);
router.get("/unread-count", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, getUnreadCount);
router.post("/mark-read", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, markAllRead);

module.exports = router;
