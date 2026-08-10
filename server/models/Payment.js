const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "RentalTransaction" },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "SaleTransaction" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  type: { type: String, enum: ["DEPOSIT_COLLECTION", "DEBT_SETTLEMENT", "REFUND", "SALE_PAYMENT"], required: true },
  amount: { type: Number, required: true },
  // Marks a SALE_PAYMENT row as part of the sale's initial payment (created
  // by saleController.createSale/updateSale), as opposed to a later debt
  // settlement made via paymentController.createPayment — updateSale only
  // ever replaces the isInitial rows, never a later settlement.
  isInitial: { type: Boolean, default: false },
  note: { type: String },
  paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", paymentSchema);
