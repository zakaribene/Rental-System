const cron = require("node-cron");
const RentalTransaction = require("../models/RentalTransaction");

// Every minute: any active rental whose expected return date/time has
// passed becomes "overdue" — precise to the minute since expectedReturnDate
// now stores a full datetime, not just a calendar date.
async function markOverdueRentals() {
  await RentalTransaction.updateMany(
    { status: "active", expectedReturnDate: { $lt: new Date() } },
    { $set: { status: "overdue" } }
  );
}

function startOverdueJob() {
  markOverdueRentals().catch(() => {});
  cron.schedule("* * * * *", () => {
    markOverdueRentals().catch(() => {});
  });
}

module.exports = { startOverdueJob, markOverdueRentals };
