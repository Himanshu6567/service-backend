const express = require("express");
const router = express.Router();

const {
  handleGetAllInntialService,
} = require("../Controller/ServiceInitialContraller");

router.route("/").get(handleGetAllInntialService);

module.exports = router;
