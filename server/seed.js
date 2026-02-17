const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Contact = require('./models/Contact');
const Deal = require('./models/Deal');
const Meeting = require('./models/Meeting');
const Action = require('./models/Action');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // 1. Create 5 Users
        const users = [];
        for (let i = 1; i <= 5; i++) {
            users.push({
                name: `User ${i}`,
                email: `user${i}@example.com`,
                password: 'password123' // Will be hashed by pre-save hook
            });
        }
        const createdUsers = await User.create(users);
        console.log(`Created ${createdUsers.length} Users`);

        // 2. Create 5 Contacts (assigned to random users)
        const contacts = [];
        for (let i = 1; i <= 5; i++) {
            const user = createdUsers[i % 5];
            contacts.push({
                name: `Contact ${i}`,
                company: `Company ${i}`,
                email: `contact${i}@company${i}.com`,
                phone: `555-010${i}`,
                dealStage: 'Lead',
                owner: user._id
            });
        }
        const createdContacts = await Contact.create(contacts);
        console.log(`Created ${createdContacts.length} Contacts`);

        // 3. Create 5 Deals (linked to contacts and users)
        const deals = [];
        for (let i = 1; i <= 5; i++) {
            const contact = createdContacts[i % 5];
            const user = createdUsers.find(u => u._id.toString() === contact.owner.toString());
            deals.push({
                clientId: contact._id,
                title: `Deal for ${contact.company}`,
                value: 1000 * i,
                stage: 'Discovery',
                userId: user._id
            });
        }
        const createdDeals = await Deal.create(deals);
        console.log(`Created ${createdDeals.length} Deals`);

        // 4. Create 5 Meetings (linked to contacts, deals? and users)
        const meetings = [];
        for (let i = 1; i <= 5; i++) {
            const contact = createdContacts[i % 5];
            const deal = createdDeals[i % 5]; // Assuming 1-to-1 mapping for simplicity in seeding
            const user = createdUsers.find(u => u._id.toString() === contact.owner.toString());

            meetings.push({
                title: `Meeting with ${contact.name}`,
                clientId: contact._id,
                dealId: deal._id,
                dateTime: new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000), // Next 5 days
                userId: user._id
            });
        }
        const createdMeetings = await Meeting.create(meetings);
        console.log(`Created ${createdMeetings.length} Meetings`);

        // 5. Create 5 Actions (linked to meetings)
        const actions = [];
        for (let i = 1; i <= 5; i++) {
            const meeting = createdMeetings[i % 5];
            const contact = createdContacts.find(c => c._id.toString() === meeting.clientId.toString());
            const deal = createdDeals.find(d => d._id.toString() === meeting.dealId.toString());
            const user = createdUsers.find(u => u._id.toString() === meeting.userId.toString());

            actions.push({
                meetingId: meeting._id,
                clientId: contact._id,
                dealId: deal._id,
                type: 'followup',
                suggestedData: { note: `Follow up on meeting ${meeting.title}` },
                status: 'pending',
                userId: user._id
            });
        }
        const createdActions = await Action.create(actions);
        console.log(`Created ${createdActions.length} Actions`);

        console.log('Seeding Completed Successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedData();
