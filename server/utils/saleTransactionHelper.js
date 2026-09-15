const SaleTransaction = require("../models/SaleTransaction");
const Payment = require("../models/Payment");
const Product = require("../models/Product");

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

// Shared by saleController.createSale (a standalone sale) and
// rentalController.createRental (sale items bundled into a rental checkout,
// linked back to the rental via orderId) — validates stock, creates the
// SaleTransaction, decrements stock and records any initial payment splits.
async function createSaleTransaction({
  storeId,
  customerId,
  customer,
  staffUserId,
  items,
  discountAmount,
  payments,
  orderId,
  userId
}) {
  const resolvedPayments = [];
  for (const p of payments || []) {
    const splitAmount = Number(p?.amount) || 0;
    if (!p?.paymentMethodId || splitAmount <= 0) {
      throw httpError(400, "Each payment split needs a paymentMethodId and an amount greater than 0");
    }
    resolvedPayments.push({ paymentMethodId: p.paymentMethodId, amount: splitAmount });
  }

  const quantityByProduct = new Map();
  for (const item of items) {
    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) || 0) + (item.quantity || 1));
  }

  const resolvedItems = [];
  let subtotal = 0;

  for (const [productId, quantity] of quantityByProduct) {
    const product = await Product.findOne({ _id: productId, storeId, listingType: "SALE" });
    if (!product) {
      throw httpError(404, `Sale product ${productId} not found`);
    }
    if (product.stockQty < quantity) {
      throw httpError(409, `Not enough stock for ${product.name} (${product.stockQty} left)`);
    }
    resolvedItems.push({ productId: product._id, quantity, unitPrice: product.salePrice });
    subtotal += product.salePrice * quantity;
  }

  const resolvedDiscount = Math.max(0, Number(discountAmount) || 0);
  const totalAmount = Math.max(0, subtotal - resolvedDiscount);

  const resolvedAmountPaid = resolvedPayments.reduce((sum, p) => sum + p.amount, 0);
  if (resolvedAmountPaid > totalAmount) {
    throw httpError(400, `The payment splits (${resolvedAmountPaid}) cannot exceed the total of ${totalAmount}`);
  }

  const sale = await SaleTransaction.create({
    storeId,
    customerId: customerId || undefined,
    staffUserId,
    orderId: orderId || undefined,
    items: resolvedItems,
    subtotal,
    discountAmount: resolvedDiscount,
    totalAmount,
    amountPaid: resolvedAmountPaid,
    paymentSplits: resolvedPayments
  });

  for (const item of resolvedItems) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stockQty: -item.quantity } });
  }

  const createdPayments = [];
  if (resolvedPayments.length > 0) {
    const itemsLabel = resolvedItems.length === 1 ? "1 item" : `${resolvedItems.length} items`;
    for (const split of resolvedPayments) {
      const payment = await Payment.create({
        storeId,
        saleId: sale._id,
        customerId: customerId || undefined,
        type: "SALE_PAYMENT",
        isInitial: true,
        amount: split.amount,
        paymentMethodId: split.paymentMethodId,
        recordedBy: userId,
        note: `Sale of ${itemsLabel} to ${customer?.fullName || "walk-in customer"} — sale #${sale._id.toString().slice(-6)}${
          resolvedDiscount > 0 ? ` (discount ${resolvedDiscount})` : ""
        }${resolvedAmountPaid < totalAmount ? ` — partial payment, ${totalAmount - resolvedAmountPaid} still owed` : ""}${
          orderId ? ` — bundled with rental #${orderId.toString().slice(-6)}` : ""
        }`
      });
      createdPayments.push(payment);
    }
  }

  return { sale, payments: createdPayments };
}

module.exports = { createSaleTransaction, httpError };
