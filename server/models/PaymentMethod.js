const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
});

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
