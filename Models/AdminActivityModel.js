const mongoose = require("mongoose");

const AdminActivitySchema = new mongoose.Schema(
  {
    adminEmail: { type: String, required: true, index: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    targetName: { type: String, default: "" },
    targetEmail: { type: String, default: "" },
    summary: { type: String, required: true },
    requestId: { type: String, default: "" },
  },
  { timestamps: true },
);

AdminActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminActivity", AdminActivitySchema);
