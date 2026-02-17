const express = require("express");
const {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  askDeal,
} = require("../controllers/deal.controller");

const router = express.Router();

const { protect } = require("../middleware/auth.middleware");

router.route("/").get(protect, getDeals).post(protect, createDeal);

router
  .route("/:id")
  .get(protect, getDeal)
  .put(protect, updateDeal)
  .delete(protect, deleteDeal);

router.post("/:id/ask", protect, askDeal);

module.exports = router;
