const mongoose = require("mongoose");
const RentalTransaction = require("../models/RentalTransaction");
const RentalDeposit = require("../models/RentalDeposit");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const SaleTransaction = require("../models/SaleTransaction");
const { reserveUnits, releaseUnits, removeFromFleet } = require("../utils/productAvailability");
const { createSaleTransaction } = require("../utils/saleTransactionHelper");

// Frontend can send stray "null"/"" entries when nothing is selected —
// keep only real ObjectIds so Mongoose casting doesn't blow up.
const cleanIds = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map(String);

// Rental pricing is per day, ceiling-rounded — any part of a day (a 1-hour
// or 6-hour quick-pick duration included) bills as a full day. No return
// date at all means we can't know the duration yet, so it's billed as 1 day.
const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (start, end) => {
  if (!end) return 1;
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS));
};

// Collapses the same product listed as two separate line items (e.g. a
// customer picks a product on two separate rows) into one — otherwise each
// row would independently read/reserve availableQty off the same starting
// snapshot and the second save would clobber the first's decrement instead
// of the two combining.
const mergeItemsByProduct = (items) => {
  const merged = [];
  const indexByProduct = new Map();
  for (const item of items) {
    const key = String(item.productId);
    const quantity = Number(item.quantity) || 1;
    if (indexByProduct.has(key)) {
      merged[indexByProduct.get(key)].quantity += quantity;
    } else {
      indexByProduct.set(key, merged.length);
      merged.push({ productId: item.productId, quantity });
    }
  }
  return merged;
};

// Shared by createRental (bundled at creation) and addRentalDeposit (added
// later) — CASH deposits also record a Payment, GUARANTOR/DOCUMENT don't.
async function createDepositRecord({ storeId, transaction, customer, deposit, userId }) {
  let paymentId = null;

  if (deposit.depositType === "CASH") {
    const itemsLabel = transaction.items.length === 1 ? "1 item" : `${transaction.items.length} items`;
    const payment = await Payment.create({
      storeId,
      transactionId: transaction._id,
      customerId: transaction.customerId,
      type: "DEPOSIT_COLLECTION",
      amount: deposit.cashAmount,
      paymentMethodId: deposit.paymentMethodId,
      recordedBy: userId,
      note: `Deposit collected from ${customer?.fullName || "customer"} for rental #${transaction._id.toString().slice(-6)} (${itemsLabel}, rent fee ${transaction.totalRentFee})`
    });
    paymentId = payment._id;
  }

  return RentalDeposit.create({
    transactionId: transaction._id,
    depositType: deposit.depositType,
    cashAmount: deposit.cashAmount,
    paymentId,
    documentImageUrl: deposit.documentImageUrl,
    guarantorName: deposit.guarantorName,
    guarantorPhone: deposit.guarantorPhone,
    goldDescription: deposit.goldDescription,
    goldWeight: deposit.goldWeight,
    goldImageUrl: deposit.goldImageUrl,
    createdBy: userId
  });
}

const createRental = async (req, res, next) => {
  try {
    const { customerId, items, expectedReturnDate, deposits, discount, saleItems, saleDiscountAmount, salePayments } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "customerId and items are required" });
    }

    const resolvedDiscount = Math.max(0, Number(discount) || 0);

    const customer = await Customer.findOne({ _id: customerId, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const dateOut = new Date();
    const rentalDays = daysBetween(dateOut, expectedReturnDate);

    const resolvedItems = [];
    const touchedProducts = [];
    let rentSubtotal = 0;

    for (const item of mergeItemsByProduct(items)) {
      const product = await Product.findOne({ _id: item.productId, storeId: req.storeId });
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      if (product.listingType !== "RENT") {
        return res.status(400).json({ message: `${product.name} is a sale item and can't be rented` });
      }
      const quantity = item.quantity;
      if (product.availableQty < quantity) {
        return res.status(409).json({ message: `Product ${product.name} only has ${product.availableQty} unit(s) available` });
      }
      const unitRent = product.rentPrice;
      resolvedItems.push({ productId: product._id, quantity, unitRent });
      rentSubtotal += unitRent * quantity;
      touchedProducts.push({ product, quantity });
    }

    const subtotal = rentSubtotal * rentalDays;
    if (resolvedDiscount > subtotal) {
      return res.status(400).json({ message: `Discount cannot exceed the rental subtotal of ${subtotal}` });
    }
    const totalRentFee = subtotal - resolvedDiscount;

    const transaction = await RentalTransaction.create({
      storeId: req.storeId,
      customerId,
      staffUserId: req.user.id,
      items: resolvedItems,
      totalRentFee,
      discount: resolvedDiscount,
      rentalDays,
      dateOut,
      expectedReturnDate,
      status: "active"
    });

    for (const { product, quantity } of touchedProducts) {
      reserveUnits(product, quantity);
      await product.save();
    }

    const createdDeposits = [];
    for (const deposit of deposits || []) {
      const rentalDeposit = await createDepositRecord({
        storeId: req.storeId,
        transaction,
        customer,
        deposit,
        userId: req.user.id
      });
      createdDeposits.push(rentalDeposit);
    }

    // Optional: sale items bought in the same visit (e.g. a customer renting
    // a car also buys an oil filter at the counter). Created as its own
    // SaleTransaction — separate stock/debt logic from the rental — but
    // linked via orderId so the receipt can show both under one visit.
    let sale = null;
    let saleCreatedPayments = [];
    if (Array.isArray(saleItems) && saleItems.length > 0) {
      const result = await createSaleTransaction({
        storeId: req.storeId,
        customerId,
        customer,
        staffUserId: req.user.id,
        items: saleItems,
        discountAmount: saleDiscountAmount,
        payments: salePayments,
        orderId: transaction._id,
        userId: req.user.id
      });
      sale = result.sale;
      saleCreatedPayments = result.payments;
    }

    res.status(201).json({ transaction, deposits: createdDeposits, sale, payments: saleCreatedPayments });
  } catch (err) {
    next(err);
  }
};

const getRentals = async (req, res, next) => {
  try {
    const filter = { storeId: req.storeId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    const rentals = await RentalTransaction.find(filter)
      .populate("customerId", "fullName phone")
      .populate("staffUserId", "name")
      .sort({ dateOut: -1 });
    res.json(rentals);
  } catch (err) {
    next(err);
  }
};

const getRentalById = async (req, res, next) => {
  try {
    const rental = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate("customerId", "fullName phone")
      .populate("items.productId", "name")
      .populate("staffUserId", "name")
      .populate("returnDetails.returnedBy", "name");
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    const deposits = await RentalDeposit.find({ transactionId: rental._id })
      .populate("createdBy", "name")
      .populate("returnedBy", "name");
    const payments = await Payment.find({ transactionId: rental._id })
      .populate("paymentMethodId", "name")
      .populate("recordedBy", "name")
      .sort({ date: 1 });

    // Sale items bought in the same visit (see createRental), if any.
    const sale = await SaleTransaction.findOne({ orderId: rental._id, storeId: req.storeId })
      .populate("items.productId", "name")
      .populate("paymentSplits.paymentMethodId", "name");
    const salePayments = sale
      ? await Payment.find({ saleId: sale._id, storeId: req.storeId })
          .populate("paymentMethodId", "name")
          .populate("recordedBy", "name")
          .sort({ date: 1 })
      : [];

    res.json({ transaction: rental, deposits, payments, sale, salePayments });
  } catch (err) {
    next(err);
  }
};

const updateRental = async (req, res, next) => {
  try {
    const rental = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.status === "returned") {
      return res.status(409).json({ message: "Rental already returned — items can no longer be edited" });
    }
    if (rental.status === "cancelled") {
      return res.status(409).json({ message: "Rental is cancelled — it can no longer be edited" });
    }

    const { customerId, items, expectedReturnDate, discount } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "customerId and items are required" });
    }

    const resolvedDiscount = discount === undefined ? rental.discount || 0 : Math.max(0, Number(discount) || 0);

    const customer = await Customer.findOne({ _id: customerId, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const oldQuantities = new Map(rental.items.map((it) => [it.productId.toString(), it.quantity]));
    const newQuantities = new Map();

    const resolvedItems = [];
    const touchedProducts = new Map(); // productId -> { product, delta }
    let rentSubtotal = 0;

    for (const item of mergeItemsByProduct(items)) {
      const product = await Product.findOne({ _id: item.productId, storeId: req.storeId });
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      if (product.listingType !== "RENT") {
        return res.status(400).json({ message: `${product.name} is a sale item and can't be rented` });
      }
      const quantity = item.quantity;
      const productKey = product._id.toString();
      const oldQuantity = oldQuantities.get(productKey) || 0;
      const delta = quantity - oldQuantity;
      if (delta > 0 && product.availableQty < delta) {
        return res.status(409).json({ message: `Product ${product.name} only has ${product.availableQty} unit(s) available` });
      }
      resolvedItems.push({ productId: product._id, quantity, unitRent: product.rentPrice });
      newQuantities.set(productKey, quantity);
      rentSubtotal += product.rentPrice * quantity;
      touchedProducts.set(productKey, { product, delta });
    }

    // Items removed entirely from the rental — release their reserved units.
    for (const [productKey, oldQuantity] of oldQuantities) {
      if (newQuantities.has(productKey)) continue;
      const product = await Product.findById(productKey);
      if (!product) continue;
      touchedProducts.set(productKey, { product, delta: -oldQuantity });
    }

    const rentalDays = daysBetween(rental.dateOut, expectedReturnDate);
    const subtotal = rentSubtotal * rentalDays;
    if (resolvedDiscount > subtotal) {
      return res.status(400).json({ message: `Discount cannot exceed the rental subtotal of ${subtotal}` });
    }
    const totalRentFee = subtotal - resolvedDiscount;

    for (const { product, delta } of touchedProducts.values()) {
      if (!delta) continue;
      if (delta > 0) reserveUnits(product, delta);
      else releaseUnits(product, -delta);
      await product.save();
    }

    rental.customerId = customerId;
    rental.items = resolvedItems;
    rental.totalRentFee = totalRentFee;
    rental.discount = resolvedDiscount;
    rental.rentalDays = rentalDays;
    rental.expectedReturnDate = expectedReturnDate;
    await rental.save();

    const populatedRental = await RentalTransaction.findById(rental._id)
      .populate("customerId", "fullName phone")
      .populate("items.productId", "name")
      .populate("staffUserId", "name");

    res.json(populatedRental);
  } catch (err) {
    next(err);
  }
};

const addRentalDeposit = async (req, res, next) => {
  try {
    const transaction = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!transaction) return res.status(404).json({ message: "Rental not found" });
    if (transaction.status === "returned") {
      return res.status(409).json({ message: "Rental already returned — deposits can no longer be added" });
    }
    if (transaction.status === "cancelled") {
      return res.status(409).json({ message: "Rental is cancelled — deposits can no longer be added" });
    }

    const {
      depositType,
      cashAmount,
      paymentMethodId,
      documentImageUrl,
      guarantorName,
      guarantorPhone,
      goldDescription,
      goldWeight,
      goldImageUrl
    } = req.body;
    if (!depositType) {
      return res.status(400).json({ message: "depositType is required" });
    }

    const customer = await Customer.findById(transaction.customerId);
    const deposit = await createDepositRecord({
      storeId: req.storeId,
      transaction,
      customer,
      deposit: {
        depositType,
        cashAmount,
        paymentMethodId,
        documentImageUrl,
        guarantorName,
        guarantorPhone,
        goldDescription,
        goldWeight,
        goldImageUrl
      },
      userId: req.user.id
    });

    const populatedDeposit = await RentalDeposit.findById(deposit._id).populate("createdBy", "name");
    res.status(201).json(populatedDeposit);
  } catch (err) {
    next(err);
  }
};

const returnRental = async (req, res, next) => {
  try {
    const {
      itemsReturnedOk = [],
      itemsMissing = [],
      itemsDamaged = [],
      damageCosts = {},
      refundPaymentMethodId,
      lateFee = 0,
      depositsReturned = []
    } = req.body;

    const okIds = cleanIds(itemsReturnedOk);
    const missingIds = cleanIds(itemsMissing);
    const damagedIds = cleanIds(itemsDamaged);
    const returnedDepositIds = cleanIds(depositsReturned);

    const transaction = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!transaction) return res.status(404).json({ message: "Rental not found" });
    if (transaction.status === "returned") {
      return res.status(409).json({ message: "Rental already returned" });
    }
    if (transaction.status === "cancelled") {
      return res.status(409).json({ message: "Rental is cancelled" });
    }

    const deposits = await RentalDeposit.find({ transactionId: transaction._id, depositType: "CASH" });
    const cashDepositAlreadyPaid = deposits.reduce((sum, d) => sum + (d.cashAmount || 0), 0);

    const costOfDamagedOrMissingItems = [...missingIds, ...damagedIds].reduce(
      (sum, productId) => sum + (Number(damageCosts[productId]) || 0),
      0
    );

    // The deposit only ever covers damage/missing-item costs. It is never
    // used to pay down the rent fee — that is settled separately (see
    // paymentController.createPayment, DEBT_SETTLEMENT) whether the rental
    // is active or already returned.
    const depositRefunded = Math.max(0, cashDepositAlreadyPaid - costOfDamagedOrMissingItems);
    const damageDebt = Math.max(0, costOfDamagedOrMissingItems - cashDepositAlreadyPaid);

    // Late fee is entirely optional — staff choose whether to charge it
    // (overdue rental) or waive it by leaving it at 0.
    const resolvedLateFee = Math.max(0, Number(lateFee) || 0);

    transaction.status = "returned";
    transaction.returnDetails = {
      returnDate: new Date(),
      itemsReturnedOk: okIds,
      itemsMissing: missingIds,
      itemsDamaged: damagedIds,
      depositRefunded,
      damageDebt,
      lateFee: resolvedLateFee,
      returnedBy: req.user.id
    };
    await transaction.save();

    const quantityByProduct = new Map(transaction.items.map((it) => [it.productId.toString(), it.quantity]));

    // OK items free up their reserved units. Damaged/missing units leave the
    // fleet for good — they're removed from the total quantity rather than
    // returned to the available pool.
    for (const id of okIds) {
      const qty = quantityByProduct.get(id) || 0;
      if (!qty) continue;
      const product = await Product.findById(id);
      if (!product) continue;
      releaseUnits(product, qty);
      await product.save();
    }
    for (const id of damagedIds) {
      const qty = quantityByProduct.get(id) || 0;
      if (!qty) continue;
      const product = await Product.findById(id);
      if (!product) continue;
      removeFromFleet(product, qty, "damaged");
      await product.save();
    }
    for (const id of missingIds) {
      const qty = quantityByProduct.get(id) || 0;
      if (!qty) continue;
      const product = await Product.findById(id);
      if (!product) continue;
      removeFromFleet(product, qty, "lost");
      await product.save();
    }

    let refundPayment = null;
    if (depositRefunded > 0 && refundPaymentMethodId) {
      const customer = await Customer.findById(transaction.customerId);
      refundPayment = await Payment.create({
        storeId: req.storeId,
        transactionId: transaction._id,
        customerId: transaction.customerId,
        type: "REFUND",
        amount: depositRefunded,
        paymentMethodId: refundPaymentMethodId,
        recordedBy: req.user.id,
        note: `Deposit refund to ${customer?.fullName || "customer"} for rental #${transaction._id.toString().slice(-6)}${
          damageDebt > 0 ? ` — deposit ${cashDepositAlreadyPaid} minus damage/missing costs ${costOfDamagedOrMissingItems}` : ""
        }`
      });
    }

    // Physical collateral (gold, a held document/ID) handed back to the
    // customer alongside their items — tracked separately from the cash
    // deposit refund above since there's no payment record for it.
    if (returnedDepositIds.length) {
      await RentalDeposit.updateMany(
        { _id: { $in: returnedDepositIds }, transactionId: transaction._id, returnedAt: { $exists: false } },
        { $set: { returnedAt: new Date(), returnedBy: req.user.id } }
      );
    }

    const populatedTransaction = await RentalTransaction.findById(transaction._id)
      .populate("customerId", "fullName phone")
      .populate("returnDetails.returnedBy", "name");

    res.json({ transaction: populatedTransaction, refundPayment });
  } catch (err) {
    next(err);
  }
};

const cancelRental = async (req, res, next) => {
  try {
    const rental = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.status === "returned" || rental.status === "cancelled") {
      return res.status(409).json({ message: "Only active rentals can be cancelled" });
    }

    rental.status = "cancelled";
    rental.cancelledAt = new Date();
    rental.cancelledBy = req.user.id;
    await rental.save();

    // Release each item's reserved units. If the product was since deleted
    // (the bug this feature exists to fix), findById just returns null and
    // we move on — nothing left to release.
    for (const item of rental.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      releaseUnits(product, item.quantity);
      await product.save();
    }

    res.json({ message: "Rental cancelled" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createRental, getRentals, getRentalById, updateRental, addRentalDeposit, returnRental, cancelRental };