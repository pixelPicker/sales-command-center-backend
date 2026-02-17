const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
            trim: true,
        },

        company: {
            type: String,
            required: [true, 'Please add a company'],
            trim: true,
        },

        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            lowercase: true,
            match: [
                /^\S+@\S+\.\S+$/,
                'Please add a valid email'
            ]
        },

        phone: {
            type: String,
        },

        dealStage: {
            type: String,
            enum: [
                'Lead',
                'Discovery',
                'Qualified',
                'Proposal Sent',
                'Negotiation',
                'Closed Won',
                'Closed Lost'
            ],
            default: 'Lead'
        },

        dealValue: {
            type: Number,
            default: 0
        },

        dealScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },

        lastContactedAt: {
            type: Date,
        },

        nextFollowUp: {
            type: Date,
        },

        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
        },

        painPoints: [String],

        objections: [String],

        notes: [
            {
                content: String,
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Contact', ContactSchema);
