const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer
} = require("../controllers/customerController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");
const logActivity = require("../middleware/activityLogger");
const { uploadCustomerPhoto, uploadCustomerIdDocument } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, requireModulePermission("customers"));

router.post("/upload-photo", uploadCustomerPhoto.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file provided" });
  res.status(201).json({ url: req.file.path });
});

router.post("/upload-id-document", uploadCustomerIdDocument.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file provided" });
  res.status(201).json({ url: req.file.path });
});

/**
 * @swagger
 * /customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phone]
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               idDocumentNumber: { type: string }
 *     responses:
 *       201: { description: Customer created }
 *   get:
 *     tags: [Customers]
 *     summary: List customers in the current store
 *     responses:
 *       200: { description: List of customers }
 */
router.post("/", logActivity("customers", "create", (req) => `Added customer "${req.body.fullName}"`), createCustomer);
router.get("/", getCustomers);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get a customer by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Customer }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Customers]
 *     summary: Update a customer
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
 *               fullName: { type: string }
 *               phone: { type: string }
 *               idDocumentNumber: { type: string }
 *     responses:
 *       200: { description: Updated customer }
 *       404: { description: Not found }
 */
router.get("/:id", getCustomerById);
router.patch(
  "/:id",
  requireModulePermission("customers", "edit"),
  logActivity("customers", "update", (req) => `Updated customer${req.body.fullName ? ` "${req.body.fullName}"` : ` (…${req.params.id.slice(-6)})`}`),
  updateCustomer
);

module.exports = router;
