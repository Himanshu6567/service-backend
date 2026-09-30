const express = require("express");
const router = express.Router();

const {
  handleCreateNewMessage,
  handleCreateChatMessage,
  handleGetChatMessages,
  handleGetProviderConversations,
  handleGetUserConversations,
} = require("../Controller/MessageController");

router.route("/").post(handleCreateNewMessage);
router.route("/chat").post(handleCreateChatMessage);
router.route("/chat").get(handleGetProviderConversations);
router.route("/myChats").get(handleGetUserConversations);
router.route("/chat/:ProviderId").get(handleGetChatMessages);

module.exports = router;
