const mongoose = require("mongoose");

const serviceInitialSchema = new mongoose.Schema({
  photo: String,
  title: String,
  discription: String,
});

const ServiceInitial = mongoose.model("ServiceInitial", serviceInitialSchema);
module.exports = ServiceInitial;
