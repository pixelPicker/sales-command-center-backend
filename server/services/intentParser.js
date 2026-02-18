const parseAction = (aiResponse) => {
    const actions = [];

    // 0. Support New Schema Actions Array
    if (aiResponse.actions && Array.isArray(aiResponse.actions)) {
        for (const act of aiResponse.actions) {
            if (act.type === 'schedule') {
                actions.push({
                    type: 'schedule',
                    suggestedData: {
                        title: act.title || "Follow-up Meeting",
                        dateTime: act.dateTime || "2024-01-01T10:00:00.000Z",
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

        actions.push({
            type: 'schedule',
            suggestedData: {
                title: typeof aiResponse.schedulingIntent === 'object' ? aiResponse.schedulingIntent.title : "Follow-up Meeting",
                dateTime: typeof aiResponse.schedulingIntent === 'object' ? aiResponse.schedulingIntent.dateTime : "2024-01-01T10:00:00.000Z",
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

module.exports = { parseAction };
