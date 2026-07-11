const Customer = require("../models/Customer");

const createCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, idDocumentNumber } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ message: "fullName and phone are required" });
    }
    const customer = await Customer.create({ storeId: req.storeId, fullName, phone, idDocumentNumber });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

const getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find({ storeId: req.storeId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    next(err);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, idDocumentNumber } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: { ...(fullName && { fullName }), ...(phone && { phone }), ...(idDocumentNumber !== undefined && { idDocumentNumber }) } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    next(err);
  }
};

module.exports = { createCustomer, getCustomers, getCustomerById, updateCustomer };
