// import dependencies
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

// import routes
const userRoutes = require("./routes/user");
const serviceProviderRoutes = require("./routes/serviceProvider");
const SignupOtpRoutes = require("./routes/SignupOtpRoute");
const MessageRoutes = require("./routes/MessageRoute");
const ServiceRoutes = require("./routes/ServicesRoute");
const ServiceInitialRoute = require("./routes/ServiceInitialRoute");
const FeedbacksRoute = require("./routes/feedbacksRoute");

const { initializeSocket } = require("./socket");

const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app); //create server
const io = initializeSocket(server); //start io server

//middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// database connection (mongoDB)
mongoose
  .connect(process.env.mongooseConnectionString)
  .then(() => {
    console.log("mongoDB Connected succesfull");
  })
  .catch((err) => {
    console.log("enable to connect with MongoDB dataBase");
  });

// define routes
app.use("/user", userRoutes);
app.use("/signup", SignupOtpRoutes);
app.use("/serviceProvider", serviceProviderRoutes);
app.use("/sendMessage", MessageRoutes);
app.use("/services", ServiceRoutes);
app.use("/initialService", ServiceInitialRoute);
app.use("/Feedbacks", FeedbacksRoute);

// servier run
server.listen(PORT, () => {
  console.log("server is running on", PORT);
});
