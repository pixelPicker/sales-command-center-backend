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

    const meetings = await require("../models/Meeting")
      .find({ dealId: req.params.id, userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(3);
    const actions = await require("../models/Action")
      .find({ dealId: req.params.id, userId: req.user.id })
      .sort({ createdAt: -1 });

    const context = `
Deal: ${deal.title}, Stage: ${deal.stage}, Value: $${deal.value}, Status: ${deal.status}, Last Activity: ${deal.lastActivity ? new Date(deal.lastActivity).toLocaleDateString() : "None"}

Client: ${deal.clientId.name} at ${deal.clientId.company}, Email: ${deal.clientId.email}, Phone: ${deal.clientId.phone || "N/A"}

Recent Meetings (${meetings.length}):
${meetings.map((m) => `- ${m.title} (${new Date(m.dateTime).toLocaleDateString()}): ${m.aiSummary || (m.transcript ? m.transcript.slice(0, 150) + "..." : "No summary")}`).join("\n")}

Actions (${actions.length}):
${actions.map((a) => `- ${a.title}: ${a.description} (${a.status}, ${a.priority})`).join("\n")}
        `;

    const { question } = req.body;
    if (!question) {
      return res
        .status(400)
        .json({ success: false, message: "Question is required" });
    }

    const answer = await askDealQuestion(context, question);

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
// @access  Private
const getDeals = async (req, res, next) => {
  try {
    const deals = await Deal.find({ userId: req.user.id })
      .populate("clientId", "name company")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deals.length,
      data: deals,
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
