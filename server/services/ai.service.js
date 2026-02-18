const axios = require('axios');

const analyzeTranscript = async (transcript) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    // Use Groq's chat completion endpoint. If AI_API_URL is set in env, use that, otherwise default to Groq.
    const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiKey) {
      throw new Error("AI service not configured: Missing AI_API_KEY");
    }

    // const prompt = `
    //     As a Senior Sales Operations Analyst, analyze the following B2B sales meeting transcript. 
    //     Focus on identifying high-leverage business opportunities, critical blockers, and technical requirements.

    //     Transcript: 
    //     "${transcript}"

    //     INSTRUCTIONS:
    //     1. **summary**: Write a concise, executive-level summary (4-5 sentences). Focus on the core value proposition and the client's current pain points.
    //     2. **participants**: Extract names of all people mentioned. If none, return an empty array.
    //     3. **keyTopics**: List 3-5 high-level business topics (e.g., "Operational Scalability", "Cost Optimization", "Risk Mitigation").
    //     4. **nextStep**: Identify the critical path forward. What is the single most important next action?
    //     5. **objection**: Identify the primary concern or risk signal. If none, return null.
    //     6. **intent**: Assess the buyer's stage and intent (High, Medium, Low).
    //     7. **timeline**: Extract specific deployment dates or contract cycles. 
    //     8. **riskSignals**: List specific factors that could derail the deal.
    //     9. **schedulingIntent**: If a specific follow-up time is proposed, return an object { "title": "Follow-up", "dateTime": "YYYY-MM-DDTHH:mm:ss" }.
    //     10. **dealSignal**: Overall professional sentiment (Positive, Neutral, Negative).
    //     11. **dealStageSuggestion**: Suggest the next logical stage in the CRM based on the conversation flow.

    //     OUTPUT FORMAT:
    //     Return ONLY valid JSON. 
    //     {
    //         "summary": "String",
    //         "participants": ["String"],
    //         "keyTopics": ["String"],
    //         "nextStep": "String",
    //         "objection": "String or null",
    //         "intent": "High",
    //         "timeline": "String or null",
    //         "riskSignals": ["String"],
    //         "schedulingIntent": { "title": "String", "dateTime": "ISO8601 String" } or null,
    //         "dealSignal": "Positive",
    //         "dealStageSuggestion": "String or null"
    //     }
    // `;

    const prompt = `
You are an enterprise Sales Intelligence Extraction Engine.

Your task is to extract strictly verifiable, structured signals from a B2B sales meeting transcript.

NON-NEGOTIABLE RULES:

1. Extract ONLY information explicitly supported by the transcript.
2. If something is not clearly stated, return null.
3. Do NOT infer budget unless a number is stated.
4. Do NOT assign stakeholder roles unless directly implied.
5. If confidence < 0.6, return null.
6. Separate evidence from interpretation.
7. Return strictly valid JSON. No markdown. No commentary.

TRANSCRIPT:
---
${transcript}
---

RETURN JSON USING THIS EXACT SCHEMA:

{
  "summary": {
    "text": "4 sentence executive summary",
    "confidence": 0.0
  },

  "stakeholders": [
    {
      "name": "String",
      "role": "Decision Maker | Budget Owner | Influencer | Unknown",
      "evidence": "Short quote from transcript",
      "confidence": 0.0
    }
  ],

  "budget": {
    "amount": 0,
    "currency": "USD | EUR | null",
    "evidence": "Quote supporting extraction or null",
    "confidence": 0.0
  },

  "timeline": {
    "text": "Exact timeline mentioned or null",
    "evidence": "Quote or null",
    "confidence": 0.0
  },

  "objections": [
    {
      "type": "Implementation | Pricing | Adoption | Competition | Other",
      "detail": "Specific objection",
      "evidence": "Quote",
      "severity": 0.0
    }
  ],

  "riskSignals": [
    {
      "signal": "Description",
      "evidence": "Quote",
      "impactScore": 0.0
    }
  ],

  "competitorsMentioned": [
    {
      "name": "String",
      "evidence": "Quote"
    }
  ],

  "intentScore": 0.0,

  "actions": [
    {
      "type": "schedule | email | stage_update | followup",
      "title": "Short description",
      "dateTime": "ISO8601 or null",
      "evidence": "Quote supporting action",
      "confidence": 0.0
    }
  ],

  "dealSignal": "Positive | Neutral | Negative",

  "dealStageSuggestion": {
    "stage": "String or null",
    "reasoning": "One sentence grounded in transcript",
    "confidence": 0.0
  }
}
`;


    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a Senior Sales Operations Analyst. You provide precise, professional, and data-driven insights. Output strictly valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    let content = "";
    if (
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message
    ) {
      content = response.data.choices[0].message.content;
    } else {
      throw new Error("Unexpected API response structure");
    }

    const jsonString = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Service Error:", error.response?.data || error.message);
    return {
      summary: "Error analyzing transcript",
      participants: [],
      keyTopics: [],
      nextStep: null,
      objection: null,
      intent: "Unknown",
      timeline: null,
      riskSignals: [],
      schedulingIntent: null,
      dealSignal: "Neutral",
    };
  }
};

const askDealQuestion = async (context, question, userName = "Salesperson") => {
  try {
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiKey) {
      throw new Error("AI service not configured: Missing AI_API_KEY");
    }

    const prompt = `
You are a Senior Strategic Sales Advisor. Your goal is to help ${userName} manage this deal with maximum efficiency and professionalism.

CONTEXT DATA:
---
${context}
---

USER QUESTION:
"${question}"

STRICT GUIDELINES:
1. **NO HALLUCINATIONS**: Your answer must be based strictly on the provided context. If the information (e.g., budget, specific names, or location details) is not in the context, state "Based on the available records, I don't see specific information regarding [X]." 
2. **PERSONALIZATION**: Address the salesperson professionally (e.g., "Hello, ${userName}. Based on our records...") when appropriate.
3. **TONE**: Be analytical, confident, and professional. Avoid sounding like a basic chatbot. Think high-level Sales Ops.
4. **FORMATTING**: Use clean Markdown. Use bold for numbers and key terms. Use bulleted lists for clarity.
        `;

    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a Senior Strategic Sales Advisor assisting ${userName}. You are expert, professional, and strictly grounded in data. Never invent details about deals or meetings.`
        },
        { role: "user", content: prompt },
      ],
      temperature: 0, // Lower temp for more grounding
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    let content = "";
    if (
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message
    ) {
      content = response.data.choices[0].message.content;
    } else {
      throw new Error("Unexpected API response structure");
    }

    return content.trim();
  } catch (error) {
    console.error(
      "AI Deal Question Error:",
      error.response?.data || error.message,
    );
    return "I apologize, but I encountered an error while retrieving that information for you. Please try again in a moment.";
  }
};

module.exports = { analyzeTranscript, askDealQuestion };
