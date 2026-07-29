const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "STORE_OWNER", "STORE_STAFF"], required: true },
  refreshToken: { type: String, default: null },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  lastLoginAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
