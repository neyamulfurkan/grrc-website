/**
 * auth.js - Authentication Module
 * GSTU Robotics & Research Club Website
 * 
 * Handles all authentication operations including:
 * - Admin login/logout
 * - Session management
 * - Password hashing and validation
 * - "Remember me" functionality
 * - Authentication state checks
 * - Session expiration handling
 * 
 * Dependencies: config.js (must be loaded first)
 * Storage: Uses sessionStorage for sessions, localStorage for "remember me"
 * 
 * MODIFIED: Added backend API authentication support with localStorage fallback
 */

// ==================== CONSTANTS ====================
const AUTH_CONFIG = {
  SESSION_KEY: 'adminSession',
  REMEMBER_KEY: 'rememberedAdmin',
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

/* NEW - Check if API client is available */
window.API_AVAILABLE = typeof window.login !== 'undefined';
if (window.API_AVAILABLE) {
  console.log('✅ Backend API client detected');
} else {
  console.log('⚠️ Backend API not available, using localStorage only');
}

// ==================== PASSWORD UTILITIES ====================

/**
 * Simple hash function for passwords
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
 * @returns {object} Session object
 */
function createSession(admin) {
  const session = {
    adminId: admin.id,
    username: admin.username,
    role: admin.role || 'Admin',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 100) // Track device
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
 * Clears the current session
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
 * MODIFIED - Added backend API authentication with localStorage fallback
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {boolean} rememberMe - Remember this user
 * @returns {object} {success: boolean, message: string, admin: object|null}
 */
async function login(username, password, rememberMe = false) {
  // EXISTING - Validate inputs
  if (!username || !username.trim()) {
    return { success: false, message: 'Username is required', admin: null };
  }
  
  if (!password) {
    return { success: false, message: 'Password is required', admin: null };
  }
  
  username = username.trim().toLowerCase();
  
  // EXISTING - Check if account is locked
  const lockStatus = isAccountLocked(username);
  if (lockStatus.isLocked) {
    return { 
      success: false, 
      message: `Account locked. Try again in ${lockStatus.remainingMinutes} minute(s).`, 
      admin: null 
    };
  }
  
  // EXISTING - Validate password format
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return { success: false, message: passwordValidation.message, admin: null };
  }
  
  try {
    /* NEW - Try API authentication first */
    if (typeof window.login !== 'undefined' && window.API_AVAILABLE) {
      try {
        const apiResult = await window.login(username, password);
        if (apiResult.success && apiResult.data) {
          // Reset failed attempts on successful login
          resetLoginAttempts(username);
          
          // Create session
          const admin = apiResult.data.admin;
          const session = createSession(admin);
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
        }
      } catch (apiError) {
        console.warn('API authentication failed, falling back to localStorage:', apiError);
      }
    }
    
    // EXISTING - Fallback to localStorage authentication
    let admins = [];
    try {
      admins = JSON.parse(localStorage.getItem(STORAGE.ADMINS) || '[]');
    } catch (error) {
      console.error('Error reading admins:', error);
      return { success: false, message: 'Authentication system error', admin: null };
    }
    
    // EXISTING - Create default admin if none exist
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
    
    // EXISTING - Hash the provided password
    const hashedPassword = hashPassword(password);
    
    // EXISTING - Find matching admin
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
    
    // EXISTING - Reset failed attempts on successful login
    resetLoginAttempts(username);
    
    // EXISTING - Create session
    const session = createSession(admin);
    if (!session) {
      return { success: false, message: 'Failed to create session', admin: null };
    }
    
    // EXISTING - Handle "Remember Me"
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
    
    // EXISTING - Log successful login
    console.log(`✅ Admin logged in via localStorage: ${admin.username} (${admin.role})`);
    
    // EXISTING - Return success with admin data (without password)
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
 * @param {boolean} redirectToLogin - Whether to redirect to login page
 */
function logout(redirectToLogin = true) {
  const session = getSession();
  
  if (session) {
    console.log(`✅ Admin logged out: ${session.username}`);
  }
  
  // Clear session
  clearSession();
  
  // Optionally clear remember me
  // localStorage.removeItem(AUTH_CONFIG.REMEMBER_KEY);
  
  // Redirect to login page
  if (redirectToLogin && typeof window !== 'undefined') {
    window.location.href = 'admin.html';
  }
}

/**
 * Checks if a user is currently authenticated
 * @param {boolean} redirectIfNot - Whether to redirect to login if not authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated(redirectIfNot = false) {
  const session = getSession();
  
  if (!session) {
    if (redirectIfNot && typeof window !== 'undefined') {
      window.location.href = 'admin.html';
    }
    return false;
  }
  
  if (!isSessionValid(session)) {
    clearSession();
    if (redirectIfNot && typeof window !== 'undefined') {
      window.location.href = 'admin.html';
    }
    return false;
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
 * - Creates default admin if none exist
 * - Cleans up expired sessions
 * - Logs authentication status
 */
function initializeAuth() {
  try {
    // Check if admins exist, create default if not
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
      console.log(`✅ Auth.js loaded - Currently logged in: ${admin?.username || 'Unknown'}`);
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
  // Initialize immediately or wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
  } else {
    initializeAuth();
  }
}

// ==================== EXPORT FOR USE IN OTHER FILES ====================
// These functions are now available globally
console.log('✅ Auth.js loaded successfully');