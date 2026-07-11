const bcrypt = require("bcrypt");
const Store = require("../models/Store");
const User = require("../models/User");

const createStore = async (req, res, next) => {
  try {
    const { storeName, ownerName, ownerPhone, password } = req.body;
    if (!storeName || !ownerName || !ownerPhone || !password) {
      return res.status(400).json({ message: "storeName, ownerName, ownerPhone and password are required" });
    }

    const existing = await User.findOne({ phone: ownerPhone });
    if (existing) {
      return res.status(409).json({ message: "A user with this phone already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const store = await Store.create({ storeName, ownerName, ownerPhone, passwordHash });

    const owner = await User.create({
      storeId: store._id,
      name: ownerName,
      phone: ownerPhone,
      passwordHash,
      role: "STORE_OWNER"
    });

    res.status(201).json({ store, owner: { id: owner._id, name: owner.name, phone: owner.phone } });
  } catch (err) {
    next(err);
  }
};

const getStores = async (req, res, next) => {
  try {
    const stores = await Store.find().sort({ createdAt: -1 });
    res.json(stores);
  } catch (err) {
    next(err);
  }
};

const getStoreById = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    next(err);
  }
};

const updateStore = async (req, res, next) => {
  try {
    const { storeName, ownerName, status } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { $set: { ...(storeName && { storeName }), ...(ownerName && { ownerName }), ...(status && { status }) } },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    next(err);
  }
};

module.exports = { createStore, getStores, getStoreById, updateStore };
