// Gates a route behind a per-store feature flag set by req.storeFeatures
// (populated by storeScopeMiddleware). Only Super Admin can flip these flags
// on Store, so this middleware never runs for SUPER_ADMIN requests.
const FEATURE_LABELS = {
  salesEnabled: "Sales",
  expensesEnabled: "Expenses",
  transfersEnabled: "Transfer Payments"
};

const requireStoreFeature = (flag) => (req, res, next) => {
  if (!req.storeFeatures?.[flag]) {
    return res.status(403).json({
      code: "FEATURE_DISABLED",
      message: `${FEATURE_LABELS[flag] || "Feature-kan"} ma shaqeynayo dukaankan. Fadlan la xiriir maamulaha si loo fasaxo.`
    });
  }
  next();
};

module.exports = requireStoreFeature;
