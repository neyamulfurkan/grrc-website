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
    this.lastMessageTime = 0; // Rate limiting
    
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
        <span class="chatbot-badge">Moon AI</span>
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

      // ✅ Categorize events by date
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const upcomingEvents = events
        .filter(e => {
          const eventDate = new Date(e.date);
          return eventDate >= now;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
      
      const pastWorkshops = events
        .filter(e => {
          const eventDate = new Date(e.date);
          return eventDate < now && (e.category?.toLowerCase().includes('workshop') || e.title?.toLowerCase().includes('workshop'));
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      // Send ALL available information
      this.clubContext = {
        name: clubConfig.name || 'GSTU Robotics & Research Club',
        motto: clubConfig.motto || 'A Hub of Robothinkers',
        university: clubConfig.university || 'Gopalganj Science and Technology University',
        
        // ✅ Full event details (upcoming)
        upcomingEvents: upcomingEvents.map(e => ({
          title: e.title,
          date: e.date,
          venue: e.venue,
          description: e.description || '',
          registrationLink: e.registrationLink || ''
        })),
        
        // ✅ Past workshops
        pastWorkshops: pastWorkshops.map(e => ({
          title: e.title,
          date: e.date,
          venue: e.venue,
          description: e.description || ''
        })),
        
        // Full project details  
        recentProjects: projects
          .slice(0, 5)
          .map(p => ({
            title: p.title,
            category: p.category,
            description: p.description || '',
            status: p.status || 'completed'
          })),
        
        // Member info
        totalMembers: members.length,
        executiveCount: members.filter(m => m.role?.includes('Executive')).length,
        
        // Membership details
        membershipFee: clubConfig.membershipFee || clubConfig.membership_fee || 'Visit Membership page for details',
        bkashNumber: clubConfig.bkash_number || 'Check Membership page',
        
        // Contact info
        contactEmail: clubConfig.contactEmail || 'Check footer for contact',
        socialLinks: clubConfig.socialLinks || {},
        
        // ✅ Introduction
        introduction: `I'm Moon AI, the smart assistant for GSTU Robotics & Research Club (GRRC). We're a community of robotics enthusiasts at Gopalganj Science and Technology University. This website and chatbot system were developed by Neyamul Furkan (ID: 21EEE009, EEE Department, Session 2021-22) from Noakhali.`
      };

      console.log('✅ Complete chatbot context loaded:', {
        upcoming: this.clubContext.upcomingEvents.length,
        pastWorkshops: this.clubContext.pastWorkshops.length,
        projects: this.clubContext.recentProjects.length
      });
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

    // Client-side rate limiting - prevent spam
    const now = Date.now();
    const timeSinceLastMessage = now - (this.lastMessageTime || 0);
    const minInterval = 2000; // 2 seconds between messages
    
    if (timeSinceLastMessage < minInterval) {
      const waitTime = Math.ceil((minInterval - timeSinceLastMessage) / 1000);
      this.addMessage(`⏰ Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`, 'bot');
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
    
    // Bold: **text** -> <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text* -> <em>text</em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links: [text](url) -> <a>text</a> - CLICKABLE!
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
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

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.grrcChatbot = new GRRCChatbot();
    initProactiveChatbot();
  });
} else {
  window.grrcChatbot = new GRRCChatbot();
  initProactiveChatbot();
}

// ✅ PROACTIVE AI MESSAGES (rapid-fire sequence every 10 minutes)
function initProactiveChatbot() {
  const messageSequences = [
    // Sequence 1: Introduction
    [
      "👋 Hey! I'm Moon AI from GRRC. We're a robotics club at GSTU.",
      "🤖 We build robots, host workshops, and create innovative projects!",
      "💡 Want to know about our upcoming events? Just click me!"
    ],
    // Sequence 2: Membership
    [
      "🎓 Hi there! GRRC welcomes all tech enthusiasts at GSTU.",
      "💳 Join us! Membership is easy - just check the Membership page.",
      "🚀 Ask me anything about joining or our activities!"
    ],
    // Sequence 3: Events
    [
      "📅 Hello! We host workshops and competitions every month.",
      "🔥 Want to see what events are coming up?",
      "✨ Click me to learn about registration and dates!"
    ],
    // Sequence 4: Projects
    [
      "🤖 Greetings! GRRC has built amazing robotics projects.",
      "🛠️ From line followers to AI systems - we do it all!",
      "💬 Curious about our projects? Ask me!"
    ],
    // Sequence 5: Community
    [
      "👋 Hey! GRRC is more than a club - it's a family of robothinkers.",
      "🌟 Join our community chat, attend workshops, and innovate!",
      "🚀 Ready to explore robotics? Click me to start!"
    ]
  ];
  
  let sequenceIndex = 0;
  
  function showMessageSequence() {
    // Don't show if chat is already open
    if (window.grrcChatbot && window.grrcChatbot.isOpen) return;
    
    const currentSequence = messageSequences[sequenceIndex];
    
    // Show each message in sequence with 4-5 second delays
    currentSequence.forEach((message, index) => {
      setTimeout(() => {
        showProactiveMessage(message);
      }, index * 5000); // 5 seconds between each message
    });
    
    // Move to next sequence (loop back to start after last one)
    sequenceIndex = (sequenceIndex + 1) % messageSequences.length;
  }
  
  function showProactiveMessage(messageText) {
    // Don't show if chat is already open
    if (window.grrcChatbot && window.grrcChatbot.isOpen) return;
    
    const toggle = document.getElementById('chatbot-toggle');
    if (!toggle) return;
    
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      position: fixed;
      bottom: 95px;
      right: 24px;
      background: white;
      color: #1a202c;
      padding: 1rem 1.25rem;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      max-width: 280px;
      z-index: 998;
      animation: bounceIn 0.5s ease;
      cursor: pointer;
      border: 2px solid var(--primary-color);
    `;
    
    bubble.innerHTML = `
      <div style="font-size: 0.875rem; line-height: 1.4;">${messageText}</div>
      <div style="position: absolute; bottom: -8px; right: 20px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid white;"></div>
    `;
    
    document.body.appendChild(bubble);
    
    // Open chatbot on click
    bubble.addEventListener('click', () => {
      if (window.grrcChatbot) {
        window.grrcChatbot.toggleChat();
      }
      bubble.remove();
    });
    
    // Auto remove after 7 seconds
    setTimeout(() => {
      bubble.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => bubble.remove(), 300);
    }, 7000);
  }
  
  // Show first sequence after 3 seconds
  setTimeout(() => {
    showMessageSequence();
    
        setInterval(showMessageSequence, 1 * 60 * 1000);
  }, 3000);
}

console.log('✅ GRRC Chatbot v2.1 initialized - Powered by Moon');