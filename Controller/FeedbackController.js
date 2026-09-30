const Feedbacks = require("../Models/FeedbackSchema");

//function to fetch the user feedback
const handleGetFeedbacks = async (req, res) => {
  console.log("handleGetFeedbacks calls");
  try {
    const feedbacks = await Feedbacks.find({});

    return res.status(201).json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  handleGetFeedbacks,
};
