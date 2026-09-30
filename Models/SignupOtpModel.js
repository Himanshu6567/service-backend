const mongoose = require("mongoose");

const SignupOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["user", "serviceProvider"], required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    lastSentAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SignupOtp", SignupOtpSchema);
