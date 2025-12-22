/**
 * Chatbot Service - Gemini API Integration Layer
 * Provides reusable functions for AI chat functionality
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class ChatbotService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not set - chatbot will not work');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    
    this.model = 'gemini-1.5-flash';
    this.defaultConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 500,
    };
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.genAI !== null;
  }

  /**
   * Generate AI response
   */
  async generateResponse(message, conversationHistory = [], clubContext = {}) {
    if (!this.isReady()) {
      throw new Error('Chatbot service is not configured');
    }

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(clubContext);

      // Get model
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: this.defaultConfig
      });

      // Format conversation
      const history = this.formatHistory(conversationHistory, systemPrompt);

      // Start chat
      const chat = model.startChat({
        history: history,
        generationConfig: this.defaultConfig
      });

      // Send message
      const result = await chat.sendMessage(message);
      const response = result.response;
      
      return {
        success: true,
        response: response.text(),
        tokensUsed: response.usageMetadata || null
      };

    } catch (error) {
      console.error('❌ Chatbot service error:', error);
      
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Build context-aware system prompt
   */
  buildSystemPrompt(clubContext) {
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
- Be friendly, enthusiastic, and encouraging about robotics and technology
- Provide accurate information based on the context provided
- Guide users to relevant pages when needed
- Keep responses concise (2-4 sentences typically, unless more detail is requested)

**Club Information:**
- Name: ${name}
- Motto: ${motto}
- Description: ${description}
- University: ${university}`;

    if (totalMembers > 0) {
      prompt += `\n- Total Members: ${totalMembers}`;
    }

    if (executiveCount > 0) {
      prompt += `\n- Executive Committee: ${executiveCount} members`;
    }

    if (upcomingEvents.length > 0) {
      prompt += `\n\n**Upcoming Events:**`;
      upcomingEvents.forEach(event => {
        prompt += `\n- ${event.title}`;
        if (event.date) prompt += ` on ${event.date}`;
        if (event.venue) prompt += ` at ${event.venue}`;
      });
    }

    if (recentProjects.length > 0) {
      prompt += `\n\n**Recent Projects:**`;
      recentProjects.forEach(project => {
        prompt += `\n- ${project.title}`;
        if (project.category) prompt += ` (${project.category})`;
      });
    }

    prompt += `\n\n**Response Guidelines:**
1. **Membership**: Direct to Membership page for application process
2. **Events**: Reference Events page for full schedules and registration
3. **Projects**: Mention Projects page for portfolio and technical details
4. **Contact**: Suggest footer links or Contact section
5. **Technical Help**: Encourage workshop participation and hands-on learning
6. **Unknown Info**: Admit uncertainty and suggest where to find answers

**Tone:**
- Friendly and conversational 😊
- Enthusiastic about robotics 🤖
- Supportive and encouraging 💪
- Professional yet approachable
- Use emojis sparingly (🤖🔧💡🚀📚)

**Formatting:**
- Use **bold** for emphasis
- Use *italic* for technical terms
- Keep paragraphs short
- Use bullet points when listing items`;

    return prompt;
  }

  /**
   * Format conversation history for Gemini
   */
  formatHistory(history, systemPrompt) {
    const formatted = [];

    // Add system context if no history
    if (history.length === 0) {
      formatted.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      formatted.push({
        role: 'model',
        parts: [{ text: 'Ready to assist! How can I help you learn about GRRC?' }]
      });
    }

    // Add conversation history (last 10 to avoid token limits)
    const recent = history.slice(-10);
    
    recent.forEach(msg => {
      if (msg.role === 'user') {
        formatted.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        formatted.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    });

    return formatted;
  }

  /**
   * Handle Gemini API errors
   */
  handleError(error) {
    const message = error.message || 'Unknown error';

    if (message.includes('API key')) {
      return 'API configuration error';
    }
    
    if (message.includes('quota') || message.includes('limit')) {
      return 'Service temporarily unavailable due to high demand';
    }
    
    if (message.includes('safety') || message.includes('blocked')) {
      return 'Cannot process this request due to content policy';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network connection error. Please try again';
    }

    return 'Failed to generate response. Please try again';
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      ready: this.isReady(),
      model: this.model,
      configured: !!process.env.GEMINI_API_KEY
    };
  }
}

// Export singleton instance
module.exports = new ChatbotService();