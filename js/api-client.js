const API_BASE_URL = 'https://grrc-website-10.onrender.com';
const AUTH_TOKEN_KEY = 'grrc_auth_token';
const REQUEST_TIMEOUT = 5000;

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
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    const requestKey = getRequestKey(url, config);
    if (activeRequests.has(requestKey)) {
        console.log(`♻️ Reusing existing request: ${endpoint}`);
        return activeRequests.get(requestKey);
    }
    
    const requestPromise = (async () => {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
            });
            
            const fetchPromise = fetch(url, config);
            const response = await Promise.race([
                fetchPromise,
                timeoutPromise
            ]).catch(error => {
                if (error.message === 'Request timeout') {
                    console.error('⏱️ Request timed out, retrying with longer timeout...');
                    return Promise.race([
                        fetch(url, { ...config, signal: AbortSignal.timeout(10000) }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Extended timeout')), 10000)
                        )
                    ]);
                }
                throw error;
            });
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
                clearAuthToken();
                console.warn('🔐 Authentication failed. Token cleared.');
                
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
            
            if (!response.ok) {
                console.error(`❌ API Error [${endpoint}]: ${data.error || data.message || 'Unknown error'}`);
                return {
                    success: false,
                    data: null,
                    error: data.error || data.message || `Request failed with status ${response.status}`
                };
            }
            
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
            
            return {
                success: false,
                data: null,
                error: error.message === 'Request timeout' 
                    ? 'Request timeout (5s). Please check your connection.'
                    : error.message || 'Network error. Please check your connection.'
            };
        } finally {
            activeRequests.delete(requestKey);
        }
    })();
    
    activeRequests.set(requestKey, requestPromise);
    
    return requestPromise;
}

async function getConfig() {
    return request('/api/content/config');
}

async function getMembers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/members${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

async function getMemberById(id) {
    return request(`/api/content/members/${id}`);
}

async function getEvents(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/events${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

async function getEventById(id) {
    return request(`/api/content/events/${id}`);
}

async function getProjects(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/projects${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

async function getProjectById(id) {
    return request(`/api/content/projects/${id}`);
}

async function getGallery(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/gallery${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

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

async function getGalleryItemById(id) {
    return request(`/api/content/gallery/${id}`);
}

async function getAnnouncements() {
    return request('/api/content/announcements');
}

async function getStatistics() {
    return request('/api/content/statistics');
}

async function getAdmins() {
    return request('/api/admin/admins');
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
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/api/content/alumni${queryParams ? '?' + queryParams : ''}`;
    return request(endpoint);
}

async function getAlumniById(id) {
    return request(`/api/content/alumni/${id}`);
}

async function getFeaturedAlumni(limit = 6) {
    return request(`/api/content/alumni/featured?limit=${limit}`);
}

async function getAlumniBatches() {
    return request('/api/content/alumni/batches');
}

async function getMembershipApplications(status = null) {
    const endpoint = `/api/membership/applications${status ? '?status=' + status : ''}`;
    return request(endpoint);
}

async function getMembershipApplicationById(id) {
    return request(`/api/membership/applications/${id}`);
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
    return request('/api/membership/statistics');
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
    return request('/api/admin/alumni/statistics');
}

// ============ ALUMNI APPLICATION API METHODS ============

async function submitAlumniApplication(data) {
    return request('/api/alumni-application/apply', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function getAlumniApplications(status = null) {
    const endpoint = `/api/alumni-application/applications${status ? '?status=' + status : ''}`;
    return request(endpoint);
}

async function getAlumniApplicationById(id) {
    return request(`/api/alumni-application/applications/${id}`);
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
    return request('/api/alumni-application/statistics');
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
    setAuthToken,
    getAuthToken,
    clearAuthToken,
    isAuthenticated,
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