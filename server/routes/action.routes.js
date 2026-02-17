const express = require('express');
const router = express.Router();

const {
  confirmAction,
  getActionsByClientId,
} = require("../controllers/action.controller");
const { protect } = require('../middleware/auth.middleware');

router.get("/", protect, getActionsByClientId);
router.post('/confirm', protect, confirmAction);

module.exports = router;
