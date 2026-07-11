const mongoose = require("mongoose");

const rentalTransactionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  staffUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      unitRent: Number
    }
  ],
  totalRentFee: { type: Number, required: true },
  dateOut: { type: Date, default: Date.now },
  expectedReturnDate: { type: Date },
  status: { type: String, enum: ["active", "returned", "overdue"], default: "active" },
  returnDetails: {
    returnDate: Date,
    itemsReturnedOk: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    itemsMissing: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    itemsDamaged: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    depositRefunded: Number,
    amountDeducted: Number,
    remainingDebt: Number
  }
});

module.exports = mongoose.model("RentalTransaction", rentalTransactionSchema);
