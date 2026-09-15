const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  storeName: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  // Unlike the other feature flags, this defaults true — the system started
  // as a rentals-only product, so every store created before this flag
  // existed (and every one that doesn't explicitly opt out) keeps rentals
  // working exactly as before.
  rentalsEnabled: { type: Boolean, default: true },
  salesEnabled: { type: Boolean, default: false },
  expensesEnabled: { type: Boolean, default: false },
  transfersEnabled: { type: Boolean, default: false },
  logoUrl: { type: String },
  notificationsLastReadAt: { type: Date, default: () => new Date(0) },
  supportStoreLastReadAt: { type: Date, default: () => new Date(0) },
  supportAdminLastReadAt: { type: Date, default: () => new Date(0) },
  subscriptionEndsAt: { type: Date, default: null },
  subscriptionStatus: { type: String, enum: ["active", "grace", "expired"], default: "active" },
  gracePeriodEndsAt: { type: Date, default: null },
  graceDays: { type: Number, default: null },
  graceHours: { type: Number, default: null },
  graceMinutes: { type: Number, default: null },
  graceBannerColor: { type: String, default: "#f59e0b" },
  graceMessage: { type: String, default: null },
  deactivatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Store", storeSchema);
