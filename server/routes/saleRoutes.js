const express = require("express");
const { createSale, getSales, getSaleById, updateSale } = require("../controllers/saleController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireStoreFeature = require("../middleware/storeFeatureMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");

const router = express.Router();

router.use(
  authMiddleware,
  requireRole("STORE_OWNER", "STORE_STAFF"),
  storeScopeMiddleware,
  requireStoreFeature("salesEnabled"),
  requireModulePermission("sales")
);

/**
 * @swagger
 * /sales:
 *   post:
 *     tags: [Sales]
 *     summary: Record a sale (deducts stock, optionally creates one payment per split)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customerId: { type: string, description: "Optional — omit for a walk-in sale" }
 *               discountAmount: { type: number, description: "Fixed amount discount off the subtotal" }
 *               payments:
 *                 type: array
 *                 description: "Optional — how the sale is paid now, split across one or more methods (e.g. part eDahab, part cash). Omitted/empty means nothing is collected now and the full total becomes debt, settled later via POST /payments."
 *                 items:
 *                   type: object
 *                   properties:
 *                     paymentMethodId: { type: string }
 *                     amount: { type: number }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *     responses:
 *       201: { description: Sale recorded }
 *       403: { description: Sales feature disabled for this store }
 *       409: { description: Not enough stock for a product }
 *   get:
 *     tags: [Sales]
 *     summary: List sales in the current store
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: staff
 *         schema: { type: string }
 *       - in: query
 *         name: product
 *         schema: { type: string }
 *       - in: query
 *         name: customerId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of sales }
 */
router.post("/", createSale);
router.get("/", getSales);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get a sale by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Sale }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Sales]
 *     summary: Edit a sale (items, discount, customer, payment splits) — reconciles stock deltas and the payment ledger
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customerId: { type: string }
 *               discountAmount: { type: number }
 *               payments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     paymentMethodId: { type: string }
 *                     amount: { type: number }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *     responses:
 *       200: { description: Sale updated }
 *       404: { description: Not found }
 *       409: { description: Not enough stock, or existing debt settlements exceed the new total }
 */
router.get("/:id", getSaleById);
router.patch("/:id", requireModulePermission("sales", "edit"), updateSale);

module.exports = router;
