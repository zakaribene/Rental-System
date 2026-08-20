const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  senderRole: { type: String, enum: ["STORE", "SUPER_ADMIN"], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SupportMessage", supportMessageSchema);
