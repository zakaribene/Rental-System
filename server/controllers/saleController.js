const SaleTransaction = require("../models/SaleTransaction");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { createSaleTransaction } = require("../utils/saleTransactionHelper");

const createSale = async (req, res, next) => {
  try {
    const { customerId, items, discountAmount, payments } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items are required" });
    }

    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, storeId: req.storeId });
      if (!customer) return res.status(404).json({ message: "Customer not found" });
    }

    const { sale, payments: createdPayments } = await createSaleTransaction({
      storeId: req.storeId,
      customerId,
      customer,
      staffUserId: req.user.id,
      items,
      discountAmount,
      payments,
      userId: req.user.id
    });

    res.status(201).json({ sale, payments: createdPayments });
  } catch (err) {
    next(err);
  }
};

const SALE_POPULATE = [
  { path: "customerId", select: "fullName phone" },
  { path: "staffUserId", select: "name" },
  { path: "items.productId", select: "name" },
  { path: "paymentSplits.paymentMethodId", select: "name" }
];

const updateSale = async (req, res, next) => {
  try {
    const sale = await SaleTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const { customerId, items, discountAmount, payments } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items are required" });
    }

    const resolvedPayments = [];
    for (const p of payments || []) {
      const splitAmount = Number(p?.amount) || 0;
      if (!p?.paymentMethodId || splitAmount <= 0) {
        return res.status(400).json({ message: "Each payment split needs a paymentMethodId and an amount greater than 0" });
      }
      resolvedPayments.push({ paymentMethodId: p.paymentMethodId, amount: splitAmount });
    }

    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, storeId: req.storeId });
      if (!customer) return res.status(404).json({ message: "Customer not found" });
    }

    // The stock check has to add this sale's own currently-held quantity
    // back first — those units are already deducted, so keeping (or
    // trimming) them isn't "using more stock," only a net increase is.
    const oldQuantityByProduct = new Map();
    for (const item of sale.items) {
      const id = item.productId.toString();
      oldQuantityByProduct.set(id, (oldQuantityByProduct.get(id) || 0) + item.quantity);
    }

    const newQuantityByProduct = new Map();
    for (const item of items) {
      newQuantityByProduct.set(item.productId, (newQuantityByProduct.get(item.productId) || 0) + (item.quantity || 1));
    }

    const resolvedItems = [];
    let subtotal = 0;

    for (const [productId, quantity] of newQuantityByProduct) {
      const product = await Product.findOne({ _id: productId, storeId: req.storeId, listingType: "SALE" });
      if (!product) {
        return res.status(404).json({ message: `Sale product ${productId} not found` });
      }
      const effectiveStock = product.stockQty + (oldQuantityByProduct.get(productId) || 0);
      if (effectiveStock < quantity) {
        return res.status(409).json({ message: `Not enough stock for ${product.name} (${effectiveStock} available)` });
      }
      resolvedItems.push({ productId: product._id, quantity, unitPrice: product.salePrice });
      subtotal += product.salePrice * quantity;
    }

    const resolvedDiscount = Math.max(0, Number(discountAmount) || 0);
    const totalAmount = Math.max(0, subtotal - resolvedDiscount);
    const newSplitsSum = resolvedPayments.reduce((sum, p) => sum + p.amount, 0);

    const existingSettlements = await Payment.find({
      storeId: req.storeId,
      saleId: sale._id,
      type: "SALE_PAYMENT",
      isInitial: { $ne: true }
    });
    const settlementsSum = existingSettlements.reduce((sum, p) => sum + p.amount, 0);

    if (newSplitsSum > totalAmount) {
      return res.status(400).json({ message: `The payment splits (${newSplitsSum}) cannot exceed the total of ${totalAmount}` });
    }
    if (settlementsSum + newSplitsSum > totalAmount) {
      return res.status(409).json({
        message: `Existing debt settlements (${settlementsSum}) exceed the new total of ${totalAmount} — adjust items/discount first`
      });
    }

    // Apply stock deltas across the union of old and new product ids —
    // returning stock for items removed/reduced, deducting more for
    // items added/increased.
    const touchedProductIds = new Set([...oldQuantityByProduct.keys(), ...newQuantityByProduct.keys()]);
    for (const productId of touchedProductIds) {
      const oldQty = oldQuantityByProduct.get(productId) || 0;
      const newQty = newQuantityByProduct.get(productId) || 0;
      const delta = newQty - oldQty;
      if (delta !== 0) {
        await Product.updateOne({ _id: productId }, { $inc: { stockQty: -delta } });
      }
    }

    await Payment.deleteMany({ storeId: req.storeId, saleId: sale._id, isInitial: true });

    if (resolvedPayments.length > 0) {
      const itemsLabel = resolvedItems.length === 1 ? "1 item" : `${resolvedItems.length} items`;
      const customerLabel = customer?.fullName || "walk-in customer";
      for (const split of resolvedPayments) {
        await Payment.create({
          storeId: req.storeId,
          saleId: sale._id,
          customerId: customerId || undefined,
          type: "SALE_PAYMENT",
          isInitial: true,
          amount: split.amount,
          paymentMethodId: split.paymentMethodId,
          recordedBy: req.user.id,
          note: `Sale of ${itemsLabel} to ${customerLabel || "walk-in customer"} — sale #${sale._id.toString().slice(-6)} (edited)${
            resolvedDiscount > 0 ? ` (discount ${resolvedDiscount})` : ""
          }`
        });
      }
    }

    sale.customerId = customerId || undefined;
    sale.items = resolvedItems;
    sale.subtotal = subtotal;
    sale.discountAmount = resolvedDiscount;
    sale.totalAmount = totalAmount;
    sale.paymentSplits = resolvedPayments;
    sale.amountPaid = newSplitsSum + settlementsSum;
    await sale.save();

    const populatedSale = await SaleTransaction.findById(sale._id).populate(SALE_POPULATE);
    res.json(populatedSale);
  } catch (err) {
    next(err);
  }
};

const getSales = async (req, res, next) => {
  try {
    const { from, to, staff, product, customerId } = req.query;
    const filter = { storeId: req.storeId };

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (staff) filter.staffUserId = staff;
    if (customerId) filter.customerId = customerId;
    if (product) filter["items.productId"] = product;

    const sales = await SaleTransaction.find(filter).populate(SALE_POPULATE).sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    next(err);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const sale = await SaleTransaction.findOne({ _id: req.params.id, storeId: req.storeId }).populate(SALE_POPULATE);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    // Every payment ever collected toward this sale — the initial split(s)
    // recorded at creation plus any later debt settlements — so the
    // receipt can show who collected what, via which method, and when.
    const payments = await Payment.find({ saleId: sale._id, storeId: req.storeId })
      .populate("paymentMethodId", "name")
      .populate("recordedBy", "name")
      .sort({ date: 1 });
    res.json({ sale, payments });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSale, getSales, getSaleById, updateSale };
