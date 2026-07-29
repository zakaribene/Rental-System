const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const RentalTransaction = require("../models/RentalTransaction");

const LATE_RETURNS_RISK_THRESHOLD = 2;
const DAMAGE_INCIDENTS_RISK_THRESHOLD = 1;

// Attaches lateReturns/damageIncidents/isRisky to each customer so staff can
// spot repeat-offenders (late returns, damaged/missing items) without having
// to open every rental individually.
async function attachRiskStats(storeId, customers) {
  const stats = await RentalTransaction.aggregate([
    { $match: { storeId: new mongoose.Types.ObjectId(storeId), status: "returned" } },
    {
      $project: {
        customerId: 1,
        isLate: {
          $cond: [
            {
              $and: [
                "$returnDetails.returnDate",
                "$expectedReturnDate",
                { $gt: ["$returnDetails.returnDate", "$expectedReturnDate"] }
              ]
            },
            1,
            0
          ]
        },
        hasDamage: {
          $cond: [
            {
              $or: [
                { $gt: [{ $size: { $ifNull: ["$returnDetails.itemsDamaged", []] } }, 0] },
                { $gt: [{ $size: { $ifNull: ["$returnDetails.itemsMissing", []] } }, 0] }
              ]
            },
            1,
            0
          ]
        }
      }
    },
    { $group: { _id: "$customerId", lateReturns: { $sum: "$isLate" }, damageIncidents: { $sum: "$hasDamage" } } }
  ]);

  const statsMap = new Map(stats.map((s) => [s._id.toString(), s]));

  return customers.map((c) => {
    const s = statsMap.get(c._id.toString()) || { lateReturns: 0, damageIncidents: 0 };
    return {
      ...c,
      lateReturns: s.lateReturns,
      damageIncidents: s.damageIncidents,
      isRisky: s.lateReturns >= LATE_RETURNS_RISK_THRESHOLD || s.damageIncidents >= DAMAGE_INCIDENTS_RISK_THRESHOLD
    };
  });
}

const createCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, idDocumentNumber, photoUrl, idDocumentImageUrl } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ message: "fullName and phone are required" });
    }
    const customer = await Customer.create({
      storeId: req.storeId,
      fullName,
      phone,
      idDocumentNumber,
      photoUrl,
      idDocumentImageUrl
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

const getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find({ storeId: req.storeId }).sort({ createdAt: -1 }).lean();
    const withRisk = await attachRiskStats(req.storeId, customers);
    res.json(withRisk);
  } catch (err) {
    next(err);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, storeId: req.storeId }).lean();
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const [withRisk] = await attachRiskStats(req.storeId, [customer]);
    res.json(withRisk);
  } catch (err) {
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, idDocumentNumber, photoUrl, idDocumentImageUrl } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      {
        $set: {
          ...(fullName && { fullName }),
          ...(phone && { phone }),
          ...(idDocumentNumber !== undefined && { idDocumentNumber }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(idDocumentImageUrl !== undefined && { idDocumentImageUrl })
        }
      },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    next(err);
  }
};

module.exports = { createCustomer, getCustomers, getCustomerById, updateCustomer };
