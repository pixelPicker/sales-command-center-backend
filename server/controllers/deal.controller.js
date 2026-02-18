const Deal = require("../models/Deal");
const { askDealQuestion } = require("../services/ai.service");

// @desc    Ask question about a deal
// @route   POST /api/deal/:id/ask
// @access  Private
const askDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate("clientId");
    if (!deal) {
      return res
        .status(404)
        .json({ success: false, message: "Deal not found" });
    }

    const pastMeetings = await require("../models/Meeting")
      .find({
        dealId: req.params.id,
        userId: req.user.id,
        dateTime: { $lt: new Date() } // Past meetings only
      })
      .sort({ dateTime: -1 }) // Most recent past meetings
      .limit(3);

    const actions = await require("../models/Action")
      .find({ dealId: req.params.id, userId: req.user.id })
      .sort({ createdAt: -1 });

    const context = `
[DEAL OVERVIEW]
- Title: ${deal.title}
- Stage: ${deal.stage}
- Forecast Value: $${deal.value.toLocaleString()}
- Status: ${deal.status}
- Last Activity Date: ${deal.lastActivity ? new Date(deal.lastActivity).toLocaleDateString() : "No recent activity logged"}

[CLIENT INFORMATION]
- Contact: ${deal.clientId.name}
- Organization: ${deal.clientId.company}
- Contact Details: ${deal.clientId.email} | ${deal.clientId.phone || "N/A"}
- Client Historical Sentiment: ${deal.clientId.sentiment || "Neutral"}

[RECENT INTERACTION HISTORY]
${pastMeetings.length > 0 ? pastMeetings.map((m) => `- Meeting: "${m.title}" (${new Date(m.dateTime).toLocaleDateString()})\n  Executive Summary: ${m.aiSummary || "Summary pending analysis."}`).join("\n") : "No recorded meeting history for this deal."}

[OUTSTANDING ACTION ITEMS]
${actions.length > 0 ? actions.map((a) => `- [${a.status.toUpperCase()}] ${a.title}: ${a.description} (Priority: ${a.priority})`).join("\n") : "No pending actions found."}
        `;

    const { question } = req.body;
    if (!question) {
      return res
        .status(400)
        .json({ success: false, message: "Question is required" });
    }

    const answer = await askDealQuestion(context, question, req.user.name);

    res.json({ answer });
  } catch (err) {
    console.error("Ask Deal Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error processing question" });
  }
};

// @desc    Get all deals
// @route   GET /api/deal
// @access  Public
const getDeals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const deals = await Deal.find(query)
      .populate('clientId', 'name company')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Deal.countDocuments(query);

    res.status(200).json({
      success: true,
      count: deals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: deals
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single deal
// @route   GET /api/deal/:id
// @access  Private
const getDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate("clientId", "name company");

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: deal,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new deal
// @route   POST /api/deal
// @access  Private
const createDeal = async (req, res, next) => {
  try {
    const dealData = { ...req.body, userId: req.user.id };
    const deal = await Deal.create(dealData);

    res.status(201).json({
      success: true,
      data: deal,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update deal
// @route   PUT /api/deal/:id
// @access  Private
const updateDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: deal,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete deal
// @route   DELETE /api/deal/:id
// @access  Private
const deleteDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  askDeal,
};
