const mongoose = require("mongoose");

// A move of money between two of the store's own payment methods (e.g. Cash
// deposited into Premier Bank). Never stored as a balance mutation — like
// Payment/Expense it's a ledger row, and every "available balance" figure
// derives it live as (+ transfers in − transfers out) for the method.
const transferSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  fromMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
  toMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transfer", transferSchema);
