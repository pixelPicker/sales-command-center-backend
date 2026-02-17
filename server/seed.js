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
        const transcriptSample = `
Sales Rep (Sarah): Hi everyone, thanks for making time today. I'm joined by my solutions engineer, Mike. We wanted to dive deeper into the technical requirements you mentioned last week.
Client (Mark - CTO): Thanks Sarah. Yes, we have Julie from Ops here too. Our main concern right now is scalability. We're doubling our user base every quarter.
Client (Julie - VP Ops): Exactly. The current solution crashes when we hit peak load on Mondays. We need 99.99% uptime guaranteed.
Sales Rep (Sarah): Understood. Our Enterprise plan is built on Kubernetes and auto-scales instantly. We actually guarantee 99.999% uptime in the SLA.
Client (Mark): That sounds good on paper. But what about data residency? We have customers in the EU.
Sales Rep (Mike): We support multi-region deployment. You can pin data to Frankfurt or Dublin availability zones to comply with GDPR.
Client (Julie): Okay, that addresses compliance. What about the implementation timeline? We need to be live by Q3.
Sales Rep (Sarah): classic implementation takes 6-8 weeks. If we sign by the end of this month, we can start onboarding on the 15th and hit your Q3 target.
Client (Mark): The pricing you sent earlier... $50k is a bit steep for the first year.
Sales Rep (Sarah): I hear you. If you can commit to a 2-year contract, I can drop the annual rate to $42k and waive the implementation fee.
Client (Julie): That helps. Mark, do we have budget for a 2-year commit?
Client (Mark): I think so, but I need to clear it with the CFO. He's worried about vendor lock-in.
Sales Rep (Sarah): We offer full data export at any time, standard format. No lock-in. I'll send over the updated proposal with the 2-year discount.
Client (Mark): Okay, send it over. Lets aim to review it next Tuesday.
Client (Julie): Also, can you send the security whitepaper? InfoSec will ask for it.
Sales Rep (Sarah): Absolutely. I'll attach that. Thanks everyone!
        `;

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
