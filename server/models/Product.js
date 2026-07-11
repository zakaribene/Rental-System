const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ["bag", "clothing", "other"] },
  rentPrice: { type: Number, required: true },
  depositPrice: { type: Number },
  status: { type: String, enum: ["available", "rented", "damaged", "lost"], default: "available" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);
