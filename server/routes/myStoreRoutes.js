const express = require("express");
const { getMyStore, uploadMyStoreLogo } = require("../controllers/myStoreController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const { uploadLogo } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware);

/**
 * @swagger
 * /my-store:
 *   get:
 *     tags: [Stores]
 *     summary: Get the current user's store (branding info)
 *     responses:
 *       200: { description: Store }
 */
router.get("/", getMyStore);

/**
 * @swagger
 * /my-store/logo:
 *   post:
 *     tags: [Stores]
 *     summary: Upload/replace the store logo (STORE_OWNER only)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: Store updated with new logo }
 */
router.post("/logo", requireRole("STORE_OWNER"), uploadLogo.single("image"), uploadMyStoreLogo);

module.exports = router;
