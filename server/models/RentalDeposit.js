const mongoose = require("mongoose");

const rentalDepositSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "RentalTransaction", required: true },
  depositType: { type: String, enum: ["CASH", "DOCUMENT", "GUARANTOR", "CARD"], required: true },
  cashAmount: { type: Number },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  documentImageUrl: { type: String },
  guarantorName: { type: String },
  guarantorPhone: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RentalDeposit", rentalDepositSchema);
