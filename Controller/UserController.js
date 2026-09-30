const bcrypt = require("bcryptjs");
const User = require("../Models/UserModel");
const SignupOtp = require("../Models/SignupOtpModel");
const { setUser } = require("../services/auth");

const handleCreateNewUser = async (req, res) => {
  const { name, email, role, mobile, password } = req.body || {};
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!name || !normalizedEmail || !role || !mobile || !password) {
    return res.status(400).json({ mgs: "data not send by user" });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ mgs: "user alredy Exist" });
  }

  const verifiedOtp = await SignupOtp.findOne({
    email: normalizedEmail,
    role: "user",
    verifiedAt: { $ne: null },
    expiresAt: { $gt: new Date() },
  });

  if (
    !verifiedOtp ||
    !(await bcrypt.compare(password, verifiedOtp.passwordHash))
  ) {
    return res.status(403).json({
      msg: "Verify your email with the signup code before creating your account.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await User.create({
    name: name,
    email: normalizedEmail,
    role: role,
    mobile: mobile,
    password: hashedPassword,
  });

  await SignupOtp.deleteOne({ _id: verifiedOtp._id });
  return res.status(201).json({ mgs: "success", id: result._id });
};

// user login
const handleLogInUser = async (req, res) => {
  console.log(req.body);
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    console.log("invalid user");
    return res.status(401).json("invalid email or password");
  }
  //verify password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ msg: "Invalid email or password" });
  }

  console.log("user verified");
  //generate token
  const token = setUser(user);
  console.log(token);

  return res
    .status(201)
    .cookie("token", token, {
      maxAge: 8 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    .json({ role: "user", useID: user._id });
};

module.exports = {
  handleCreateNewUser,
  handleLogInUser,
};
