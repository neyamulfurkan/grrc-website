/**
 * GRRC AI Chatbot - Frontend Logic
 * Powered by Google Gemini API
 * Version: 1.0.0
 */

class GRRCChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.isTyping = false;
    this.clubContext = null;
    
    // Welcome messages pool
    this.welcomeQuestions = [
      "Hi! 👋 I'm the GRRC AI Assistant. What brings you here today?",
      "Hello! 🤖 Curious about robotics? Ask me anything!",
      "Welcome! 🎓 Want to know about our club activities?",
      "Hey there! 💡 Looking for project ideas or event info?",
      "Greetings! 🚀 How can I help you explore robotics today?",
      "Hi! 🔧 Interested in joining our workshops or competitions?",
      "Hello! 🌟 Got questions about our executive team or projects?",
      "Welcome! 📚 Need guidance on getting started with robotics?"
    ];
    
    this.init();
  }

  init() {
    this.createChatbotUI();
    this.attachEventListeners();
    this.loadClubContext();
  }

  createChatbotUI() {
    const chatbotHTML = `
      <!-- Chatbot Toggle Button -->
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Open AI Chatbot">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="chatbot-badge">AI</span>
      </button>

      <!-- Chatbot Window -->
      <div id="chatbot-window" class="chatbot-window">
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-8c.83 0 1.5-.67 1.5-1.5S7.83 9 7 9s-1.5.67-1.5 1.5S6.17 12 7 12zm10 0c.83 0 1.5-.67 1.5-1.5S17.83 9 17 9s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-5 4c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </div>
            <div>
              <div class="chatbot-title">GRRC AI Assistant</div>
              <div class="chatbot-status">
                <span class="status-dot"></span>
                <span>Online - Powered by Gemini</span>
              </div>
            </div>
          </div>
          <button id="chatbot-close" class="chatbot-close" aria-label="Close chat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div id="chatbot-messages" class="chatbot-messages">
          <!-- Messages will be inserted here -->
        </div>

        <div class="chatbot-input-container">
          <div class="chatbot-suggestions" id="chatbot-suggestions">
            <button class="suggestion-chip" data-text="Tell me about GRRC">About GRRC</button>
            <button class="suggestion-chip" data-text="What events are upcoming?">Events</button>
            <button class="suggestion-chip" data-text="How can I join?">Join Us</button>
            <button class="suggestion-chip" data-text="Show me projects">Projects</button>
          </div>
          <div class="chatbot-input-wrapper">
            <textarea 
              id="chatbot-input" 
              class="chatbot-input" 
              placeholder="Ask me anything about GRRC..."
              rows="1"
            ></textarea>
            <button id="chatbot-send" class="chatbot-send" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    const toggle = document.getElementById('chatbot-toggle');
    const close = document.getElementById('chatbot-close');
    const send = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');
    const suggestions = document.getElementById('chatbot-suggestions');

    toggle.addEventListener('click', () => this.toggleChat());
    close.addEventListener('click', () => this.closeChat());
    send.addEventListener('click', () => this.sendMessage());
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    input.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });

    suggestions.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-chip')) {
        const text = e.target.dataset.text;
        input.value = text;
        this.sendMessage();
      }
    });
  }

  async loadClubContext() {
    try {
      // Load club configuration and events from cache or API
      const clubConfig = JSON.parse(localStorage.getItem('cache_clubConfig') || '{}');
      const events = JSON.parse(localStorage.getItem('cache_events') || '[]');
      const members = JSON.parse(localStorage.getItem('cache_members') || '[]');
      const projects = JSON.parse(localStorage.getItem('cache_projects') || '[]');

      this.clubContext = {
        name: clubConfig.name || 'GSTU Robotics & Research Club',
        motto: clubConfig.motto || 'A Hub of Robothinkers',
        description: clubConfig.description || 'Innovation and technology community',
        university: clubConfig.university || 'Gopalganj Science and Technology University',
        upcomingEvents: events.filter(e => e.status === 'upcoming').slice(0, 3),
        recentProjects: projects.slice(0, 3),
        executiveCount: members.filter(m => m.role?.includes('Executive')).length,
        totalMembers: members.length
      };

      console.log('✅ Chatbot context loaded');
    } catch (error) {
      console.warn('⚠️ Could not load full context:', error);
      this.clubContext = {
        name: 'GSTU Robotics & Research Club',
        motto: 'A Hub of Robothinkers',
        description: 'Innovation and technology community'
      };
    }
  }

  buildSystemPrompt() {
    const {
      name = 'GSTU Robotics & Research Club',
      motto = 'A Hub of Robothinkers',
      description = 'A community of robotics and technology enthusiasts',
      university = 'Gopalganj Science and Technology University',
      upcomingEvents = [],
      recentProjects = [],
      executiveCount = 0,
      totalMembers = 0
    } = this.clubContext || {};

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
- Use markdown formatting when helpful (**bold**, *italic*)`;

    return prompt;
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');

    if (this.isOpen) {
      window.classList.add('active');
      toggle.classList.add('hidden');
      
      // Show welcome message if first time
      if (this.conversationHistory.length === 0) {
        this.showWelcomeMessage();
      }
      
      // Focus input
      setTimeout(() => {
        document.getElementById('chatbot-input').focus();
      }, 300);
    } else {
      window.classList.remove('active');
      toggle.classList.remove('hidden');
    }
  }

  closeChat() {
    this.isOpen = false;
    document.getElementById('chatbot-window').classList.remove('active');
    document.getElementById('chatbot-toggle').classList.remove('hidden');
  }

  showWelcomeMessage() {
    const randomWelcome = this.welcomeQuestions[
      Math.floor(Math.random() * this.welcomeQuestions.length)
    ];
    
    this.addMessage(randomWelcome, 'bot');
  }

  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message || this.isTyping) return;

    // Add user message
    this.addMessage(message, 'user');
    this.conversationHistory.push({ role: 'user', content: message });
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Hide suggestions after first message
    document.getElementById('chatbot-suggestions').style.display = 'none';

    // Get AI response
    await this.getAIResponse(message);
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}-message`;

    if (sender === 'bot') {
      messageDiv.innerHTML = `
        <div class="message-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
        <div class="message-content">${this.formatMessage(text)}</div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-content">${this.escapeHtml(text)}</div>
        <div class="message-avatar user-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    this.isTyping = true;
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message bot-message typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      </div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  removeTypingIndicator() {
    this.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  async getAIResponse(userMessage) {
    this.showTypingIndicator();

    try {
      // Get API key from config (you'll need to add this)
      const GEMINI_API_KEY = window.CHATBOT_CONFIG?.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
      
      if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        throw new Error('Gemini API key not configured');
      }

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Format messages for Gemini
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: "Understood! I'm ready to help visitors learn about GRRC. How can I assist?" }]
        }
      ];

      // Add conversation history (last 10 messages)
      this.conversationHistory.slice(-10).forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      // Call Gemini API directly
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();

      this.removeTypingIndicator();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        this.addMessage(aiResponse, 'bot');
        this.conversationHistory.push({ role: 'assistant', content: aiResponse });
      } else {
        throw new Error('Invalid response format from Gemini');
      }
    } catch (error) {
      console.error('❌ Chatbot error:', error);
      this.removeTypingIndicator();
      
      const errorMessage = "I'm having trouble connecting right now. Please try again in a moment! 🔄";
      this.addMessage(errorMessage, 'bot');
    }
  }

  formatMessage(text) {
    // Convert markdown-style formatting to HTML
    let formatted = this.escapeHtml(text);
    
    // Bold: **text** -> <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text* -> <em>text</em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links: [text](url) -> <a>text</a>
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.grrcChatbot = new GRRCChatbot();
  });
} else {
  window.grrcChatbot = new GRRCChatbot();
}

console.log('✅ GRRC Chatbot initialized');