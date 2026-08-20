const mongoose = require("mongoose");

// Single-document collection — global retention policy for support chat
// messages, controlled only by Super Admin. Off by default so nothing is
// silently deleted until an admin explicitly opts in.
const supportSettingsSchema = new mongoose.Schema({
  autoDeleteEnabled: { type: Boolean, default: false },
  retentionDays: { type: Number, default: 30 }
});

module.exports = mongoose.model("SupportSettings", supportSettingsSchema);
