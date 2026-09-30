const ServiceProvider = require("../Models/ServiceProviderModel");
const User = require("../Models/UserModel");
const bcrypt = require("bcryptjs");
const cloudinary = require("../cloudinary-config");
const multer = require("multer");
const { setUser, getUser } = require("../services/auth");
const { default: axios } = require("axios");
const FormData = require("form-data");
const SignupOtp = require("../Models/SignupOtpModel");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const handleCreateNewServiceProvider = async (req, res) => {
  console.log("handleCreateNewServiceProvider called");
  console.log(req.body);

  try {
    const {
      name,
      email,
      role,
      mobile,
      password,
      DoB,
      aboutYou,
      gender,
      jobCategory,
      location,
      salary,
      workDescription,
    } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (
      !name ||
      !email ||
      !role ||
      !mobile ||
      !password ||
      !DoB ||
      !aboutYou ||
      !gender ||
      !jobCategory ||
      !location ||
      !salary ||
      !workDescription
    ) {
      return res.status(400).json({ msg: "Incomplete data provided" });
    }

    if (!req.file) {
      console.log("Image is required");
      return res.status(400).json({ msg: "Image is required" });
    }

    // Check if user already exists in ServiceProvider or User collection
    const existingUser =
      (await ServiceProvider.findOne({ email: normalizedEmail })) ||
      (await User.findOne({ email: normalizedEmail }));
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists" });
    }

    const verifiedOtp = await SignupOtp.findOne({
      email: normalizedEmail,
      role: "serviceProvider",
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });
    if (
      !verifiedOtp ||
      !(await bcrypt.compare(password, verifiedOtp.passwordHash))
    ) {
      return res.status(403).json({
        msg: "Verify this email with the signup code before continuing",
      });
    }

    console.log("Uploading image to Cloudinary...");

    const imagePath = req.file.path;
    const cloudinaryResult = await cloudinary.uploader.upload(imagePath, {
      folder: "service_images",
    });

    const { secure_url } = cloudinaryResult; //  image url

    console.log("Creating new service provider...");
    const newUser = await ServiceProvider.create({
      name,
      email: normalizedEmail,
      role,
      mobile,
      password: verifiedOtp.passwordHash,
      DoB,
      aboutYou,
      gender,
      image: secure_url,
      jobCategory,
      location,
      salary,
      workDescription,
    });

    await SignupOtp.deleteOne({ _id: verifiedOtp._id });

    return res.status(201).json({ msg: "Success", id: newUser._id });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// //////////////////////////
// login service provider
const handleLogInServiceProvider = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(401).json({ msg: "Invalid email or password" });
  }

  const user = await ServiceProvider.findOne({ email });
  if (!user || !user.password) {
    return res.status(401).json({ msg: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password); // compare password
  if (!isMatch) {
    return res.status(401).json({ msg: "Invalid email or password" });
  }

  const token = setUser(user); // generate token
  return res
    .status(201)
    .cookie("token", token, { maxAge: 8 * 60 * 60 })
    .json({ role: "ServiceProvider" });
};

// verify the  service provider
const handleVerifyToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"
  // console.log("Token:", token);
  const user = getUser(token);

  if (user == null) {
    return res.status(400).json({ mgs: "token not verify" });
  }
  const us = user.email;
  const Provider = await ServiceProvider.findOne({ email: us });

  // return the whole user object
  return res.status(200).json({ user: Provider });
};

// get the list of all service provider
const handlegetallServiceProvider = async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1]; // split token from header
    const usr = getUser(token); // verify token
    const meUser = await User.findOne({ email: usr.email });
    // return  the user and service provider object
    const alluser = await ServiceProvider.find({});
    res.status(200).json({ alluser: alluser, me: meUser });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

module.exports = {
  handlegetallServiceProvider,
  handleCreateNewServiceProvider: [
    upload.single("image"),
    handleCreateNewServiceProvider,
  ],
  handleLogInServiceProvider,
  handleVerifyToken,
};
