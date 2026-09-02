const bcrypt = require("bcrypt");
const User = require("../models/User");

const MIN_PASSWORD_LENGTH = 6;
const ADMIN_SELECT = "-passwordHash -refreshToken -permissions";

const publicAdmin = (u) => ({
  _id: u._id,
  name: u.name,
  phone: u.phone,
  role: u.role,
  status: u.status,
  lastLoginAt: u.lastLoginAt,
  lastActiveAt: u.lastActiveAt,
  createdAt: u.createdAt
});

const listAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: "SUPER_ADMIN" }).select(ADMIN_SELECT).sort({ createdAt: 1 });
    res.json(admins.map(publicAdmin));
  } catch (err) {
    next(err);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone and password are required" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "A user with this phone already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await User.create({ storeId: null, name, phone, passwordHash, role: "SUPER_ADMIN" });
    res.status(201).json(publicAdmin(admin));
  } catch (err) {
    next(err);
  }
};

// Change another admin's (or your own) username/name/password without needing
// the old one. Editing someone else force-logs them out; editing yourself
// keeps your current session alive.
const updateAdmin = async (req, res, next) => {
  try {
    const { name, phone, password, status } = req.body;

    const admin = await User.findOne({ _id: req.params.id, role: "SUPER_ADMIN" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isSelf = String(admin._id) === String(req.user.id);
    let invalidateOtherSession = false;

    if (phone && phone !== admin.phone) {
      const clash = await User.findOne({ phone, _id: { $ne: admin._id } });
      if (clash) return res.status(409).json({ message: "A user with this phone already exists" });
      admin.phone = phone;
      if (!isSelf) invalidateOtherSession = true;
    }

    if (name) admin.name = name;

    if (status && status !== admin.status) {
      if (isSelf) {
        return res.status(400).json({ message: "You can't change your own account status" });
      }
      if (status === "inactive") {
        const activeCount = await User.countDocuments({ role: "SUPER_ADMIN", status: "active" });
        if (activeCount <= 1) {
          return res.status(400).json({ message: "At least one super admin must stay active" });
        }
      }
      admin.status = status;
      if (status === "inactive") invalidateOtherSession = true;
    }

    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      }
      admin.passwordHash = await bcrypt.hash(password, 10);
      if (!isSelf) invalidateOtherSession = true;
    }

    if (invalidateOtherSession) admin.refreshToken = null;

    await admin.save();
    res.json(publicAdmin(admin));
  } catch (err) {
    next(err);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: "SUPER_ADMIN" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (String(admin._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You can't delete your own account" });
    }
    const total = await User.countDocuments({ role: "SUPER_ADMIN" });
    if (total <= 1) {
      return res.status(400).json({ message: "At least one super admin must remain" });
    }

    await admin.deleteOne();
    res.json({ message: "Admin deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAdmins, createAdmin, updateAdmin, deleteAdmin };
