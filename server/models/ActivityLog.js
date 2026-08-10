const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  module: {
    type: String,
    enum: ["products", "categories", "customers", "rentals", "sales", "payments", "staff", "auth"],
    required: true
  },
  action: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

activityLogSchema.index({ storeId: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
