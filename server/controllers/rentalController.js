const RentalTransaction = require("../models/RentalTransaction");
const RentalDeposit = require("../models/RentalDeposit");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Customer = require("../models/Customer");

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
      let paymentId = null;

      if (deposit.depositType === "CASH") {
        const payment = await Payment.create({
          storeId: req.storeId,
          transactionId: transaction._id,
          customerId,
          type: "DEPOSIT_COLLECTION",
          amount: deposit.cashAmount,
          paymentMethodId: deposit.paymentMethodId,
          recordedBy: req.user.id
        });
        paymentId = payment._id;
      }

      const rentalDeposit = await RentalDeposit.create({
        transactionId: transaction._id,
        depositType: deposit.depositType,
        cashAmount: deposit.cashAmount,
        paymentId,
        documentImageUrl: deposit.documentImageUrl,
        guarantorName: deposit.guarantorName,
        guarantorPhone: deposit.guarantorPhone
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
    const rentals = await RentalTransaction.find(filter).sort({ dateOut: -1 });
    res.json(rentals);
  } catch (err) {
    next(err);
  }
};

const getRentalById = async (req, res, next) => {
  try {
    const rental = await RentalTransaction.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    const deposits = await RentalDeposit.find({ transactionId: rental._id });
    res.json({ transaction: rental, deposits });
  } catch (err) {
    next(err);
  }
};

const returnRental = async (req, res, next) => {
  try {
    const { itemsReturnedOk = [], itemsMissing = [], itemsDamaged = [], damageCosts = {}, refundPaymentMethodId } = req.body;

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

    const totalOwed = transaction.totalRentFee - cashDepositAlreadyPaid + costOfDamagedOrMissingItems;

    let remainingDebt = 0;
    let depositRefunded = 0;
    let amountDeducted;

    if (totalOwed > 0) {
      remainingDebt = totalOwed;
      amountDeducted = cashDepositAlreadyPaid;
    } else {
      depositRefunded = -totalOwed;
      amountDeducted = cashDepositAlreadyPaid - depositRefunded;
    }

    transaction.status = "returned";
    transaction.returnDetails = {
      returnDate: new Date(),
      itemsReturnedOk,
      itemsMissing,
      itemsDamaged,
      depositRefunded,
      amountDeducted,
      remainingDebt
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
      refundPayment = await Payment.create({
        storeId: req.storeId,
        transactionId: transaction._id,
        customerId: transaction.customerId,
        type: "REFUND",
        amount: depositRefunded,
        paymentMethodId: refundPaymentMethodId,
        recordedBy: req.user.id
      });
    }

    res.json({ transaction, refundPayment });
  } catch (err) {
    next(err);
  }
};

module.exports = { createRental, getRentals, getRentalById, returnRental };
