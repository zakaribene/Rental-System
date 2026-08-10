const RentalTransaction = require("../models/RentalTransaction");
const RentalDeposit = require("../models/RentalDeposit");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Customer = require("../models/Customer");

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
    createdBy: userId
  });
}

const createRental = async (req, res, next) => {
  try {
    const { customerId, items, expectedReturnDate, deposits } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "customerId and items are required" });
    }

    const customer = await Customer.findOne({ _id: customerId, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const resolvedItems = [];
    let totalRentFee = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId: req.storeId });
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      if (product.status !== "available") {
        return res.status(409).json({ message: `Product ${product.name} is not available` });
      }
      const quantity = item.quantity || 1;
      const unitRent = product.rentPrice;
      resolvedItems.push({ productId: product._id, quantity, unitRent });
      totalRentFee += unitRent * quantity;
    }

    const transaction = await RentalTransaction.create({
      storeId: req.storeId,
      customerId,
      staffUserId: req.user.id,
      items: resolvedItems,
      totalRentFee,
      expectedReturnDate,
      status: "active"
    });

    await Product.updateMany(
      { _id: { $in: resolvedItems.map((i) => i.productId) } },
      { $set: { status: "rented" } }
    );

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

    res.status(201).json({ transaction, deposits: createdDeposits });
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
    const deposits = await RentalDeposit.find({ transactionId: rental._id }).populate("createdBy", "name");
    const payments = await Payment.find({ transactionId: rental._id })
      .populate("paymentMethodId", "name")
      .populate("recordedBy", "name")
      .sort({ date: 1 });
    res.json({ transaction: rental, deposits, payments });
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

    const { customerId, items, expectedReturnDate } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "customerId and items are required" });
    }

    const customer = await Customer.findOne({ _id: customerId, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const oldProductIds = new Set(rental.items.map((it) => it.productId.toString()));

    const resolvedItems = [];
    const newProductIds = new Set();
    let totalRentFee = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId: req.storeId });
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      const alreadyOnThisRental = oldProductIds.has(product._id.toString());
      if (!alreadyOnThisRental && product.status !== "available") {
        return res.status(409).json({ message: `Product ${product.name} is not available` });
      }
      const quantity = item.quantity || 1;
      const unitRent = product.rentPrice;
      resolvedItems.push({ productId: product._id, quantity, unitRent });
      newProductIds.add(product._id.toString());
      totalRentFee += unitRent * quantity;
    }

    const removedProductIds = [...oldProductIds].filter((id) => !newProductIds.has(id));
    const addedProductIds = [...newProductIds].filter((id) => !oldProductIds.has(id));

    if (removedProductIds.length) {
      await Product.updateMany({ _id: { $in: removedProductIds } }, { $set: { status: "available" } });
    }
    if (addedProductIds.length) {
      await Product.updateMany({ _id: { $in: addedProductIds } }, { $set: { status: "rented" } });
    }

    rental.customerId = customerId;
    rental.items = resolvedItems;
    rental.totalRentFee = totalRentFee;
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

    const { depositType, cashAmount, paymentMethodId, documentImageUrl, guarantorName, guarantorPhone } = req.body;
    if (!depositType) {
      return res.status(400).json({ message: "depositType is required" });
    }

    const customer = await Customer.findById(transaction.customerId);
    const deposit = await createDepositRecord({
      storeId: req.storeId,
      transaction,
      customer,
      deposit: { depositType, cashAmount, paymentMethodId, documentImageUrl, guarantorName, guarantorPhone },
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
      lateFee = 0
    } = req.body;

    const transaction = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!transaction) return res.status(404).json({ message: "Rental not found" });
    if (transaction.status === "returned") {
      return res.status(409).json({ message: "Rental already returned" });
    }

    const deposits = await RentalDeposit.find({ transactionId: transaction._id, depositType: "CASH" });
    const cashDepositAlreadyPaid = deposits.reduce((sum, d) => sum + (d.cashAmount || 0), 0);

    const costOfDamagedOrMissingItems = [...itemsMissing, ...itemsDamaged].reduce(
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
      itemsReturnedOk,
      itemsMissing,
      itemsDamaged,
      depositRefunded,
      damageDebt,
      lateFee: resolvedLateFee,
      returnedBy: req.user.id
    };
    await transaction.save();

    if (itemsReturnedOk.length) {
      await Product.updateMany({ _id: { $in: itemsReturnedOk } }, { $set: { status: "available" } });
    }
    if (itemsDamaged.length) {
      await Product.updateMany({ _id: { $in: itemsDamaged } }, { $set: { status: "damaged" } });
    }
    if (itemsMissing.length) {
      await Product.updateMany({ _id: { $in: itemsMissing } }, { $set: { status: "lost" } });
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

    const populatedTransaction = await RentalTransaction.findById(transaction._id)
      .populate("customerId", "fullName phone")
      .populate("returnDetails.returnedBy", "name");

    res.json({ transaction: populatedTransaction, refundPayment });
  } catch (err) {
    next(err);
  }
};

module.exports = { createRental, getRentals, getRentalById, updateRental, addRentalDeposit, returnRental };
