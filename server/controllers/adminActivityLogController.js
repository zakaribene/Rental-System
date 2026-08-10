const ActivityLog = require("../models/ActivityLog");
const ActivityLogSettings = require("../models/ActivityLogSettings");

const getAllActivityLogs = async (req, res, next) => {
  try {
    const { storeId, from, to, module } = req.query;
    const filter = {};

    if (storeId) filter.storeId = storeId;
    if (module) filter.module = module;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const logs = await ActivityLog.find(filter)
      .populate("storeId", "storeName")
      .populate("userId", "name role")
      .sort({ createdAt: -1 })
      .limit(2000);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

const getActivityLogSettings = async (req, res, next) => {
  try {
    let settings = await ActivityLogSettings.findOne();
    if (!settings) settings = await ActivityLogSettings.create({});
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

const updateActivityLogSettings = async (req, res, next) => {
  try {
    const { autoDeleteEnabled, retentionDays } = req.body;
    if (retentionDays !== undefined && Number(retentionDays) <= 0) {
      return res.status(400).json({ message: "retentionDays must be a positive number" });
    }

    const settings = await ActivityLogSettings.findOneAndUpdate(
      {},
      {
        $set: {
          ...(autoDeleteEnabled !== undefined && { autoDeleteEnabled }),
          ...(retentionDays !== undefined && { retentionDays: Number(retentionDays) })
        }
      },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllActivityLogs, getActivityLogSettings, updateActivityLogSettings };
