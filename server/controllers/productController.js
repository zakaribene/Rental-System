const Product = require("../models/Product");

const createProduct = async (req, res, next) => {
  try {
    const { name, category, rentPrice, depositPrice } = req.body;
    if (!name || rentPrice === undefined) {
      return res.status(400).json({ message: "name and rentPrice are required" });
    }
    const product = await Product.create({ storeId: req.storeId, name, category, rentPrice, depositPrice });
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
    const { name, category, rentPrice, depositPrice, status } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      {
        $set: {
          ...(name && { name }),
          ...(category && { category }),
          ...(rentPrice !== undefined && { rentPrice }),
          ...(depositPrice !== undefined && { depositPrice }),
          ...(status && { status })
        }
      },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct };
