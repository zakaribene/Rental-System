const express = require("express");
const {
  getStoreMessages,
  sendStoreMessage,
  getStoreUnreadCount,
  markStoreRead,
  listThreads,
  getThreadMessages,
  replyToThread,
  getAdminUnreadCount,
  markThreadRead,
  getSupportSettings,
  updateSupportSettings
} = require("../controllers/supportController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const { uploadSupportAttachment } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Store side — always talks to the super admin, no recipient picker
router.get("/store/messages", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, getStoreMessages);
router.post(
  "/store/messages",
  requireRole("STORE_OWNER", "STORE_STAFF"),
  storeScopeMiddleware,
  uploadSupportAttachment.single("image"),
  sendStoreMessage
);
router.get("/store/unread-count", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, getStoreUnreadCount);
router.post("/store/mark-read", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, markStoreRead);

// Super admin side — one thread per store
router.get("/admin/threads", requireRole("SUPER_ADMIN"), listThreads);
router.get("/admin/unread-count", requireRole("SUPER_ADMIN"), getAdminUnreadCount);
router.get("/admin/settings", requireRole("SUPER_ADMIN"), getSupportSettings);
router.patch("/admin/settings", requireRole("SUPER_ADMIN"), updateSupportSettings);
router.get("/admin/threads/:storeId", requireRole("SUPER_ADMIN"), getThreadMessages);
router.post("/admin/threads/:storeId/reply", requireRole("SUPER_ADMIN"), uploadSupportAttachment.single("image"), replyToThread);
router.post("/admin/threads/:storeId/mark-read", requireRole("SUPER_ADMIN"), markThreadRead);

module.exports = router;
