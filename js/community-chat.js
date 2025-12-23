/**
 * community-chat.js
 * Main chat functionality with real-time messaging
 */

import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let selectedUserId = null;
let usersUnsubscribe = null;
let messagesUnsubscribe = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
  console.log('🔐 Auth state changed. User:', user ? user.uid : 'None');
  
  if (!user) {
    console.log('❌ No user authenticated, redirecting to login');
    window.location.href = 'community-auth.html';
    return;
  }
  
  console.log('✅ User authenticated:', user.email);
  
  try {
    console.log('📝 Fetching user document from Firestore...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      console.log('✅ User document found in Firestore');
      const userData = userDoc.data();
      
      // ✅ CRITICAL FIX: Check if user is banned
      if (userData.banned) {
        console.warn('🚫 User is banned');
        alert(`Your account has been banned.\n\nReason: ${userData.banReason || 'No reason provided'}\n\nContact administrators for more information.`);
        await signOut(auth);
        window.location.href = 'community-auth.html';
        return;
      }
      
      currentUser = { uid: user.uid, ...userData };
      console.log('✅ Current user loaded:', currentUser.name);
      
      // Update last seen timestamp
      await updateDoc(doc(db, 'users', user.uid), {
        lastSeen: new Date().toISOString()
      });
      
      initializeChat();
    } else {
      console.error('❌ User document does NOT exist in Firestore');
      console.log('User ID:', user.uid);
      console.log('This should have been created during signup!');
      
      // Create the document now as a fallback
      console.log('📝 Creating missing user document...');
      const fallbackUserData = {
        name: user.email.split('@')[0],
        email: user.email,
        avatar: {
          type: 'letter',
          value: user.email.charAt(0).toUpperCase()
        },
        memberMatch: null,
        banned: false,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), fallbackUserData);
      console.log('✅ Fallback user document created');
      
      currentUser = { uid: user.uid, ...fallbackUserData };
      initializeChat();
    }
  } catch (error) {
    console.error('❌ Error loading user:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    alert('Failed to load user data. Error: ' + error.message);
    await signOut(auth);
    window.location.href = 'community-auth.html';
  }
});

// Initialize chat interface
function initializeChat() {
  console.log('✅ Chat initialized for:', currentUser.name);
  
  // Add "Global Chat" as first item in users list
  addGlobalChatOption();
  
  // Load users list
  loadUsers();
  
  // Setup event listeners
  setupEventListeners();
}

// Add Global Chat option at top of users list
function addGlobalChatOption() {
  const container = document.getElementById('usersList');
  
  const globalChatHTML = `
    <div class="user-item global-chat-item" data-user-id="__GLOBAL__" style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; border-radius: 8px; margin-bottom: 0.5rem;">
      <div class="user-avatar" style="background: rgba(255,255,255,0.3);">
        🌍
      </div>
      <div class="user-info">
        <div class="user-name" style="color: white; font-weight: 600;">Global Chat</div>
        <div class="user-status" style="color: rgba(255,255,255,0.8);">Community Discussion</div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('afterbegin', globalChatHTML);
  
  // Add click handler for global chat
  container.querySelector('.global-chat-item').addEventListener('click', () => {
    selectGlobalChat();
  });
}

// Select global chat
function selectGlobalChat() {
  selectedUserId = '__GLOBAL__';
  
  // Update UI
  document.querySelectorAll('.user-item').forEach(item => {
    item.classList.toggle('active', item.dataset.userId === '__GLOBAL__');
  });
  
  // Show chat area
  document.getElementById('emptyChat').style.display = 'none';
  document.getElementById('chatContent').style.display = 'flex';
  
  // Update chat header
  document.getElementById('chatUserAvatar').innerHTML = '🌍';
  document.getElementById('chatUserAvatar').style.fontSize = '1.5rem';
  document.getElementById('chatUserName').textContent = 'Global Chat';
  document.getElementById('chatUserStatus').textContent = 'Everyone can see these messages';
  
  // Load global messages
  loadGlobalMessages();
  
  // Mobile: Show chat
  if (window.innerWidth <= 768) {
    document.getElementById('usersSidebar').classList.remove('mobile-show');
    document.getElementById('chatArea').classList.add('mobile-show');
  }
}

// Load global messages
function loadGlobalMessages() {
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }
  
  const messagesQuery = query(
    collection(db, 'global_chat'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  
  messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    renderGlobalMessages(messages);
  });
}

// Render global messages
function renderGlobalMessages(messages) {
  const container = document.getElementById('chatMessages');
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div style="margin: auto; text-align: center; color: var(--text-secondary);">
        <p>No messages yet. Start the conversation! 🌍</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = messages.map(msg => {
    const isOwn = msg.senderId === currentUser.uid;
    const senderName = msg.senderName || 'Unknown';
    
    const time = msg.timestamp ? 
      formatTime(msg.timestamp.toDate()) : 
      'Sending...';
    
    return `
      <div class="message ${isOwn ? 'own' : ''}">
        <div class="message-content">
          ${!isOwn ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; font-weight: 600;">${escapeHtml(senderName)}</div>` : ''}
          <p class="message-text">${escapeHtml(msg.text)}</p>
          <div class="message-time">${time}</div>
          ${isOwn ? `<button class="message-actions" data-msg-id="${msg.id}">Delete</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  container.scrollTop = container.scrollHeight;
  
  // Add delete handlers
  container.querySelectorAll('.message-actions').forEach(btn => {
    btn.addEventListener('click', () => deleteGlobalMessage(btn.dataset.msgId));
  });
}

// Delete global message
async function deleteGlobalMessage(messageId) {
  if (!confirm('Delete this message?')) return;
  
  try {
    await deleteDoc(doc(db, 'global_chat', messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
    alert('Failed to delete message.');
  }
}

// Load all users (except current user)
function loadUsers() {
  const usersQuery = query(collection(db, 'users'));
  
  usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
    const users = [];
    snapshot.forEach((doc) => {
      if (doc.id !== currentUser.uid) {
        users.push({ uid: doc.id, ...doc.data() });
      }
    });
    
    renderUsersList(users);
  });
}

// Render users list with online indicators
function renderUsersList(users) {
  const container = document.getElementById('usersList');
  const searchTerm = document.getElementById('usersSearch').value.toLowerCase();
  
  // Filter users by search
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm) ||
    (u.email && u.email.toLowerCase().includes(searchTerm))
  );
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
        <p>No users found</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(user => {
    const isActive = selectedUserId === user.uid;
    const avatar = renderAvatar(user.avatar, user.name);
    const onlineStatus = calculateOnlineStatus(user.lastSeen);
    const isOnline = onlineStatus === 'Online';
    
    return `
      <div class="user-item ${isActive ? 'active' : ''}" data-user-id="${user.uid}">
        <div class="user-avatar" style="position: relative;">
          ${avatar}
          ${isOnline ? '<span class="online-indicator"></span>' : ''}
        </div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(user.name)}</div>
          <div class="user-status" style="color: ${isOnline ? '#10b981' : 'var(--text-secondary)'}">${onlineStatus}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.user-item').forEach(item => {
    item.addEventListener('click', () => {
      selectUser(item.dataset.userId);
    });
  });
}

// Select user and load chat
function selectUser(userId) {
  selectedUserId = userId;
  
  // Update UI
  document.querySelectorAll('.user-item').forEach(item => {
    item.classList.toggle('active', item.dataset.userId === userId);
  });
  
  // Show chat area
  document.getElementById('emptyChat').style.display = 'none';
  document.getElementById('chatContent').style.display = 'flex';
  
  // Load selected user info
  loadChatUser(userId);
  
  // Load messages
  loadMessages(userId);
  
  // Mobile: Show chat, hide users list
  if (window.innerWidth <= 768) {
    document.getElementById('usersSidebar').classList.remove('mobile-show');
    document.getElementById('chatArea').classList.add('mobile-show');
  }
}

// Load chat user info with real-time status
async function loadChatUser(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const user = userDoc.data();
      const avatar = renderAvatar(user.avatar, user.name);
      
      document.getElementById('chatUserAvatar').innerHTML = avatar;
      document.getElementById('chatUserName').textContent = user.name;
      
      // Calculate real online status
      const status = calculateOnlineStatus(user.lastSeen);
      document.getElementById('chatUserStatus').textContent = status;
      document.getElementById('chatUserStatus').style.color = status === 'Online' ? '#10b981' : 'var(--text-secondary)';
    }
  } catch (error) {
    console.error('Error loading chat user:', error);
  }
}

// Helper: Calculate online status
function calculateOnlineStatus(lastSeen) {
  if (!lastSeen) return 'Offline';
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMinutes = (now - lastSeenDate) / 1000 / 60;
  
  if (diffMinutes < 5) return 'Online';
  if (diffMinutes < 60) return `Active ${Math.floor(diffMinutes)}m ago`;
  if (diffMinutes < 1440) return `Active ${Math.floor(diffMinutes / 60)}h ago`;
  return 'Offline';
}

// Load messages
function loadMessages(otherUserId) {
  // Unsubscribe from previous messages listener
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }
  
  // Create chat ID (alphabetically sorted user IDs)
  const chatId = [currentUser.uid, otherUserId].sort().join('_');
  
  // Query messages
  const messagesQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  
  messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    renderMessages(messages);
  });
}

// Render messages
function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div style="margin: auto; text-align: center; color: var(--text-secondary);">
        <p>No messages yet. Start the conversation! 👋</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = messages.map(msg => {
    const isOwn = msg.senderId === currentUser.uid;
    const avatar = isOwn ? 
      renderAvatar(currentUser.avatar, currentUser.name) :
      ''; // Other user avatar loaded from cache
    
    const time = msg.timestamp ? 
      formatTime(msg.timestamp.toDate()) : 
      'Sending...';
    
    return `
      <div class="message ${isOwn ? 'own' : ''}">
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
          <p class="message-text">${escapeHtml(msg.text)}</p>
          <div class="message-time">${time}</div>
          ${isOwn ? `<button class="message-actions" data-msg-id="${msg.id}">Delete</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
  
  // Add delete handlers
  container.querySelectorAll('.message-actions').forEach(btn => {
    btn.addEventListener('click', () => deleteMessage(btn.dataset.msgId));
  });
}

// Send message (supports both 1-on-1 and global chat)
async function sendMessage() {
  if (!selectedUserId) return;
  
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text) return;
  
  try {
    if (selectedUserId === '__GLOBAL__') {
      // Send to global chat
      await addDoc(collection(db, 'global_chat'), {
        text: text,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        timestamp: serverTimestamp()
      });
    } else {
      // Send to 1-on-1 chat
      const chatId = [currentUser.uid, selectedUserId].sort().join('_');
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: text,
        senderId: currentUser.uid,
        receiverId: selectedUserId,
        timestamp: serverTimestamp()
      });
    }
    
    input.value = '';
    input.style.height = 'auto';
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  }
}

// Delete message
async function deleteMessage(messageId) {
  if (!selectedUserId || !confirm('Delete this message?')) return;
  
  try {
    const chatId = [currentUser.uid, selectedUserId].sort().join('_');
    await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
    alert('Failed to delete message.');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Logout from community chat?')) {
      try {
        await signOut(auth);
        window.location.href = 'community-auth.html';
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
      }
    }
  });
  
  // Users search
  document.getElementById('usersSearch').addEventListener('input', () => {
    loadUsers(); // Re-render with search filter
  });
  
  // Send button
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  
  // Message input - Enter to send
  const input = document.getElementById('messageInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize textarea
  input.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  });
  
  // Mobile: Back to users list
  document.getElementById('mobileChatBackBtn').addEventListener('click', () => {
    document.getElementById('chatArea').classList.remove('mobile-show');
    document.getElementById('usersSidebar').classList.add('mobile-show');
    selectedUserId = null;
  });
}

// Helper: Render avatar
function renderAvatar(avatarData, name) {
  if (!avatarData) {
    return name.charAt(0).toUpperCase();
  }
  
  if (avatarData.type === 'image') {
    return `<img src="${avatarData.value}" alt="${name}">`;
  }
  
  return avatarData.value || name.charAt(0).toUpperCase();
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Format time
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' mins ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (usersUnsubscribe) usersUnsubscribe();
  if (messagesUnsubscribe) messagesUnsubscribe();
});

// Initialize mobile view state
function initializeMobileView() {
  if (window.innerWidth <= 768) {
    document.getElementById('usersSidebar').classList.add('mobile-show');
    document.getElementById('chatArea').classList.remove('mobile-show');
  }
}

// Call on load
window.addEventListener('load', initializeMobileView);
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    // Reset mobile classes on desktop
    document.getElementById('usersSidebar').classList.remove('mobile-show');
    document.getElementById('chatArea').classList.remove('mobile-show');
  }
});

console.log('✅ Community chat initialized');