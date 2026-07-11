const express = require("express");
const { createStore, getStores, getStoreById, updateStore } = require("../controllers/storeController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("SUPER_ADMIN"));

/**
 * @swagger
 * /stores:
 *   post:
 *     tags: [Stores]
 *     summary: Create a store and its owner user (SUPER_ADMIN only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeName, ownerName, ownerPhone, password]
 *             properties:
 *               storeName: { type: string }
 *               ownerName: { type: string }
 *               ownerPhone: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Store and owner created }
 *   get:
 *     tags: [Stores]
 *     summary: List all stores (SUPER_ADMIN only)
 *     responses:
 *       200: { description: List of stores }
 */
router.post("/", createStore);
router.get("/", getStores);

/**
 * @swagger
 * /stores/{id}:
 *   get:
 *     tags: [Stores]
 *     summary: Get a store by id (SUPER_ADMIN only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Store }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Stores]
 *     summary: Update / activate / deactivate a store (SUPER_ADMIN only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName: { type: string }
 *               ownerName: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200: { description: Updated store }
 *       404: { description: Not found }
 */
router.get("/:id", getStoreById);
router.patch("/:id", updateStore);

module.exports = router;
