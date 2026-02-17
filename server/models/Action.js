const mongoose = require('mongoose');

const ActionSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
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
    type: {
      type: String,
      enum: ["schedule", "email", "followup", "stage_update"],
      required: true,
    },
    suggestedData: {
      type: mongoose.Schema.Types.Mixed, // Flexible JSON data
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
    source: {
      type: String,
      enum: ["ai", "manual"],
      default: "ai",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Action', ActionSchema);
