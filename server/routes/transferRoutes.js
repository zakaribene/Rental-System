const express = require("express");
const {
  createTransfer,
  getTransfers,
  deleteTransfer,
  getTransferBalances
} = require("../controllers/transferController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireStoreFeature = require("../middleware/storeFeatureMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");
const logActivity = require("../middleware/activityLogger");

const router = express.Router();

router.use(
  authMiddleware,
  requireRole("STORE_OWNER", "STORE_STAFF"),
  storeScopeMiddleware,
  requireStoreFeature("transfersEnabled"),
  requireModulePermission("transfers")
);

/**
 * @swagger
 * /transfers/balances:
 *   get:
 *     tags: [Transfers]
 *     summary: Get every payment method's current available balance
 *     responses:
 *       200: { description: List of balances by payment method }
 */
router.get("/balances", getTransferBalances);

/**
 * @swagger
 * /transfers:
 *   post:
 *     tags: [Transfers]
 *     summary: Move money between two of the store's payment methods — deducted from the source, added to the destination
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromMethodId, toMethodId, amount]
 *             properties:
 *               fromMethodId: { type: string }
 *               toMethodId: { type: string }
 *               amount: { type: number }
 *               note: { type: string }
 *     responses:
 *       201: { description: Transfer recorded }
 *       409: { description: Amount exceeds the source method's available balance }
 *   get:
 *     tags: [Transfers]
 *     summary: List transfers in the current store
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
 *     responses:
 *       200: { description: List of transfers }
 */
router.post(
  "/",
  logActivity("transfers", "create", (req) => `Transferred ${req.body.amount} between payment methods`),
  createTransfer
);
router.get("/", getTransfers);

/**
 * @swagger
 * /transfers/{id}:
 *   delete:
 *     tags: [Transfers]
 *     summary: Delete a transfer
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Transfer deleted }
 *       404: { description: Not found }
 */
router.delete(
  "/:id",
  requireModulePermission("transfers", "delete"),
  logActivity("transfers", "delete", () => `Deleted a transfer`),
  deleteTransfer
);

module.exports = router;
