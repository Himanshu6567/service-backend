const express = require("express");
const router = express.Router();

const {
  handlegetallServiceProvider,
  handleLogInServiceProvider,
  handleCreateNewServiceProvider,
  handleVerifyToken,
} = require("../Controller/ServiceProviderController");

router.route("/createNewServiceProvider").post(handleCreateNewServiceProvider);
router.route("/logInServiceProvider").post(handleLogInServiceProvider);
router.route("/verify").post(handleVerifyToken);
router.route("/getAllProvider").get(handlegetallServiceProvider);



module.exports = router;
