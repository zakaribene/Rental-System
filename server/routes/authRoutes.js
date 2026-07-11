const express = require("express");
const { login, refreshTokenHandler, logout } = require("../controllers/authController");

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with phone + password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone: { type: string, example: "0000000000" }
 *               password: { type: string, example: "changeme123" }
 *     responses:
 *       200:
 *         description: Access token + user, refresh token set as httpOnly cookie
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Issue a new access token using the refresh token cookie
 *     security: []
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Missing/invalid refresh token
 */
router.post("/refresh-token", refreshTokenHandler);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate refresh token
 *     security: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", logout);

module.exports = router;
