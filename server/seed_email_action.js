const mongoose = require('mongoose');
const Action = require('./models/Action');
const Meeting = require('./models/Meeting');
const Deal = require('./models/Deal');

require('dotenv').config();

const testEmailAction = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find a meeting
        const meeting = await Meeting.findOne().sort({ dateTime: -1 });
        if (!meeting) {
            console.log("No meeting found");
            return;
        }

        console.log(`Found meeting: ${meeting.title}`);

        // Create an email action
        const action = await Action.create({
            meetingId: meeting._id,
            clientId: meeting.clientId,
            dealId: meeting.dealId,
            userId: meeting.userId,
            type: "email",
            suggestedData: {
                task: "Send follow-up email with pricing",
                subject: "Follow-up: Pricing Discussion",
                body: "Hi [Name],\n\nThanks for the time today. As requested, here is the pricing breakdown...\n\nBest,\nMe"
            },
            source: "ai",
            status: "pending",
        });

        console.log("Created Email Action:", action._id);
        console.log("Go to frontend and click Valid Email Action.");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

testEmailAction();
