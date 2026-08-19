// Single source of truth for how a RENT product's `status` follows its
// availableQty/quantity. Every place that reserves, releases, or permanently
// removes rentable units must go through here instead of re-deriving the
// available/rented rule inline — that's what let the rule drift out of sync
// in a previous version of this code.

// A manual "damaged"/"lost" flag (set outside a formal return, e.g. an owner
// editing the product directly) is left alone here — it only gets cleared by
// another explicit status change, not by routine availability bookkeeping.
function syncAvailabilityStatus(product) {
  if (product.status === "damaged" || product.status === "lost") return;
  product.status = product.availableQty > 0 ? "available" : "rented";
}

function reserveUnits(product, qty) {
  product.availableQty -= qty;
  syncAvailabilityStatus(product);
}

function releaseUnits(product, qty) {
  product.availableQty = Math.min(product.quantity, product.availableQty + qty);
  syncAvailabilityStatus(product);
}

// Permanently shrinks the fleet (damaged/missing items returned) — unlike
// releaseUnits, these units never come back to the available pool.
function removeFromFleet(product, qty, terminalStatus) {
  product.quantity = Math.max(0, product.quantity - qty);
  product.availableQty = Math.min(product.availableQty, product.quantity);
  product.status = product.quantity === 0 ? terminalStatus : product.availableQty > 0 ? "available" : "rented";
}

module.exports = { syncAvailabilityStatus, reserveUnits, releaseUnits, removeFromFleet };
