const Meeting = require('../models/Meeting');
const Action = require('../models/Action');
const Deal = require('../models/Deal');
const { generateCoachInsight } = require('../services/ai.service');

// Helper: count consecutive days of activity from an array of Date objects
// Walks backwards from today, counting days that have at least one entry
const countStreak = (dates) => {
    if (!dates.length) return 0;

    // Get unique calendar days (YYYY-MM-DD strings) sorted descending
    const days = [...new Set(
        dates.map(d => d.toISOString().slice(0, 10))
    )].sort().reverse();

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Streak must start today or yesterday (allow for timezone/end-of-day gaps)
    if (days[0] !== today && days[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1]);
        const curr = new Date(days[i]);
        const diffDays = Math.round((prev - curr) / 86400000);
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
};

// @desc    Get momentum score for current user
// @route   GET /api/momentum
// @access  Private
const getMomentum = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Count completed meetings in last 7 days (past meetings)
        const meetingsCompleted = await Meeting.countDocuments({
            userId,
            dateTime: { $gte: sevenDaysAgo, $lt: new Date() },
        });

        // Count approved actions in last 7 days
        const actionsApproved = await Action.countDocuments({
            userId,
            status: 'approved',
            updatedAt: { $gte: sevenDaysAgo },
        });

        // Count deals that had their stage updated in last 7 days
        const dealsProgressed = await Deal.countDocuments({
            userId,
            updatedAt: { $gte: sevenDaysAgo },
            stage: { $ne: 'Lead' },
        });

        // Calculate score
        const score =
            meetingsCompleted * 2 +
            actionsApproved * 3 +
            dealsProgressed * 5;

        // Determine level
        let level, emoji;
        if (score >= 15) {
            level = 'Rising';
            emoji = '🔥';
        } else if (score >= 8) {
            level = 'Active';
            emoji = '⚡';
        } else if (score >= 1) {
            level = 'Quiet';
            emoji = '😴';
        } else {
            level = 'Inactive';
            emoji = '—';
        }

        // Dot bar: 5 dots, fill based on score capped at 25
        const filledDots = Math.min(5, Math.round((score / 25) * 5));

        res.status(200).json({
            success: true,
            data: {
                score,
                level,
                emoji,
                filledDots,
                breakdown: {
                    meetingsCompleted,
                    actionsApproved,
                    dealsProgressed,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get action streaks for current user
// @route   GET /api/momentum/streaks
// @access  Private
const getStreaks = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        // --- 1. Follow-up Streak: consecutive days with approved followup/email actions ---
        const followupActions = await Action.find({
            userId,
            status: 'approved',
            type: { $in: ['followup', 'email'] },
            updatedAt: { $gte: ninetyDaysAgo },
        }).select('updatedAt');

        const followupStreak = countStreak(followupActions.map(a => a.updatedAt));

        // --- 2. Prepared Call Streak: consecutive meetings with transcript or aiInsights ---
        const preparedMeetings = await Meeting.find({
            userId,
            dateTime: { $lt: new Date(), $gte: ninetyDaysAgo },
            $or: [
                { transcript: { $exists: true, $ne: '' } },
                { 'aiInsights': { $exists: true, $ne: {} } },
            ],
        }).select('dateTime').sort({ dateTime: -1 });

        const preparedCallStreak = countStreak(preparedMeetings.map(m => m.dateTime));

        // --- 3. Active Deal Streak: consecutive days with any approved action ---
        const allActions = await Action.find({
            userId,
            status: 'approved',
            updatedAt: { $gte: ninetyDaysAgo },
        }).select('updatedAt');

        const activeDealStreak = countStreak(allActions.map(a => a.updatedAt));

        res.status(200).json({
            success: true,
            data: {
                followupStreak,
                preparedCallStreak,
                activeDealStreak,
            },
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get AI coach insight for a deal (based on most recent meeting)
// @route   GET /api/momentum/coach/:dealId
// @access  Private
const getCoachInsight = async (req, res, next) => {
    try {
        const { dealId } = req.params;
        const userId = req.user.id;

        // Get the deal to verify ownership and get current stage
        const deal = await Deal.findOne({ _id: dealId, userId });
        if (!deal) {
            return res.status(404).json({ success: false, message: 'Deal not found' });
        }

        // Get the most recent past meeting for this deal
        const recentMeeting = await Meeting.findOne({
            dealId,
            userId,
            dateTime: { $lt: new Date() },
        }).sort({ dateTime: -1 });

        if (!recentMeeting || !recentMeeting.aiInsights || Object.keys(recentMeeting.aiInsights).length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    positives: [],
                    improvements: [],
                    risks: [],
                    meetingTitle: null,
                    meetingDate: null,
                },
            });
        }

        const coaching = await generateCoachInsight(recentMeeting.aiInsights, deal.stage);

        res.status(200).json({
            success: true,
            data: {
                ...coaching,
                meetingTitle: recentMeeting.title,
                meetingDate: recentMeeting.dateTime,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMomentum, getStreaks, getCoachInsight };

