const mongoose = require('mongoose');
const Action = require('./models/Action');
const Meeting = require('./models/Meeting');
const Deal = require('./models/Deal'); // Ensure models are loaded
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const actions = await Action.find({ source: 'ai', status: 'pending' })
            .populate('meetingId')
            .sort({ createdAt: -1 })
            .limit(5);

        if (actions.length === 0) {
            console.log("NO PENDING AI ACTIONS FOUND.");
        } else {
            console.log("--- FOUND PENDING ACTIONS ---");
            actions.forEach(a => {
                if (a.meetingId) {
                    console.log(`Action Type: ${a.type}`);
                    console.log(`Meeting Title: ${a.meetingId.title}`);
                    console.log(`Meeting ID: ${a.meetingId._id}`);
                    console.log(`URL hint: /dashboard/meetings/${a.meetingId._id}`);
                    console.log("-------------------");
                } else {
                    console.log(`Action ${a._id} has missing meetingId linkage.`);
                }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

checkData();
