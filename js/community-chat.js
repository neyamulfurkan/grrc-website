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
  serverTimestamp,
  collectionGroup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let selectedUserId = null;
let usersUnsubscribe = null;
let messagesUnsubscribe = null;

// ✅ FIX: Debounce auth state changes to prevent multiple rapid loads
let authCheckTimeout = null;
onAuthStateChanged(auth, async (user) => {
  // Clear previous timeout to prevent multiple simultaneous checks
  if (authCheckTimeout) {
    clearTimeout(authCheckTimeout);
  }
  
  authCheckTimeout = setTimeout(async () => {
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
  }, 300); // 300ms debounce delay
});

// Initialize chat interface
function initializeChat() {
  console.log('✅ Chat initialized for:', currentUser.name);
  
  // Load users list
  loadUsers();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup tab switching
  setupChatTabs();
}

// Setup chat tabs (Chats vs All Members vs Global)
function setupChatTabs() {
  const tabButtons = document.querySelectorAll('.chat-tab-btn');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Update active tab
      tabButtons.forEach(b => {
        b.classList.remove('active');
        if (b === btn) {
          b.classList.add('active');
          b.style.background = 'var(--primary-color)';
          b.style.color = 'white';
        } else {
          b.style.background = 'var(--background-secondary)';
          b.style.color = 'var(--text-primary)';
        }
      });
      
      if (tab === 'global') {
        // Show global chat
        selectGlobalChat();
      } else if (tab === 'all-members') {
        // Show all members
        showAllMembers();
      } else {
        // Show users with chat history
        document.getElementById('usersList').style.display = 'block';
        document.getElementById('usersSearch').style.display = 'block';
        
        // Hide chat if global was selected
        if (selectedUserId === '__GLOBAL__') {
          document.getElementById('emptyChat').style.display = 'flex';
          document.getElementById('chatContent').style.display = 'none';
          selectedUserId = null;
        }
        
        // Reload filtered users
        loadUsers();
      }
    });
  });
}

// ✅ NEW: Show all members (not just chat history)
async function showAllMembers() {
  selectedUserId = null;
  
  // Hide chat area
  document.getElementById('emptyChat').style.display = 'flex';
  document.getElementById('chatContent').style.display = 'none';
  
  // Show users sidebar
  document.getElementById('usersList').style.display = 'block';
  document.getElementById('usersSearch').style.display = 'block';
  
  const usersQuery = query(collection(db, 'users'));
  
  onSnapshot(usersQuery, (snapshot) => {
    const allUsers = [];
    snapshot.forEach((doc) => {
      if (doc.id !== currentUser.uid) {
        allUsers.push({ uid: doc.id, ...doc.data() });
      }
    });
    
    renderUsersList(allUsers);
  });
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
  
  // Hide users list
  document.getElementById('usersList').style.display = 'none';
  document.getElementById('usersSearch').style.display = 'none';
  
  // Update UI
  document.querySelectorAll('.user-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Show chat area
  document.getElementById('emptyChat').style.display = 'none';
  document.getElementById('chatContent').style.display = 'flex';
  
  // Update chat header
  const avatarEl = document.getElementById('chatUserAvatar');
  avatarEl.innerHTML = '🌍';
  avatarEl.style.fontSize = '1.5rem';
  avatarEl.style.display = 'flex';
  avatarEl.style.alignItems = 'center';
  avatarEl.style.justifyContent = 'center';
  
  document.getElementById('chatUserName').textContent = 'Global Chat';
  document.getElementById('chatUserStatus').textContent = 'Everyone can see these messages';
  document.getElementById('chatUserStatus').style.color = 'var(--text-secondary)';
  
  // Load global messages
  loadGlobalMessages();
  
  // Mobile: Show chat
  if (window.innerWidth <= 768) {
    document.getElementById('usersSidebar').classList.remove('mobile-show');
    document.getElementById('chatArea').classList.add('mobile-show');
  }
}

// Load global messages with pagination
function loadGlobalMessages() {
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }
  
  const messagesQuery = query(
    collection(db, 'global_chat'),
    orderBy('timestamp', 'asc'),
    limit(50) // Reduced from 100 to 50 for better performance
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
          ${!isOwn ? `
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;" 
                 class="global-user-name" 
                 data-user-id="${msg.senderId}"
                 title="Click to message privately">
              ${escapeHtml(senderName)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>` : ''}
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
  
  // ✅ NEW: Add click handlers for user names to message privately
  container.querySelectorAll('.global-user-name').forEach(nameEl => {
    nameEl.addEventListener('click', () => {
      const userId = nameEl.dataset.userId;
      if (userId && userId !== currentUser.uid) {
        // Switch to users tab
        document.querySelector('[data-tab="users"]').click();
        // Select the user
        setTimeout(() => selectUser(userId), 300);
      }
    });
  });
  
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

// ✅ NEW: Admin function to permanently delete user account
async function permanentlyDeleteUser(userId) {
  if (!confirm('⚠️ PERMANENT DELETE\n\nThis will:\n- Delete Firebase Authentication account\n- Remove all user data\n- Delete all messages\n- User CANNOT login again with same credentials\n\nAre you absolutely sure?')) {
    return;
  }
  
  try {
    // 1. Delete all user's messages from all chats
    const chatsQuery = query(collection(db, 'chats'));
    const chatsSnapshot = await getDocs(chatsQuery);
    
    for (const chatDoc of chatsSnapshot.docs) {
      const messagesQuery = query(
        collection(db, 'chats', chatDoc.id, 'messages'),
        where('senderId', '==', userId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      for (const msgDoc of messagesSnapshot.docs) {
        await deleteDoc(msgDoc.ref);
      }
    }
    
    // 2. Delete global messages
    const globalQuery = query(
      collection(db, 'global_chat'),
      where('senderId', '==', userId)
    );
    const globalSnapshot = await getDocs(globalQuery);
    for (const msgDoc of globalSnapshot.docs) {
      await deleteDoc(msgDoc.ref);
    }
    
    // 3. Delete user document
    await deleteDoc(doc(db, 'users', userId));
    
    // 4. User must re-authenticate to delete their own account
    // This is a Firebase security rule - only the user can delete their own auth account
    alert('✅ User data deleted from Firestore.\n\n⚠️ Note: The user must delete their own Firebase Authentication account by logging in and going to account settings.\n\nOr you can use Firebase Console to manually delete the auth account.');
    
    // Reload users list
    loadUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Failed to delete user: ' + error.message);
  }
}
// ✅ FIXED: Load only users with chat history + active users
async function loadUsers() {
  const usersQuery = query(collection(db, 'users'));
  
  usersUnsubscribe = onSnapshot(usersQuery, async (snapshot) => {
    const allUsers = [];
    snapshot.forEach((doc) => {
      if (doc.id !== currentUser.uid) {
        allUsers.push({ uid: doc.id, ...doc.data() });
      }
    });
    
    // Get users with chat history
    const usersWithChats = await getUsersWithChatHistory(allUsers);
    
    // Separate active users (online in last 5 minutes)
    const now = new Date();
    const activeUsers = allUsers.filter(u => {
      if (!u.lastSeen) return false;
      const lastSeenDate = new Date(u.lastSeen);
      const diffMinutes = (now - lastSeenDate) / 1000 / 60;
      return diffMinutes < 5;
    });
    
    // Render active users bar (async now)
    await renderActiveUsersBar(activeUsers);
    
    // Render only chatted users in sidebar
    renderUsersList(usersWithChats);
  });
}

// ✅ FIXED: Get users with chat history (optimized)
async function getUsersWithChatHistory(allUsers) {
  const usersWithChats = [];
  
  // Use Promise.all for parallel fetching
  const checks = allUsers.map(async (user) => {
    const chatId = [currentUser.uid, user.uid].sort().join('_');
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      limit(1)
    );
    
    try {
      const snapshot = await getDocs(messagesQuery);
      if (!snapshot.empty) {
        return user;
      }
    } catch (error) {
      console.error('Error checking chat history:', error);
    }
    return null;
  });
  
  const results = await Promise.all(checks);
  return results.filter(user => user !== null);
}

// ✅ FIXED: Render active users bar - only users with chat history
async function renderActiveUsersBar(activeUsers) {
  const container = document.querySelector('.active-users-scroll');
  
  // Filter active users to only show those with chat history
  const activeUsersWithChats = [];
  for (const user of activeUsers) {
    const chatId = [currentUser.uid, user.uid].sort().join('_');
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      limit(1)
    );
    
    try {
      const snapshot = await getDocs(messagesQuery);
      if (!snapshot.empty) {
        activeUsersWithChats.push(user);
      }
    } catch (error) {
      console.error('Error checking chat:', error);
    }
  }
  
  if (activeUsersWithChats.length === 0) {
    container.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.75rem; padding: 0.5rem;">No active chats</div>';
    return;
  }
  
  container.innerHTML = activeUsersWithChats.map(user => {
    const avatar = renderAvatar(user.avatar, user.name);
    
    return `
      <div class="active-user-item" data-user-id="${user.uid}">
        <div class="active-user-avatar">
          ${avatar}
          <span class="online-indicator"></span>
        </div>
        <div class="active-user-name">${escapeHtml(user.name.split(' ')[0])}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.active-user-item').forEach(item => {
    item.addEventListener('click', () => {
      selectUser(item.dataset.userId);
    });
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
  const emptyChat = document.getElementById('emptyChat');
  const chatContent = document.getElementById('chatContent');
  
  if (emptyChat) emptyChat.style.display = 'none';
  if (chatContent) {
    chatContent.style.display = 'flex';
    chatContent.style.flexDirection = 'column';
  }
  
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
let lastMessageCount = 0;

function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div style="margin: auto; text-align: center; color: var(--text-secondary);">
        <p>No messages yet. Start the conversation! 👋</p>
      </div>
    `;
    lastMessageCount = 0;
    return;
  }
  
  // ✅ Show notification for NEW messages
  if (messages.length > lastMessageCount && lastMessageCount > 0) {
    const newMsg = messages[messages.length - 1];
    if (newMsg.senderId !== currentUser.uid) {
      showMessageNotification(newMsg);
    }
  }
  lastMessageCount = messages.length;
  
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

// ✅ NEW: Show popup notification for new messages
function showMessageNotification(message) {
  // Don't show if already on chat page and focused
  if (document.hasFocus()) return;
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 300px;
    animation: slideInRight 0.3s ease;
    cursor: pointer;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 0.25rem;">💬 New Message</div>
    <div style="font-size: 0.875rem; opacity: 0.9;">${escapeHtml(message.text.substring(0, 50))}${message.text.length > 50 ? '...' : ''}</div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
  
  // Click to focus chat
  notification.addEventListener('click', () => {
    window.focus();
    notification.remove();
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

// Delete message - only own messages
async function deleteMessage(messageId) {
  if (!selectedUserId || !confirm('Delete this message?')) return;
  
  try {
    const chatId = [currentUser.uid, selectedUserId].sort().join('_');
    
    // ✅ Verify ownership before deleting
    const messageDoc = await getDoc(doc(db, 'chats', chatId, 'messages', messageId));
    if (!messageDoc.exists()) {
      alert('Message not found.');
      return;
    }
    
    if (messageDoc.data().senderId !== currentUser.uid) {
      alert('You can only delete your own messages.');
      return;
    }
    
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
  
  // Delete Account button
  document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    const confirmation = confirm('⚠️ DELETE ACCOUNT?\n\nThis will permanently delete:\n• Your account\n• All your messages\n• Your profile data\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:');
    
    if (!confirmation) return;
    
    const finalConfirm = prompt('Type "DELETE" (in capital letters) to permanently delete your account:');
    
    if (finalConfirm !== 'DELETE') {
      alert('Account deletion cancelled.');
      return;
    }
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        alert('No user logged in.');
        return;
      }
      
      console.log('🗑️ Deleting account:', user.uid);
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      console.log('✅ Firestore document deleted');
      
      // Delete all user's messages
      const chatsSnapshot = await getDocs(
        query(collectionGroup(db, 'messages'), where('senderId', '==', user.uid))
      );
      
      for (const msgDoc of chatsSnapshot.docs) {
        await deleteDoc(msgDoc.ref);
      }
      console.log('✅ Private messages deleted');
      
      // Delete global messages
      const globalSnapshot = await getDocs(
        query(collection(db, 'global_chat'), where('senderId', '==', user.uid))
      );
      
      for (const msgDoc of globalSnapshot.docs) {
        await deleteDoc(msgDoc.ref);
      }
      console.log('✅ Global messages deleted');
      
      // Delete Firebase Auth account
      await user.delete();
      console.log('✅ Firebase Auth account deleted');
      
      alert('✅ Account deleted successfully. You will be redirected to the homepage.');
      window.location.href = 'index.html';
      
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        alert('For security, please logout and login again before deleting your account.');
        await signOut(auth);
        window.location.href = 'community-auth.html';
      } else {
        alert('Failed to delete account: ' + error.message);
      }
    }
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
  
  // ✅ NEW: Delete conversation button
  const deleteChatBtn = document.getElementById('deleteChatBtn');
  if (deleteChatBtn) {
    deleteChatBtn.addEventListener('click', deleteConversation);
  }
}

// ✅ NEW: Delete entire conversation
async function deleteConversation() {
  if (!selectedUserId || selectedUserId === '__GLOBAL__') {
    alert('Cannot delete global chat.');
    return;
  }
  
  if (!confirm('⚠️ Delete entire conversation?\n\nThis will permanently delete all messages between you and this user.')) {
    return;
  }
  
  try {
    const chatId = [currentUser.uid, selectedUserId].sort().join('_');
    
    // Delete all messages in this chat
    const messagesQuery = query(collection(db, 'chats', chatId, 'messages'));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const deletePromises = [];
    messagesSnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    alert('✅ Conversation deleted successfully!');
    
    // Go back to users list
    selectedUserId = null;
    document.getElementById('emptyChat').style.display = 'flex';
    document.getElementById('chatContent').style.display = 'none';
    
    // Reload users
    loadUsers();
    
  } catch (error) {
    console.error('Error deleting conversation:', error);
    alert('Failed to delete conversation: ' + error.message);
  }
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