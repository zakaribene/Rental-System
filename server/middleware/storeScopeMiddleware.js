// Ensures store-role users can only ever operate on their own store's data.
// Controllers should filter/assign storeId using req.storeId, never trust the request body.
const storeScopeMiddleware = (req, res, next) => {
  if (req.user.role === "STORE_OWNER" || req.user.role === "STORE_STAFF") {
    if (!req.user.storeId) {
      return res.status(403).json({ message: "User is not assigned to a store" });
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
