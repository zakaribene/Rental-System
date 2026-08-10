const cron = require("node-cron");
const ActivityLog = require("../models/ActivityLog");
const ActivityLogSettings = require("../models/ActivityLogSettings");

// Off by default (see ActivityLogSettings) — nothing is deleted until a
// Super Admin explicitly opts in via /admin/activity-logs/settings.
async function sweepActivityLogs() {
  const settings = await ActivityLogSettings.findOne();
  if (!settings?.autoDeleteEnabled) return;

  const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
  await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
}

function startActivityLogCleanupJob() {
  sweepActivityLogs().catch(() => {});
  // A retention sweep doesn't need per-minute precision like the overdue/subscription
  // jobs — once a day (03:00) is plenty.
  cron.schedule("0 3 * * *", () => {
    sweepActivityLogs().catch(() => {});
  });
}

module.exports = { startActivityLogCleanupJob, sweepActivityLogs };
