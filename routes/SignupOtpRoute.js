const express = require("express");
const router = express.Router();
const {
  handleSendSignupOtp,
  handleVerifySignupOtp,
} = require("../Controller/SignupOtpController");

router.route("/send-otp").post(handleSendSignupOtp);
router.route("/verify-otp").post(handleVerifySignupOtp);

module.exports = router;
