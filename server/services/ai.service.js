const axios = require('axios');

const analyzeTranscript = async (transcript) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    // Use Groq's chat completion endpoint. If AI_API_URL is set in env, use that, otherwise default to Groq.
    const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiKey) {
      throw new Error("AI service not configured: Missing AI_API_KEY");
    }

    const prompt = `
        You are an expert Sales Operations Analyst and Psychologist. Your task is to analyze the following B2B sales meeting transcript and extract high-value insights.
        
        Transcript: 
        "${transcript}"

        INSTRUCTIONS:
        1. **summary**: Write a 3-4 sentence detailed executive summary. Focus on business value, key decisions, and critical blockers.
        2. **participants**: Extract names of all people mentioned. If none, return an empty array.
        3. **keyTopics**: List 3-5 main topics/themes discussed (e.g., "Pricing", "Integration", "Security").
        4. **nextStep**: Identify the single most important next action item. If none is explicitly stated, suggest a logical next step (e.g., "Send follow-up email").
        5. **objection**: Identify the primary objection or concern raised by the client. If none, return null.
        6. **intent**: Assess the buyer's purchasing intent (High, Medium, Low) based on their engagement, questions, and tone.
        7. **timeline**: Extract any mentioned dates or timeframes for deployment, next steps, or contract signing. If vague, estimate based on context (e.g., "Q3", "Next week").
        8. **riskSignals**: List specific risks that could slow or kill the deal (e.g., "Budget cuts", "Competitor mention", "dm missing").
        9. **schedulingIntent**: If a specific follow-up time is proposed, return an object { "title": "Follow-up", "dateTime": "YYYY-MM-DDTHH:mm:ss" }. If vague or none, return null.
        10. **dealSignal**: Overall sentiment of the deal (Positive, Neutral, Negative).
        11. **dealStageSuggestion**: If the conversation indicates a clear stage progression (e.g., "Send me the contract" -> Negotiation), suggest the NEW stage (Lead, Discovery, Qualified, Proposal Sent, Negotiation, Closed Won, Closed Lost). Otherwise null.

        OUTPUT FORMAT:
        Return ONLY valid JSON. No markdown. No explanations outside the JSON.
        {
            "summary": "String",
            "participants": ["String"],
            "keyTopics": ["String"],
            "nextStep": "String",
            "objection": "String or null",
            "intent": "High",
            "timeline": "String or null",
            "riskSignals": ["String"],
            "schedulingIntent": { "title": "String", "dateTime": "ISO8601 String" } or null,
            "dealSignal": "Positive",
            "dealStageSuggestion": "String or null"
        }
    `;

    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are an expert Sales Operations Analyst. Your job is to analyze transcripts from B2B sales meetings. Output strictly valid JSON without any markdown formatting. Be concise but specific.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1, // Lower temperature for more deterministic JSON
      response_format: { type: "json_object" } // Enforce JSON object if supported by provider (Groq does support this)
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // Handle Groq/OpenAI response structure
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

    console.log("AI Raw Response:", content);

    // Clean up markdown code blocks if present (just in case)
    const jsonString = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Service Error:", error.response?.data || error.message);
    // Fallback return validation
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

const askDealQuestion = async (context, question) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

    if (!apiKey) {
      throw new Error("AI service not configured: Missing AI_API_KEY");
    }

    const prompt = `
You are an AI sales assistant. Use the following context about a sales deal to answer the question.

Context:
${context}

Question: ${question}

Instructions:
- Provide a helpful, concise answer based *strictly* on the context.
- **FORMATTING IS CRITICALLY IMPORTANT**:
  - Use **bold** for key terms.
  - Use bullet points for lists.
  - Use numbered lists for steps.
  - Split long paragraphs into smaller, readable chunks.
  - Do NOT output a single block of text.
        `;

    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a helpful sales assistant. You MUST format your response using Markdown. Use bullet points, bold text, and newlines to make the response easy to read." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
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
    return "Sorry, I encountered an error while processing your question.";
  }
};

module.exports = { analyzeTranscript, askDealQuestion };
