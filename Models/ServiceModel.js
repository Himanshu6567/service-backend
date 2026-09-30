const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the normal user
      required: true,
    },
    serviceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider", // Reference to the service provider
      required: true,
    },
    serviceTitle: {
      type: String,
      required: true,
    },
    serviceDescription: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["ReqPending", "Pending", "Accepted", "Completed", "Rejected"],
      default: "ReqPending",
    },
  },
  { timestamps: true },
);

const Service = mongoose.model("Services", ServiceRequestSchema);

module.exports = Service;
