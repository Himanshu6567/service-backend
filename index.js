// import dependencies
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { randomUUID } = require("node:crypto");
require("dotenv").config();

// import routes
const userRoutes = require("./routes/user");
const serviceProviderRoutes = require("./routes/serviceProvider");
const SignupOtpRoutes = require("./routes/SignupOtpRoute");
const MessageRoutes = require("./routes/MessageRoute");
const ServiceRoutes = require("./routes/ServicesRoute");
const ServiceInitialRoute = require("./routes/ServiceInitialRoute");
const FeedbacksRoute = require("./routes/feedbacksRoute");
const { getMailConfiguration } = require("./services/mailer");
const {
  handleAdminLogin,
  handleGetSession,
  handleLogout,
  handleGetAdminDashboard,
  handleDeleteUser,
  handleDeleteProvider,
} = require("./Controller/AdminController");

const { initializeSocket } = require("./socket");

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app); //create server
const io = initializeSocket(server); //start io server

//middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use((req, res, next) => {
  req.requestId = req.get("x-request-id") || randomUUID();
  res.setHeader("x-request-id", req.requestId);
  const startedAt = Date.now();
  res.on("finish", () => {
    console.info(
      "[http] request completed",
      JSON.stringify({
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });
  next();
});

let databaseConnection;
async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return;
  if (!databaseConnection) {
    databaseConnection = mongoose
      .connect(process.env.mongooseConnectionString, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then(() => {
        console.info("[database] MongoDB connection established");
      })
      .catch((error) => {
        databaseConnection = null;
        throw error;
      });
  }
  return databaseConnection;
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
    mail: getMailConfiguration(),
  });
});

app.use(async (req, res, next) => {
  if (req.path === "/admin/login" || req.path === "/auth/logout") return next();
  try {
    await ensureDatabaseConnection();
    next();
  } catch (error) {
    console.error(
      "[database] API request blocked because MongoDB is unavailable",
      JSON.stringify({
        requestId: req.requestId,
        path: req.path,
        name: error.name,
        code: error.code,
        error: error.message,
      }),
    );
    return res.status(503).json({
      msg: "The database is unavailable. Please try again shortly.",
      requestId: req.requestId,
    });
  }
});

// define routes
app.use("/user", userRoutes);
app.use("/signup", SignupOtpRoutes);
app.use("/serviceProvider", serviceProviderRoutes);
app.use("/sendMessage", MessageRoutes);
app.use("/services", ServiceRoutes);
app.use("/initialService", ServiceInitialRoute);
app.use("/Feedbacks", FeedbacksRoute);
app.post("/admin/login", handleAdminLogin);
app.get("/auth/session", handleGetSession);
app.post("/auth/logout", handleLogout);
app.get("/admin/dashboard", handleGetAdminDashboard);
app.delete("/admin/delete-user/:userId", handleDeleteUser);
app.delete("/admin/delete-provider/:providerId", handleDeleteProvider);

// servier run
server.listen(PORT, () => {
  console.info(
    "[server] Express API listening",
    JSON.stringify({ port: PORT, mail: getMailConfiguration() }),
  );
});
