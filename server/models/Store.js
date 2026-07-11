const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  storeName: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Store", storeSchema);
