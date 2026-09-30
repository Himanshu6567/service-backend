const express = require("express");
const router = express.Router();

const {
  handleCreateNewUser,
  handleLogInUser,
} = require("../Controller/UserController");

router.route("/createNewUser").post(handleCreateNewUser);
router.route("/loginUser").post(handleLogInUser);

module.exports = router;
