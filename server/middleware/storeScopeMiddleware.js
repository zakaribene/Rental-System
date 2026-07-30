const Store = require("../models/Store");

// Ensures store-role users can only ever operate on their own store's data.
// Controllers should filter/assign storeId using req.storeId, never trust the request body.
const storeScopeMiddleware = async (req, res, next) => {
  if (req.user.role === "STORE_OWNER" || req.user.role === "STORE_STAFF") {
    if (!req.user.storeId) {
      return res.status(403).json({ message: "User is not assigned to a store" });
    }

    // Blocks system-wide usage the moment a store is deactivated (e.g. an
    // expired grace period), not just fresh logins from already-active sessions.
    const store = await Store.findById(req.user.storeId).select("status");
    if (!store || store.status !== "active") {
      return res.status(403).json({
        code: "STORE_DEACTIVATED",
        message: "Subscription-kaagu wuu dhammaaday. Fadlan la xiriir maamulaha si adeeggaagu u sii shaqeeyo."
      });
    }

    req.storeId = req.user.storeId;
    return next();
  }

  if (req.user.role === "SUPER_ADMIN") {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
};

module.exports = storeScopeMiddleware;
