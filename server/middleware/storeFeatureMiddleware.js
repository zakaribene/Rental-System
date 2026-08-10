// Gates a route behind a per-store feature flag set by req.storeFeatures
// (populated by storeScopeMiddleware). Only Super Admin can flip these flags
// on Store, so this middleware never runs for SUPER_ADMIN requests.
const requireStoreFeature = (flag) => (req, res, next) => {
  if (!req.storeFeatures?.[flag]) {
    return res.status(403).json({
      code: "FEATURE_DISABLED",
      message: "Sales ma shaqeynayo dukaankan. Fadlan la xiriir maamulaha si loo fasaxo."
    });
  }
  next();
};

module.exports = requireStoreFeature;
