const Meeting = require('../models/Meeting');
const Deal = require('../models/Deal');
const { askDealQuestion } = require('../services/ai.service');

// @desc    Ask a question about a meeting
// @route   POST /api/chat/ask
// @access  Private
const askQuestion = async (req, res, next) => {
    try {
        const { meetingId, question } = req.body;

        if (!meetingId || !question) {
            return res.status(400).json({ success: false, message: 'Please provide meetingId and question' });
        }

        // 1. Fetch Meeting and related Deal/Client info
        const meeting = await Meeting.findById(meetingId)
            .populate('clientId', 'name company')
            .populate('dealId', 'title stage value');

        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        // 2. Construct Context
        let context = `
Meeting Title: ${meeting.title}
Date: ${new Date(meeting.dateTime).toDateString()}
Participants: ${meeting.participants ? meeting.participants.join(', ') : 'Unknown'}
Transcript:
${meeting.transcript || "No transcript available."}

AI Analysis Summary:
${meeting.aiSummary || "N/A"}
`;

        if (meeting.dealId) {
            context += `
Deal Context:
Title: ${meeting.dealId.title}
Stage: ${meeting.dealId.stage}
Value: $${meeting.dealId.value}
`;
        }

        if (meeting.clientId) {
            context += `
Client: ${meeting.clientId.name} (${meeting.clientId.company})
`;
        }

        // 3. Call AI Service
        const answer = await askDealQuestion(context, question);

        res.status(200).json({
            success: true,
            data: {
                answer
            }
        });

    } catch (err) {
        next(err);
    }
};

module.exports = { askQuestion };
