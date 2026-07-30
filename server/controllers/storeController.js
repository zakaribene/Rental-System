const bcrypt = require("bcrypt");
const Store = require("../models/Store");
const User = require("../models/User");
const Payment = require("../models/Payment");
const RentalTransaction = require("../models/RentalTransaction");
const ImpersonationLog = require("../models/ImpersonationLog");
const { generateAccessToken } = require("../utils/tokenUtils");

// A store owner is considered "online" if their last authenticated request
// was within this window (matches the touch interval in authMiddleware).
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

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
    const stores = await Store.find().sort({ createdAt: -1 }).lean();
    const owners = await User.find({ role: "STORE_OWNER", storeId: { $in: stores.map((s) => s._id) } }).select(
      "storeId lastLoginAt lastActiveAt"
    );
    const ownerMap = new Map(owners.map((o) => [o.storeId.toString(), o]));
    const now = Date.now();

    const withOwnerInfo = stores.map((s) => {
      const owner = ownerMap.get(s._id.toString());
      return {
        ...s,
        lastLoginAt: owner?.lastLoginAt || null,
        lastActiveAt: owner?.lastActiveAt || null,
        isOnline: !!(owner?.lastActiveAt && now - new Date(owner.lastActiveAt).getTime() < ONLINE_WINDOW_MS)
      };
    });

    res.json(withOwnerInfo);
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

const resetStorePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "password is required and must be at least 6 characters" });
    }

    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const passwordHash = await bcrypt.hash(password, 10);

    store.passwordHash = passwordHash;
    await store.save();

    // Reset the owner's own login too (this is what login actually checks),
    // and clear their refresh token so any existing session is force-logged-out.
    await User.findOneAndUpdate(
      { storeId: store._id, role: "STORE_OWNER" },
      { passwordHash, refreshToken: null }
    );

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

const impersonateStore = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const owner = await User.findOne({ storeId: store._id, role: "STORE_OWNER" });
    if (!owner) return res.status(404).json({ message: "Store owner account not found" });
    if (owner.status !== "active") {
      return res.status(409).json({ message: "This store owner's account is inactive" });
    }

    // Access-token-only session — deliberately no refresh token is issued
    // and the admin's own refresh cookie is left untouched, so this view
    // naturally expires back to the admin session (ACCESS_TOKEN_EXPIRY) even
    // if they never click "Return to admin".
    const accessToken = generateAccessToken(owner);

    await ImpersonationLog.create({
      adminId: req.user.id,
      storeId: store._id,
      targetUserId: owner._id
    });

    res.json({
      accessToken,
      user: {
        id: owner._id,
        name: owner.name,
        phone: owner.phone,
        role: owner.role,
        storeId: owner.storeId
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    const { subscriptionEndsAt } = req.body;
    if (!subscriptionEndsAt) {
      return res.status(400).json({ message: "subscriptionEndsAt is required" });
    }
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subscriptionEndsAt: new Date(subscriptionEndsAt),
          subscriptionStatus: "active",
          gracePeriodEndsAt: null,
          graceDays: null,
          graceMessage: null,
          deactivatedAt: null,
          status: "active"
        }
      },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    next(err);
  }
};

const grantGracePeriod = async (req, res, next) => {
  try {
    const { days, bannerColor, message } = req.body;
    const numDays = Number(days);
    if (!numDays || numDays <= 0) {
      return res.status(400).json({ message: "days must be a positive number" });
    }
    const now = new Date();
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subscriptionStatus: "grace",
          gracePeriodEndsAt: new Date(now.getTime() + numDays * 24 * 60 * 60 * 1000),
          graceDays: numDays,
          status: "active",
          deactivatedAt: null,
          ...(bannerColor && { graceBannerColor: bannerColor }),
          graceMessage: message || null
        }
      },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    next(err);
  }
};

const clearGracePeriod = async (req, res, next) => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subscriptionStatus: "active",
          gracePeriodEndsAt: null,
          graceDays: null,
          graceMessage: null
        }
      },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    next(err);
  }
};

const getStoreAnalytics = async (req, res, next) => {
  try {
    const stores = await Store.find().select("storeName status createdAt");

    const revenueByStore = await Payment.aggregate([
      {
        $project: {
          storeId: 1,
          signedAmount: { $cond: [{ $eq: ["$type", "REFUND"] }, { $multiply: ["$amount", -1] }, "$amount"] }
        }
      },
      { $group: { _id: "$storeId", revenue: { $sum: "$signedAmount" } } }
    ]);

    const rentalsByStore = await RentalTransaction.aggregate([{ $group: { _id: "$storeId", rentals: { $sum: 1 } } }]);

    const revenueMap = new Map(revenueByStore.map((r) => [r._id.toString(), r.revenue]));
    const rentalsMap = new Map(rentalsByStore.map((r) => [r._id.toString(), r.rentals]));

    const results = stores
      .map((s) => ({
        _id: s._id,
        storeName: s.storeName,
        status: s.status,
        createdAt: s.createdAt,
        revenue: revenueMap.get(s._id.toString()) || 0,
        rentals: rentalsMap.get(s._id.toString()) || 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(results);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createStore,
  getStores,
  getStoreById,
  updateStore,
  updateSubscription,
  grantGracePeriod,
  clearGracePeriod,
  getStoreAnalytics,
  resetStorePassword,
  impersonateStore
};
