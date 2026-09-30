const express = require("express");
const router = express.Router();

const { handleGetFeedbacks } = require("../Controller/FeedbackController");

router.route("/").get(handleGetFeedbacks);

module.exports = router;
