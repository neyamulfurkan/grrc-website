/**
 * API Client for GSTU Robotics Club Backend
 * ==========================================
 * Centralized module for all frontend-backend communication.
 * Handles authentication, error handling, and request deduplication.
 * 
 * CRITICAL FIX v1.3.0:
 * - Fixed token persistence using localStorage instead of memory-only
 * - Tokens now persist across page reloads
 * - Automatic token loading on initialization
 * - Added request deduplication to prevent concurrent identical requests
 * - Added 5-second timeout to all fetch() calls
 * - Removed retry logic (was causing infinite loops and server overload)
 * - Added detailed error logging with endpoint, status, and duration
 * - Fixed getGalleryItems() to properly call getGallery()
 * 
 * Features:
 * - Automatic authentication header injection
 * - Persistent token storage (localStorage)
 * - Consistent error handling across all requests
 * - Request deduplication
 * - 5-second request timeout
 * - CORS-compatible request configuration
 * 
 * Usage:
 * - Import this file in HTML: <script src="js/api-client.js"></script>
 * - All functions are available globally via window.apiClient object
 * 
 * @author GSTU Robotics Club
 * @version 1.3.0 - Fixed token persistence with localStorage
 */

// ============ CONFIGURATION ============

const API_BASE_URL = 'https://grrc-website-10.onrender.com';

const AUTH_TOKEN_KEY = 'grrc_auth_token';
const REQUEST_TIMEOUT = 5000; // 5 seconds

// ============ REQUEST DEDUPLICATION ============

/**
 * Track active requests to prevent duplicates
 * Key: URL + method + body hash
 * Value: Promise of ongoing request
 */
const activeRequests = new Map();

/**
 * Generate unique key for request deduplication
 * @param {string} url - Full request URL
 * @param {Object} config - Fetch config
 * @returns {string} - Unique request key
 */
function getRequestKey(url, config) {
    const method = config.method || 'GET';
    const bodyHash = config.body ? btoa(config.body).substring(0, 20) : '';
    return `${method}:${url}:${bodyHash}`;
}

// ============ TOKEN MANAGEMENT ============

/**
 * Store authentication token in localStorage (persistent)
 * @param {string} token - JWT token from backend
 */
function setAuthToken(token) {
    try {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        window.__authToken = token;
        console.log('🔐 Token saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save token to localStorage:', error);
        // Fallback to memory-only storage
        window.__authToken = token;
    }
}

/**
 * Retrieve authentication token from localStorage
 * @returns {string|null} - JWT token or null
 */
function getAuthToken() {
    try {
        // Try to get from localStorage first
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            window.__authToken = token;
            return token;
        }
        // Fallback to memory
        return window.__authToken || null;
    } catch (error) {
        console.error('❌ Failed to read token from localStorage:', error);
        // Fallback to memory
        return window.__authToken || null;
    }
}

/**
 * Clear authentication token (logout)
 */
function clearAuthToken() {
    try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        console.log('🔓 Token removed from localStorage');
    } catch (error) {
        console.error('❌ Failed to remove token from localStorage:', error);
    }
    window.__authToken = null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if valid token exists
 */
function isAuthenticated() {
    return !!getAuthToken();
}

// ============ INITIALIZE TOKEN ON LOAD ============

/**
 * Load token from localStorage on initialization
 */
(function initializeAuth() {
    try {
        const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
            window.__authToken = savedToken;
            console.log('🔐 Token loaded from localStorage');
        } else {
            console.log('🔓 No saved token found');
        }
    } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
    }
})();

// ============ HTTP REQUEST WRAPPER ============

/**
 * Generic HTTP request wrapper with error handling, timeout, and deduplication
 * @param {string} endpoint - API endpoint (e.g., '/api/content/members')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} - { success: boolean, data: any, error: string }
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();
    const startTime = Date.now();
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    // Add auth header if token exists
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    // Check for duplicate in-flight requests
    const requestKey = getRequestKey(url, config);
    if (activeRequests.has(requestKey)) {
        console.log(`♻️ Reusing existing request: ${endpoint}`);
        return activeRequests.get(requestKey);
    }
    
    // Create new request promise
    const requestPromise = (async () => {
        try {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
            });
            
            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url, config),
                timeoutPromise
            ]);
            
            const duration = Date.now() - startTime;
            
            // Handle non-JSON responses (e.g., network errors)
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }
            
            // Log response details
            console.log(`📊 API Response [${endpoint}]: Status ${response.status} (${duration}ms)`);
            
            // Handle authentication errors (token expired or invalid)
            if (response.status === 401 || response.status === 403) {
                clearAuthToken();
                console.warn('🔐 Authentication failed. Token cleared.');
                
                // Redirect to login if on admin page
                if (window.location.pathname.includes('admin')) {
                    setTimeout(() => {
                        window.location.href = '/admin.html';
                    }, 1000);
                }
                
                return {
                    success: false,
                    data: null,
                    error: data.error || 'Authentication required. Please login again.'
                };
            }
            
            // Handle other HTTP errors
            if (!response.ok) {
                console.error(`❌ API Error [${endpoint}]: ${data.error || data.message || 'Unknown error'}`);
                return {
                    success: false,
                    data: null,
                    error: data.error || data.message || `Request failed with status ${response.status}`
                };
            }
            
            // Success response
            console.log(`✅ API Success [${endpoint}]: ${duration}ms`);
            return {
                success: true,
                data: data.data || data,
                error: null
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ API Error [${endpoint}]: ${error.message}`);
            console.error(`⏱️ Duration: ${duration}ms`);
            
            // Return error immediately (no retries)
            return {
                success: false,
                data: null,
                error: error.message === 'Request timeout' 
                    ? 'Request timeout (5s). Please check your connection.'
                    : error.message || 'Network error. Please check your connection.'
            };
        } finally {
            // Remove from active requests after completion
            activeRequests.delete(requestKey);
        }
    })();
    
    // Store in active requests
    activeRequests.set(requestKey, requestPromise);
    
    return requestPromise;
}

// ============ PUBLIC CONTENT APIs ============

/**
 * Get club configuration (logo, name, motto, social links, etc.)
 * @returns {Promise<Object>} - { success, data: { logo, name, motto, ... }, error }
 */
async function getConfig() {
    return request('/api/content/config');
}

/**
 * Get list of club members with optional filters
 * @param {Object} filters - { department, year, role, status }
 * @returns {Promise<Object>} - { success, data: [members], error }
 */
async function getMembers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/members${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

/**
 * Get single member by ID
 * @param {string|number} id - Member ID
 * @returns {Promise<Object>} - { success, data: {member}, error }
 */
async function getMemberById(id) {
    return request(`/api/content/members/${id}`);
}

/**
 * Get list of events with optional filters
 * @param {Object} filters - { category, status, date_from, date_to }
 * @returns {Promise<Object>} - { success, data: [events], error }
 */
async function getEvents(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/events${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

/**
 * Get single event by ID
 * @param {string|number} id - Event ID
 * @returns {Promise<Object>} - { success, data: {event}, error }
 */
async function getEventById(id) {
    return request(`/api/content/events/${id}`);
}

/**
 * Get list of projects with optional filters
 * @param {Object} filters - { category, status }
 * @returns {Promise<Object>} - { success, data: [projects], error }
 */
async function getProjects(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/projects${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

/**
 * Get single project by ID
 * @param {string|number} id - Project ID
 * @returns {Promise<Object>} - { success, data: {project}, error }
 */
async function getProjectById(id) {
    return request(`/api/content/projects/${id}`);
}

/**
 * Get gallery items with optional filters
 * @param {Object} filters - { category, date_from, date_to }
 * @returns {Promise<Object>} - { success, data: [gallery items], error }
 */
async function getGallery(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/gallery${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

/**
 * Alias for getGallery() - for compatibility with load-config.js
 * FIXED: Now properly calls getGallery() with filters and handles response
 * @param {Object} filters - { category, date_from, date_to }
 * @returns {Promise<Object>} - { success, data: [gallery items], error }
 */
async function getGalleryItems(filters = {}) {
    try {
        const result = await getGallery(filters);
        return result;
    } catch (error) {
        console.error('❌ getGalleryItems error:', error);
        return {
            success: false,
            data: null,
            error: error.message || 'Failed to fetch gallery items'
        };
    }
}

/**
 * Get single gallery item by ID
 * @param {string|number} id - Gallery item ID
 * @returns {Promise<Object>} - { success, data: {gallery item}, error }
 */
async function getGalleryItemById(id) {
    return request(`/api/content/gallery/${id}`);
}

/**
 * Get active announcements
 * @returns {Promise<Object>} - { success, data: [announcements], error }
 */
async function getAnnouncements() {
    return request('/api/content/announcements');
}

/**
 * Get club statistics (member count, event count, etc.)
 * @returns {Promise<Object>} - { success, data: {statistics}, error }
 */
async function getStatistics() {
    return request('/api/content/statistics');
}

/**
 * Get all admins (admin only - requires auth)
 * @returns {Promise<Object>} - { success, data: [admins], error }
 */
async function getAdmins() {
    return request('/api/admin/admins');
}

// ============ AUTHENTICATION APIs ============

/**
 * Login with username and password
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<Object>} - { success, data: {token, admin}, error }
 */
async function login(username, password) {
    const result = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    // Store token on successful login (now persists in localStorage)
    if (result.success && result.data && result.data.token) {
        setAuthToken(result.data.token);
        console.log('✅ Login successful - token saved');
    }
    
    return result;
}

/**
 * Logout current user
 * @returns {Promise<Object>} - { success: true }
 */
async function logout() {
    clearAuthToken();
    
    // Optionally call backend logout endpoint
    try {
        await request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.warn('Logout endpoint error (non-critical):', error);
    }
    
    return { success: true, data: null, error: null };
}

/**
 * Verify current authentication token
 * @returns {Promise<Object>} - { success, data: {valid, user}, error }
 */
async function verifyToken() {
    return request('/api/auth/verify');
}

// ============ ADMIN APIs - CLUB CONFIG ============

/**
 * Update club configuration (admin only)
 * FIXED: Renamed from updateClubConfig to updateConfig to match storage.js calls
 * @param {Object} data - { logo, name, motto, description, social_links, ... }
 * @returns {Promise<Object>} - { success, data: {updated config}, error }
 */
async function updateConfig(data) {
    return request('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// ============ ADMIN APIs - MEMBERS ============

/**
 * Create new member (admin only)
 * @param {Object} data - { name, photo, department, year, role, email, ... }
 * @returns {Promise<Object>} - { success, data: {new member}, error }
 */
async function createMember(data) {
    return request('/api/admin/members', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Update existing member (admin only)
 * @param {string|number} id - Member ID
 * @param {Object} data - Updated member data
 * @returns {Promise<Object>} - { success, data: {updated member}, error }
 */
async function updateMember(id, data) {
    return request(`/api/admin/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Delete member (admin only)
 * @param {string|number} id - Member ID
 * @returns {Promise<Object>} - { success, data: {deleted: true}, error }
 */
async function deleteMember(id) {
    return request(`/api/admin/members/${id}`, {
        method: 'DELETE'
    });
}

// ============ ADMIN APIs - EVENTS ============

/**
 * Create new event (admin only)
 * @param {Object} data - { title, description, category, date, time, venue, ... }
 * @returns {Promise<Object>} - { success, data: {new event}, error }
 */
async function createEvent(data) {
    return request('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Update existing event (admin only)
 * @param {string|number} id - Event ID
 * @param {Object} data - Updated event data
 * @returns {Promise<Object>} - { success, data: {updated event}, error }
 */
async function updateEvent(id, data) {
    return request(`/api/admin/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Delete event (admin only)
 * @param {string|number} id - Event ID
 * @returns {Promise<Object>} - { success, data: {deleted: true}, error }
 */
async function deleteEvent(id) {
    return request(`/api/admin/events/${id}`, {
        method: 'DELETE'
    });
}

// ============ ADMIN APIs - PROJECTS ============

/**
 * Create new project (admin only)
 * @param {Object} data - { title, description, category, status, technologies, ... }
 * @returns {Promise<Object>} - { success, data: {new project}, error }
 */
async function createProject(data) {
    return request('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Update existing project (admin only)
 * @param {string|number} id - Project ID
 * @param {Object} data - Updated project data
 * @returns {Promise<Object>} - { success, data: {updated project}, error }
 */
async function updateProject(id, data) {
    return request(`/api/admin/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Delete project (admin only)
 * @param {string|number} id - Project ID
 * @returns {Promise<Object>} - { success, data: {deleted: true}, error }
 */
async function deleteProject(id) {
    return request(`/api/admin/projects/${id}`, {
        method: 'DELETE'
    });
}

// ============ ADMIN APIs - GALLERY ============

/**
 * Create new gallery item (admin only)
 * @param {Object} data - { image, title, description, category, date, ... }
 * @returns {Promise<Object>} - { success, data: {new gallery item}, error }
 */
async function createGalleryItem(data) {
    return request('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Update existing gallery item (admin only)
 * @param {string|number} id - Gallery item ID
 * @param {Object} data - Updated gallery item data
 * @returns {Promise<Object>} - { success, data: {updated gallery item}, error }
 */
async function updateGalleryItem(id, data) {
    return request(`/api/admin/gallery/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Delete gallery item (admin only)
 * @param {string|number} id - Gallery item ID
 * @returns {Promise<Object>} - { success, data: {deleted: true}, error }
 */
async function deleteGalleryItem(id) {
    return request(`/api/admin/gallery/${id}`, {
        method: 'DELETE'
    });
}

// ============ ADMIN APIs - ANNOUNCEMENTS ============

/**
 * Create new announcement (admin only)
 * @param {Object} data - { title, content, priority, date }
 * @returns {Promise<Object>} - { success, data: {new announcement}, error }
 */
async function createAnnouncement(data) {
    return request('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Update existing announcement (admin only)
 * @param {string|number} id - Announcement ID
 * @param {Object} data - Updated announcement data
 * @returns {Promise<Object>} - { success, data: {updated announcement}, error }
 */
async function updateAnnouncement(id, data) {
    return request(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Delete announcement (admin only)
 * @param {string|number} id - Announcement ID
 * @returns {Promise<Object>} - { success, data: {deleted: true}, error }
 */
async function deleteAnnouncement(id) {
    return request(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
    });
}

// ============ ADMIN APIs - ADMINS ============

/**
 * Create new admin user (admin only)
 * @param {Object} data - { username, password, role }
 * @returns {Promise<Object>} - { success, data: {new admin}, error }
 */
async function createAdmin(data) {
    return request('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Update existing admin user (admin only)
 * @param {string|number} id - Admin ID
 * @param {Object} data - Updated admin data
 * @returns {Promise<Object>} - { success, data: {updated admin}, error }
 */
async function updateAdmin(id, data) {
    return request(`/api/admin/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Delete admin user (admin only)
 * @param {string|number} id - Admin ID
 * @returns {Promise<Object>} - { success, data: {deleted: true}, error }
 */
async function deleteAdmin(id) {
    return request(`/api/admin/admins/${id}`, {
        method: 'DELETE'
    });
}

// ============ UTILITY FUNCTIONS ============

/**
 * Check if API is reachable (health check)
 * @returns {Promise<boolean>} - True if API is online
 */
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        return response.ok;
    } catch (error) {
        console.error('API Health Check Failed:', error);
        return false;
    }
}

/**
 * Format API error for user display
 * @param {string} error - Error message from API
 * @returns {string} - User-friendly error message
 */
function formatErrorMessage(error) {
    if (!error) return 'An unknown error occurred';
    
    // Common error mappings
    const errorMap = {
        'Network error': 'Unable to connect to server. Please check your internet connection.',
        'Authentication required': 'Please login to continue.',
        'Invalid credentials': 'Invalid username or password.',
        'Token expired': 'Your session has expired. Please login again.',
        'Permission denied': 'You do not have permission to perform this action.',
        'Not found': 'The requested resource was not found.',
        'Validation error': 'Please check your input and try again.'
    };
    
    for (const [key, value] of Object.entries(errorMap)) {
        if (error.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return error;
}

// ============ EXPORT ALL FUNCTIONS ============

/**
 * Export all API functions to global scope
 * Usage: window.apiClient.getMembers()
 */
window.apiClient = {
    // Token Management
    setAuthToken,
    getAuthToken,
    clearAuthToken,
    isAuthenticated,
    
    // Public Content APIs
    getConfig,
    getMembers,
    getMemberById,
    getEvents,
    getEventById,
    getProjects,
    getProjectById,
    getGallery,
    getGalleryItems,
    getGalleryItemById,
    getAnnouncements,
    getStatistics,
    getAdmins,
    
    // Authentication APIs
    login,
    logout,
    verifyToken,
    
    // Admin APIs - Config
    updateConfig,
    
    // Admin APIs - Members
    createMember,
    updateMember,
    deleteMember,
    
    // Admin APIs - Events
    createEvent,
    updateEvent,
    deleteEvent,
    
    // Admin APIs - Projects
    createProject,
    updateProject,
    deleteProject,
    
    // Admin APIs - Gallery
    createGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    
    // Admin APIs - Announcements
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    
    // Admin APIs - Admins
    createAdmin,
    updateAdmin,
    deleteAdmin,
    
    // Utilities
    checkAPIHealth,
    formatErrorMessage,
    
    // Direct access to request function for custom calls
    request
};

// Log initialization
console.log('✅ API Client initialized (v1.3.0 - Persistent Auth)');
console.log('📡 API Base URL:', API_BASE_URL);
console.log('🔐 Authentication:', isAuthenticated() ? 'Active (token loaded)' : 'Not authenticated');
console.log('💾 Token Storage: localStorage');
console.log('🔧 Fixed Issues:');
console.log('   - Token now persists across page reloads');
console.log('   - Automatic token loading on initialization');
console.log('   - Removed retry logic (prevents infinite loops)');
console.log('   - Added 5-second request timeout');
console.log('   - Added request deduplication');
console.log('   - Added detailed error logging');
console.log('   - Fixed getGalleryItems() error handling');

// Export for Node.js environment (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.apiClient;
}