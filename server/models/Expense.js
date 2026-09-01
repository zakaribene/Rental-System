const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  description: { type: String, required: true },
  // Denormalized name, not a ref — mirrors Product.category, which lets
  // CategoryPicker's "type a name, pick or create it" UI work unchanged.
  category: { type: String },
  amount: { type: Number, required: true },
  paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Expense", expenseSchema);
