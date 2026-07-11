const express = require("express");
const { createUser, getUsers, updateUser } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const storeScopeMiddleware = require("../middleware/storeScopeMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("STORE_OWNER", "STORE_STAFF"), storeScopeMiddleware);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Add a staff/owner user to the current store (STORE_OWNER only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [STORE_OWNER, STORE_STAFF] }
 *     responses:
 *       201: { description: User created }
 *   get:
 *     tags: [Users]
 *     summary: List users in the current store
 *     responses:
 *       200: { description: List of users }
 */
router.post("/", requireRole("STORE_OWNER"), createUser);
router.get("/", getUsers);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user in the current store (STORE_OWNER only)
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
 *               role: { type: string, enum: [STORE_OWNER, STORE_STAFF] }
 *     responses:
 *       200: { description: Updated user }
 *       404: { description: Not found }
 */
router.patch("/:id", requireRole("STORE_OWNER"), updateUser);

module.exports = router;
