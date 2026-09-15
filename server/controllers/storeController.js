const bcrypt = require("bcrypt");
const Store = require("../models/Store");
const User = require("../models/User");
const Payment = require("../models/Payment");
const RentalTransaction = require("../models/RentalTransaction");
const ImpersonationLog = require("../models/ImpersonationLog");
const { generateAccessToken } = require("../utils/tokenUtils");

// A store owner is considered "online" only if they still hold a live session
// (refresh token not cleared by logout) AND their last authenticated request
// was within this window. Comfortably above authMiddleware's touch interval
// so a genuinely-active owner doesn't flicker offline between requests.
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

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

    // "Last login" / "Online" should reflect ANYONE who uses the store —
    // owner or staff — so roll every store user's timestamps up to the store,
    // keeping the most recent of each. Only the owner's account drove this
    // before, so a store worked entirely by staff looked untouched for weeks.
    const users = await User.find({
      role: { $in: ["STORE_OWNER", "STORE_STAFF"] },
      storeId: { $in: stores.map((s) => s._id) }
    }).select("storeId lastLoginAt lastActiveAt refreshToken");

    const byStore = new Map();
    for (const u of users) {
      const key = u.storeId.toString();
      const entry = byStore.get(key) || { lastLoginAt: null, lastActiveAt: null, hasLiveSession: false };
      if (u.lastLoginAt && (!entry.lastLoginAt || u.lastLoginAt > entry.lastLoginAt)) entry.lastLoginAt = u.lastLoginAt;
      if (u.lastActiveAt && (!entry.lastActiveAt || u.lastActiveAt > entry.lastActiveAt)) entry.lastActiveAt = u.lastActiveAt;
      // A user with a refreshToken still holds a session (hasn't logged out or
      // been idle-timed-out) — required for the store to count as "online".
      if (u.refreshToken) entry.hasLiveSession = true;
      byStore.set(key, entry);
    }

    const now = Date.now();
    const withOwnerInfo = stores.map((s) => {
      const info = byStore.get(s._id.toString()) || {};
      const lastActiveMs = info.lastActiveAt ? new Date(info.lastActiveAt).getTime() : 0;
      return {
        ...s,
        lastLoginAt: info.lastLoginAt || null,
        lastActiveAt: info.lastActiveAt || null,
        isOnline: !!info.hasLiveSession && lastActiveMs > 0 && now - lastActiveMs < ONLINE_WINDOW_MS
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
    const { storeName, ownerName, ownerPhone, password, status, rentalsEnabled, salesEnabled, expensesEnabled, transfersEnabled } = req.body;

    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const owner = await User.findOne({ storeId: store._id, role: "STORE_OWNER" });

    // Changing the login phone ("username") — make sure it isn't already
    // taken by another account before touching either record.
    if (ownerPhone && ownerPhone !== store.ownerPhone) {
      const clash = await User.findOne({ phone: ownerPhone, _id: { $ne: owner?._id } });
      if (clash) return res.status(409).json({ message: "A user with this phone already exists" });
      store.ownerPhone = ownerPhone;
    }

    if (storeName) store.storeName = storeName;
    if (ownerName) store.ownerName = ownerName;
    if (status) store.status = status;
    if (rentalsEnabled !== undefined) store.rentalsEnabled = rentalsEnabled;
    if (salesEnabled !== undefined) store.salesEnabled = salesEnabled;
    if (expensesEnabled !== undefined) store.expensesEnabled = expensesEnabled;
    if (transfersEnabled !== undefined) store.transfersEnabled = transfersEnabled;

    let passwordHash;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "password must be at least 6 characters" });
      }
      passwordHash = await bcrypt.hash(password, 10);
      store.passwordHash = passwordHash;
    }

    await store.save();

    // Keep the owner's own login record (what login/impersonation actually
    // read) in step with the store's owner fields.
    if (owner) {
      if (ownerName) owner.name = ownerName;
      if (ownerPhone) owner.phone = ownerPhone;
      if (passwordHash) {
        owner.passwordHash = passwordHash;
        owner.refreshToken = null; // force any existing session to log in again
      }
      await owner.save();
    }

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
          graceHours: null,
          graceMinutes: null,
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
    const { bannerColor, message } = req.body;
    const numDays = Number(req.body.days) || 0;
    const numHours = Number(req.body.hours) || 0;
    const numMinutes = Number(req.body.minutes) || 0;
    const totalMs = numDays * 24 * 60 * 60 * 1000 + numHours * 60 * 60 * 1000 + numMinutes * 60 * 1000;
    if (totalMs <= 0) {
      return res.status(400).json({ message: "Enter a positive grace period duration" });
    }
    const now = new Date();
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subscriptionStatus: "grace",
          gracePeriodEndsAt: new Date(now.getTime() + totalMs),
          graceDays: numDays,
          graceHours: numHours,
          graceMinutes: numMinutes,
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
          graceHours: null,
          graceMinutes: null,
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
