const Notification = require("../models/Notification");
const Store = require("../models/Store");

const sendNotification = async (req, res, next) => {
  try {
    const { message, targetStoreId } = req.body;
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }
    const notification = await Notification.create({
      message,
      targetStoreId: targetStoreId || null,
      createdBy: req.user.id
    });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
};

const listAllNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find()
      .populate("targetStoreId", "storeName")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

const listStoreNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [{ targetStoreId: null }, { targetStoreId: req.storeId }]
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const store = await Store.findById(req.storeId);
    const lastReadAt = store?.notificationsLastReadAt || new Date(0);
    const count = await Notification.countDocuments({
      $or: [{ targetStoreId: null }, { targetStoreId: req.storeId }],
      createdAt: { $gt: lastReadAt }
    });
    res.json({ count, lastReadAt });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Store.findByIdAndUpdate(req.storeId, { notificationsLastReadAt: new Date() });
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendNotification, listAllNotifications, listStoreNotifications, getUnreadCount, markAllRead };
