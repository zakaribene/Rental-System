const Category = require("../models/Category");

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const category = await Category.create({ storeId: req.storeId, name });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ storeId: req.storeId }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: { name } },
      { new: true }
    );
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCategory, getCategories, updateCategory, deleteCategory };
