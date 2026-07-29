const mongoose = require("mongoose");

const RETRY_DELAY_MS = 5000;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    console.error(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectDB, RETRY_DELAY_MS);
  }
};

module.exports = connectDB;
