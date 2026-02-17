const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a meeting title"],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
    },
    dateTime: {
      type: Date,
      required: true,
    },
    transcript: {
      type: String,
      default: "",
    },
    aiInsights: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiSummary: {
      type: String,
      default: "",
    },
    participants: [
      {
        type: String,
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Meeting', MeetingSchema);
