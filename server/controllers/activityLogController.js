const ActivityLog = require("../models/ActivityLog");

const getActivityLogs = async (req, res, next) => {
  try {
    const { from, to, module, userId } = req.query;
    const filter = { storeId: req.storeId };

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (module) filter.module = module;
    if (userId) filter.userId = userId;

    const logs = await ActivityLog.find(filter).populate("userId", "name role").sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivityLogs };
