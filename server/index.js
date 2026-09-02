require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const storeRoutes = require("./routes/storeRoutes");
const userRoutes = require("./routes/userRoutes");
const customerRoutes = require("./routes/customerRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const saleRoutes = require("./routes/saleRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const transferRoutes = require("./routes/transferRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const supportRoutes = require("./routes/supportRoutes");
const myStoreRoutes = require("./routes/myStoreRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const adminActivityLogRoutes = require("./routes/adminActivityLogRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const { startOverdueJob } = require("./jobs/overdueJob");
const { startSubscriptionJob } = require("./jobs/subscriptionJob");
const { startActivityLogCleanupJob } = require("./jobs/activityLogCleanupJob");
const { startSupportCleanupJob } = require("./jobs/supportCleanupJob");

connectDB();
startOverdueJob();
startSubscriptionJob();
startActivityLogCleanupJob();
startSupportCleanupJob();

const app = express();

// CLIENT_ORIGIN supports a comma-separated list, so multiple deployed
// frontends (e.g. a Render static site and a Vercel deployment) can hit this
// backend at the same time without switching the env var back and forth.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

if (process.env.NODE_ENV !== "production") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/my-store", myStoreRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/admin/activity-logs", adminActivityLogRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api", paymentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
