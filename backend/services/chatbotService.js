/**
 * Chatbot Service - Groq Llama API Integration Layer
 * Balanced: Complete information with smart token optimization
 */

const Groq = require('groq-sdk');

class ChatbotService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not set - chatbot will not work');
      this.groq = null;
    } else {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    
    this.model = 'llama-3.3-70b-versatile';
    this.defaultConfig = {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 800,  // Increased for detailed responses
    };
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.groq !== null;
  }

  /**
   * Generate AI response
   */
  async generateResponse(message, conversationHistory = [], clubContext = {}) {
    if (!this.isReady()) {
      throw new Error('Chatbot service is not configured');
    }

    try {
      // Build informative system prompt
      const systemPrompt = this.buildSystemPrompt(clubContext);

      // Format conversation
      const messages = this.formatMessages(conversationHistory, systemPrompt, message);

      // Call Groq API
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: messages,
        ...this.defaultConfig
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from Groq API');
      }
      
      return {
        success: true,
        response: response,
        tokensUsed: completion.usage || null
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
   * Build informative system prompt with all necessary details
   */
  buildSystemPrompt(clubContext) {
    const {
      name = 'GSTU Robotics & Research Club',
      motto = 'A Hub of Robothinkers',
      university = 'Gopalganj Science and Technology University',
      upcomingEvents = [],
      recentProjects = [],
      totalMembers = 0,
      membershipFee = 'Contact us for details',
      contactEmail = 'Check footer for contact',
      socialLinks = {}
    } = clubContext;

    // Build comprehensive but concise prompt
    let prompt = `You are the AI assistant for ${name} (${motto}) at ${university}.

**Role:** Help visitors with club information. Be friendly, helpful, and provide complete answers.

**Club Info:**
- University: ${university}
- Members: ${totalMembers > 0 ? totalMembers : 'Growing community'}
- Membership: ${membershipFee}
- Contact: ${contactEmail}`;

    // Add events with full details
    if (upcomingEvents.length > 0) {
      prompt += `\n\n**Upcoming Events:**`;
      upcomingEvents.slice(0, 3).forEach(event => {
        prompt += `\n- ${event.title}`;
        if (event.date) prompt += ` (${event.date})`;
        if (event.venue) prompt += ` at ${event.venue}`;
        if (event.description) prompt += ` - ${event.description}`;
      });
    }

    // Add projects with details
    if (recentProjects.length > 0) {
      prompt += `\n\n**Recent Projects:**`;
      recentProjects.slice(0, 3).forEach(project => {
        prompt += `\n- ${project.title}`;
        if (project.category) prompt += ` (${project.category})`;
        if (project.description) prompt += ` - ${project.description}`;
      });
    }

    prompt += `\n\n**Guidelines:**
- Provide complete, helpful answers
- If asked about pricing/fees: Give specific details if available, or direct to Membership page
- If asked about events: Mention dates, venues, registration details
- If asked about joining: Explain process and requirements
- If asked about projects: Describe what we've built
- If asked about contact: Provide all available contact methods
- Use 2-5 sentences depending on question complexity
- Be enthusiastic about robotics! 🤖
- Direct users to relevant pages for full details

**Chatbot Developer:**
If asked who built this chatbot or about the developer:
- Name: Neyamul Furkan
- Student ID: 21EEE009
- Department: Electrical & Electronic Engineering (EEE)
- Session: 2021-22
- Home District: Noakhali
- Role: Developed the AI chatbot system for GRRC website`;

    return prompt;
  }

  /**
   * Format messages with reasonable history (6 messages)
   */
  formatMessages(history, systemPrompt, currentMessage) {
    const messages = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Keep last 6 messages (3 exchanges)
    const recent = history.slice(-6);
    
    recent.forEach(msg => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  /**
   * Handle Groq API errors
   */
  handleError(error) {
    const message = error.message || 'Unknown error';

    if (message.includes('API key') || message.includes('401')) {
      return 'API configuration error';
    }
    
    if (message.includes('quota') || message.includes('limit') || message.includes('429')) {
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
      configured: !!process.env.GROQ_API_KEY
    };
  }
}

// Export singleton instance
module.exports = new ChatbotService();