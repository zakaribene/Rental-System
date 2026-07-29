const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  targetStoreId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
  message: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isBanner: { type: Boolean, default: false },
  bannerColor: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
