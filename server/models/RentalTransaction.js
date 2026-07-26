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
  rentPaid: { type: Number, default: 0 },
  dateOut: { type: Date, default: Date.now },
  expectedReturnDate: { type: Date },
  status: { type: String, enum: ["active", "returned", "overdue"], default: "active" },
  returnDetails: {
    returnDate: Date,
    itemsReturnedOk: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    itemsMissing: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    itemsDamaged: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    depositRefunded: Number,
    damageDebt: { type: Number, default: 0 }
  }
});

// Rent fee owed is tracked independently of the deposit: the deposit is
// refunded in full (minus damage/missing costs) on return, while the rent
// fee itself is paid down separately via DEBT_SETTLEMENT payments, whether
// the rental is still active or already returned.
rentalTransactionSchema.virtual("remainingDebt").get(function () {
  const damageDebt = this.returnDetails?.damageDebt || 0;
  const debt = this.totalRentFee - (this.rentPaid || 0) + damageDebt;
  return Math.max(0, debt);
});

rentalTransactionSchema.set("toJSON", { virtuals: true });
rentalTransactionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("RentalTransaction", rentalTransactionSchema);
