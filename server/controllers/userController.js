const bcrypt = require("bcrypt");
const User = require("../models/User");

const createUser = async (req, res, next) => {
  try {
    const { name, phone, password, role, permissions } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone and password are required" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "A user with this phone already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      storeId: req.storeId,
      name,
      phone,
      passwordHash,
      role: role === "STORE_OWNER" ? "STORE_OWNER" : "STORE_STAFF",
      ...(permissions && { permissions })
    });

    res.status(201).json({ id: user._id, name: user.name, phone: user.phone, role: user.role, permissions: user.permissions });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ storeId: req.storeId }).select("-passwordHash -refreshToken");
    res.json(users);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, status, role, permissions } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      {
        $set: {
          ...(name && { name }),
          ...(status && { status }),
          ...(role && { role }),
          ...(permissions && { permissions })
        }
      },
      { new: true }
    ).select("-passwordHash -refreshToken");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, getUsers, updateUser };
