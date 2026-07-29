const mongoose = require("mongoose");

const impersonationLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ImpersonationLog", impersonationLogSchema);
