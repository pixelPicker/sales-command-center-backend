const Meeting = require('../models/Meeting');
const Action = require('../models/Action');
const { analyzeTranscript } = require('../services/ai.service');
const { parseAction, parseSchedulingIntent } = require('../services/intentParser');


// @desc    Create a meeting (manual)
// @route   POST /api/meeting
// @access  Public
const createMeeting = async (req, res, next) => {
  try {
    const meetingData = { ...req.body, userId: req.user.id };

    // Sanitize empty strings for ObjectIds
    if (meetingData.dealId === "") {
      delete meetingData.dealId;
    }

    const meeting = await Meeting.create(meetingData);
    res.status(201).json({
      success: true,
      data: meeting
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get meetings by clientId
// @route   GET /api/meeting?clientId=...
// @access  Public
const getMeetingsByClientId = async (req, res, next) => {
  try {
    const { clientId, dealId } = req.query;
    let filter = { userId: req.user.id };

    if (dealId) {
      filter.dealId = dealId;
    } else if (clientId) {
      filter.clientId = clientId;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Please provide clientId or dealId" });
    }

    const meetings = await Meeting.find(filter)
      .populate("clientId", "name company")
      .sort({ dateTime: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all meetings (calendar view)
// @route   GET /api/meeting/calendar
// @access  Public
const getCalendar = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const timeframe = req.query.timeframe || 'all'; // 'upcoming', 'past', or 'all'
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (timeframe === 'upcoming') {
      query.dateTime = { $gte: new Date() };
    } else if (timeframe === 'past') {
      query.dateTime = { $lt: new Date() };
    }

    // Sort: 
    // - Upcoming: nearest first (asc)
    // - Past: most recent first (desc)
    // - All: nearest first (asc) - but maybe better to separate
    const sort = timeframe === 'past' ? { dateTime: -1 } : { dateTime: 1 };

    const meetings = await Meeting.find(query)
      .populate('clientId', 'name company')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Meeting.countDocuments(query);

    res.status(200).json({
      success: true,
      count: meetings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: meetings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single meeting
// @route   GET /api/meeting/:id
// @access  Private
const getMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('clientId', 'name company')
      .populate('dealId', 'title stage');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Analyze meeting transcript
// @route   POST /api/meeting/analyze
// @access  Public
const analyzeMeeting = async (req, res, next) => {
  try {
    const { meetingId, transcript } = req.body;

    if (!meetingId || !transcript) {
      return res.status(400).json({
        success: false,
        message: "Please provide meetingId and transcript",
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    // 1. Save transcript
    meeting.transcript = transcript;

    // 2. Call AI Service
    const aiResponse = await analyzeTranscript(transcript, new Date().toString());

    // 3. Update Meeting with Summary and Insights
    // Handle new schema: aiResponse.summary is now { text: string, confidence: number }
    meeting.aiSummary = aiResponse.summary?.text || aiResponse.summary || "No summary generated";
    meeting.aiInsights = aiResponse;

    // Handle stakeholders -> participants
    if (aiResponse.stakeholders && aiResponse.stakeholders.length > 0) {
      meeting.participants = aiResponse.stakeholders.map(s => s.name);
    } else if (aiResponse.participants && aiResponse.participants.length > 0) {
      meeting.participants = aiResponse.participants;
    }

    await meeting.save();

    // 4. Parse Actions and Create Action Documents
    const parsedActions = parseAction(aiResponse);
    const createdActions = [];

    for (const actionData of parsedActions) {
      const action = await Action.create({
        meetingId: meeting._id,
        clientId: meeting.clientId,
        dealId: meeting.dealId,
        userId: req.user.id,
        type: actionData.type,
        suggestedData: actionData.suggestedData,
        source: "ai",
        status: "pending",
      });
      createdActions.push(action);
    }

    console.log(
      "AI Analysis Complete. Actions Created:",
      createdActions.length
    );

    res.status(200).json({
      success: true,
      data: {
        meeting,
        aiResponse,
        actions: createdActions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Transcribe audio file
// @route   POST /api/meeting/transcribe
// @access  Public
const transcribeMeetingAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an audio file' });
    }

    const filePath = req.file.path;
    const { transcribeAudio } = require('../services/transcription.service');
    const fs = require('fs');

    // Call Transcription Service
    const transcript = await transcribeAudio(filePath);

    // Cleanup: Delete temp file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      transcript
    });

  } catch (err) {
    // Attempt cleanup if error occurred and file exists
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
    next(err);
  }
};

// @desc    Auto-process audio (Transcribe -> Analyze -> Execute)
// @route   POST /api/meeting/auto-process
// @access  Public
const autoProcessMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide meetingId" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload an audio file" });
    }

    const filePath = req.file.path;
    const {
      autoProcessMeetingAudio,
    } = require("../services/autoWorkflow.service");
    const fs = require("fs");

    // Execute Workflow
    const results = await autoProcessMeetingAudio(meetingId, filePath);

    // Cleanup
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    // Attempt cleanup if error occurred and file exists
    if (req.file && req.file.path) {
      const fs = require("fs");
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
    next(err);
  }
};

// @desc    Process live audio (Buffer -> Temp File -> Process)
// @route   POST /api/meeting/live-audio
// @access  Public
const processLiveAudio = async (req, res, next) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide meetingId" });
    }

    // Check for file (multipart) AND buffer logic if using memory storage
    // If multer memoryStorage is used, req.file.buffer is available
    // If streams are sent as raw body, we might need req.body (but multer handles multipart better for frontend)

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No audio data received' });
    }

    const { createTempFile, deleteTempFile } = require('../utils/tempFile');
    const { autoProcessMeetingAudio } = require('../services/autoWorkflow.service');

    // Create temp file from buffer
    // Default to webm as that's common for MediaRecorder
    const tempFilePath = createTempFile(req.file.buffer, 'webm');

    try {
      // Execute Workflow with the temp file
      const results = await autoProcessMeetingAudio(meetingId, tempFilePath);

      res.status(200).json({
        success: true,
        data: results
      });
    } finally {
      // Cleanup
      deleteTempFile(tempFilePath);
    }

  } catch (err) {
    next(err);
  }
};

// @desc    Update meeting
// @route   PUT /api/meeting/:id
// @access  Private
const updateMeeting = async (req, res, next) => {
  try {
    let meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.id });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMeeting,
  getCalendar,
  getMeeting,
  updateMeeting,
  analyzeMeeting,
  transcribeMeetingAudio,
  autoProcessMeeting,
  processLiveAudio,
  getMeetingsByClientId,
};
