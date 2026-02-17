const express = require('express');
const router = express.Router();

const {
  createMeeting,
  getCalendar,
  getMeeting,
  analyzeMeeting,
  transcribeMeetingAudio,
  autoProcessMeeting,
  processLiveAudio,
  getMeetingsByClientId,
} = require("../controllers/meeting.controller");
const multer = require('multer');
const { protect } = require("../middleware/auth.middleware");

// Configure Multer
const upload = multer({ dest: 'uploads/' });
const storageMemory = multer.memoryStorage();
const uploadMemory = multer({ storage: storageMemory });

router
  .route("/")
  .get(protect, getMeetingsByClientId)
  .post(protect, createMeeting);
router.get('/calendar', protect, getCalendar);
router.post('/analyze', protect, analyzeMeeting);
router.post('/transcribe', protect, upload.single('audio'), transcribeMeetingAudio);
router.post('/auto-process', protect, upload.single('audio'), autoProcessMeeting);
router.post('/live-audio', protect, uploadMemory.single('audio'), processLiveAudio);
router.route("/:id").get(protect, getMeeting);

module.exports = router;
