const mongoose = require("mongoose");

const rentalDepositSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "RentalTransaction", required: true },
  depositType: { type: String, enum: ["CASH", "DOCUMENT", "GUARANTOR", "CARD", "GOLD"], required: true },
  cashAmount: { type: Number },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  documentImageUrl: { type: String },
  guarantorName: { type: String },
  guarantorPhone: { type: String },
  // GOLD — physical collateral held like a document/ID. Described rather
  // than priced; it's given back on return, not liquidated against debt.
  goldDescription: { type: String },
  goldWeight: { type: Number },
  goldImageUrl: { type: String },
  // Physical collateral (DOCUMENT/GOLD) held at the store gets handed back
  // when the customer returns their rented items — tracked separately from
  // the rental's own return so staff can see what's still owed back.
  returnedAt: { type: Date },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RentalDeposit", rentalDepositSchema);
