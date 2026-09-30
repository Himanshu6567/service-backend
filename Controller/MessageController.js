const Message = require("../Models/MessageModel");
const ServiceProvider = require("../Models/ServiceProviderModel");
const User = require("../Models/UserModel");
const { getUser } = require("../services/auth");

// function to store the user query & message
const handleCreateNewMessage = async (req, res) => {
  try {
    const { fullName, email, message } = req.body;
    console.log(fullName, email, message);
    if (!fullName || !email || !message) {
      return res.status(400).json({ msg: "Data not provided by user" });
    }

    const result = await Message.create({
      name: fullName,
      email: email,
      message: message,
    });

    return res.status(201).json({ msg: "Success" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

const handleCreateChatMessage = async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    const currentUser = getUser(token);
    const {
      providerId: requestedProviderId,
      userId: requestedUserId,
      message,
    } = req.body;

    if (!currentUser || !message?.trim()) {
      return res.status(400).json({ msg: "Chat data is incomplete" });
    }

    const [senderUser, senderProvider] = await Promise.all([
      User.findById(currentUser._id),
      ServiceProvider.findById(currentUser._id),
    ]);
    const userId = senderUser ? senderUser._id : requestedUserId;
    const providerId = senderProvider
      ? senderProvider._id
      : requestedProviderId;
    const [user, provider] = await Promise.all([
      senderUser || User.findById(userId),
      senderProvider || ServiceProvider.findById(providerId),
    ]);
    if (!user || !provider)
      return res.status(404).json({ msg: "Chat participant not found" });

    const conversationId = [user._id.toString(), provider._id.toString()]
      .sort()
      .join(":");
    const senderRole = senderProvider ? "ServiceProvider" : "user";
    const recipientRole = senderProvider ? "user" : "ServiceProvider";
    const sender = senderProvider || senderUser;
    const chatMessage = await Message.create({
      name: sender.name,
      email: sender.email,
      message: message.trim(),
      senderId: sender._id,
      recipientId: senderProvider ? user._id : provider._id,
      senderRole,
      recipientRole,
      conversationId,
      kind: "chat",
    });

    return res.status(201).json(chatMessage);
  } catch (error) {
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};

const handleGetChatMessages = async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    const currentUser = getUser(token);
    if (!currentUser)
      return res.status(401).json({ msg: "Authentication required" });

    const [user, currentProvider] = await Promise.all([
      User.findById(currentUser._id),
      ServiceProvider.findById(currentUser._id),
    ]);
    const userId = currentProvider ? req.query.userId : currentUser._id;
    const providerId = currentProvider
      ? currentProvider._id
      : req.params.ProviderId;
    const [chatUser, provider] = await Promise.all([
      user || User.findById(userId),
      currentProvider || ServiceProvider.findById(providerId),
    ]);
    if (!chatUser || !provider)
      return res.status(401).json({ msg: "Chat participant not found" });

    const conversationId = [chatUser._id.toString(), provider._id.toString()]
      .sort()
      .join(":");
    const messages = await Message.find({ conversationId, kind: "chat" }).sort({
      createdAt: 1,
    });
    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};

const handleGetProviderConversations = async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    const currentUser = getUser(token);
    const provider =
      currentUser && (await ServiceProvider.findById(currentUser._id));
    if (!provider)
      return res.status(401).json({ msg: "Provider authentication required" });

    const messages = await Message.find({
      kind: "chat",
      $or: [{ senderId: provider._id }, { recipientId: provider._id }],
    }).sort({ createdAt: -1 });
    const latestByUser = new Map();
    for (const message of messages) {
      const userId =
        message.senderRole === "user" ? message.senderId : message.recipientId;
      const key = userId.toString();
      if (!latestByUser.has(key)) latestByUser.set(key, message);
    }

    const conversations = await Promise.all(
      [...latestByUser.entries()].map(async ([userId, lastMessage]) => {
        const user = await User.findById(userId).select("name email");
        return {
          participantId: userId,
          participantName: user?.name || lastMessage.name,
          participantEmail: user?.email || lastMessage.email,
          participantImage: "",
          participantCategory: "Customer",
          lastMessage,
        };
      }),
    );
    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};

const handleGetUserConversations = async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    const currentUser = getUser(token);
    const user = currentUser && (await User.findById(currentUser._id));
    if (!user)
      return res.status(401).json({ msg: "User authentication required" });

    const messages = await Message.find({
      kind: "chat",
      $or: [{ senderId: user._id }, { recipientId: user._id }],
    }).sort({ createdAt: -1 });
    const latestByProvider = new Map();
    for (const message of messages) {
      const providerId =
        message.senderRole === "ServiceProvider"
          ? message.senderId
          : message.recipientId;
      const key = providerId.toString();
      if (!latestByProvider.has(key)) latestByProvider.set(key, message);
    }

    const conversations = await Promise.all(
      [...latestByProvider.entries()].map(async ([providerId, lastMessage]) => {
        const provider = await ServiceProvider.findById(providerId).select(
          "name email image jobCategory",
        );
        return {
          participantId: providerId,
          participantName: provider?.name || lastMessage.name,
          participantEmail: provider?.email || lastMessage.email,
          participantImage: provider?.image || "",
          participantCategory: provider?.jobCategory || "Service provider",
          lastMessage,
        };
      }),
    );
    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};

module.exports = {
  handleCreateNewMessage,
  handleCreateChatMessage,
  handleGetChatMessages,
  handleGetProviderConversations,
  handleGetUserConversations,
};
