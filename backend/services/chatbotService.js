/**
 * Chatbot Service - Ultra-Optimized with Complete Knowledge
 * Groq Llama API Integration
 */

const Groq = require('groq-sdk');

class ChatbotService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not set');
      this.groq = null;
    } else {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    
    this.model = 'llama-3.3-70b-versatile';
    this.defaultConfig = {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 600
    };
  }

  isReady() {
    return this.groq !== null;
  }

  async generateResponse(message, conversationHistory = [], clubContext = {}) {
    if (!this.isReady()) {
      throw new Error('Chatbot service not configured');
    }

    try {
      const systemPrompt = this.buildSystemPrompt(clubContext);
      const messages = this.formatMessages(conversationHistory, systemPrompt, message);

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
      console.error('❌ Chatbot error:', error);
      
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  buildSystemPrompt(clubContext) {
    const {
      name = 'GSTU Robotics & Research Club',
      motto = 'A Hub of Robothinkers',
      university = 'Gopalganj Science and Technology University',
      upcomingEvents = [],
      pastWorkshops = [],
      pastCompetitions = [],
      pastSeminars = [],
      pastMeetups = [],
      totalPastEvents = 0,
      projects = [],
      totalMembers = 0,
      totalExecutives = 0,
      executiveMembers = {},
      totalAlumni = 0,
      featuredAlumni = [],
      membershipFee = '500',
      bkashNumber = '01712345678',
      contactEmail = 'contact@grrc.edu',
      socialLinks = []
    } = clubContext;

    let prompt = `You are Moon AI, smart assistant for ${name} (${motto}) at ${university}.

**About Us:**
- University: ${university}
- Members: ${totalMembers} (${totalExecutives} executives)
- Alumni: ${totalAlumni} proud graduates
- Events Completed: ${totalPastEvents}
- Fee: ৳${membershipFee} via bKash ${bkashNumber}
- Email: ${contactEmail}`;

    // Executive Committee
    if (Object.keys(executiveMembers).length > 0) {
      prompt += `\n\n**Executive Committee:**`;
      Object.entries(executiveMembers).forEach(([position, info]) => {
        prompt += `\n- ${position}: ${info.name} (${info.department})`;
      });
    }

    // Upcoming Events
    if (upcomingEvents.length > 0) {
      prompt += `\n\n**Upcoming Events:**`;
      upcomingEvents.forEach(e => {
        prompt += `\n- ${e.title} (${e.date}) at ${e.venue}`;
      });
    }

    // Past Events Summary
    if (totalPastEvents > 0) {
      prompt += `\n\n**Event History (${totalPastEvents} total):**`;
      
      if (pastWorkshops.length > 0) {
        prompt += `\nWorkshops: `;
        prompt += pastWorkshops.map(e => `${e.title} (${e.date})`).join(', ');
      }
      
      if (pastCompetitions.length > 0) {
        prompt += `\nCompetitions: `;
        prompt += pastCompetitions.map(e => `${e.title} (${e.date})`).join(', ');
      }
      
      if (pastSeminars.length > 0) {
        prompt += `\nSeminars: `;
        prompt += pastSeminars.map(e => `${e.title} (${e.date})`).join(', ');
      }
      
      if (pastMeetups.length > 0) {
        prompt += `\nMeetups: `;
        prompt += pastMeetups.map(e => e.title).join(', ');
      }
    }

    // Projects
    if (projects.length > 0) {
      prompt += `\n\n**Projects:**`;
      projects.forEach(p => {
        prompt += `\n- ${p.title} (${p.category}) [${p.status}]`;
      });
    }

    // Featured Alumni
    if (featuredAlumni.length > 0) {
      prompt += `\n\n**Notable Alumni:**`;
      featuredAlumni.forEach(a => {
        prompt += `\n- ${a.name} (${a.batch}): ${a.currentPosition}`;
      });
    }

    prompt += `\n\n**Guidelines:**
- Keep answers 2-3 sentences max
- If asked about events: Mention both upcoming AND past (workshops/competitions/seminars)
- If asked about executives/committee: List positions and names
- If asked about members: Say we have ${totalMembers} members including ${totalExecutives} executives
- If asked about alumni: Mention ${totalAlumni} alumni
- If asked "how many events": Say ${totalPastEvents} events completed
- If asked about joining: Fee ৳${membershipFee}, bKash ${bkashNumber}
- If asked "who made you": Credit Neyamul Furkan (21EEE009, EEE, 2021-22, Noakhali) - developed entire website/chatbot. Facebook: [Connect](https://www.facebook.com/neyamul.furkan)
- Use emojis occasionally 🤖

IMPORTANT: Keep responses SHORT and friendly. No long lists.`;

    return prompt;
  }

  formatMessages(history, systemPrompt, currentMessage) {
    const messages = [{ role: 'system', content: systemPrompt }];
    
    const recent = history.slice(-6);
    recent.forEach(msg => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });

    messages.push({ role: 'user', content: currentMessage });
    return messages;
  }

  handleError(error) {
    const message = error.message || 'Unknown error';

    if (message.includes('API key') || message.includes('401')) {
      return 'API configuration error';
    }
    
    if (message.includes('quota') || message.includes('limit') || message.includes('429')) {
      return 'Service temporarily unavailable';
    }
    
    if (message.includes('safety') || message.includes('blocked')) {
      return 'Cannot process due to content policy';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network error. Try again';
    }

    return 'Failed to generate response';
  }

  getStatus() {
    return {
      ready: this.isReady(),
      model: this.model,
      configured: !!process.env.GROQ_API_KEY
    };
  }
}

module.exports = new ChatbotService();