const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "RentalTransaction" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  type: { type: String, enum: ["DEPOSIT_COLLECTION", "DEBT_SETTLEMENT", "REFUND"], required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", paymentSchema);
