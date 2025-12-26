const API_BASE_URL = 'https://grrc-website-10.onrender.com';
const AUTH_TOKEN_KEY = 'grrc_auth_token';
const REQUEST_TIMEOUT = 90000;

const activeRequests = new Map();

function getRequestKey(url, config) {
    const method = config.method || 'GET';
    const bodyHash = config.body ? btoa(config.body).substring(0, 20) : '';
    return `${method}:${url}:${bodyHash}`;
}

function setAuthToken(token) {
    try {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        window.__authToken = token;
        console.log('🔐 Token saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save token to localStorage:', error);
        window.__authToken = token;
    }
}

function getAuthToken() {
    try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            window.__authToken = token;
            return token;
        }
        return window.__authToken || null;
    } catch (error) {
        console.error('❌ Failed to read token from localStorage:', error);
        return window.__authToken || null;
    }
}

function clearAuthToken() {
    try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        console.log('🔓 Token removed from localStorage');
    } catch (error) {
        console.error('❌ Failed to remove token from localStorage:', error);
    }
    window.__authToken = null;
}

function isAuthenticated() {
    return !!getAuthToken();
}

// ✅ FIX: Remove IIFE and use simpler initialization
function initializeAuth() {
    try {
        const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
            window.__authToken = savedToken;
            console.log('🔐 Token loaded from localStorage on init');
            console.log('🔐 Token preview:', savedToken.substring(0, 20) + '...');
        } else {
            console.log('🔓 No saved token found on init');
        }
    } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
    }
}

// ✅ FIX: Call initializeAuth after all functions are defined
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

// CRITICAL FIX: Ensure token is always available before API calls
window.addEventListener('load', function() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && window.apiClient) {
        window.__authToken = token;
        console.log('✅ Token re-verified on window load');
    }
});

async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();
    const startTime = Date.now();
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // ✅ FIX: Define method FIRST before using it
    const method = options.method || 'GET';
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
        // ✅ FIX: Allow caching for GET requests to static data
        cache: options.cache || (method === 'GET' && !endpoint.includes('?_t=') ? 'force-cache' : 'no-store')
    };
    
    // ✅ FIX: Cache GET requests for config/members/events (static data)
    const isStaticEndpoint = endpoint.includes('/config') || endpoint.includes('/members') || endpoint.includes('/events') || endpoint.includes('/projects');
    const shouldDeduplicate = method !== 'GET' && !endpoint.includes('?_t=');
    
    // Check memory cache for static GET requests
    if (method === 'GET' && isStaticEndpoint && window.__apiCache) {
        const cached = window.__apiCache.get(endpoint);
        if (cached && (Date.now() - cached.timestamp < 60000)) { // 60 second cache
            console.log(`💾 Using cached response: ${endpoint}`);
            return cached.data;
        }
    }
    
    const requestKey = getRequestKey(url, config);
    if (shouldDeduplicate && activeRequests.has(requestKey)) {
        console.log(`♻️ Reusing existing request: ${endpoint}`);
        return activeRequests.get(requestKey);
    }
    
    const requestPromise = (async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.error('⏱️ Request timeout after', REQUEST_TIMEOUT/1000, 'seconds');
            }, REQUEST_TIMEOUT);
            
            const fetchPromise = fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            const response = await fetchPromise.finally(() => clearTimeout(timeoutId));
            const duration = Date.now() - startTime;
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }
            
            console.log(`📊 API Response [${endpoint}]: Status ${response.status} (${duration}ms)`);
            
            if (response.status === 401 || response.status === 403) {
                console.error('🔐 Authentication failed:', data.error || 'Token invalid/expired');
                
                // CRITICAL FIX: Don't immediately clear token - might be race condition
                // Only clear if explicitly told token is invalid
                if (data.error && (data.error.includes('Invalid token') || data.error.includes('expired'))) {
                    clearAuthToken();
                    console.warn('🔓 Token cleared due to invalidity');
                    
                    if (window.location.pathname.includes('admin')) {
                        setTimeout(() => {
                            const basePath = window.location.pathname.includes('/grrc-website/') ? '/grrc-website/' : './';
                            window.location.replace(basePath + 'admin.html');
                        }, 1000);
                    }
                } else {
                    console.warn('⚠️ Auth failed but token not cleared - might be temporary issue');
                }
                
                return {
                    success: false,
                    data: null,
                    error: data.error || 'Authentication required. Please login again.'
                };
            }
            
            if (!response.ok) {
                console.error(`❌ API Error [${endpoint}]: ${data.error || data.message || 'Unknown error'}`);
                return {
                    success: false,
                    data: null,
                    error: data.error || data.message || `Request failed with status ${response.status}`
                };
            }
            
            console.log(`✅ API Success [${endpoint}]: ${duration}ms`);
            const result = {
                success: true,
                data: data.data || data,
                error: null
            };
            
            // ✅ FIX: Cache successful GET responses for static endpoints
            if (method === 'GET' && isStaticEndpoint) {
                if (!window.__apiCache) window.__apiCache = new Map();
                window.__apiCache.set(endpoint, { data: result, timestamp: Date.now() });
                console.log(`💾 Cached response: ${endpoint}`);
            }
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ API Error [${endpoint}]: ${error.message}`);
            console.error(`⏱️ Duration: ${duration}ms`);
            
            let errorMessage = error.message || 'Network error. Please check your connection.';
            
            if (error.name === 'AbortError') {
                errorMessage = `Request timeout (${REQUEST_TIMEOUT/1000}s). Server is starting up, please wait and try again.`;
            }
            
            return {
                success: false,
                data: null,
                error: errorMessage
            };
        } finally {
            activeRequests.delete(requestKey);
        }
    })();
    
    activeRequests.set(requestKey, requestPromise);
    
    return requestPromise;
}

async function getConfig() {
    const timestamp = Date.now();
    return request(`/api/content/config?_t=${timestamp}`);
}

async function getMembers(filters = {}) {
    const timestamp = Date.now();
    filters._t = timestamp;
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/members?${queryParams}`;
    return request(endpoint);
}

async function getMemberById(id) {
    const timestamp = Date.now();
    return request(`/api/content/members/${id}?_t=${timestamp}`);
}

async function getEvents(filters = {}) {
    const timestamp = Date.now();
    filters._t = timestamp;
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/events?${queryParams}`;
    return request(endpoint);
}

async function getEventById(id) {
    const timestamp = Date.now();
    return request(`/api/content/events/${id}?_t=${timestamp}`);
}

async function getProjects(filters = {}) {
    const timestamp = Date.now();
    filters._t = timestamp;
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/projects?${queryParams}`;
    return request(endpoint);
}

async function getProjectById(id) {
    const timestamp = Date.now();
    return request(`/api/content/projects/${id}?_t=${timestamp}`);
}

async function getGallery(filters = {}) {
    const timestamp = Date.now();
    filters._t = timestamp;
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/gallery?${queryParams}`;
    return request(endpoint);
}

async function getGalleryItems(filters = {}) {
    try {
        const timestamp = Date.now();
        filters._t = timestamp;
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

async function getGalleryItemById(id) {
    const timestamp = Date.now();
    return request(`/api/content/gallery/${id}?_t=${timestamp}`);
}

async function getAnnouncements() {
    const timestamp = Date.now();
    return request(`/api/content/announcements?_t=${timestamp}`);
}

async function getStatistics() {
    const timestamp = Date.now();
    return request(`/api/content/statistics?_t=${timestamp}`);
}

async function getAdmins() {
    const timestamp = Date.now();
    return request(`/api/superadmin/admins?_t=${timestamp}`);
}

async function login(username, password) {
    const result = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (result.success && result.data && result.data.token) {
        setAuthToken(result.data.token);
        console.log('✅ Login successful - token saved');
    }
    
    return result;
}

async function logout() {
    clearAuthToken();
    
    try {
        await request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.warn('Logout endpoint error (non-critical):', error);
    }
    
    return { success: true, data: null, error: null };
}

async function verifySuperAdmin(password) {
    return request('/api/auth/verify-superadmin', {
        method: 'POST',
        body: JSON.stringify({ password })
    });
}
async function verifyToken() {
    return request('/api/auth/verify');
}
async function updateConfig(data) {
    return request('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function createMember(data) {
    return request('/api/admin/members', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateMember(id, data) {
    return request(`/api/admin/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteMember(id) {
    return request(`/api/admin/members/${id}`, {
        method: 'DELETE'
    });
}

async function createEvent(data) {
    return request('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateEvent(id, data) {
    return request(`/api/admin/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteEvent(id) {
    return request(`/api/admin/events/${id}`, {
        method: 'DELETE'
    });
}

async function createProject(data) {
    return request('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateProject(id, data) {
    return request(`/api/admin/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteProject(id) {
    return request(`/api/admin/projects/${id}`, {
        method: 'DELETE'
    });
}

async function createGalleryItem(data) {
    return request('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateGalleryItem(id, data) {
    return request(`/api/admin/gallery/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteGalleryItem(id) {
    return request(`/api/admin/gallery/${id}`, {
        method: 'DELETE'
    });
}

async function createAnnouncement(data) {
    return request('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateAnnouncement(id, data) {
    return request(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteAnnouncement(id) {
    return request(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
    });
}

async function createAdmin(data) {
    return request('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateAdmin(id, data) {
    return request(`/api/admin/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteAdmin(id) {
    return request(`/api/admin/admins/${id}`, {
        method: 'DELETE'
    });
}

async function submitMembershipApplication(data) {
    return request('/api/membership/apply', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function getAlumni(filters = {}) {
    const timestamp = Date.now();
    filters._t = timestamp;
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/alumni?${queryParams}`;
    return request(endpoint);
}

async function getAlumniById(id) {
    const timestamp = Date.now();
    return request(`/api/content/alumni/${id}?_t=${timestamp}`);
}

async function getFeaturedAlumni(limit = 6) {
    const timestamp = Date.now();
    return request(`/api/content/alumni/featured?limit=${limit}&_t=${timestamp}`);
}

async function getAlumniBatches() {
    const timestamp = Date.now();
    return request(`/api/content/alumni/batches?_t=${timestamp}`);
}

async function getMembershipApplications(status = null) {
    const timestamp = Date.now();
    const endpoint = `/api/membership/applications${status ? '?status=' + status + '&_t=' + timestamp : '?_t=' + timestamp}`;
    return request(endpoint);
}

async function getMembershipApplicationById(id) {
    const timestamp = Date.now();
    return request(`/api/membership/applications/${id}?_t=${timestamp}`);
}

async function approveMembershipApplication(id, adminNotes = '') {
    return request(`/api/membership/applications/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: adminNotes })
    });
}

async function rejectMembershipApplication(id, adminNotes) {
    return request(`/api/membership/applications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: adminNotes })
    });
}

async function deleteMembershipApplication(id) {
    return request(`/api/membership/applications/${id}`, {
        method: 'DELETE'
    });
}

async function getMembershipStatistics() {
    const timestamp = Date.now();
    return request(`/api/membership/statistics?_t=${timestamp}`);
}

async function createAlumni(data) {
    return request('/api/admin/alumni', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateAlumni(id, data) {
    return request(`/api/admin/alumni/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteAlumni(id) {
    return request(`/api/admin/alumni/${id}`, {
        method: 'DELETE'
    });
}

async function getAlumniStatistics() {
    const timestamp = Date.now();
    return request(`/api/admin/alumni/statistics?_t=${timestamp}`);
}

// ============ ALUMNI APPLICATION API METHODS ============

async function submitAlumniApplication(data) {
    return request('/api/alumni-application/apply', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function getAlumniApplications(status = null) {
    const timestamp = Date.now();
    const endpoint = `/api/alumni-application/applications${status ? '?status=' + status + '&_t=' + timestamp : '?_t=' + timestamp}`;
    return request(endpoint);
}

async function getAlumniApplicationById(id) {
    const timestamp = Date.now();
    return request(`/api/alumni-application/applications/${id}?_t=${timestamp}`);
}

async function approveAlumniApplication(id, adminNotes = '') {
    return request(`/api/alumni-application/applications/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: adminNotes })
    });
}

async function rejectAlumniApplication(id, adminNotes) {
    return request(`/api/alumni-application/applications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: adminNotes })
    });
}

async function deleteAlumniApplication(id) {
    return request(`/api/alumni-application/applications/${id}`, {
        method: 'DELETE'
    });
}

async function getAlumniApplicationStatistics() {
    const timestamp = Date.now();
    return request(`/api/alumni-application/statistics?_t=${timestamp}`);
}

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

function formatErrorMessage(error) {
    if (!error) return 'An unknown error occurred';
    
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

window.apiClient = {
    baseURL: API_BASE_URL,
    setAuthToken,
    getAuthToken,
    clearAuthToken,
    isAuthenticated,
    verifySuperAdmin,
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
    login,
    logout,
    verifyToken,
    updateConfig,
    createMember,
    updateMember,
    deleteMember,
    createEvent,
    updateEvent,
    deleteEvent,
    createProject,
    updateProject,
    deleteProject,
    createGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    submitMembershipApplication,
    getAlumni,
    getAlumniById,
    getFeaturedAlumni,
    getAlumniBatches,
    getMembershipApplications,
    getMembershipApplicationById,
    approveMembershipApplication,
    rejectMembershipApplication,
    deleteMembershipApplication,
    getMembershipStatistics,
    createAlumni,
    updateAlumni,
    deleteAlumni,
    getAlumniStatistics,
    submitAlumniApplication,
    getAlumniApplications,
    getAlumniApplicationById,
    approveAlumniApplication,
    rejectAlumniApplication,
    deleteAlumniApplication,
    getAlumniApplicationStatistics,
    checkAPIHealth,
    formatErrorMessage,
    request
};

console.log('✅ API Client v1.5.0 - Added Alumni Application APIs');
console.log('📡 API Base URL:', API_BASE_URL);
console.log('🔐 Authentication:', isAuthenticated() ? 'Active (token loaded)' : 'Not authenticated');

window.apiClient.isReady = true;
window.API_AVAILABLE = true;

if (isAuthenticated()) {
    console.log('🔐 Existing authentication token detected and loaded');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.apiClient;
}