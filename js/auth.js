/**
 * auth.js - Authentication Module
 * GSTU Robotics & Research Club Website
 * 
 * Handles all authentication operations including:
 * - Admin login/logout
 * - Session management
 * - Password hashing and validation (fallback)
 * - "Remember me" functionality
 * - Authentication state checks
 * - Session expiration handling
 * 
 * Dependencies: api-client.js (for backend auth), config.js
 * Storage: Uses sessionStorage for sessions, localStorage for "remember me" and tokens
 * 
 * FIXED: Properly integrated with backend API authentication via api-client.js
 */

// ==================== CONSTANTS ====================
const AUTH_CONFIG = {
  SESSION_KEY: 'adminSession',
  REMEMBER_KEY: 'rememberedAdmin',
  TOKEN_KEY: 'grrc_auth_token',
  SESSION_DURATION_HOURS: 24,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15
};

// Fallback storage keys if config.js not loaded
const STORAGE_KEYS_FALLBACK = {
  ADMINS: 'grrc_admins',
  MEMBERS: 'grrc_members',
  EVENTS: 'grrc_events',
  PROJECTS: 'grrc_projects',
  NEWS: 'grrc_news',
  GALLERY: 'grrc_gallery'
};

// Use STORAGE_KEYS from config.js if available, otherwise use fallback
const STORAGE = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : STORAGE_KEYS_FALLBACK;


if (window.API_AVAILABLE) {
  console.log('✅ Backend API client (api-client.js) detected - Using API authentication');
} else {
  console.log('⚠️ Backend API not available - Using localStorage fallback authentication');
}

// ==================== PASSWORD UTILITIES ====================

/**
 * Simple hash function for passwords (FALLBACK ONLY)
 * Note: This is a basic hash for demonstration. In production, use bcrypt or similar.
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
function hashPassword(password) {
  if (!password) return '';
  
  let hash = 0;
  const str = password + 'GRRC_SALT_2024'; // Add salt
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex string
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} {isValid: boolean, message: string}
 */
function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters` 
    };
  }
  
  if (password.length > AUTH_CONFIG.PASSWORD_MAX_LENGTH) {
    return { 
      isValid: false, 
      message: `Password must be less than ${AUTH_CONFIG.PASSWORD_MAX_LENGTH} characters` 
    };
  }
  
  return { isValid: true, message: 'Valid password' };
}

// ==================== LOGIN ATTEMPTS MANAGEMENT ====================

/**
 * Gets login attempt data for a username
 * @param {string} username - Username to check
 * @returns {object} {attempts: number, lockedUntil: timestamp|null}
 */
function getLoginAttempts(username) {
  try {
    const attemptsData = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    return attemptsData[username] || { attempts: 0, lockedUntil: null };
  } catch (error) {
    console.error('Error reading login attempts:', error);
    return { attempts: 0, lockedUntil: null };
  }
}

/**
 * Records a failed login attempt
 * @param {string} username - Username that failed
 */
function recordFailedAttempt(username) {
  try {
    const attemptsData = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    const userData = attemptsData[username] || { attempts: 0, lockedUntil: null };
    
    userData.attempts += 1;
    
    // Lock account after max attempts
    if (userData.attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + AUTH_CONFIG.LOCKOUT_DURATION_MINUTES);
      userData.lockedUntil = lockoutTime.toISOString();
    }
    
    attemptsData[username] = userData;
    localStorage.setItem('loginAttempts', JSON.stringify(attemptsData));
  } catch (error) {
    console.error('Error recording failed attempt:', error);
  }
}

/**
 * Resets login attempts for a username (called on successful login)
 * @param {string} username - Username to reset
 */
function resetLoginAttempts(username) {
  try {
    const attemptsData = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    delete attemptsData[username];
    localStorage.setItem('loginAttempts', JSON.stringify(attemptsData));
  } catch (error) {
    console.error('Error resetting login attempts:', error);
  }
}

/**
 * Checks if an account is currently locked
 * @param {string} username - Username to check
 * @returns {object} {isLocked: boolean, remainingMinutes: number}
 */
function isAccountLocked(username) {
  const attemptData = getLoginAttempts(username);
  
  if (!attemptData.lockedUntil) {
    return { isLocked: false, remainingMinutes: 0 };
  }
  
  const now = new Date();
  const lockedUntil = new Date(attemptData.lockedUntil);
  
  if (now < lockedUntil) {
    const remainingMs = lockedUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return { isLocked: true, remainingMinutes };
  }
  
  // Lock expired, reset attempts
  resetLoginAttempts(username);
  return { isLocked: false, remainingMinutes: 0 };
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Creates a new admin session
 * @param {object} admin - Admin object {id, username, role}
 * @param {boolean} hasToken - Whether JWT token is present
 * @returns {object} Session object
 */
function createSession(admin, hasToken = false) {
  const session = {
    adminId: admin.id,
    username: admin.username,
    role: admin.role || 'Admin',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 100), // Track device
    hasToken: hasToken // Track if session has JWT token
  };
  
  try {
    sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Gets the current session
 * @returns {object|null} Session object or null
 */
function getSession() {
  try {
    const sessionData = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (!sessionData) return null;
    
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
}

/**
 * Checks if JWT token exists in localStorage
 * @returns {boolean} True if token exists
 */
function hasValidToken() {
  try {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    return !!token && token.trim().length > 0;
  } catch (error) {
    console.error('Error checking token:', error);
    return false;
  }
}

/**
 * Checks if a session is still valid (not expired)
 * @param {object} session - Session object
 * @returns {boolean} True if valid, false if expired
 */
function isSessionValid(session) {
  if (!session || !session.timestamp) return false;
  
  try {
    const sessionTime = new Date(session.timestamp);
    const now = new Date();
    const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
    
    return hoursDiff <= AUTH_CONFIG.SESSION_DURATION_HOURS;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}

/**
 * Clears the current session and token
 */
function clearSession() {
  try {
    sessionStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Updates the session timestamp (extends session)
 */
function extendSession() {
  const session = getSession();
  if (session) {
    session.timestamp = new Date().toISOString();
    try {
      sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }
  return false;
}

// ==================== AUTHENTICATION FUNCTIONS ====================

/**
 * Authenticates an admin user
 * FIXED - Properly integrated with api-client.js backend authentication
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {boolean} rememberMe - Remember this user
 * @returns {object} {success: boolean, message: string, admin: object|null}
 */
async function login(username, password, rememberMe = false) {
  // Validate inputs
  if (!username || !username.trim()) {
    return { success: false, message: 'Username is required', admin: null };
  }
  
  if (!password) {
    return { success: false, message: 'Password is required', admin: null };
  }
  
  username = username.trim().toLowerCase();
  
  // Check if account is locked
  const lockStatus = isAccountLocked(username);
  if (lockStatus.isLocked) {
    return { 
      success: false, 
      message: `Account locked. Try again in ${lockStatus.remainingMinutes} minute(s).`, 
      admin: null 
    };
  }
  
  // Validate password format
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return { success: false, message: passwordValidation.message, admin: null };
  }
  
  try {
    /* PRIMARY: Try API authentication first via api-client.js */
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      console.log('🔐 Attempting API authentication via api-client.js...');
      
      try {
        const apiResult = await window.apiClient.login(username, password);
        
        if (apiResult.success && apiResult.data && apiResult.data.admin) {
          console.log('✅ API authentication successful');
          
          // Reset failed attempts on successful login
          resetLoginAttempts(username);
          
          // api-client.js automatically saves the token to localStorage
          const admin = apiResult.data.admin;
          
          // Create session with token flag
          const session = createSession(admin, true);
          if (!session) {
            return { success: false, message: 'Failed to create session', admin: null };
          }
          
          // Handle "Remember Me"
          if (rememberMe) {
            try {
              localStorage.setItem(AUTH_CONFIG.REMEMBER_KEY, username);
            } catch (error) {
              console.error('Error saving remember me:', error);
            }
          } else {
            try {
              localStorage.removeItem(AUTH_CONFIG.REMEMBER_KEY);
            } catch (error) {
              console.error('Error removing remember me:', error);
            }
          }
          
          console.log(`✅ Admin logged in via API: ${admin.username} (${admin.role})`);
          
          return { 
            success: true, 
            message: 'Login successful', 
            admin: admin 
          };
        } else {
          // API returned failure
          console.log('❌ API authentication failed:', apiResult.message || 'Unknown error');
          recordFailedAttempt(username);
          return {
            success: false,
            message: apiResult.message || 'Invalid credentials',
            admin: null
          };
        }
      } catch (apiError) {
        console.warn('⚠️ API authentication error, falling back to localStorage:', apiError.message);
        // Continue to fallback below
      }
    } else {
      console.log('⚠️ API client not available or not ready, using localStorage authentication');
      console.log('   API Check:', {
        exists: typeof window.apiClient !== 'undefined',
        hasLogin: typeof window.apiClient?.login === 'function',
        isReady: window.apiClient?.isReady
      });
    }
    
    /* FALLBACK: localStorage authentication */
    console.log('🔐 Using localStorage fallback authentication...');
    
    let admins = [];
    try {
      admins = JSON.parse(localStorage.getItem(STORAGE.ADMINS) || '[]');
    } catch (error) {
      console.error('Error reading admins:', error);
      return { success: false, message: 'Authentication system error', admin: null };
    }
    
    // Create default admin if none exist
    if (admins.length === 0) {
      const defaultAdmin = {
        id: `admin_${Date.now()}`,
        username: 'admin',
        password: hashPassword('admin123'),
        role: 'Super Admin',
        createdAt: new Date().toISOString()
      };
      admins = [defaultAdmin];
      localStorage.setItem(STORAGE.ADMINS, JSON.stringify(admins));
      console.log('✅ Default admin created: username="admin", password="admin123"');
    }
    
    // Hash the provided password
    const hashedPassword = hashPassword(password);
    
    // Find matching admin
    const admin = admins.find(a => 
      a.username.toLowerCase() === username && a.password === hashedPassword
    );
    
    if (!admin) {
      recordFailedAttempt(username);
      const remainingAttempts = AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - getLoginAttempts(username).attempts;
      
      if (remainingAttempts > 0) {
        return { 
          success: false, 
          message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining.`, 
          admin: null 
        };
      } else {
        return { 
          success: false, 
          message: 'Invalid credentials. Account locked.', 
          admin: null 
        };
      }
    }
    
    // Reset failed attempts on successful login
    resetLoginAttempts(username);
    
    // Create session WITHOUT token flag (localStorage fallback)
    const session = createSession(admin, false);
    if (!session) {
      return { success: false, message: 'Failed to create session', admin: null };
    }
    
    // Handle "Remember Me"
    if (rememberMe) {
      try {
        localStorage.setItem(AUTH_CONFIG.REMEMBER_KEY, username);
      } catch (error) {
        console.error('Error saving remember me:', error);
      }
    } else {
      try {
        localStorage.removeItem(AUTH_CONFIG.REMEMBER_KEY);
      } catch (error) {
        console.error('Error removing remember me:', error);
      }
    }
    
    console.log(`✅ Admin logged in via localStorage: ${admin.username} (${admin.role})`);
    
    // Return success with admin data (without password)
    const { password: _, ...adminWithoutPassword } = admin;
    return { 
      success: true, 
      message: 'Login successful', 
      admin: adminWithoutPassword 
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An error occurred during login', admin: null };
  }
}

/**
 * Logs out the current admin
 * FIXED - Properly integrated with api-client.js logout
 * @param {boolean} redirectToLogin - Whether to redirect to login page
 */
async function logout(redirectToLogin = true) {
  const session = getSession();
  
  if (session) {
    console.log(`✅ Logging out: ${session.username}`);
  }
  
  // Call API logout if available and session has token
  if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
    if (session && session.hasToken) {
      console.log('🔐 Calling API logout via api-client.js...');
      try {
        await window.apiClient.logout();
        console.log('✅ API logout successful');
      } catch (error) {
        console.error('⚠️ API logout error:', error);
      }
    }
  }
  
  // Clear session (api-client.js clears token automatically)
  clearSession();
  
  // Optionally clear remember me
  // localStorage.removeItem(AUTH_CONFIG.REMEMBER_KEY);
  
  // Redirect to login page
  if (redirectToLogin && typeof window !== 'undefined') {
    const basePath = window.location.pathname.includes('/grrc-website/') ? '/grrc-website/' : './';
    window.location.replace(basePath + 'admin.html');
  }
}

/**
 * Checks if a user is currently authenticated
 * FIXED - Token-aware authentication check
 * @param {boolean} redirectIfNot - Whether to redirect to login if not authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated(redirectIfNot = false) {
  const session = getSession();
  
  // No session at all
  if (!session) {
    if (redirectIfNot && typeof window !== 'undefined') {
      const basePath = window.location.pathname.includes('/grrc-website/') ? '/grrc-website/' : './';
      window.location.replace(basePath + 'admin.html');
    }
    return false;
  }
  
  // Check session validity (time-based)
  if (!isSessionValid(session)) {
    console.log('⚠️ Session expired');
    clearSession();
    if (redirectIfNot && typeof window !== 'undefined') {
      const basePath = window.location.pathname.includes('/grrc-website/') ? '/grrc-website/' : './';
      window.location.replace(basePath + 'admin.html');
    }
    return false;
  }
  
  // CRITICAL FIX: If session claims to have token, ALWAYS restore it to apiClient
  if (session.hasToken) {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    if (token) {
      // Token exists in localStorage, ALWAYS restore to apiClient
      if (typeof window.apiClient !== 'undefined' && window.apiClient.setAuthToken) {
        const currentApiToken = window.apiClient.getAuthToken();
        if (!currentApiToken || currentApiToken !== token) {
          console.log('🔄 Syncing token to apiClient from localStorage');
          window.apiClient.setAuthToken(token);
        }
      }
      return true;
    } else {
      // No token in localStorage, clear session
      console.log('⚠️ No token found in localStorage - clearing session');
      clearSession();
      if (redirectIfNot && typeof window !== 'undefined') {
        const basePath = window.location.pathname.includes('/grrc-website/') ? '/grrc-website/' : './';
        window.location.replace(basePath + 'admin.html');
      }
      return false;
    }
  }
  
  // CRITICAL: Always verify apiClient has token if session has one
  if (session.hasToken && typeof window.apiClient !== 'undefined') {
    const apiToken = window.apiClient.getAuthToken();
    if (!apiToken) {
      const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      if (token && window.apiClient.setAuthToken) {
        console.log('🔄 Re-syncing token to apiClient');
        window.apiClient.setAuthToken(token);
      }
    }
  }
  
  // Extend session on activity
  extendSession();
  
  return true;
}

/**
 * Gets the currently logged-in admin
 * @returns {object|null} Admin object (without password) or null
 */
function getCurrentAdmin() {
  if (!isAuthenticated()) return null;
  
  const session = getSession();
  if (!session) return null;
  
  // If using API authentication, return session data directly
  if (session.hasToken) {
    return {
      id: session.adminId,
      username: session.username,
      role: session.role
    };
  }
  
  // Fallback: Get from localStorage
  try {
    const admins = JSON.parse(localStorage.getItem(STORAGE.ADMINS) || '[]');
    const admin = admins.find(a => a.id === session.adminId);
    
    if (!admin) {
      clearSession();
      return null;
    }
    
    // Return admin without password
    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
    
  } catch (error) {
    console.error('Error getting current admin:', error);
    return null;
  }
}

/**
 * Gets the remembered username (if "remember me" was used)
 * @returns {string|null} Username or null
 */
function getRememberedUsername() {
  try {
    return localStorage.getItem(AUTH_CONFIG.REMEMBER_KEY);
  } catch (error) {
    console.error('Error getting remembered username:', error);
    return null;
  }
}

/**
 * Checks if current admin has a specific role
 * @param {string} requiredRole - Role to check
 * @returns {boolean} True if admin has the role
 */
function hasRole(requiredRole) {
  const admin = getCurrentAdmin();
  if (!admin) return false;
  
  return admin.role === requiredRole || admin.role === 'Super Admin';
}

/**
 * Changes the password for the current admin
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {object} {success: boolean, message: string}
 */
function changePassword(currentPassword, newPassword) {
  if (!isAuthenticated()) {
    return { success: false, message: 'Not authenticated' };
  }
  
  const session = getSession();
  if (!session) {
    return { success: false, message: 'No active session' };
  }
  
  // If using API authentication, cannot change password here
  if (session.hasToken) {
    return { 
      success: false, 
      message: 'Password changes must be done through the API' 
    };
  }
  
  // Validate new password
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    return { success: false, message: validation.message };
  }
  
  try {
    const admins = JSON.parse(localStorage.getItem(STORAGE.ADMINS) || '[]');
    const adminIndex = admins.findIndex(a => a.id === session.adminId);
    
    if (adminIndex === -1) {
      return { success: false, message: 'Admin not found' };
    }
    
    // Verify current password
    const hashedCurrent = hashPassword(currentPassword);
    if (admins[adminIndex].password !== hashedCurrent) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Update password
    admins[adminIndex].password = hashPassword(newPassword);
    admins[adminIndex].passwordChangedAt = new Date().toISOString();
    
    localStorage.setItem(STORAGE.ADMINS, JSON.stringify(admins));
    
    console.log(`✅ Password changed for: ${admins[adminIndex].username}`);
    return { success: true, message: 'Password changed successfully' };
    
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Failed to change password' };
  }
}

/**
 * Initializes authentication system
 * - Creates default admin if none exist (localStorage fallback only)
 * - Cleans up expired sessions
 * - Logs authentication status
 */
function initializeAuth() {
  try {
    // Only create default admin if using localStorage fallback
    if (!window.apiClient || !window.apiClient.isReady) {
      let admins = JSON.parse(localStorage.getItem(STORAGE.ADMINS) || '[]');
      
      if (admins.length === 0) {
        const defaultAdmin = {
          id: `admin_${Date.now()}`,
          username: 'admin',
          password: hashPassword('admin123'),
          role: 'Super Admin',
          createdAt: new Date().toISOString()
        };
        admins = [defaultAdmin];
        localStorage.setItem(STORAGE.ADMINS, JSON.stringify(admins));
        console.log('✅ Default admin created: username="admin", password="admin123"');
      }
    }
    
    // Clean up expired login attempts (older than 24 hours)
    try {
      const attemptsData = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
      const now = new Date();
      let cleaned = false;
      
      Object.keys(attemptsData).forEach(username => {
        const data = attemptsData[username];
        if (data.lockedUntil) {
          const lockedUntil = new Date(data.lockedUntil);
          const hoursDiff = (now - lockedUntil) / (1000 * 60 * 60);
          if (hoursDiff > 24) {
            delete attemptsData[username];
            cleaned = true;
          }
        }
      });
      
      if (cleaned) {
        localStorage.setItem('loginAttempts', JSON.stringify(attemptsData));
      }
    } catch (error) {
      console.error('Error cleaning login attempts:', error);
    }
    
    // Log current authentication status
    if (isAuthenticated()) {
      const admin = getCurrentAdmin();
      const authMethod = getSession()?.hasToken ? 'API' : 'localStorage';
      console.log(`✅ Auth.js loaded - Currently logged in: ${admin?.username || 'Unknown'} (${authMethod})`);
    } else {
      console.log('✅ Auth.js loaded - No active session');
    }
    
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
}

// ==================== AUTO-INITIALIZE ====================
// Initialize when the script loads
if (typeof window !== 'undefined') {
  // Wait for DOM and api-client.js to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to ensure api-client.js is loaded
      setTimeout(initializeAuth, 100);
    });
  } else {
    setTimeout(initializeAuth, 100);
  }
}

// ==================== EXPORT FOR USE IN OTHER FILES ====================
// These functions are now available globally
console.log('✅ Auth.js loaded successfully');