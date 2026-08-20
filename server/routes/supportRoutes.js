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
  markThreadRead
} = require("../controllers/supportController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Store side — always talks to the super admin, no recipient picker
router.get("/store/messages", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, getStoreMessages);
router.post("/store/messages", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, sendStoreMessage);
router.get("/store/unread-count", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, getStoreUnreadCount);
router.post("/store/mark-read", requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, markStoreRead);

// Super admin side — one thread per store
router.get("/admin/threads", requireRole("SUPER_ADMIN"), listThreads);
router.get("/admin/unread-count", requireRole("SUPER_ADMIN"), getAdminUnreadCount);
router.get("/admin/threads/:storeId", requireRole("SUPER_ADMIN"), getThreadMessages);
router.post("/admin/threads/:storeId/reply", requireRole("SUPER_ADMIN"), replyToThread);
router.post("/admin/threads/:storeId/mark-read", requireRole("SUPER_ADMIN"), markThreadRead);

module.exports = router;
