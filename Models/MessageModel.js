const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      require: true,
    },

    message: {
      type: String,
      require: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    senderRole: String,
    recipientRole: String,
    conversationId: String,
    kind: {
      type: String,
      default: "contact",
    },
  },
  { timestamps: true },
);

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
