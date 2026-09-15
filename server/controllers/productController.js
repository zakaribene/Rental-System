const Product = require("../models/Product");
const RentalTransaction = require("../models/RentalTransaction");
const { syncAvailabilityStatus } = require("../utils/productAvailability");

const resolveQuantity = (raw) => Math.max(1, Number(raw) || 1);

const createProduct = async (req, res, next) => {
  try {
    const { name, category, listingType, rentPrice, quantity, salePrice, stockQty, imageUrl, plateNumber } =
      req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const type = listingType === "SALE" ? "SALE" : "RENT";
    if (type === "SALE") {
      if (!req.storeFeatures?.salesEnabled) {
        return res.status(403).json({ code: "FEATURE_DISABLED", message: "Sales ma shaqeynayo dukaankan." });
      }
      if (salePrice === undefined || stockQty === undefined) {
        return res.status(400).json({ message: "salePrice and stockQty are required for a sale product" });
      }
    } else {
      if (!req.storeFeatures?.rentalsEnabled) {
        return res.status(403).json({ code: "FEATURE_DISABLED", message: "Rentals ma shaqeynayo dukaankan." });
      }
      if (rentPrice === undefined) {
        return res.status(400).json({ message: "rentPrice is required for a rent product" });
      }
    }

    // availableQty is a RENT-only concept — SALE products track stock via
    // stockQty instead, so it stays 0 to keep them out of any "available to
    // rent" listing (e.g. the rental item picker).
    const resolvedQuantity = type === "RENT" ? resolveQuantity(quantity) : 1;

    const product = await Product.create({
      storeId: req.storeId,
      name,
      category,
      listingType: type,
      rentPrice,
      quantity: resolvedQuantity,
      availableQty: type === "RENT" ? resolvedQuantity : 0,
      salePrice,
      stockQty: type === "SALE" ? stockQty : 0,
      imageUrl,
      plateNumber
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const filter = { storeId: req.storeId };
    if (req.query.status) filter.status = req.query.status;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { name, category, listingType, rentPrice, quantity, salePrice, stockQty, imageUrl, plateNumber, status } =
      req.body;

    if (listingType === "SALE" && !req.storeFeatures?.salesEnabled) {
      return res.status(403).json({ code: "FEATURE_DISABLED", message: "Sales ma shaqeynayo dukaankan." });
    }
    if (listingType === "RENT" && !req.storeFeatures?.rentalsEnabled) {
      return res.status(403).json({ code: "FEATURE_DISABLED", message: "Rentals ma shaqeynayo dukaankan." });
    }

    const product = await Product.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (name) product.name = name;
    if (category) product.category = category;
    if (rentPrice !== undefined) product.rentPrice = rentPrice;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (stockQty !== undefined) product.stockQty = stockQty;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (plateNumber !== undefined) product.plateNumber = plateNumber;
    if (status) product.status = status;

    // Switching listing type flips which "how many can I sell/rent right
    // now" field applies — availableQty is meaningless for SALE (it uses
    // stockQty) and would otherwise keep a stale RENT-era value.
    if (listingType && listingType !== product.listingType) {
      product.listingType = listingType;
      if (listingType === "SALE") {
        product.availableQty = 0;
      } else {
        product.quantity = resolveQuantity(quantity ?? product.quantity);
        product.availableQty = product.quantity;
      }
    }

    if (quantity !== undefined && product.listingType === "RENT") {
      const newQuantity = resolveQuantity(quantity);
      const newAvailableQty = product.availableQty + (newQuantity - product.quantity);
      if (newAvailableQty < 0) {
        const rentedOut = product.quantity - product.availableQty;
        return res.status(409).json({
          message: `Cannot reduce quantity below the ${rentedOut} unit(s) currently rented out`
        });
      }
      product.quantity = newQuantity;
      product.availableQty = newAvailableQty;
    }

    // A quantity or listing-type change can change how many units are free,
    // so status (which tracks availableQty for RENT products) needs to be
    // re-derived — an explicit `status` sent in the same request would
    // otherwise go stale. Not meaningful for SALE items (they track stock
    // via stockQty instead), so leave their status untouched.
    if ((quantity !== undefined || listingType) && product.listingType === "RENT") {
      syncAvailabilityStatus(product);
    }

    await product.save();
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const hasActiveRental = await RentalTransaction.exists({
      storeId: req.storeId,
      status: { $in: ["active", "overdue"] },
      "items.productId": product._id
    });
    if (hasActiveRental) {
      return res.status(409).json({ message: "Cannot delete a product that is part of an active rental" });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};

const uploadProductImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }
  res.status(201).json({ url: req.file.path });
};

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct, uploadProductImage };
