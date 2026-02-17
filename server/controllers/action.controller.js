const Action = require('../models/Action');
const Meeting = require('../models/Meeting');

// @desc    Confirm action
// @route   POST /api/action/confirm
// @access  Public
const confirmAction = async (req, res, next) => {
    try {
        const { actionId } = req.body;

        const action = await Action.findOne({
          _id: actionId,
          userId: req.user.id,
        }).populate("meetingId");
        if (!action) {
            return res.status(404).json({ success: false, message: 'Action not found' });
        }

        if (action.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Action already approved' });
        }

        // Mark as approved
        action.status = 'approved';
        await action.save();

        let newMeeting = null;

        // Side Effects based on Type
        if (action.type === 'schedule') {
            // Create new meeting
            // We need the contact ID from the original meeting
            const originalMeeting = action.meetingId; // Populated above
            
            if (!originalMeeting) {
                 return res.status(400).json({ success: false, message: 'Original meeting not found, cannot schedule follow-up' });
            }

            const { title, dateTime } = action.suggestedData;

            newMeeting = await Meeting.create({
              title: title || "Follow-up Meeting",
              contactId: originalMeeting.contactId,
              userId: req.user.id,
              dateTime: dateTime || new Date(Date.now() + 86400000), // Default to tomorrow if missing
              transcript: "",
              aiSummary: "",
            });
            
            console.log("New Meeting Auto-Created:", newMeeting._id);
        }

        res.status(200).json({
            success: true,
            data: {
                action,
                newMeeting
            }
        });

    } catch (err) {
        next(err);
    }
};

// @desc    Get actions by clientId
// @route   GET /api/action?clientId=...
// @access  Public
const getActionsByClientId = async (req, res, next) => {
    try {
        const { clientId } = req.query;
        if (!clientId) {
            return res.status(400).json({ success: false, message: 'Please provide clientId' });
        }

        const actions = await Action.find({ clientId, userId: req.user.id })
          .populate("meetingId", "title")
          .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: actions.length,
            data: actions
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
  confirmAction,
  getActionsByClientId,
};
