const express = require('express');
const router = express.Router();
const { askQuestion } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/ask', protect, askQuestion);

module.exports = router;
