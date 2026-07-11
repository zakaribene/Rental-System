const jwt = require("jsonwebtoken");

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, storeId: user.storeId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  });

module.exports = { generateAccessToken, generateRefreshToken };
