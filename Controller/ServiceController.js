const Service = require("../Models/ServiceModel");
const { setUser, getUser } = require("../services/auth");
const ServiceProvider = require("../Models/ServiceProviderModel");
const User = require("../Models/UserModel");
require("dotenv").config();
const { sendHtmlMail, smtpConfigured } = require("../services/mailer");

const {
  NewRequestMailFormet,
  RequestAcceptMailFormet,
  RequestRejectMailFormet,
} = require("../services/MailFormet");

// crete new service
const handleCreateNewService = async (req, res) => {
  console.log("handleCreateNewService calls");
  const body = req.body;

  const { title, description, date, time, ProviderID } = req.body;

  if (!body || !title || !description || !date || !time || !ProviderID) {
    return res.status(400).json({ msg: "Booking details are incomplete" });
  }

  const bookingTime = new Date(`${date}T${time}`);
  if (
    Number.isNaN(bookingTime.getTime()) ||
    bookingTime.getTime() <= Date.now()
  ) {
    return res
      .status(400)
      .json({ msg: "Choose a future booking date and time" });
  }

  const token = req.header("Authorization")?.split(" ")[1];
  const usr = getUser(token);
  if (!usr) return res.status(401).json({ msg: "Invalid token" });

  const userId = usr._id;
  const provider = await ServiceProvider.findById(ProviderID);
  const user = await User.findById(userId);
  if (!provider || !user) {
    return res.status(404).json({ msg: "User or service provider not found" });
  }

  const { name: providerName, email: providerEmail } = provider;
  const { name: userName, email: userEmail } = user;

  const result = await Service.create({
    userId: userId,
    serviceProviderId: ProviderID, // assign with service provider
    serviceTitle: title,
    serviceDescription: description,
    date: date,
    time: time,
    images: [],
  });

  const emaildata = NewRequestMailFormet({
    // generate mail formet
    providerName,
    userName,
    title,
    date,
    time,
    userEmail,
    description,
  });

  if (smtpConfigured) {
    try {
      await sendHtmlMail({
        to: providerEmail,
        subject: "new request from urbanAssist",
        html: emaildata,
      });
    } catch (error) {
      console.log("enable to send mail", error);
    }
  }

  return res.status(201).json({ mgs: "success", id: result._id, task: result });
};

// get all tasks which are assing to any specific provider
const handlegetAllTasks = async (req, res) => {
  try {
    console.log("handlegetAllTasks call");
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const usr = getUser(token);
    if (!usr) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const providerId = usr._id;
    const allTasks = await Service.find({ serviceProviderId: providerId }); // search tasks

    if (allTasks.length === 0) {
      return res.status(202).json({ msg: "No data found" });
    }

    return res.status(200).json(allTasks);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const handleGetUserBookings = async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    const currentUser = getUser(token);
    if (!currentUser) return res.status(401).json({ msg: "Invalid token" });

    const bookings = await Service.find({ userId: currentUser._id })
      .sort({ createdAt: -1 })
      .lean();
    const providerIds = [
      ...new Set(
        bookings.map((booking) => booking.serviceProviderId.toString()),
      ),
    ];
    const providers = await ServiceProvider.find({ _id: { $in: providerIds } })
      .select("name email mobile image jobCategory salary rating aboutYou")
      .lean();
    const providersById = new Map(
      providers.map((provider) => [provider._id.toString(), provider]),
    );

    return res.status(200).json(
      bookings.map((booking) => ({
        ...booking,
        provider:
          providersById.get(booking.serviceProviderId.toString()) || null,
      })),
    );
  } catch (error) {
    console.error("Unable to get user bookings", error);
    return res.status(500).json({ msg: "Unable to load bookings" });
  }
};

// accept the request
const handleAcceptReq = async (req, res) => {
  try {
    console.log("handleAcceptReq");

    const Tid = req.body.TaskId; // Extract TaskId from request body

    if (!Tid) {
      return res.status(400).json({ msg: "TaskId is required" });
    }

    // Update only the 'status' field to "pending"
    const task = await Service.findByIdAndUpdate(
      Tid,
      { status: "Pending" }, // Update only the status field
      { new: true }, // Returns the updated document
    );

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }
    const userIdStr = task.userId.toString();
    const serviceProviderIdStr = task.serviceProviderId.toString();

    const { serviceTitle, date, time } = task;
    const user = await User.findById(userIdStr);
    const provider = await ServiceProvider.findById(serviceProviderIdStr);

    const { name: providerName, email: providerEmail } = provider;
    const { name: userName, email: userEmail } = user;

    console.log(task); // Log the updated task
    const emailDetails = RequestAcceptMailFormet({
      userName,
      serviceTitle,
      providerName,
      date,
      time,
      providerEmail,
    });

    if (smtpConfigured) {
      try {
        await sendHtmlMail({
          to: userEmail,
          subject: "Your request has been accept",
          html: emailDetails,
        });
      } catch (error) {
        console.log("enable to send mail", error);
      }
    }

    return res.status(200).json({ msg: "Update success", task });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

// for delete or reject the request
const handleRejectReq = async (req, res) => {
  try {
    console.log("handleRejectReq");

    const { TaskId } = req.params; // Fetch TaskId from URL params
    console.log(TaskId);

    if (!TaskId) {
      console.log("id not found");
      return res.status(400).json({ msg: "TaskId is required" });
    }

    // Reject the request (delete the task)
    const task = await Service.findByIdAndDelete(TaskId);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    const userIdStr = task.userId.toString();
    const serviceProviderIdStr = task.serviceProviderId.toString();
    const { serviceTitle } = task;
    const user = await User.findById(userIdStr);
    const provider = await ServiceProvider.findById(serviceProviderIdStr);

    const { name: providerName } = provider;
    const { name: userName, email: userEmail } = user;

    const emailDetails = RequestRejectMailFormet({
      // email formet
      userName,
      serviceTitle,
      providerName,
    });

    if (smtpConfigured) {
      try {
        await sendHtmlMail({
          to: userEmail,
          subject: "Request Rejected",
          html: emailDetails,
        });
      } catch (error) {
        console.log("enable to send mail", error);
      }
    }

    return res.status(200).json({ msg: "Task rejected successfully", task });
  } catch (error) {
    console.error("Error rejecting task:", error.message);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

module.exports = {
  handleCreateNewService,
  handlegetAllTasks,
  handleGetUserBookings,
  handleAcceptReq,
  handleRejectReq,
};
