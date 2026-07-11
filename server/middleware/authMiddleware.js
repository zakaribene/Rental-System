const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No access token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role, storeId: decoded.storeId };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

module.exports = authMiddleware;
