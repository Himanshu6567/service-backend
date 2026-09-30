const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { getUser } = require("../services/auth");
const User = require("../Models/UserModel");
const ServiceProvider = require("../Models/ServiceProviderModel");
const Service = require("../Models/ServiceModel");
const Message = require("../Models/MessageModel");
const ServiceInitial = require("../Models/ServiceInitialSchema");
const Feedbacks = require("../Models/FeedbackSchema");

const ADMIN_EMAIL = "Admin@gmail.com";
const ADMIN_PASSWORD = "123456789";

function safeEqual(value, expected) {
  const valueBuffer = Buffer.from(String(value || ""));
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

const handleAdminLogin = async (req, res) => {
  const { email, password } = req.body || {};
  if (!safeEqual(email, ADMIN_EMAIL) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ msg: "Invalid admin credentials" });
  }

  const secret = process.env.jwt_secretKay;
  if (!secret)
    return res
      .status(500)
      .json({ msg: "Admin authentication is not configured" });

  const token = jwt.sign({ email: ADMIN_EMAIL, role: "admin" }, secret, {
    expiresIn: "8h",
  });
  return res
    .status(200)
    .cookie("token", token, { maxAge: 8 * 60 * 60 })
    .json({ role: "admin" });
};

const handleGetSession = async (req, res) => {
  const token = req.header("Authorization")?.split(" ")[1];
  const session = getUser(token);
  if (!session) return res.status(401).json({ msg: "Not authenticated" });
  if (session.role === "admin") return res.status(200).json({ role: "admin" });

  const account =
    session.role === "ServiceProvider" || session.role === "serviceProvider"
      ? await ServiceProvider.findOne({ email: session.email })
          .select("_id name email role")
          .lean()
      : await User.findOne({ email: session.email })
          .select("_id name email role")
          .lean();
  if (!account) return res.status(401).json({ msg: "Account not found" });
  const role =
    account.role === "serviceProvider" ? "ServiceProvider" : account.role;
  return res
    .status(200)
    .json({ role, userId: account._id, user: { ...account, role } });
};

const handleLogout = async (req, res) =>
  res
    .status(200)
    .cookie("token", "", { maxAge: 0 })
    .json({ msg: "Logged out" });

const handleGetAdminDashboard = async (req, res) => {
  const token = req.header("Authorization")?.split(" ")[1];
  const admin = getUser(token);
  if (!admin || admin.role !== "admin" || admin.email !== ADMIN_EMAIL) {
    return res.status(401).json({ msg: "Admin authentication required" });
  }

  try {
    const [users, providers, requests, messages, serviceCategories, feedback] =
      await Promise.all([
        User.find().select("-password").sort({ createdAt: -1 }).lean(),
        ServiceProvider.find()
          .select("-password")
          .sort({ createdAt: -1 })
          .lean(),
        Service.find().sort({ createdAt: -1 }).lean(),
        Message.find().sort({ createdAt: -1 }).lean(),
        ServiceInitial.find().sort({ title: 1 }).lean(),
        Feedbacks.find().sort({ _id: -1 }).lean(),
      ]);

    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const providersById = new Map(
      providers.map((provider) => [provider._id.toString(), provider]),
    );
    const enrichedRequests = requests.map((request) => ({
      ...request,
      customer: usersById.get(request.userId.toString()) || null,
      provider: providersById.get(request.serviceProviderId.toString()) || null,
    }));

    return res.status(200).json({
      stats: {
        users: users.length,
        providers: providers.length,
        requests: requests.length,
        newLeads: requests.filter((request) => request.status === "ReqPending")
          .length,
        activeJobs: requests.filter((request) => request.status === "Pending")
          .length,
        completedJobs: requests.filter(
          (request) => request.status === "Completed",
        ).length,
        messages: messages.length,
        chatMessages: messages.filter((message) => message.kind === "chat")
          .length,
      },
      users,
      providers,
      requests: enrichedRequests,
      messages,
      serviceCategories,
      feedback,
    });
  } catch (error) {
    console.error("Unable to load admin dashboard", error);
    return res.status(500).json({ msg: "Unable to load admin dashboard" });
  }
};

const requireAdmin = (req) => {
  const token = req.header("Authorization")?.split(" ")[1];
  const admin = getUser(token);
  if (!admin || admin.role !== "admin" || admin.email !== ADMIN_EMAIL) {
    return null;
  }
  return admin;
};

const handleDeleteUser = async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ msg: "Admin authentication required" });
  }

  const userId = req.params?.userId || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ msg: "User id is required" });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ msg: "User not found" });
    }
    return res.status(200).json({ msg: "User deleted successfully" });
  } catch (error) {
    console.error("Unable to delete user", error);
    return res.status(500).json({ msg: "Unable to delete user" });
  }
};

const handleDeleteProvider = async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ msg: "Admin authentication required" });
  }

  const providerId = req.params?.providerId || req.body?.providerId;
  if (!providerId) {
    return res.status(400).json({ msg: "Provider id is required" });
  }

  try {
    const deletedProvider = await ServiceProvider.findByIdAndDelete(providerId);
    if (!deletedProvider) {
      return res.status(404).json({ msg: "Service provider not found" });
    }
    return res
      .status(200)
      .json({ msg: "Service provider deleted successfully" });
  } catch (error) {
    console.error("Unable to delete service provider", error);
    return res.status(500).json({ msg: "Unable to delete service provider" });
  }
};

module.exports = {
  handleAdminLogin,
  handleGetSession,
  handleLogout,
  handleGetAdminDashboard,
  handleDeleteUser,
  handleDeleteProvider,
};
