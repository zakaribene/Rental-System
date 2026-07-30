const cron = require("node-cron");
const Store = require("../models/Store");

// Default length of the automatic grace period granted the moment a
// subscription lapses, before the Super Admin steps in to extend or renew.
const DEFAULT_GRACE_DAYS = 3;

async function markExpiredSubscriptionsInGrace() {
  const now = new Date();
  await Store.updateMany(
    { subscriptionStatus: "active", subscriptionEndsAt: { $ne: null, $lte: now } },
    {
      $set: {
        subscriptionStatus: "grace",
        gracePeriodEndsAt: new Date(now.getTime() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000),
        graceDays: DEFAULT_GRACE_DAYS
      }
    }
  );
}

async function deactivateExpiredGracePeriods() {
  const now = new Date();
  await Store.updateMany(
    { subscriptionStatus: "grace", gracePeriodEndsAt: { $lte: now } },
    { $set: { subscriptionStatus: "expired", status: "inactive", deactivatedAt: now } }
  );
}

async function runSubscriptionSweep() {
  await markExpiredSubscriptionsInGrace();
  await deactivateExpiredGracePeriods();
}

function startSubscriptionJob() {
  runSubscriptionSweep().catch(() => {});
  cron.schedule("* * * * *", () => {
    runSubscriptionSweep().catch(() => {});
  });
}

module.exports = { startSubscriptionJob, runSubscriptionSweep };
