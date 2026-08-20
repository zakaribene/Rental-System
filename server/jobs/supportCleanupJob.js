const cron = require("node-cron");
const SupportMessage = require("../models/SupportMessage");
const SupportSettings = require("../models/SupportSettings");

// Off by default (see SupportSettings) — nothing is deleted until a Super
// Admin explicitly opts in via /support/admin/settings.
async function sweepSupportMessages() {
  const settings = await SupportSettings.findOne();
  if (!settings?.autoDeleteEnabled) return;

  const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
  await SupportMessage.deleteMany({ createdAt: { $lt: cutoff } });
}

function startSupportCleanupJob() {
  sweepSupportMessages().catch(() => {});
  // A retention sweep doesn't need per-minute precision — once a day (03:00) is plenty.
  cron.schedule("0 3 * * *", () => {
    sweepSupportMessages().catch(() => {});
  });
}

module.exports = { startSupportCleanupJob, sweepSupportMessages };
