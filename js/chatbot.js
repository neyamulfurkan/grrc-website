/**
 * GRRC AI Chatbot - Frontend Logic
 * Provides complete, helpful information
 * Version: 2.1.0
 */

class GRRCChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.isTyping = false;
    this.clubContext = null;
    
    this.welcomeMessages = [
      "Hi! 👋 I'm the GRRC AI Assistant. How can I help you today?",
      "Hello! 🤖 Ask me anything about our robotics club!",
      "Welcome! 🎓 What would you like to know about GRRC?",
      "Hey there! 💡 I'm here to help with any questions!",
      "Greetings! 🚀 How can I assist you with GRRC info?"
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
        <span class="chatbot-badge">GRRC AI</span>
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
                <span>Online - Powered by Groq Llama 3.3</span>
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
            <button class="suggestion-chip" data-text="How much does it cost to join?">Membership Fee</button>
            <button class="suggestion-chip" data-text="Show me your projects">Projects</button>
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
        input.value = e.target.dataset.text;
        this.sendMessage();
      }
    });
  }

  async loadClubContext() {
    try {
      // Load complete context with all details
      const clubConfig = JSON.parse(localStorage.getItem('cache_clubConfig') || '{}');
      const events = JSON.parse(localStorage.getItem('cache_events') || '[]');
      const members = JSON.parse(localStorage.getItem('cache_members') || '[]');
      const projects = JSON.parse(localStorage.getItem('cache_projects') || '[]');

      // Send ALL available information
      this.clubContext = {
        name: clubConfig.name || 'GSTU Robotics & Research Club',
        motto: clubConfig.motto || 'A Hub of Robothinkers',
        university: clubConfig.university || 'Gopalganj Science and Technology University',
        
        // Full event details
        upcomingEvents: events
          .filter(e => e.status === 'upcoming')
          .slice(0, 3)
          .map(e => ({
            title: e.title,
            date: e.date,
            venue: e.venue,
            description: e.description || '',
            registrationLink: e.registrationLink || ''
          })),
        
        // Full project details  
        recentProjects: projects
          .slice(0, 3)
          .map(p => ({
            title: p.title,
            category: p.category,
            description: p.description || ''
          })),
        
        // Member info
        totalMembers: members.length,
        executiveCount: members.filter(m => m.role?.includes('Executive')).length,
        
        // Membership details (add these to your database/config)
        membershipFee: clubConfig.membershipFee || 'Visit Membership page for details',
        membershipBenefits: clubConfig.membershipBenefits || [],
        
        // Contact info
        contactEmail: clubConfig.contactEmail || 'Check footer for contact',
        socialLinks: clubConfig.socialLinks || {}
      };

      console.log('✅ Complete chatbot context loaded');
    } catch (error) {
      console.warn('⚠️ Could not load context:', error);
      this.clubContext = {
        name: 'GSTU Robotics & Research Club',
        motto: 'A Hub of Robothinkers',
        university: 'Gopalganj Science and Technology University'
      };
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');

    if (this.isOpen) {
      window.classList.add('active');
      toggle.classList.add('hidden');
      
      if (this.conversationHistory.length === 0) {
        this.showWelcomeMessage();
      }
      
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
    const msg = this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];
    this.addMessage(msg, 'bot');
  }

  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message || this.isTyping) return;

    this.addMessage(message, 'user');
    this.conversationHistory.push({ role: 'user', content: message });
    
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('chatbot-suggestions').style.display = 'none';

    await this.getAIResponse(message);
  }

  addMessage(text, sender) {
    const container = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = `chatbot-message ${sender}-message`;

    if (sender === 'bot') {
      div.innerHTML = `
        <div class="message-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
        <div class="message-content">${this.formatMessage(text)}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="message-content">${this.escapeHtml(text)}</div>
        <div class="message-avatar user-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      `;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  showTypingIndicator() {
    this.isTyping = true;
    const container = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = 'chatbot-message bot-message typing-indicator';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      </div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  removeTypingIndicator() {
    this.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  async getAIResponse(userMessage) {
    this.showTypingIndicator();

    try {
      const API_ENDPOINT = window.CHATBOT_CONFIG?.API_ENDPOINT;
      
      if (!API_ENDPOINT) {
        throw new Error('Backend API endpoint not configured');
      }

      // Send complete context
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: this.conversationHistory.slice(-6),  // Last 3 exchanges
          clubContext: this.clubContext  // All details included
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      this.removeTypingIndicator();

      if (data.success && data.response) {
        this.addMessage(data.response, 'bot');
        this.conversationHistory.push({ role: 'assistant', content: data.response });
      } else {
        throw new Error('Invalid response from backend');
      }

    } catch (error) {
      console.error('❌ Chatbot error:', error);
      this.removeTypingIndicator();
      
      let msg = "I'm having trouble right now. Please try again in a moment! 🔄";
      
      if (error.message.includes('endpoint') || error.message.includes('configured')) {
        msg = "⚙️ Chatbot service not configured. Contact support.";
      } else if (error.message.includes('429')) {
        msg = "⏰ Too many requests. Please wait a moment and try again.";
      } else if (error.message.includes('fetch') || error.message.includes('Network')) {
        msg = "🌐 Connection error. Check your internet connection.";
      }
      
      this.addMessage(msg, 'bot');
    }
  }

  formatMessage(text) {
    let formatted = this.escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.grrcChatbot = new GRRCChatbot();
  });
} else {
  window.grrcChatbot = new GRRCChatbot();
}

console.log('✅ GRRC Chatbot v2.1 initialized (complete info)');