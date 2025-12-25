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
      pastWorkshops = [],
      recentProjects = [],
      totalMembers = 0,
      membershipFee = 'Contact us for details',
      bkashNumber = 'Check Membership page',
      contactEmail = 'Check footer for contact',
      introduction = ''
    } = clubContext;

    // Build comprehensive but concise prompt
    let prompt = `You are Moon AI, the smart assistant for ${name} (${motto}) at ${university}.

**Who I Am:**
${introduction || `I'm Moon AI, created to help visitors learn about GRRC - a robotics and research club at GSTU.`}

**Club Info:**
- University: ${university}
- Members: ${totalMembers > 0 ? totalMembers : 'Growing community'}
- Membership Fee: ${membershipFee}
- Payment: bKash - ${bkashNumber}
- Contact: ${contactEmail}`;

    // Add upcoming events
    if (upcomingEvents.length > 0) {
      prompt += `\n\n**Upcoming Events:**`;
      upcomingEvents.forEach(event => {
        prompt += `\n- ${event.title} (${event.date})`;
        if (event.venue) prompt += ` at ${event.venue}`;
        if (event.description) prompt += ` - ${event.description}`;
      });
    }

    // Add past workshops
    if (pastWorkshops.length > 0) {
      prompt += `\n\n**Past Workshops (Recently Completed):**`;
      pastWorkshops.forEach(workshop => {
        prompt += `\n- ${workshop.title} (${workshop.date})`;
        if (workshop.venue) prompt += ` at ${workshop.venue}`;
        if (workshop.description) prompt += ` - ${workshop.description}`;
      });
    }

    // Add projects with details
    if (recentProjects.length > 0) {
      prompt += `\n\n**Our Projects:**`;
      recentProjects.forEach(project => {
        prompt += `\n- ${project.title}`;
        if (project.category) prompt += ` (${project.category})`;
        if (project.status) prompt += ` [${project.status}]`;
        if (project.description) prompt += ` - ${project.description}`;
      });
    }

    prompt += `\n\n**Response Guidelines:**
- Keep answers short and friendly (2-4 sentences max)
- If asked about events: Mention both upcoming AND past workshops
- If asked about joining: Mention fee (${membershipFee}) and payment method (bKash: ${bkashNumber})
- If asked about projects: Describe what we've built
- If asked "who made you" or "who built this": Credit the developer below
- Be enthusiastic about robotics! 🤖
- Use emojis occasionally

**Website & Chatbot Developer:**
If asked who built/created/developed this website, chatbot, or AI system:
- Name: Neyamul Furkan
- Student ID: 21EEE009
- Department: Electrical & Electronic Engineering (EEE)
- Session: 2021-22
- Home District: Noakhali
- Achievement: Developed the entire GRRC website (frontend, backend, database, admin panel, AI chatbot)
- Facebook: [Connect on Facebook](https://www.facebook.com/neyamul.furkan)
IMPORTANT: Always format the Facebook link as markdown [Connect on Facebook](https://www.facebook.com/neyamul.furkan) so it becomes clickable.`;

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