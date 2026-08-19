const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  name: { type: String, required: true },
  category: { type: String },
  listingType: { type: String, enum: ["RENT", "SALE"], default: "RENT" },
  rentPrice: { type: Number },
  quantity: { type: Number, default: 1 },
  availableQty: { type: Number, default: 1 },
  salePrice: { type: Number },
  stockQty: { type: Number, default: 0 },
  imageUrl: { type: String },
  plateNumber: { type: String },
  status: { type: String, enum: ["available", "rented", "damaged", "lost"], default: "available" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);
