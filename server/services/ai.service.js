const axios = require('axios');

const analyzeTranscript = async (transcript) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_URL;

    if (!apiKey || !apiUrl) {
      throw new Error("AI service not configured: Missing API KEY or URL");
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

    // Generic payload structure fitting many providers (like OpenAI/Anthropic/Local LLMs that follow common patterns)
    // Adjust payload structure if specific provider requirements are known, but keep it generic enough.
    // Assuming an OpenAI-compatible interface for now as it's the most common "generic" target.
    const payload = {
      model: "gpt-3.5-turbo", // Or user configured model
      messages: [
        {
          role: "system",
          content: "You are a helpful sales assistant. Output strict JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // Defensive parsing to handle various API response structures
    let content;
    if (
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message
    ) {
      content = response.data.choices[0].message.content;
    } else if (response.data.response) {
      // Some other APIs
      content = response.data.response;
    } else {
      // Fallback for simple raw text responses
      content = JSON.stringify(response.data);
    }

    console.log("AI Raw Response:", content);

    // Clean up markdown code blocks if present
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
    const apiUrl = process.env.AI_API_URL;

    if (!apiKey || !apiUrl) {
      throw new Error("AI service not configured: Missing API KEY or URL");
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
      temperature: 0.3,
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    let content;
    if (
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message
    ) {
      content = response.data.choices[0].message.content;
    } else if (response.data.response) {
      content = response.data.response;
    } else {
      content = JSON.stringify(response.data);
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
