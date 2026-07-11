const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage
} = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const { uploadProduct } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware);

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, rentPrice]
 *             properties:
 *               name: { type: string }
 *               category: { type: string, enum: [bag, clothing, other] }
 *               rentPrice: { type: number }
 *               depositPrice: { type: number }
 *               imageUrl: { type: string }
 *               plateNumber: { type: string, description: "Optional vehicle plate number (targa), for future vehicle rentals" }
 *     responses:
 *       201: { description: Product created }
 *   get:
 *     tags: [Products]
 *     summary: List products in the current store
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [available, rented, damaged, lost] }
 *     responses:
 *       200: { description: List of products }
 */
router.post("/", createProduct);
router.get("/", getProducts);

/**
 * @swagger
 * /products/upload-image:
 *   post:
 *     tags: [Products]
 *     summary: Upload a product image
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
 *       400: { description: No file provided or invalid type }
 */
router.post("/upload-image", uploadProduct.single("image"), uploadProductImage);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
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
 *               category: { type: string, enum: [bag, clothing, other] }
 *               rentPrice: { type: number }
 *               depositPrice: { type: number }
 *               imageUrl: { type: string }
 *               plateNumber: { type: string, description: "Optional vehicle plate number (targa), for future vehicle rentals" }
 *               status: { type: string, enum: [available, rented, damaged, lost] }
 *     responses:
 *       200: { description: Updated product }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.get("/:id", getProductById);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
