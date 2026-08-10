const express = require("express");
const { createCategory, getCategories, updateCategory, deleteCategory } = require("../controllers/categoryController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");
const requireModulePermission = require("../middleware/modulePermissionMiddleware");
const logActivity = require("../middleware/activityLogger");

const router = express.Router();

// Categories live on the Products page, so they fold into the "products" permission.
router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware, requireModulePermission("products"));

/**
 * @swagger
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a product category
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
 *       201: { description: Category created }
 *   get:
 *     tags: [Categories]
 *     summary: List categories in the current store
 *     responses:
 *       200: { description: List of categories }
 */
router.post("/", logActivity("categories", "create", (req) => `Created category "${req.body.name}"`), createCategory);
router.get("/", getCategories);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Rename a category
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
 *     responses:
 *       200: { description: Updated category }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.patch(
  "/:id",
  requireModulePermission("products", "edit"),
  logActivity("categories", "update", (req) => `Renamed category to "${req.body.name}"`),
  updateCategory
);
router.delete(
  "/:id",
  requireModulePermission("products", "delete"),
  logActivity("categories", "delete", (req) => `Deleted category (…${req.params.id.slice(-6)})`),
  deleteCategory
);

module.exports = router;
