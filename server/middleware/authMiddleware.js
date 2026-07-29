const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Considered "online" if active within this window (see storeController's
// isOnline calculation) — only bother writing lastActiveAt this often too,
// so we're not hitting the DB on every single request.
const ACTIVITY_TOUCH_INTERVAL_MS = 2 * 60 * 1000;

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No access token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role, storeId: decoded.storeId };

    // Fire-and-forget "presence" touch — only writes if the last touch is
    // stale, so this stays cheap even under heavy request volume.
    User.updateOne(
      { _id: decoded.id, $or: [{ lastActiveAt: null }, { lastActiveAt: { $lt: new Date(Date.now() - ACTIVITY_TOUCH_INTERVAL_MS) } }] },
      { $set: { lastActiveAt: new Date() } }
    ).catch(() => {});

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

module.exports = authMiddleware;
