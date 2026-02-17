const mongoose = require('mongoose');
const Action = require('./models/Action');
const Meeting = require('./models/Meeting');
const Deal = require('./models/Deal');

require('dotenv').config();

const testStageUpdate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find a meeting and deal
        const meeting = await Meeting.findOne().sort({ dateTime: -1 });
        if (!meeting) {
            console.log("No meeting found");
            return;
        }
        const deal = await Deal.findById(meeting.dealId);
        if (!deal) {
            console.log("No deal found for meeting");
            return;
        }

        console.log(`Found meeting: ${meeting.title}, Deal: ${deal.title} (${deal.stage})`);

        // Create a stage_update action
        const action = await Action.create({
            meetingId: meeting._id,
            clientId: meeting.clientId,
            dealId: meeting.dealId,
            userId: meeting.userId,
            type: "stage_update",
            suggestedData: {
                currentStage: deal.stage,
                proposedStage: "Negotiation", // Force a stage
                reason: "Test Script Force Update"
            },
            source: "ai",
            status: "pending",
        });

        console.log("Created Action:", action._id);
        console.log("Go to frontend and approve it.");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

testStageUpdate();
