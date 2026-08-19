const Product = require("../models/Product");

// One-time backfill for RENT products created before the `quantity`/
// `availableQty` fields existed. Idempotent — only touches docs where the
// field is still missing, so it's safe to run on every boot. A product that
// was "available" is assumed to be a single legacy unit (quantity 1) with
// that unit free; anything else (rented, damaged, lost) had zero units free
// at the time of the switch.
module.exports = async function backfillProductQuantity() {
  await Product.updateMany(
    { listingType: "RENT", quantity: { $exists: false }, status: "available" },
    { $set: { quantity: 1 } }
  );
  await Product.updateMany(
    { listingType: "RENT", quantity: { $exists: false } },
    { $set: { quantity: 0 } }
  );
  await Product.updateMany(
    { listingType: "RENT", availableQty: { $exists: false }, status: "available" },
    [{ $set: { availableQty: "$quantity" } }]
  );
  await Product.updateMany(
    { listingType: "RENT", availableQty: { $exists: false } },
    { $set: { availableQty: 0 } }
  );
};
