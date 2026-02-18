// Helper function to parse scheduling intent from text (e.g., "Thursday at 4pm")
const parseSchedulingIntent = (intent) => {
    if (!intent) return null;

    // Small fix: if it's already an ISO string, just return it
    if (intent.includes('T') && !isNaN(Date.parse(intent))) {
        return new Date(intent);
    }

    // Simple parsing for "Thursday at 4pm" format
    const dayMatch = intent.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    const timeMatch = intent.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

    if (!dayMatch || !timeMatch) return null;

    const dayName = dayMatch[1].toLowerCase();
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    const dayMap = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };

    const targetDay = dayMap[dayName];
    if (targetDay === undefined) return null;

    let hour24 = hour;
    if (ampm === 'pm' && hour !== 12) hour24 += 12;
    if (ampm === 'am' && hour === 12) hour24 = 0;

    const now = new Date();
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Next week if today or past

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntil);
    targetDate.setHours(hour24, minute, 0, 0);

    return targetDate;
};

const parseAction = (aiResponse) => {
    const actions = [];

    // 0. Support New Schema Actions Array
    if (aiResponse.actions && Array.isArray(aiResponse.actions)) {
        for (const act of aiResponse.actions) {
            if (act.type === 'schedule') {
                const parsedDate = parseSchedulingIntent(act.dateTime || act.title);
                actions.push({
                    type: 'schedule',
                    suggestedData: {
                        title: act.title || "Follow-up Meeting",
                        dateTime: parsedDate ? parsedDate.toISOString() : (act.dateTime || new Date(Date.now() + 86400000).toISOString()),
                        notes: act.evidence || ""
                    },
                    status: 'pending'
                });
            } else if (act.type === 'email') {
                actions.push({
                    type: 'email',
                    suggestedData: {
                        title: act.title,
                        task: act.title,
                        subject: "Follow-up regarding our meeting",
                        body: `Hi [Name],\n\nGreat speaking with you today. Regarding: ${act.title}.\n\nBest,\n[Your Name]`
                    },
                    status: 'pending'
                });
            } else if (act.type === 'followup') {
                actions.push({
                    type: 'followup',
                    suggestedData: {
                        title: act.title,
                        task: act.title
                    },
                    status: 'pending'
                });
            } else if (act.type === 'stage_update') {
                actions.push({
                    type: 'stage_update',
                    suggestedData: {
                        title: "Update Deal Stage",
                        proposedStage: act.proposedStage || act.title,
                        reason: act.evidence || "Positive signals detected."
                    },
                    status: 'pending'
                });
            }
        }
    }

    // If we found actions in the new schema, we skip the legacy mapping 
    // to avoid duplicates, unless we want to merge them.
    if (actions.length > 0) return actions;

    // 1. Scheduling Intent
    if (aiResponse.schedulingIntent) {
        // Simple date parsing or demo value
        // In a real app, use chrono-node or similar.
        // For Hackathon MVP: defaults to "Tomorrow 10 AM" if parsing fails or just pass the text string

        const parsedDate = parseSchedulingIntent(typeof aiResponse.schedulingIntent === 'object' ? aiResponse.schedulingIntent.dateTime : aiResponse.schedulingIntent);
        actions.push({
            type: 'schedule',
            suggestedData: {
                title: typeof aiResponse.schedulingIntent === 'object' ? aiResponse.schedulingIntent.title : "Follow-up Meeting",
                dateTime: parsedDate ? parsedDate.toISOString() : (typeof aiResponse.schedulingIntent === 'object' ? aiResponse.schedulingIntent.dateTime : new Date(Date.now() + 86400000).toISOString()),
                notes: typeof aiResponse.schedulingIntent === 'object' ? JSON.stringify(aiResponse.schedulingIntent) : aiResponse.schedulingIntent
            },
            status: 'pending'
        });
    }

    // 2. Next Action Follow-up (Email or Task)
    if (aiResponse.nextStep) {
        const lowerAction = aiResponse.nextStep.toLowerCase();
        if (lowerAction.includes('email') || lowerAction.includes('send') || lowerAction.includes('follow up') || lowerAction.includes('follow-up')) {
            actions.push({
                type: 'email',
                suggestedData: {
                    task: aiResponse.nextStep,
                    subject: "Follow-up regarding our meeting",
                    body: "Hi [Name],\n\nGreat speaking with you today. As discussed, here are the next steps:\n\n" + aiResponse.nextStep + "\n\nBest,\n[Your Name]"
                },
                status: 'pending'
            });
        } else {
            actions.push({
                type: 'followup',
                suggestedData: {
                    task: aiResponse.nextStep
                },
                status: 'pending'
            });
        }
    }

    // 3. Stage Update Suggestion
    const stageSuggestion = aiResponse.dealStageSuggestion?.stage || aiResponse.dealStageSuggestion;
    if (stageSuggestion && typeof stageSuggestion === 'string' && stageSuggestion !== 'None') {
        actions.push({
            type: 'stage_update',
            suggestedData: {
                title: "Update Deal Stage",
                proposedStage: stageSuggestion,
                reason: aiResponse.summary?.text || aiResponse.summary || "AI suggested stage update."
            },
            status: 'pending'
        });
    }

    return actions;
};

module.exports = { parseAction, parseSchedulingIntent };
