const Store = require("../models/Store");

const getMyStore = async (req, res, next) => {
  try {
    const store = await Store.findById(req.storeId).select(
      "storeName ownerName status logoUrl createdAt subscriptionStatus subscriptionEndsAt gracePeriodEndsAt graceDays graceBannerColor graceMessage"
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    next(err);
  }
};

const uploadMyStoreLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file provided" });
    const url = req.file.path;
    const store = await Store.findByIdAndUpdate(req.storeId, { logoUrl: url }, { new: true }).select(
      "storeName ownerName status logoUrl createdAt"
    );
    res.status(201).json(store);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyStore, uploadMyStoreLogo };
