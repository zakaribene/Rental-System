// Gates a route behind a per-staff-user module permission (req.userPermissions,
// populated by storeScopeMiddleware). Owners/admins are never restricted —
// only STORE_STAFF accounts can have a module disabled or an action denied.
// A missing/undefined flag is treated as allowed, so staff created before
// this system existed keep their current full access.
const requireModulePermission = (module, action = "enabled") => (req, res, next) => {
  if (req.user.role !== "STORE_STAFF") return next();

  const allowed = req.userPermissions?.[module]?.[action] !== false;
  if (!allowed) {
    return res.status(403).json({
      code: "PERMISSION_DENIED",
      message: "Ma lihid ogolaanshaha falkan. Fadlan la xiriir maamulaha dukaanka."
    });
  }
  next();
};

module.exports = requireModulePermission;
