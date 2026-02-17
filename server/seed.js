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

        // 0. Clear existing data
        await User.deleteMany({});
        await Contact.deleteMany({});
        await Deal.deleteMany({});
        await Meeting.deleteMany({});
        await Action.deleteMany({});
        console.log('Cleared existing data');

        // 1. Create Test User
        const testUser = await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        });
        console.log(`Created Test User: test@example.com`);

        // 2. Create Contacts for Test User
        const contacts = [];
        const companies = ['TechCorp', 'Innnovate Inc', 'Global Solutions', 'Alpha Industries', 'Beta Ltd', 'Gamma Grp'];
        for (let i = 1; i <= 20; i++) {
            contacts.push({
                name: `Contact ${i}`,
                company: companies[Math.floor(Math.random() * companies.length)],
                email: `contact${i}@example.com`,
                phone: `555-010${i}`,
                dealStage: ['Lead', 'Discovery', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won'][Math.floor(Math.random() * 6)],
                owner: testUser._id
            });
        }
        const createdContacts = await Contact.create(contacts);
        console.log(`Created ${createdContacts.length} Contacts for Test User`);

        // 3. Create Deals for Test User
        const deals = [];
        for (let i = 1; i <= 15; i++) {
            const contact = createdContacts[i % createdContacts.length];
            deals.push({
                clientId: contact._id,
                title: `Deal with ${contact.company} - ${i}`,
                value: (Math.floor(Math.random() * 50) + 10) * 1000, // 10k - 60k
                stage: ['Discovery', 'Qualified', 'Proposal Sent', 'Negotiation'][Math.floor(Math.random() * 4)],
                userId: testUser._id
            });
        }
        const createdDeals = await Deal.create(deals);
        console.log(`Created ${createdDeals.length} Deals for Test User`);

        // 4. Create Meetings for Test User
        const meetings = [];
        // Future meetings
        for (let i = 1; i <= 10; i++) {
            const contact = createdContacts[i % createdContacts.length];
            const deal = createdDeals[i % createdDeals.length];
            meetings.push({
                title: `Strategy Call with ${contact.name}`,
                clientId: contact._id,
                dealId: deal._id,
                dateTime: new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000), // Next 10 days
                userId: testUser._id
            });
        }
        // Past meetings (some with transcripts)
        const transcriptSample = "Sales Rep: Hi, thanks for joining. I wanted to walk you through our new CRM features.\nClient: Sounds good. We are looking for better reporting and AI integrations.\nSales Rep: Perfect. Our AI Intelligence layer does exactly that. It records meetings and extracts insights.\nClient: That's interesting. What about pricing?\nSales Rep: It starts at $50/user. We can offer a discount if you sign by end of month.\nClient: Okay, send me a proposal. We need to discuss internally.\nSales Rep: Will do. Let's touch base next Tuesday at 2pm.";

        for (let i = 1; i <= 10; i++) {
            const contact = createdContacts[(i + 10) % createdContacts.length];
            const deal = createdDeals[(i + 5) % createdDeals.length];
            meetings.push({
                title: `Review Meeting with ${contact.name}`,
                clientId: contact._id,
                dealId: deal._id,
                dateTime: new Date(new Date().getTime() - i * 24 * 60 * 60 * 1000), // Past 10 days
                userId: testUser._id,
                transcript: i % 2 === 0 ? transcriptSample : undefined // Add transcript to every other past meeting
            });
        }

        const createdMeetings = await Meeting.create(meetings);
        console.log(`Created ${createdMeetings.length} Meetings for Test User`);

        console.log('Seeding Completed Successfully');
        console.log('--------------------------------');
        console.log('LOGIN CREDENTIALS:');
        console.log('Email: test@example.com');
        console.log('Password: password123');
        console.log('--------------------------------');

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedData();
