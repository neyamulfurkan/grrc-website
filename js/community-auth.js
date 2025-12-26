/**
 * community-auth.js
 * Handles login/signup with member matching
 */

import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let matchedMember = null;

// Check if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = 'community.html';
  }
});

// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`${targetTab}Form`).classList.add('active');
    
    // Clear errors
    hideError('loginError');
    hideError('signupError');
    hideSuccess('signupSuccess');
  });
});

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Logging in...';
    hideError('loginError');
    
    await signInWithEmailAndPassword(auth, email, password);
    
    // Redirect handled by onAuthStateChanged
  } catch (error) {
    console.error('Login error:', error);
    showError('loginError', getErrorMessage(error.code));
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">Login</span>';
  }
});

// Name input - check for member match
document.getElementById('signupName').addEventListener('blur', async (e) => {
  const name = e.target.value.trim();
  if (!name) return;
  
  try {
    // Fetch members from API or localStorage
    const members = await getMembers();
    
    // Find exact match (case-insensitive)
    const match = members.find(m => 
      m.name.toLowerCase() === name.toLowerCase()
    );
    
    if (match) {
      matchedMember = match;
      showMemberMatch(match);
    } else {
      matchedMember = null;
      hideMemberMatch();
    }
  } catch (error) {
    console.error('Error checking member match:', error);
  }
});

// Member match buttons
document.getElementById('matchYesBtn').addEventListener('click', () => {
  // Keep the matched member
  document.getElementById('memberMatchSection').style.display = 'none';
});

document.getElementById('matchNoBtn').addEventListener('click', () => {
  matchedMember = null;
  hideMemberMatch();
});

// Signup form
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = document.getElementById('signupBtn');
  
  if (password.length < 6) {
    showError('signupError', 'Password must be at least 6 characters');
    return;
  }
  
  // ✅ FIXED: Strict membership verification
  if (matchedMember) {
    const memberEmail = matchedMember.email?.toLowerCase().trim();
    
    // Must match exact email
    if (!memberEmail || email.toLowerCase().trim() !== memberEmail) {
      showError('signupError', `❌ Email verification failed.\n\nYour email (${email}) doesn't match our records for ${matchedMember.name}.\n\nPlease contact admin if this is incorrect.`);
      return;
    }
    
    console.log('✅ Member verified:', matchedMember.name);
  } else {
    // No member match - should we allow non-members?
    if (!confirm('⚠️ No membership record found.\n\nDo you want to create a community account anyway?')) {
      return;
    }
  }
  
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Creating account...';
    hideError('signupError');
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase user created:', user.uid);
    
    // ✅ FIXED: Generate avatar (first letter or member photo)
    let avatarData = {
      type: 'letter',
      value: name.charAt(0).toUpperCase()
    };
    
    console.log('🔍 Checking for matched member...');
    console.log('📋 Matched member:', matchedMember);
    
    if (matchedMember) {
      console.log('📸 Member photo value:', matchedMember.photo);
      console.log('📸 Photo type:', typeof matchedMember.photo);
      console.log('📸 Photo length:', matchedMember.photo ? matchedMember.photo.length : 0);
      
      // Check if photo exists and is valid URL
      if (matchedMember.photo && 
          matchedMember.photo.trim() !== '' && 
          (matchedMember.photo.startsWith('http') || matchedMember.photo.startsWith('data:'))) {
        
        avatarData = {
          type: 'image',
          value: matchedMember.photo
        };
        console.log('✅ Using member photo for avatar:', matchedMember.photo.substring(0, 50) + '...');
      } else {
        console.log('⚠️ No valid photo found, using letter avatar');
        console.log('   Photo value was:', matchedMember.photo);
      }
    } else {
      console.log('⚠️ No matched member found');
    }
    
    console.log('🎨 Final avatar data:', avatarData);
    
    // Create user document in Firestore
    const userData = {
      name: name,
      email: email,
      avatar: avatarData,
      memberMatch: matchedMember ? {
        id: matchedMember.id,
        name: matchedMember.name,
        department: matchedMember.department,
        year: matchedMember.year
      } : null,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
    
    console.log('📝 Creating Firestore document for user:', user.uid);
    
    try {
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('✅ Firestore document created successfully');
    } catch (firestoreError) {
      console.error('❌ Firestore document creation failed:', firestoreError);
      throw new Error('Failed to create user profile: ' + firestoreError.message);
    }
    
    showSuccess('signupSuccess', 'Account created! Redirecting...');
    
    setTimeout(() => {
      window.location.href = 'community.html';
    }, 1500);
    
  } catch (error) {
    console.error('Signup error:', error);
    showError('signupError', getErrorMessage(error.code));
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">Create Account</span>';
  }
});

// Helper functions
async function getMembers() {
  try {
    console.log('🔍 Fetching members for matching...');
    
    // Try API first
    if (window.apiClient && window.apiClient.isReady) {
      console.log('📡 Using API client');
      const result = await window.apiClient.getMembers();
      if (result.success && result.data) {
        console.log(`✅ Loaded ${result.data.length} members from API`);
        if (result.data.length > 0) {
          console.log('📋 Sample member structure:', {
            name: result.data[0].name,
            hasPhoto: !!result.data[0].photo,
            photoUrl: result.data[0].photo ? result.data[0].photo.substring(0, 50) + '...' : 'none'
          });
        }
        return result.data;
      }
    }
    
    // Fallback to localStorage
    console.log('📦 Falling back to localStorage');
    const cached = localStorage.getItem('members');
    const members = cached ? JSON.parse(cached) : [];
    console.log(`✅ Loaded ${members.length} members from cache`);
    if (members.length > 0) {
      console.log('📋 Sample cached member:', {
        name: members[0].name,
        hasPhoto: !!members[0].photo
      });
    }
    return members;
  } catch (error) {
    console.error('❌ Error getting members:', error);
    return [];
  }
}

function showMemberMatch(member) {
  const section = document.getElementById('memberMatchSection');
  const avatar = document.getElementById('matchAvatar');
  const name = document.getElementById('matchName');
  const details = document.getElementById('matchDetails');
  
  console.log('🎭 Showing member match popup for:', member.name);
  console.log('📸 Member photo:', member.photo);
  
  // Set avatar with better validation
  if (member.photo && member.photo.trim() !== '' && 
      (member.photo.startsWith('http') || member.photo.startsWith('data:'))) {
    console.log('✅ Displaying member photo in popup');
    avatar.innerHTML = `<img src="${member.photo}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  } else {
    console.log('⚠️ No photo, showing letter avatar in popup');
    avatar.innerHTML = '';
    avatar.textContent = member.name.charAt(0).toUpperCase();
  }
  
  // Set details
  name.textContent = member.name;
  details.textContent = `${member.department} - Year ${member.year}`;
  
  section.classList.add('show');
}

function hideMemberMatch() {
  document.getElementById('memberMatchSection').classList.remove('show');
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}

function hideError(id) {
  const el = document.getElementById(id);
  el.classList.remove('show');
}

function showSuccess(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}

function hideSuccess(id) {
  const el = document.getElementById(id);
  el.classList.remove('show');
}

function getErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Please login instead.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  
  return messages[code] || 'An error occurred. Please try again.';
}

console.log('✅ Community auth initialized');