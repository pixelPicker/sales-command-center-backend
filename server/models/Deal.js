const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contact',
            required: [true, 'Please add a client'],
        },

        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true,
        },

        stage: {
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

        value: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ['active', 'inactive', 'closed'],
            default: 'active'
        },

        lastActivity: {
            type: Date,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Deal', DealSchema);
