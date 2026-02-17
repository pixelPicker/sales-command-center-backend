const parseAction = (aiResponse) => {
    const actions = [];

    // 1. Scheduling Intent
    if (aiResponse.scheduling_intent) {
        // Simple date parsing or demo value
        // In a real app, use chrono-node or similar.
        // For Hackathon MVP: defaults to "Tomorrow 10 AM" if parsing fails or just pass the text string

        actions.push({
            type: 'schedule',
            suggestedData: {
                title: "Follow-up Meeting",
                dateTime: "2024-01-01T10:00:00.000Z", // Demo placeholder, or could attempt string parsing
                notes: aiResponse.scheduling_intent
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

    // 3. Stage Update (Deal Signal) - Optional Logic
    // If deal signal is very positive, maybe suggest moving stage?
    // Keeping it simple for now as per requirements: "If scheduling... If next_action..."

    return actions;
};

module.exports = { parseAction };
