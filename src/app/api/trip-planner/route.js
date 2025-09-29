// app/api/trip-planner/route.js
// Using Tavily for web search + Groq for AI responses
import { NextResponse } from "next/server";

// ============================================
// HELPER FUNCTIONS
// ============================================

function isGreeting(message) {
  const greetings = ["hi", "hello", "hey", "hola", "greetings"];
  return greetings.some((greeting) =>
    message.toLowerCase().trim().startsWith(greeting)
  );
}

function extractDestination(message) {
  const patterns = [
    /(?:to|in|at|visit|going to) ([A-Za-z\s]+)(?=[,.?!]|$)/i,
    /([A-Za-z\s]+) (?:trip|vacation|holiday)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return "";
}

function extractDates(message) {
  const datePatterns = [
    /(?:from|between|on) ([A-Za-z0-9\s,-]+) (?:to|and|until|through) ([A-Za-z0-9\s,-]+)/i,
    /(?:in|during) ([A-Za-z]+)(?: [0-9]{4})?/i,
    /([A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?(?:,\s*[0-9]{4})?)/i,
  ];
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) return match[1] + (match[2] ? ` to ${match[2]}` : "");
  }
  return "Flexible";
}

function extractBudget(message) {
  const budgetPatterns = [
    /budget (?:of |is )?([\d,]+)\s*(?:USD|INR|EUR|\$|₹|€)/i,
    /([\d,]+)\s*(?:USD|INR|EUR|\$|₹|€)\s*budget/i,
    /spend(?:ing)? ([\d,]+)\s*(?:USD|INR|EUR|\$|₹|€)/i,
  ];
  for (const pattern of budgetPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return (
        match[1].trim() +
        " " +
        (message.match(/(?:USD|INR|EUR|\$|₹|€)/i)?.[0] || "USD")
      );
    }
  }
  return "Flexible";
}

// ============================================
// TAVILY SEARCH FUNCTION
// ============================================

async function searchTavily(query) {
  const API_KEY = process.env.TAVILY_API_KEY;

  if (!API_KEY) {
    throw new Error(
      "Tavily API key not configured. Add TAVILY_API_KEY to .env.local"
    );
  }

  console.log("🔍 Searching Tavily for:", query);

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: API_KEY,
      query: query,
      search_depth: "advanced", // 'basic' or 'advanced'
      include_answer: true, // Get AI-generated answer
      include_raw_content: false,
      max_results: 5, // Number of search results
      include_domains: [
        "tripadvisor.com",
        "lonelyplanet.com",
        "timeout.com",
        "booking.com",
        "airbnb.com",
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Tavily error:", errorText);
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(
    "✅ Tavily search complete. Found",
    data.results?.length,
    "results"
  );

  return {
    answer: data.answer || "", // AI-generated answer from Tavily
    results: data.results || [], // Array of search results
  };
}

// ============================================
// GROQ AI FUNCTION
// ============================================

async function generateAIResponse(searchResults, userQuery, context = "") {
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    throw new Error(
      "Groq API key not configured. Add GROQ_API_KEY to .env.local"
    );
  }

  // Combine search results into context
  const searchContext = searchResults.results
    .map((result, idx) => {
      return `[Source ${idx + 1}: ${result.title}]\n${result.content}\nURL: ${
        result.url
      }\n`;
    })
    .join("\n");

  const systemPrompt = `You are a helpful travel planning assistant. 
Use the provided web search results to give accurate, detailed travel recommendations.
Always cite your sources by mentioning the source number.
Be specific with recommendations for hotels, restaurants, and attractions.
Include estimated costs when available in the search results.`;

  const userPrompt = context
    ? `Previous context: ${context}\n\nSearch Results:\n${searchContext}\n\nUser question: ${userQuery}\n\nProvide a detailed, helpful response based on the search results.`
    : `Search Results:\n${searchContext}\n\nUser question: ${userQuery}\n\nProvide a detailed, helpful response based on the search results.`;

  console.log("🤖 Generating AI response with Groq...");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq error:", errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("✅ AI response generated");

  return data.choices[0].message.content;
}

// ============================================
// API ENDPOINTS
// ============================================

export async function GET() {
  return NextResponse.json({
    status: "API is working!",
    timestamp: new Date().toISOString(),
    tavilyConfigured: !!process.env.TAVILY_API_KEY,
    groqConfigured: !!process.env.GROQ_API_KEY,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userMessage, context, conversationHistory } = body;

    console.log("\n📨 Received message:", userMessage);
    console.log("📋 Current context:", context);

    // Extract context from message
    // Always try to extract a new destination from the current message
    const newDestination = extractDestination(userMessage);

    const updatedContext = {
      ...context,
      // If user mentions a new destination, use it. Otherwise keep the old one.
      destination: newDestination || context?.destination,
      dates: context?.dates || extractDates(userMessage),
      budget: context?.budget || extractBudget(userMessage),
    };

    // If a new destination is detected and it's different from the old one, reset the context
    if (
      newDestination &&
      context?.destination &&
      newDestination.toLowerCase() !== context.destination.toLowerCase()
    ) {
      console.log(
        `🔄 Detected new destination: ${newDestination} (was: ${context.destination})`
      );
      updatedContext.destination = newDestination;
      updatedContext.dates = extractDates(userMessage) || "Flexible";
      updatedContext.budget = extractBudget(userMessage) || "Flexible";
    }
    console.log("📋 Updated context:", updatedContext);

    // Handle greeting
    if (isGreeting(userMessage)) {
      return NextResponse.json({
        reply:
          "Hello! 👋 I'm your AI travel assistant. I can help you plan amazing trips with real-time information from the web.\n\nWhich destination would you like to explore?",
        needsFollowUp: true,
        context: updatedContext,
        sources: [],
      });
    }

    // Build search query based on context
    let searchQuery = userMessage;
    if (updatedContext.destination) {
      searchQuery = `Travel guide for ${updatedContext.destination}: `;
      searchQuery += `best attractions, hotels, restaurants, things to do. `;
      if (updatedContext.dates !== "Flexible") {
        searchQuery += `Travel dates: ${updatedContext.dates}. `;
      }
      if (updatedContext.budget !== "Flexible") {
        searchQuery += `Budget: ${updatedContext.budget}.`;
      }
    }

    console.log("🔍 Search query:", searchQuery);

    try {
      // Step 1: Search Tavily for real-time web data
      const searchResults = await searchTavily(searchQuery);

      // Step 2: Generate AI response using search results
      const aiResponse = await generateAIResponse(
        searchResults,
        userMessage,
        conversationHistory
      );

      // Determine if we need more info
      const needsFollowUp =
        !updatedContext.dates ||
        updatedContext.dates === "Flexible" ||
        !updatedContext.budget ||
        updatedContext.budget === "Flexible";

      let followUpQuestion = "";
      if (needsFollowUp) {
        if (!updatedContext.dates || updatedContext.dates === "Flexible") {
          followUpQuestion = "\n\nWhen are you planning to visit? 📅";
        } else if (
          !updatedContext.budget ||
          updatedContext.budget === "Flexible"
        ) {
          followUpQuestion = "\n\nWhat's your budget for this trip? 💰";
        }
      }

      // Extract source URLs
      const sources = searchResults.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content.substring(0, 150) + "...",
      }));

      return NextResponse.json({
        reply: aiResponse + followUpQuestion,
        sources: sources,
        needsFollowUp: needsFollowUp,
        followUpQuestion: followUpQuestion,
        context: updatedContext,
      });
    } catch (error) {
      console.error("❌ API Error:", error);
      return NextResponse.json(
        {
          error: "Failed to get travel information. Please try again.",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Request Processing Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process your request. Please try again.",
        details: error.message,
      },
      { status: 400 }
    );
  }
}
