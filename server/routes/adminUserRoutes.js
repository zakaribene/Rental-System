const express = require("express");
const { listAdmins, createAdmin, updateAdmin, deleteAdmin } = require("../controllers/adminUserController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware, requireRole("SUPER_ADMIN"));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admins]
 *     summary: List every super admin account (SUPER_ADMIN only)
 *     responses:
 *       200: { description: List of super admins }
 *   post:
 *     tags: [Admins]
 *     summary: Create another super admin with its own username and password (SUPER_ADMIN only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, description: "Login username" }
 *               password: { type: string }
 *     responses:
 *       201: { description: Admin created }
 *       409: { description: Phone already in use }
 */
router.get("/", listAdmins);
router.post("/", createAdmin);

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     tags: [Admins]
 *     summary: Change a super admin's username/name/password or status — no old password required (SUPER_ADMIN only)
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
 *               phone: { type: string }
 *               password: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200: { description: Updated admin }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Admins]
 *     summary: Delete a super admin account (SUPER_ADMIN only, never yourself or the last one)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       400: { description: Cannot delete self or the last admin }
 */
router.patch("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

module.exports = router;
