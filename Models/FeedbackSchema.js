const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  name: String,
  photo: String,
  rating: Number,
  feedback: String,
});

const Feedbacks = mongoose.model("Feedback", FeedbackSchema);
module.exports = Feedbacks;
