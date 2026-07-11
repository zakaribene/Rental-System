const express = require("express");
const {
  createPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  createPayment,
  getPayments
} = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware);

/**
 * @swagger
 * /payment-methods:
 *   post:
 *     tags: [Payment Methods]
 *     summary: Create a payment method (e.g. Cash, EVC, eDahab, Bank)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201: { description: Payment method created }
 *   get:
 *     tags: [Payment Methods]
 *     summary: List payment methods in the current store
 *     responses:
 *       200: { description: List of payment methods }
 */
router.post("/payment-methods", createPaymentMethod);
router.get("/payment-methods", getPaymentMethods);

/**
 * @swagger
 * /payment-methods/{id}:
 *   patch:
 *     tags: [Payment Methods]
 *     summary: Update a payment method
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
 *               name: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200: { description: Updated payment method }
 *       404: { description: Not found }
 */
router.patch("/payment-methods/:id", updatePaymentMethod);

/**
 * @swagger
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment (debt settlement or refund)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount, paymentMethodId]
 *             properties:
 *               transactionId: { type: string }
 *               customerId: { type: string }
 *               type: { type: string, enum: [DEPOSIT_COLLECTION, DEBT_SETTLEMENT, REFUND] }
 *               amount: { type: number }
 *               paymentMethodId: { type: string }
 *     responses:
 *       201: { description: Payment recorded }
 *   get:
 *     tags: [Payments]
 *     summary: List payments (ledger) with filters
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: method
 *         schema: { type: string }
 *       - in: query
 *         name: product
 *         schema: { type: string }
 *       - in: query
 *         name: customer
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of payments }
 */
router.post("/payments", createPayment);
router.get("/payments", getPayments);

module.exports = router;
