/**
 * GRRC AI Chatbot - Ultra-Lite Full Knowledge
 * Complete club information with optimized context
 */

class GRRCChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.isTyping = false;
    this.clubContext = null;
    this.lastMessageTime = 0;
    
    this.welcomeMessages = [
      "Hi! 👋 I'm Moon AI. Ask me about GRRC!",
      "Hello! 🤖 What can I help you with?",
      "Welcome! 🎓 Ask me anything about our club!"
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
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Open AI Chatbot">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="chatbot-badge">Moon AI</span>
      </button>

      <div id="chatbot-window" class="chatbot-window">
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-8c.83 0 1.5-.67 1.5-1.5S7.83 9 7 9s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm10 0c.83 0 1.5-.67 1.5-1.5S17.83 9 17 9s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-5 4c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </div>
            <div>
              <div class="chatbot-title">GRRC AI Assistant</div>
              <div class="chatbot-status">
                <span class="status-dot"></span>
                <span>Online - Powered by Moon</span>
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

        <div id="chatbot-messages" class="chatbot-messages"></div>

        <div class="chatbot-input-container">
          <div class="chatbot-suggestions" id="chatbot-suggestions">
            <button class="suggestion-chip" data-text="Tell me about GRRC">About Us</button>
            <button class="suggestion-chip" data-text="Upcoming events?">Events</button>
            <button class="suggestion-chip" data-text="How to join?">Join</button>
            <button class="suggestion-chip" data-text="Show projects">Projects</button>
          </div>
          <div class="chatbot-input-wrapper">
            <textarea 
              id="chatbot-input" 
              class="chatbot-input" 
              placeholder="Ask me anything..."
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
    if (this.clubContext && Object.keys(this.clubContext).length > 5) {
      console.log('✅ Using cached context');
      return;
    }
    
    try {
      const clubConfig = await this.getFromCache('cache_clubConfig', {});
      const events = await this.getFromCache('cache_events', []);
      const members = await this.getFromCache('cache_members', []);
      const projects = await this.getFromCache('cache_projects', []);
      const alumni = await this.getFromCache('cache_alumni', []);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Categorize events
      const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
      const past = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Group past events by category
      const pastByCategory = {
        workshop: past.filter(e => e.category?.toLowerCase() === 'workshop').slice(0, 7),
        competition: past.filter(e => e.category?.toLowerCase() === 'competition').slice(0, 5),
        seminar: past.filter(e => e.category?.toLowerCase() === 'seminar').slice(0, 5),
        meetup: past.filter(e => e.category?.toLowerCase() === 'meetup').slice(0, 3),
        general: past.filter(e => !e.category || e.category.toLowerCase() === 'general').slice(0, 3)
      };

      // Get executive members with positions
      const executives = members.filter(m => m.role === 'Executive Member');
      const executivesByPosition = {};
      executives.forEach(exec => {
        if (exec.position) {
          executivesByPosition[exec.position] = {
            name: exec.name,
            department: exec.department,
            email: exec.email
          };
        }
      });

      this.clubContext = {
        // Basic info
        name: clubConfig.name || clubConfig.club_name || 'GSTU Robotics & Research Club',
        motto: clubConfig.motto || clubConfig.club_motto || 'A Hub of Robothinkers',
        university: clubConfig.university || 'Gopalganj Science and Technology University',
        
        // Events
        upcomingEvents: upcoming.map(e => ({
          title: e.title,
          date: e.date,
          venue: e.venue,
          category: e.category,
          description: e.description || ''
        })),
        
        pastWorkshops: pastByCategory.workshop.map(e => ({
          title: e.title,
          date: e.date,
          venue: e.venue
        })),
        
        pastCompetitions: pastByCategory.competition.map(e => ({
          title: e.title,
          date: e.date,
          venue: e.venue
        })),
        
        pastSeminars: pastByCategory.seminar.map(e => ({
          title: e.title,
          date: e.date,
          venue: e.venue
        })),
        
        pastMeetups: pastByCategory.meetup.map(e => ({
          title: e.title,
          date: e.date
        })),
        
        totalPastEvents: past.length,
        
        // Projects
        projects: projects.slice(0, 8).map(p => ({
          title: p.title,
          category: p.category,
          status: p.status,
          description: p.description || ''
        })),
        
        // Members
        totalMembers: members.length,
        totalExecutives: executives.length,
        executiveMembers: executivesByPosition,
        
        // Alumni
        totalAlumni: alumni.length,
        featuredAlumni: alumni.filter(a => a.is_featured).slice(0, 3).map(a => ({
          name: a.name,
          batch: a.batch_year,
          currentPosition: a.current_position
        })),
        
        // Membership
        membershipFee: clubConfig.membershipFee || clubConfig.membership_fee || '500',
        bkashNumber: clubConfig.bkash_number || clubConfig.bkashNumber || '01712345678',
        
        // Contact
        contactEmail: clubConfig.contactEmail || clubConfig.email || 'contact@grrc.edu',
        socialLinks: clubConfig.socialLinks || clubConfig.social_links || []
      };

      console.log('✅ Complete context loaded:', {
        upcoming: this.clubContext.upcomingEvents.length,
        pastEvents: this.clubContext.totalPastEvents,
        workshops: this.clubContext.pastWorkshops.length,
        competitions: this.clubContext.pastCompetitions.length,
        seminars: this.clubContext.pastSeminars.length,
        projects: this.clubContext.projects.length,
        members: this.clubContext.totalMembers,
        executives: this.clubContext.totalExecutives,
        alumni: this.clubContext.totalAlumni
      });
    } catch (error) {
      console.warn('⚠️ Context load error:', error);
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
      
      setTimeout(() => document.getElementById('chatbot-input').focus(), 300);
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

    const now = Date.now();
    if (now - this.lastMessageTime < 2000) {
      const wait = Math.ceil((2000 - (now - this.lastMessageTime)) / 1000);
      this.addMessage(`⏰ Please wait ${wait} second${wait > 1 ? 's' : ''}`, 'bot');
      return;
    }
    
    this.lastMessageTime = now;

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
        throw new Error('Backend API not configured');
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: this.conversationHistory.slice(-6),
          clubContext: this.clubContext
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
        throw new Error('Invalid response');
      }

    } catch (error) {
      console.error('❌ Error:', error);
      this.removeTypingIndicator();
      
      let msg = "I'm having trouble. Please try again! 🔄";
      
      if (error.message.includes('configured')) {
        msg = "⚙️ Service not configured. Contact support.";
      } else if (error.message.includes('429')) {
        msg = "⏰ Too many requests. Wait a moment.";
      } else if (error.message.includes('Network')) {
        msg = "🌐 Connection error. Check internet.";
      }
      
      this.addMessage(msg, 'bot');
    }
  }

  formatMessage(text) {
    let formatted = this.escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async getFromCache(key, defaultValue) {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const data = localStorage.getItem(key);
          resolve(data ? JSON.parse(data) : defaultValue);
        } catch (error) {
          resolve(defaultValue);
        }
      }, 0);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.grrcChatbot = new GRRCChatbot();
    initProactiveChatbot();
  });
} else {
  window.grrcChatbot = new GRRCChatbot();
  initProactiveChatbot();
}

function initProactiveChatbot() {
  const sequences = [
    ["👋 Hey! I'm Moon AI from GRRC at GSTU.", "🤖 We build robots and host tech events!", "💡 Ask me about joining or our activities!"],
    ["🎓 GRRC welcomes all GSTU tech enthusiasts.", "💳 Joining is easy - check Membership page.", "🚀 Ask me anything!"],
    ["📅 We host workshops and competitions monthly.", "🔥 Want to see upcoming events?", "✨ Click me to learn more!"],
    ["🤖 GRRC has built amazing projects.", "🛠️ From robotics to AI systems!", "💬 Curious? Ask me!"],
    ["👋 GRRC is a family of robothinkers.", "🌟 Join workshops and innovate!", "🚀 Ready to explore? Click me!"]
  ];
  
  let idx = 0;
  
  function show() {
    if (window.grrcChatbot && window.grrcChatbot.isOpen) return;
    
    const seq = sequences[idx];
    seq.forEach((msg, i) => {
      setTimeout(() => showMsg(msg), i * 8000);
    });
    
    idx = (idx + 1) % sequences.length;
  }
  
  function showMsg(text) {
    if (window.grrcChatbot && window.grrcChatbot.isOpen) return;
    
    const bubble = document.createElement('div');
    bubble.style.cssText = `position:fixed;bottom:160px;right:24px;background:white;color:#1a202c;padding:1rem 1.25rem;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.2);max-width:280px;z-index:998;cursor:pointer;border:2px solid var(--primary-color)`;
    bubble.innerHTML = `<div style="font-size:0.875rem;line-height:1.4;">${text}</div>`;
    
    if (window.innerWidth <= 768) {
      bubble.style.bottom = '150px';
      bubble.style.right = '20px';
      bubble.style.maxWidth = '260px';
    }
    
    document.body.appendChild(bubble);
    
    bubble.addEventListener('click', () => {
      if (window.grrcChatbot) window.grrcChatbot.toggleChat();
      bubble.remove();
    });
    
    setTimeout(() => bubble.remove(), 7000);
  }
  
  setTimeout(() => {
    show();
    setInterval(show, 15 * 60 * 1000);
  }, 5000);
}

console.log('✅ GRRC Chatbot v3.0 - Complete Knowledge');