const express = require("express");
const { createRental, getRentals, getRentalById, returnRental } = require("../controllers/rentalController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const { uploadDocument } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware);

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
  const url = `${req.protocol}://${req.get("host")}/uploads/documents/${req.file.filename}`;
  res.status(201).json({ url });
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
 *                     depositType: { type: string, enum: [CASH, DOCUMENT, GUARANTOR, CARD] }
 *                     cashAmount: { type: number }
 *                     paymentMethodId: { type: string }
 *                     documentImageUrl: { type: string }
 *                     guarantorName: { type: string }
 *                     guarantorPhone: { type: string }
 *     responses:
 *       201: { description: Rental created }
 *   get:
 *     tags: [Rentals]
 *     summary: List rentals in the current store
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, returned, overdue] }
 *     responses:
 *       200: { description: List of rentals }
 */
router.post("/", createRental);
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
 */
router.get("/:id", getRentalById);

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
 *     responses:
 *       200: { description: Rental returned, deposit/debt settled }
 *       404: { description: Not found }
 *       409: { description: Already returned }
 */
router.post("/:id/return", returnRental);

module.exports = router;
