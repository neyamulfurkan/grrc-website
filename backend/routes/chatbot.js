/**
 * Chatbot Routes
 * Handles AI chatbot interactions using Gemini API
 */

const express = require('express');
const router = express.Router();
const chatbotService = require('../services/chatbotService');

/**
 * POST /api/chatbot/chat
 * Send message and get AI response
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

    // Check if chatbot service is ready
    if (!chatbotService.isReady()) {
      return res.status(503).json({
        success: false,
        error: 'Chatbot service is not configured. Please set GEMINI_API_KEY in environment variables.'
      });
    }

    // Generate AI response
    const result = await chatbotService.generateResponse(
      message,
      conversationHistory,
      clubContext
    );

    if (result.success) {
      res.json({
        success: true,
        response: result.response,
        tokensUsed: result.tokensUsed
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate response'
      });
    }
  } catch (error) {
    console.error('❌ Chatbot route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/chatbot/health
 * Check chatbot service health
 */
router.get('/health', (req, res) => {
  const status = chatbotService.getStatus();
  
  res.json({
    success: true,
    status: status.ready ? 'operational' : 'not_configured',
    ...status
  });
});

module.exports = router;