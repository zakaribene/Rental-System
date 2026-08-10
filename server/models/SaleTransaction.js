const mongoose = require("mongoose");

const saleTransactionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  staffUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      unitPrice: Number
    }
  ],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  // How the initial payment (if any) was split across methods — e.g. a $30
  // sale paid as $10 eDahab + $10 EVC + $10 cash. Each split also gets its
  // own Payment ledger row (created in saleController) so reports keep
  // working off the Payment collection; this array is a display-only
  // snapshot of the sale's initial payment, not touched by later debt
  // settlements (those stay single-method via paymentController).
  paymentSplits: [
    {
      paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod" },
      amount: Number
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

// Mirrors RentalTransaction.remainingDebt — a sale can be created with less
// than the full amount paid (or nothing at all), settled later via
// paymentController.createPayment's SALE_PAYMENT branch.
saleTransactionSchema.virtual("remainingDebt").get(function () {
  return Math.max(0, this.totalAmount - (this.amountPaid || 0));
});

saleTransactionSchema.set("toJSON", { virtuals: true });
saleTransactionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("SaleTransaction", saleTransactionSchema);
