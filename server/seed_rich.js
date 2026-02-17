const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Contact = require("./models/Contact");
const Deal = require("./models/Deal");
const Meeting = require("./models/Meeting");
const Action = require("./models/Action");

dotenv.config();

// --- DATA CONSTANTS ---

const FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
    "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Margaret", "Anthony", "Betty", "Donald", "Sandra",
    "Mark", "Ashley", "Paul", "Dorothy", "Steven", "Kimberly", "Andrew", "Emily", "Kenneth", "Donna",
    "George", "Michelle", "Joshua", "Carol", "Kevin", "Amanda", "Brian", "Melissa", "Edward", "Deborah"
];

const LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
];

const COMPANIES = [
    "TechFlow", "RetailGiant", "FinServe", "HealthPlus", "EduTech", "GlobalCorp", "Omega Solutions", "Alpha Dynamics",
    "Beta Systems", "Gamma Industries", "Delta Group", "Epsilon Enterprises", "Zeta Technologies", "Eta Innovations",
    "Theta Logistics", "Iota Services", "Kappa Consulting", "Lambda Labs", "Mu Manufacturing", "Nu Networks"
];

const ROLES = [
    "CTO", "VP of Engineering", "Director of IT", "Product Manager", "CEO", "COO", "CFO", "Operations Manager",
    "Sales Director", "Marketing Manager", "HR Director", "Lead Developer", "Solutions Architect", "Procurement Manager"
];

const DEAL_STAGES = [
    "Lead", "Discovery", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"
];

const PAIN_POINTS_LIST = [
    "Legacy systems", "Manual processes", "Data silos", "Poor reporting", "Compliance issues", "Scalability concerns",
    "High operational costs", "Lack of visibility", "Security vulnerabilities", "User adoption methodology"
];

const TRANSCRIPTS = {
    DISCOVERY: `
Sales Rep: Thanks for joining. I'd love to understand your current workflow.
Client: Ideally, we want real-time tracking. Right now, it's all spreadsheets, and we're losing stock.
Sales Rep: That's significant. Our platform integrates directly with your POS.
Client: Does it handle multi-location? We have warehouses in 3 states.
Sales Rep: Yes, natively. You can view stock by location or aggregate.
Client: That sounds promising. What's the implementation time?
Sales Rep: Usually 2-3 weeks for a setup of your size.
`,
    NEGOTIATION: `
Sales Rep: I've sent over the updated proposal. Any thoughts on the pricing structure?
Client: The total cost is within budget, but the upfront implementation fee is a bit high.
Sales Rep: I understand. If we can sign by Friday, I can defer 50% of the implementation fee.
Client: That would help. And this includes the premium support package?
Sales Rep: Correct. 24/7 priority support is included.
Client: Okay, let me run this by my VP. I think we can make this work.
`,
    DEMO: `
Sales Rep: As you can see, all your KPIs are visible at a glance.
Client: Can we customize these widgets?
Sales Rep: Absolutely. You can drag and drop, resize, and choose from over 50 pre-built widgets.
Client: Nice. And how do we share this with the board?
Sales Rep: You can schedule automated PDF reports or give them view-only access.
Client: Perfect. That saves me hours a week.
`
};

const INSIGHTS = {
    DISCOVERY: {
        summary: "Client is struggling with legacy systems and manual tracking. Interested in multi-location support.",
        keyTopics: ["Legacy Systems", "Multi-location Support", "Inventory Management"],
        nextStep: "Schedule technical deep dive with solution architect.",
        timeline: "Q3 Implementation",
        intent: "High",
        dealSignal: "Positive",
        dealStageSuggestion: "Discovery",
        riskSignals: ["Legacy data migration"]
    },
    NEGOTIATION: {
        summary: "Client is price-sensitive on upfront fees. Offered deferral to close soon.",
        keyTopics: ["Pricing", "Budget Approval", "Implementation Fee"],
        nextStep: "Send updated contract with fee deferral terms.",
        timeline: "Sign by Friday",
        intent: "High",
        dealSignal: "Positive",
        dealStageSuggestion: "Negotiation",
        riskSignals: ["VP approval needed"]
    },
    DEMO: {
        summary: "Client impressed with dashboard customizability and reporting features.",
        keyTopics: ["Customization", "Reporting", "Board Visibility"],
        nextStep: "Grant view-only access to board members for trial.",
        timeline: "2-week trial",
        intent: "Medium",
        dealSignal: "Positive",
        dealStageSuggestion: "Qualified",
        riskSignals: []
    }
};

// --- HELPER FUNCTIONS ---

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSubset(arr, size) {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
}

// --- MAIN SEED FUNCTION ---

const seedRichData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected for Large Scale Seeding");

        // 0. CLEAR DATA
        await User.deleteMany({});
        await Contact.deleteMany({});
        await Deal.deleteMany({});
        await Meeting.deleteMany({});
        await Action.deleteMany({});
        console.log("Cleared existing data");

        // 1. CREATE USER
        const mainUser = await User.create({
            name: "Zafar",
            email: "zafar@spaghetti.com",
            password: "password123" // In a real app, hash this!
        });
        console.log(`Created User: ${mainUser.email}`);

        // 2. CREATE CONTACTS (50)
        const contacts = [];
        for (let i = 0; i < 50; i++) {
            const fn = getRandomElement(FIRST_NAMES);
            const ln = getRandomElement(LAST_NAMES);
            const company = getRandomElement(COMPANIES);

            contacts.push({
                name: `${fn} ${ln}`,
                company: company,
                email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@${company.toLowerCase().replace(/\s/g, '')}.com`,
                phone: `555-01${getRandomInt(10, 99)}`,
                role: getRandomElement(ROLES),
                painPoints: getRandomSubset(PAIN_POINTS_LIST, getRandomInt(1, 3)),
                sentiment: getRandomElement(["positive", "neutral", "negative"]),
                owner: mainUser._id,
                dealStage: getRandomElement(DEAL_STAGES)
            });
        }
        const createdContacts = await Contact.create(contacts);
        console.log(`Created ${createdContacts.length} Contacts`);

        // 3. CREATE DEALS (100)
        const deals = [];
        for (let i = 0; i < 100; i++) {
            const contact = getRandomElement(createdContacts);
            const value = getRandomInt(10, 200) * 1000;

            deals.push({
                title: `${contact.company} - ${getRandomElement(["Expansion", "New License", "Renewal", "Service Contract", "Platform Upgrade"])}`,
                value: value,
                stage: getRandomElement(DEAL_STAGES),
                clientId: contact._id,
                userId: mainUser._id,
                status: "active",
                lastActivity: new Date(new Date().getTime() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000)
            });
        }
        const createdDeals = await Deal.create(deals);
        console.log(`Created ${createdDeals.length} Deals`);

        // 4. CREATE MEETINGS (200) & ACTIONS
        const meetings = [];
        const actions = [];

        // Distribute meetings across past and future
        // 150 Past meetings, 50 Future meetings

        for (let i = 0; i < 200; i++) {
            const deal = getRandomElement(createdDeals);
            const contactId = deal.clientId; // Verify against deal's contact
            const isPast = i < 150;

            const daysOffset = isPast ? -getRandomInt(1, 60) : getRandomInt(1, 30);
            const meetingDate = new Date();
            meetingDate.setDate(meetingDate.getDate() + daysOffset);

            // Setup varying types for transcripts
            let type = "DISCOVERY";
            if (deal.stage === "Negotiation" || deal.stage === "Proposal Sent") type = "NEGOTIATION";
            if (deal.stage === "Qualified") type = "DEMO";

            // Randomize title based on type
            const titles = {
                "DISCOVERY": ["Initial Discovery", "Requirements Gathering", "Intro Call"],
                "NEGOTIATION": ["Contract Review", "Final Terms", "Pricing Discussion"],
                "DEMO": ["Product Demo", "Technical Deep Dive", "Solution Overview"]
            };
            const meetingTitle = getRandomElement(titles[type] || ["Check-in"]);

            const meeting = {
                _id: new mongoose.Types.ObjectId(),
                title: meetingTitle,
                clientId: contactId,
                dealId: deal._id,
                userId: mainUser._id,
                dateTime: meetingDate,
                transcript: isPast ? TRANSCRIPTS[type] : "",
                aiSummary: isPast ? INSIGHTS[type].summary : "",
                aiInsights: isPast ? INSIGHTS[type] : {},
                participants: ["Zafar", "Client"]
            };
            meetings.push(meeting);

            // Generate Action for some past meetings
            if (isPast && Math.random() > 0.4) {
                actions.push({
                    meetingId: meeting._id,
                    clientId: contactId,
                    dealId: deal._id,
                    userId: mainUser._id,
                    type: getRandomElement(["email", "followup", "stage_update"]),
                    suggestedData: {
                        subject: `Follow up: ${meetingTitle}`,
                        body: "Hi team, regarding our last conversation...",
                        reason: "Automated suggestion based on transcript sentiment"
                    },
                    status: "pending",
                    source: "ai"
                });
            }
        }

        const createdMeetings = await Meeting.create(meetings);
        console.log(`Created ${createdMeetings.length} Meetings`);

        const createdActions = await Action.create(actions);
        console.log(`Created ${createdActions.length} Actions`);

        console.log("--------------------------------");
        console.log("LARGE SCALE SEEDING COMPLETE");
        console.log("Login: zafar@spaghetti.com / password123");
        console.log("Stats:");
        console.log(`- Contacts: ${createdContacts.length}`);
        console.log(`- Deals: ${createdDeals.length}`);
        console.log(`- Meetings: ${createdMeetings.length}`);
        console.log(`- Actions: ${createdActions.length}`);
        console.log("--------------------------------");

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedRichData();
