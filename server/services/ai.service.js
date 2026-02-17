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
        Analyze the following meeting transcript and extracting insights into a STRICT JSON format.
        
        Transcript: 
        "${transcript}"

        Return ONLY the following JSON structure (valid JSON, no markdown formatting):
        {
            "summary": "Brief summary of the meeting",
            "participants": ["List of participant names mentioned in the transcript"],
            "keyTopics": ["List of main topics discussed"],
            "nextStep": "What is the next step or action item",
            "objection": "Any objections raised, or null",
            "intent": "Buyer's intent level: High, Medium, Low",
            "timeline": "Proposed timeline for next actions",
            "riskSignals": ["List of any risk signals or concerns"],
            "schedulingIntent": "If a follow-up meeting is mentioned, extract details (e.g. 'Monday at 2pm') otherwise null",
            "dealSignal": "Positive, Neutral, or Negative"
        }
        `;

    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are an expert Sales Operations Analyst. Your job is to analyze transcripts from B2B sales meetings. Output strict JSON. Provide executive-level summaries, deep psychological analysis of buyer intent, and highly specific actionable next steps. Do not include markdown formatting.",
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

Provide a helpful, concise answer based on the context.
        `;

    const payload = {
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a helpful sales assistant." },
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
