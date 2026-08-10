const mongoose = require("mongoose");

// enabled = can open this page at all; edit/delete further restrict actions
// within it (unused for modules that have no such concept, e.g. reports).
// Missing/undefined is always treated as allowed (see modulePermissionMiddleware),
// so existing users without this field keep their current full access.
const modulePermissionSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    edit: { type: Boolean, default: true },
    delete: { type: Boolean, default: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "STORE_OWNER", "STORE_STAFF"], required: true },
  refreshToken: { type: String, default: null },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  permissions: {
    products: { type: modulePermissionSchema, default: () => ({}) },
    customers: { type: modulePermissionSchema, default: () => ({}) },
    rentals: { type: modulePermissionSchema, default: () => ({}) },
    sales: { type: modulePermissionSchema, default: () => ({}) },
    payments: { type: modulePermissionSchema, default: () => ({}) },
    reports: { type: modulePermissionSchema, default: () => ({}) },
    activityLog: { type: modulePermissionSchema, default: () => ({}) }
  },
  lastLoginAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
