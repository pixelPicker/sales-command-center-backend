const express = require('express');
const router = express.Router();
const { getMomentum, getStreaks, getCoachInsight } = require('../controllers/momentum.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getMomentum);
router.get('/streaks', protect, getStreaks);
router.get('/coach/:dealId', protect, getCoachInsight);

module.exports = router;
