const ActivityLog = require("../models/ActivityLog");

// Fire-and-forget audit trail entry, written after the response is already
// on its way out — same convention as authMiddleware's lastActiveAt touch:
// never blocks or fails the actual request. Only logs successful (< 400)
// requests, so denied/failed attempts don't clutter the trail.
const logActivity = (module, action, describe) => (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    if (!req.user?.id || !req.storeId) return;

    let description;
    try {
      description = describe ? describe(req) : `${action} ${module}`;
    } catch {
      description = `${action} ${module}`;
    }

    ActivityLog.create({
      storeId: req.storeId,
      userId: req.user.id,
      module,
      action,
      description
    }).catch(() => {});
  });
  next();
};

module.exports = logActivity;
