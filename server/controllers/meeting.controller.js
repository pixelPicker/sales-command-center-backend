const Meeting = require('../models/Meeting');
const Action = require('../models/Action');
const { analyzeTranscript } = require('../services/ai.service');
const { parseAction } = require('../services/intentParser');

// Helper function to parse scheduling intent
const parseSchedulingIntent = (intent) => {
  if (!intent) return null;

  // Simple parsing for "Thursday at 4pm" format
  const dayMatch = intent.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  const timeMatch = intent.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  if (!dayMatch || !timeMatch) return null;

  const dayName = dayMatch[1].toLowerCase();
  const hour = parseInt(timeMatch[1]);
  const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

  const dayMap = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
  };

  const targetDay = dayMap[dayName];
  if (targetDay === undefined) return null;

  let hour24 = hour;
  if (ampm === 'pm' && hour !== 12) hour24 += 12;
  if (ampm === 'am' && hour === 12) hour24 = 0;

  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7; // Next week if today or past

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntil);
  targetDate.setHours(hour24, minute, 0, 0);

  return targetDate;
};

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
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const meetings = await Meeting.find(query)
      .populate('clientId', 'name company')
      .sort({ dateTime: 1 })
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
    const aiResponse = await analyzeTranscript(transcript);

    // 3. Update Meeting with Summary and Insights
    meeting.aiSummary = aiResponse.summary || "No summary generated";
    meeting.aiInsights = aiResponse;
    if (aiResponse.participants && aiResponse.participants.length > 0) {
      meeting.participants = aiResponse.participants;
    }
    await meeting.save();

    // 4. Create AI-suggested actions
    const createdAIActions = [];

    // Scheduling action
    if (aiResponse.schedulingIntent) {
      // Check if it's the new object format
      let dateTime = null;
      let title = "Follow-up Meeting";

      if (typeof aiResponse.schedulingIntent === 'object' && aiResponse.schedulingIntent.dateTime) {
        dateTime = new Date(aiResponse.schedulingIntent.dateTime);
        if (aiResponse.schedulingIntent.title) title = aiResponse.schedulingIntent.title;
      } else if (typeof aiResponse.schedulingIntent === 'string') {
        // Legacy string parsing
        dateTime = parseSchedulingIntent(aiResponse.schedulingIntent);
      }

      if (dateTime && !isNaN(dateTime.getTime())) {
        const action = await Action.create({
          meetingId: meeting._id,
          clientId: meeting.clientId,
          dealId: meeting.dealId,
          userId: req.user.id,
          type: "schedule",
          suggestedData: {
            title,
            dateTime,
            contactId: meeting.clientId,
            dealId: meeting.dealId,
          },
          source: "ai",
          status: "pending",
        });
        createdAIActions.push(action);
      }
    }

    // Deal stage update action
    if (meeting.dealId) {
      const Deal = require("../models/Deal");
      const deal = await Deal.findById(meeting.dealId);

      if (deal) {
        let proposedStage = null;

        // 1. Explicit AI Suggestion (High Confidence)
        if (aiResponse.dealStageSuggestion && aiResponse.dealStageSuggestion !== deal.stage) {
          const validStages = ["Lead", "Discovery", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];
          if (validStages.includes(aiResponse.dealStageSuggestion)) {
            proposedStage = aiResponse.dealStageSuggestion;
          }
        }

        // 2. Fallback: Positive Signal Heuristic (if no explicit suggestion)
        if (!proposedStage && aiResponse.dealSignal === "Positive") {
          const stageProgression = {
            Lead: "Discovery",
            Discovery: "Qualified",
            Qualified: "Proposal Sent",
            "Proposal Sent": "Negotiation",
            Negotiation: "Closed Won",
          };
          proposedStage = stageProgression[deal.stage];
        }

        if (proposedStage && proposedStage !== deal.stage) {
          const action = await Action.create({
            meetingId: meeting._id,
            clientId: meeting.clientId,
            dealId: meeting.dealId,
            userId: req.user.id,
            type: "stage_update",
            suggestedData: {
              currentStage: deal.stage,
              proposedStage: proposedStage,
              reason: aiResponse.summary || "Positive deal signals detected."
            },
            source: "ai",
            status: "pending",
          });
          createdAIActions.push(action);
        }
      }
    }

    // 5. Parse Actions and Create Action Documents (existing logic)
    const parsedActions = parseAction(aiResponse);
    const createdActions = [];

    for (const actionData of parsedActions) {
      const action = await Action.create({
        meetingId: meeting._id,
        userId: req.user.id,
        type: actionData.type,
        suggestedData: actionData.suggestedData,
        status: "pending",
      });
      createdActions.push(action);
    }

    console.log(
      "AI Analysis Complete. Actions Created:",
      createdActions.length,
      "AI Actions:",
      createdAIActions.length,
    );

    res.status(200).json({
      success: true,
      data: {
        meeting,
        aiResponse,
        actions: createdActions,
        aiActions: createdAIActions,
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

module.exports = {
  createMeeting,
  getCalendar,
  getMeeting,
  analyzeMeeting,
  transcribeMeetingAudio,
  autoProcessMeeting,
  processLiveAudio,
  getMeetingsByClientId,
};
