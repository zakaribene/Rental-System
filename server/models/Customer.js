const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  idDocumentNumber: { type: String },
  photoUrl: { type: String },
  idDocumentImageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Customer", customerSchema);
