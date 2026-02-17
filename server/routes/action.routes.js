const express = require('express');
const router = express.Router();

const {
  confirmAction,
  getActionsByClientId,
  deleteAction,
} = require("../controllers/action.controller");
const { protect } = require('../middleware/auth.middleware');

router.get("/", protect, getActionsByClientId);
router.post('/confirm', protect, confirmAction);
router.delete("/:id", protect, deleteAction);

module.exports = router;
