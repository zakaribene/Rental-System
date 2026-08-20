const Store = require("../models/Store");
const SupportMessage = require("../models/SupportMessage");

// --- Store side ---

const getStoreMessages = async (req, res, next) => {
  try {
    const messages = await SupportMessage.find({ storeId: req.storeId }).sort({ createdAt: 1 }).limit(200);
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

const sendStoreMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }
    const doc = await SupportMessage.create({
      storeId: req.storeId,
      senderRole: "STORE",
      senderId: req.user.id,
      message: message.trim()
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

const getStoreUnreadCount = async (req, res, next) => {
  try {
    const store = await Store.findById(req.storeId);
    const lastReadAt = store?.supportStoreLastReadAt || new Date(0);
    const count = await SupportMessage.countDocuments({
      storeId: req.storeId,
      senderRole: "SUPER_ADMIN",
      createdAt: { $gt: lastReadAt }
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

const markStoreRead = async (req, res, next) => {
  try {
    await Store.findByIdAndUpdate(req.storeId, { supportStoreLastReadAt: new Date() });
    res.json({ message: "Support messages marked as read" });
  } catch (err) {
    next(err);
  }
};

// --- Super admin side ---

const listThreads = async (req, res, next) => {
  try {
    const stores = await Store.find().select("storeName ownerName supportAdminLastReadAt").lean();
    const threads = await Promise.all(
      stores.map(async (store) => {
        const lastMessage = await SupportMessage.findOne({ storeId: store._id }).sort({ createdAt: -1 });
        if (!lastMessage) return null;
        const lastReadAt = store.supportAdminLastReadAt || new Date(0);
        const unreadCount = await SupportMessage.countDocuments({
          storeId: store._id,
          senderRole: "STORE",
          createdAt: { $gt: lastReadAt }
        });
        return {
          storeId: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          lastMessage: lastMessage.message,
          lastMessageAt: lastMessage.createdAt,
          lastSenderRole: lastMessage.senderRole,
          unreadCount
        };
      })
    );
    const sorted = threads.filter(Boolean).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    res.json(sorted);
  } catch (err) {
    next(err);
  }
};

const getThreadMessages = async (req, res, next) => {
  try {
    const messages = await SupportMessage.find({ storeId: req.params.storeId }).sort({ createdAt: 1 }).limit(200);
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

const replyToThread = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }
    const store = await Store.findById(req.params.storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const doc = await SupportMessage.create({
      storeId: store._id,
      senderRole: "SUPER_ADMIN",
      senderId: req.user.id,
      message: message.trim()
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

const getAdminUnreadCount = async (req, res, next) => {
  try {
    const stores = await Store.find().select("supportAdminLastReadAt").lean();
    const counts = await Promise.all(
      stores.map((store) =>
        SupportMessage.countDocuments({
          storeId: store._id,
          senderRole: "STORE",
          createdAt: { $gt: store.supportAdminLastReadAt || new Date(0) }
        })
      )
    );
    res.json({ count: counts.reduce((sum, c) => sum + c, 0) });
  } catch (err) {
    next(err);
  }
};

const markThreadRead = async (req, res, next) => {
  try {
    await Store.findByIdAndUpdate(req.params.storeId, { supportAdminLastReadAt: new Date() });
    res.json({ message: "Thread marked as read" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStoreMessages,
  sendStoreMessage,
  getStoreUnreadCount,
  markStoreRead,
  listThreads,
  getThreadMessages,
  replyToThread,
  getAdminUnreadCount,
  markThreadRead
};
