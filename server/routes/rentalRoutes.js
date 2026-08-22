const express = require("express");
const { createRental, getRentals, getRentalById, updateRental, addRentalDeposit, returnRental, cancelRental } = require("../controllers/rentalController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");
const logActivity = require("../middleware/activityLogger");
const { uploadDocument } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, requireModulePermission("rentals"));

/**
 * @swagger
 * /rentals/upload-document:
 *   post:
 *     tags: [Rentals]
 *     summary: Upload a deposit document image (e.g. passport)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: Uploaded image URL }
 */
router.post("/upload-document", uploadDocument.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file provided" });
  res.status(201).json({ url: req.file.path });
});

/**
 * @swagger
 * /rentals:
 *   post:
 *     tags: [Rentals]
 *     summary: Create a rental transaction (with items and deposits)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, items]
 *             properties:
 *               customerId: { type: string }
 *               expectedReturnDate: { type: string, format: date }
 *               discount: { type: number, description: "Flat amount off the rent subtotal, can't exceed it" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *               deposits:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     depositType: { type: string, enum: [CASH, DOCUMENT, GUARANTOR, CARD, GOLD] }
 *                     cashAmount: { type: number }
 *                     paymentMethodId: { type: string }
 *                     documentImageUrl: { type: string }
 *                     guarantorName: { type: string }
 *                     guarantorPhone: { type: string }
 *                     goldDescription: { type: string }
 *                     goldWeight: { type: number }
 *                     goldImageUrl: { type: string }
 *     responses:
 *       201: { description: Rental created }
 *   get:
 *     tags: [Rentals]
 *     summary: List rentals in the current store
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, returned, overdue, cancelled] }
 *     responses:
 *       200: { description: List of rentals }
 */
router.post("/", logActivity("rentals", "create", () => "Created a new rental"), createRental);
router.get("/", getRentals);

/**
 * @swagger
 * /rentals/{id}:
 *   get:
 *     tags: [Rentals]
 *     summary: Get a rental transaction (with its deposits) by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Rental transaction with deposits }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Rentals]
 *     summary: Edit a rental (items, customer, expected return date) — reconciles product availability for added/removed items
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
 *             required: [customerId, items]
 *             properties:
 *               customerId: { type: string }
 *               expectedReturnDate: { type: string, format: date }
 *               discount: { type: number, description: "Flat amount off the rent subtotal, can't exceed it" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *     responses:
 *       200: { description: Rental updated }
 *       404: { description: Not found }
 *       409: { description: Already returned, or a newly-added product isn't available }
 */
router.get("/:id", getRentalById);
router.patch(
  "/:id",
  requireModulePermission("rentals", "edit"),
  logActivity("rentals", "update", (req) => `Edited rental #${req.params.id.slice(-6)}`),
  updateRental
);

/**
 * @swagger
 * /rentals/{id}/deposits:
 *   post:
 *     tags: [Rentals]
 *     summary: Add a deposit to an existing rental (e.g. one that was created without one)
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
 *             required: [depositType]
 *             properties:
 *               depositType: { type: string, enum: [CASH, DOCUMENT, GUARANTOR, CARD] }
 *               cashAmount: { type: number }
 *               paymentMethodId: { type: string }
 *               documentImageUrl: { type: string }
 *               guarantorName: { type: string }
 *               guarantorPhone: { type: string }
 *     responses:
 *       201: { description: Deposit added }
 *       404: { description: Not found }
 *       409: { description: Rental already returned }
 */
router.post(
  "/:id/deposits",
  requireModulePermission("rentals", "edit"),
  logActivity("rentals", "deposit", (req) => `Added a ${req.body.depositType} deposit to rental #${req.params.id.slice(-6)}`),
  addRentalDeposit
);

/**
 * @swagger
 * /rentals/{id}/return:
 *   post:
 *     tags: [Rentals]
 *     summary: Return items for a rental and settle deposit/debt
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
 *               itemsReturnedOk:
 *                 type: array
 *                 items: { type: string }
 *               itemsMissing:
 *                 type: array
 *                 items: { type: string }
 *               itemsDamaged:
 *                 type: array
 *                 items: { type: string }
 *               damageCosts:
 *                 type: object
 *                 description: map of productId -> cost
 *               refundPaymentMethodId: { type: string }
 *               depositsReturned:
 *                 type: array
 *                 items: { type: string }
 *                 description: RentalDeposit ids for physical collateral (gold/document) handed back to the customer
 *     responses:
 *       200: { description: Rental returned, deposit/debt settled }
 *       404: { description: Not found }
 *       409: { description: Already returned }
 */
router.post(
  "/:id/return",
  logActivity("rentals", "return", (req) => `Processed return for rental #${req.params.id.slice(-6)}`),
  returnRental
);

/**
 * @swagger
 * /rentals/{id}:
 *   delete:
 *     tags: [Rentals]
 *     summary: Cancel a rental (soft-delete) and release its reserved units
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Rental cancelled }
 *       404: { description: Not found }
 *       409: { description: Rental is already returned or cancelled }
 */
router.delete(
  "/:id",
  requireModulePermission("rentals", "delete"),
  logActivity("rentals", "delete", (req) => `Cancelled rental #${req.params.id.slice(-6)}`),
  cancelRental
);

module.exports = router;
