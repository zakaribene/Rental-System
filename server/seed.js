require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");

const SUPER_ADMIN_PHONE = process.env.SEED_SUPER_ADMIN_PHONE || "0000000000";
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || "changeme123";

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ phone: SUPER_ADMIN_PHONE });
  if (existing) {
    console.log("Super admin already exists, skipping.");
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  await User.create({
    storeId: null,
    name: "Super Admin",
    phone: SUPER_ADMIN_PHONE,
    passwordHash,
    role: "SUPER_ADMIN"
  });

  console.log(`Super admin created: phone=${SUPER_ADMIN_PHONE} password=${SUPER_ADMIN_PASSWORD}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
