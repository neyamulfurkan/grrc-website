/**
 * GRRC AI Chatbot Route - Google Gemini Integration
 * Handles chat requests with club-specific context
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate AI response using Google Gemini
 * POST /api/chatbot/chat
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], clubContext = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Chatbot service is not configured'
      });
    }

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(clubContext);

    // Format conversation for Gemini
    const conversationForGemini = formatConversation(conversationHistory, message, systemPrompt);

    // Call Gemini API
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 500,
      }
    });

    const chat = model.startChat({
      history: conversationForGemini.history,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const aiResponse = response.text();

    // Log for monitoring
    console.log(`✅ Chatbot response generated (${aiResponse.length} chars)`);

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    
    // Handle specific Gemini errors
    let errorMessage = 'Failed to generate response';
    
    if (error.message?.includes('API key')) {
      errorMessage = 'API configuration error';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Service temporarily unavailable';
    } else if (error.message?.includes('safety')) {
      errorMessage = 'Cannot process this request due to content policy';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Build system prompt with club context
 */
function buildSystemPrompt(clubContext) {
  const {
    name = 'GSTU Robotics & Research Club',
    motto = 'A Hub of Robothinkers',
    description = 'A community of robotics and technology enthusiasts',
    university = 'Gopalganj Science and Technology University',
    upcomingEvents = [],
    recentProjects = [],
    executiveCount = 0,
    totalMembers = 0
  } = clubContext;

  let prompt = `You are an AI assistant for ${name} (${motto}) at ${university}. 

**Your Role:**
- Help visitors learn about the club, events, projects, and membership
- Be friendly, enthusiastic, and encouraging
- Provide accurate information based on the context provided
- Guide users to relevant pages when needed
- Keep responses concise (2-4 sentences typically)

**Club Information:**
- Name: ${name}
- Motto: ${motto}
- Description: ${description}
- University: ${university}`;

  if (totalMembers > 0) {
    prompt += `\n- Total Members: ${totalMembers}`;
  }

  if (executiveCount > 0) {
    prompt += `\n- Executive Members: ${executiveCount}`;
  }

  if (upcomingEvents.length > 0) {
    prompt += `\n\n**Upcoming Events:**\n`;
    upcomingEvents.forEach(event => {
      prompt += `- ${event.title} (${event.date})`;
      if (event.venue) prompt += ` at ${event.venue}`;
      prompt += `\n`;
    });
  }

  if (recentProjects.length > 0) {
    prompt += `\n**Recent Projects:**\n`;
    recentProjects.forEach(project => {
      prompt += `- ${project.title}`;
      if (project.category) prompt += ` (${project.category})`;
      prompt += `\n`;
    });
  }

  prompt += `\n\n**Guidelines:**
1. If asked about joining: Mention visiting the Membership page
2. If asked about events: Reference the Events page for full details
3. If asked about projects: Mention the Projects page
4. If asked about contact: Suggest checking the footer or Contact section
5. For technical questions: Encourage participation in workshops
6. Be encouraging about robotics and technology
7. Use emojis occasionally to be friendly (🤖🔧💡🚀)
8. If you don't know something specific, admit it and suggest where to find the info

**Response Style:**
- Friendly and conversational
- Enthusiastic about robotics
- Concise but informative
- Use markdown formatting when helpful (**bold**, *italic*)
- Include relevant links when appropriate`;

  return prompt;
}

/**
 * Format conversation history for Gemini API
 */
function formatConversation(history, currentMessage, systemPrompt) {
  const formattedHistory = [];

  // Add system context as first message
  if (history.length === 0) {
    formattedHistory.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    formattedHistory.push({
      role: 'model',
      parts: [{ text: 'Understood! I\'m ready to help visitors learn about GRRC. How can I assist?' }]
    });
  }

  // Add conversation history (last 10 messages to avoid token limits)
  const recentHistory = history.slice(-10);
  
  recentHistory.forEach(msg => {
    if (msg.role === 'user') {
      formattedHistory.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === 'assistant') {
      formattedHistory.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  });

  return {
    history: formattedHistory
  };
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  
  res.json({
    success: true,
    status: isConfigured ? 'configured' : 'not_configured',
    model: 'gemini-1.5-flash',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;