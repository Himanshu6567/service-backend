const express = require("express");
const router = express.Router();

const {
  handleCreateNewService,
  handlegetAllTasks,
  handleGetUserBookings,
  handleAcceptReq,
  handleRejectReq,
} = require("../Controller/ServiceController");

router.route("/NewService").post(handleCreateNewService);
router.route("/allTasks").get(handlegetAllTasks);
router.route("/myBookings").get(handleGetUserBookings);
router.route("/acceptReq").patch(handleAcceptReq);
router.route("/rejectReq/:TaskId").delete(handleRejectReq);

module.exports = router;
