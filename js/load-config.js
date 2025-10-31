/**
 * load-config.js - Dynamic Club Data Loading Module
 * 
 * FIXED: Infinite loop prevention with proper architecture
 * - getX() functions ONLY read from localStorage cache (NO API calls)
 * - loadX() functions are the ONLY ones that call APIs
 * - Global isLoading flag prevents concurrent API calls
 * - Rate limiting prevents excessive API requests (5 second minimum between calls)
 * - Auto-initialization DISABLED - must call manually
 * - Auto-refresh DISABLED - must start manually
 * 
 * REQUIRES: api-client.js must be loaded before this file
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Storage keys for localStorage (MUST match storage.js)
const LOAD_CONFIG_STORAGE_KEYS = {
    CLUB_CONFIG: 'clubConfig',
    MEMBERS: 'clubMembers',
    EVENTS: 'clubEvents',
    PROJECTS: 'clubProjects',
    GALLERY: 'clubGallery',
    ANNOUNCEMENTS: 'clubAnnouncements',
    ADMINS: 'clubAdmins'
};

const REFRESH_INTERVAL = 30000; // Auto-refresh every 30 seconds (when enabled)
const RATE_LIMIT_INTERVAL = 5000; // Minimum 5 seconds between API calls per endpoint

// Global state management
let refreshTimer = null;
let isLoadingGlobal = false; // Prevents concurrent refreshAllData() calls

// Rate limiting: Track last API call timestamp per endpoint
const lastApiCall = {
    config: 0,
    members: 0,
    events: 0,
    projects: 0,
    gallery: 0,
    announcements: 0,
    admins: 0
};

/**
 * Check if enough time has passed since last API call (rate limiting)
 * @param {string} endpoint - Endpoint name (e.g., 'config', 'members')
 * @returns {boolean} True if call is allowed
 */
function canCallApi(endpoint) {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall[endpoint];
    return timeSinceLastCall >= RATE_LIMIT_INTERVAL;
}

/**
 * Update last API call timestamp
 * @param {string} endpoint - Endpoint name
 */
function updateApiCallTimestamp(endpoint) {
    lastApiCall[endpoint] = Date.now();
}

// =============================================================================
// CLUB CONFIGURATION
// =============================================================================

/**
 * Load club configuration from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR CLUB CONFIG
 * @returns {Promise<Object>} Club configuration object
 */
async function loadClubConfig() {
    try {
        // Rate limiting check
        if (!canCallApi('config')) {
            console.warn('⚠️ Rate limit: Using cached club config');
            return getClubConfigFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached data');
            return getClubConfigFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('config');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getConfig();
        
        if (result && result.success && result.data) {
            // Cache for offline access
            localStorage.setItem('clubConfig', JSON.stringify(result.data));
            console.log('✅ Club config loaded from API');
            return result.data;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached club config');
        return getClubConfigFromCache();
        
    } catch (error) {
        console.error('❌ Error loading club config from API:', error);
        return getClubConfigFromCache();
    }
}

/**
 * Get club config from cache ONLY
 * FIXED: No longer calls loadClubConfig() - prevents infinite loop
 * @returns {Object} Cached club config or default
 */
function getClubConfig() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getClubConfigFromCache();
}

/**
 * Get club config from localStorage cache
 * @returns {Object} Cached club config or default
 */
function getClubConfigFromCache() {
    try {
        const cached = localStorage.getItem('clubConfig');
        if (cached) {
            console.log('📦 Loading club config from cache');
            return JSON.parse(cached);
        }
    } catch (error) {
        console.error('Error reading cached config:', error);
    }
    
    return getDefaultConfig();
}

/**
 * Get default club configuration
 * @returns {Object} Default configuration
 */
function getDefaultConfig() {
    return {
        name: 'GSTU Robotics & Research Club',
        motto: 'A Hub of Robothinkers',
        description: 'Empowering students to explore robotics, AI, and innovative technologies through hands-on projects and collaborative learning.',
        logo: 'assets/default-logo.jpg',
        socialLinks: []
    };
}

// =============================================================================
// MEMBERS
// =============================================================================

/**
 * Load members from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR MEMBERS
 * @returns {Promise<Array>} Array of member objects
 */
async function loadMembers() {
    try {
        // Rate limiting check
        if (!canCallApi('members')) {
            console.warn('⚠️ Rate limit: Using cached members');
            return getMembersFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached members');
            return getMembersFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('members');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getMembers();
        
        if (result && result.success && result.data) {
            const members = Array.isArray(result.data) ? result.data : [];
            // Cache for offline access
            localStorage.setItem('clubMembers', JSON.stringify(members));
            console.log(`✅ Loaded ${members.length} members from API`);
            return members;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached members');
        return getMembersFromCache();
        
    } catch (error) {
        console.error('❌ Error loading members from API:', error);
        return getMembersFromCache();
    }
}

/**
 * Get members from cache ONLY
 * FIXED: No longer calls loadMembers() - prevents infinite loop
 * @returns {Array} Cached members or empty array
 */
function getMembers() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getMembersFromCache();
}

/**
 * Get members from localStorage cache
 * @returns {Array} Cached members or empty array
 */
function getMembersFromCache() {
    try {
        const cached = localStorage.getItem('clubMembers');
        if (cached) {
            const members = JSON.parse(cached);
            console.log(`📦 Loaded ${members.length} members from cache`);
            return members;
        }
    } catch (error) {
        console.error('Error reading cached members:', error);
    }
    
    return [];
}

/**
 * Load a single member by ID (uses cache)
 * @param {string|number} memberId - Member ID
 * @returns {Object|null} Member object or null
 */
async function loadMemberById(memberId) {
    try {
        const members = getMembersFromCache(); // Use cache only
        return members.find(m => m.id == memberId) || null;
    } catch (error) {
        console.error('Error loading member by ID:', error);
        return null;
    }
}

/**
 * Filter members by role (uses cache)
 * @param {string} role - Member role (e.g., 'Executive', 'General')
 * @returns {Array} Filtered members array
 */
async function loadMembersByRole(role) {
    try {
        const members = getMembersFromCache(); // Use cache only
        return members.filter(m => m.role === role);
    } catch (error) {
        console.error('Error filtering members by role:', error);
        return [];
    }
}

/**
 * Filter members by department (uses cache)
 * @param {string} department - Department name
 * @returns {Array} Filtered members array
 */
async function loadMembersByDepartment(department) {
    try {
        const members = getMembersFromCache(); // Use cache only
        return members.filter(m => m.department === department);
    } catch (error) {
        console.error('Error filtering members by department:', error);
        return [];
    }
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Load events from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR EVENTS
 * @returns {Promise<Array>} Array of event objects
 */
async function loadEvents() {
    try {
        // Rate limiting check
        if (!canCallApi('events')) {
            console.warn('⚠️ Rate limit: Using cached events');
            return getEventsFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached events');
            return getEventsFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('events');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getEvents();
        
        if (result && result.success && result.data) {
            const events = Array.isArray(result.data) ? result.data : [];
            // Cache for offline access
            localStorage.setItem('clubEvents', JSON.stringify(events));
            console.log(`✅ Loaded ${events.length} events from API`);
            return events;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached events');
        return getEventsFromCache();
        
    } catch (error) {
        console.error('❌ Error loading events from API:', error);
        return getEventsFromCache();
    }
}

/**
 * Get events from cache ONLY
 * FIXED: No longer calls loadEvents() - prevents infinite loop
 * @returns {Array} Cached events or empty array
 */
function getEvents() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getEventsFromCache();
}

/**
 * Get events from localStorage cache
 * @returns {Array} Cached events or empty array
 */
function getEventsFromCache() {
    try {
        const cached = localStorage.getItem('clubEvents');
        if (cached) {
            const events = JSON.parse(cached);
            console.log(`📦 Loaded ${events.length} events from cache`);
            return events;
        }
    } catch (error) {
        console.error('Error reading cached events:', error);
    }
    
    return [];
}

/**
 * Load upcoming events (uses cache)
 * @returns {Array} Array of upcoming events
 */
async function loadUpcomingEvents() {
    try {
        const events = getEventsFromCache(); // Use cache only
        const now = new Date();
        
        return events
            .filter(e => {
                if (e.status === 'Cancelled' || e.status === 'cancelled') return false;
                
                const eventDate = new Date(e.date);
                return eventDate >= now || e.status === 'Upcoming' || e.status === 'Ongoing';
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
        console.error('Error loading upcoming events:', error);
        return [];
    }
}

/**
 * Load past events (uses cache)
 * @returns {Array} Array of past events (sorted newest first)
 */
async function loadPastEvents() {
    try {
        const events = getEventsFromCache(); // Use cache only
        const now = new Date();
        
        return events
            .filter(e => {
                if (e.status === 'Completed' || e.status === 'completed') return true;
                
                const eventDate = new Date(e.date);
                return eventDate < now;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error loading past events:', error);
        return [];
    }
}

/**
 * Filter events by category (uses cache)
 * @param {string} category - Event category
 * @returns {Array} Filtered events array
 */
async function loadEventsByCategory(category) {
    try {
        const events = getEventsFromCache(); // Use cache only
        return events.filter(e => e.category === category);
    } catch (error) {
        console.error('Error filtering events by category:', error);
        return [];
    }
}

/**
 * Load event by ID (uses cache)
 * @param {string|number} eventId - Event ID
 * @returns {Object|null} Event object or null
 */
async function loadEventById(eventId) {
    try {
        const events = getEventsFromCache(); // Use cache only
        return events.find(e => e.id == eventId) || null;
    } catch (error) {
        console.error('Error loading event by ID:', error);
        return null;
    }
}

// =============================================================================
// PROJECTS
// =============================================================================

/**
 * Load projects from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR PROJECTS
 * @returns {Promise<Array>} Array of project objects
 */
async function loadProjects() {
    try {
        // Rate limiting check
        if (!canCallApi('projects')) {
            console.warn('⚠️ Rate limit: Using cached projects');
            return getProjectsFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached projects');
            return getProjectsFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('projects');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getProjects();
        
        if (result && result.success && result.data) {
            const projects = Array.isArray(result.data) ? result.data : [];
            // Cache for offline access
            localStorage.setItem('clubProjects', JSON.stringify(projects));
            console.log(`✅ Loaded ${projects.length} projects from API`);
            return projects;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached projects');
        return getProjectsFromCache();
        
    } catch (error) {
        console.error('❌ Error loading projects from API:', error);
        return getProjectsFromCache();
    }
}

/**
 * Get projects from cache ONLY
 * FIXED: No longer calls loadProjects() - prevents infinite loop
 * @returns {Array} Cached projects or empty array
 */
function getProjects() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getProjectsFromCache();
}

/**
 * Get projects from localStorage cache
 * @returns {Array} Cached projects or empty array
 */
function getProjectsFromCache() {
    try {
        const cached = localStorage.getItem('clubProjects');
        if (cached) {
            const projects = JSON.parse(cached);
            console.log(`📦 Loaded ${projects.length} projects from cache`);
            return projects;
        }
    } catch (error) {
        console.error('Error reading cached projects:', error);
    }
    
    return [];
}

/**
 * Filter projects by status (uses cache)
 * @param {string} status - Project status (e.g., 'Completed', 'Ongoing', 'Planned')
 * @returns {Array} Filtered projects array
 */
async function loadProjectsByStatus(status) {
    try {
        const projects = getProjectsFromCache(); // Use cache only
        return projects.filter(p => p.status === status);
    } catch (error) {
        console.error('Error filtering projects by status:', error);
        return [];
    }
}

/**
 * Filter projects by category (uses cache)
 * @param {string} category - Project category
 * @returns {Array} Filtered projects array
 */
async function loadProjectsByCategory(category) {
    try {
        const projects = getProjectsFromCache(); // Use cache only
        return projects.filter(p => p.category === category);
    } catch (error) {
        console.error('Error filtering projects by category:', error);
        return [];
    }
}

/**
 * Load project by ID (uses cache)
 * @param {string|number} projectId - Project ID
 * @returns {Object|null} Project object or null
 */
async function loadProjectById(projectId) {
    try {
        const projects = getProjectsFromCache(); // Use cache only
        return projects.find(p => p.id == projectId) || null;
    } catch (error) {
        console.error('Error loading project by ID:', error);
        return null;
    }
}

// =============================================================================
// GALLERY
// =============================================================================

/**
 * Load gallery items from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR GALLERY
 * @returns {Promise<Array>} Array of gallery objects
 */
async function loadGallery() {
    try {
        // Rate limiting check
        if (!canCallApi('gallery')) {
            console.warn('⚠️ Rate limit: Using cached gallery');
            return getGalleryFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached gallery');
            return getGalleryFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('gallery');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getGalleryItems();
        
        if (result && result.success && result.data) {
            const gallery = Array.isArray(result.data) ? result.data : [];
            // Cache for offline access
            localStorage.setItem('clubGallery', JSON.stringify(gallery));
            console.log(`✅ Loaded ${gallery.length} gallery items from API`);
            return gallery;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached gallery');
        return getGalleryFromCache();
        
    } catch (error) {
        console.error('❌ Error loading gallery from API:', error);
        return getGalleryFromCache();
    }
}

/**
 * Get gallery from cache ONLY
 * FIXED: No longer calls loadGallery() - prevents infinite loop
 * @returns {Array} Cached gallery or empty array
 */
function getGallery() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getGalleryFromCache();
}

/**
 * Get gallery from localStorage cache
 * @returns {Array} Cached gallery or empty array
 */
function getGalleryFromCache() {
    try {
        const cached = localStorage.getItem('clubGallery');
        if (cached) {
            const gallery = JSON.parse(cached);
            console.log(`📦 Loaded ${gallery.length} gallery items from cache`);
            return gallery;
        }
    } catch (error) {
        console.error('Error reading cached gallery:', error);
    }
    
    return [];
}

/**
 * Filter gallery by category (uses cache)
 * @param {string} category - Gallery category
 * @returns {Array} Filtered gallery array
 */
async function loadGalleryByCategory(category) {
    try {
        const gallery = getGalleryFromCache(); // Use cache only
        return gallery.filter(g => g.category === category);
    } catch (error) {
        console.error('Error filtering gallery by category:', error);
        return [];
    }
}

/**
 * Load gallery item by ID (uses cache)
 * @param {string|number} galleryId - Gallery item ID
 * @returns {Object|null} Gallery object or null
 */
async function loadGalleryItemById(galleryId) {
    try {
        const gallery = getGalleryFromCache(); // Use cache only
        return gallery.find(g => g.id == galleryId) || null;
    } catch (error) {
        console.error('Error loading gallery item by ID:', error);
        return null;
    }
}

// =============================================================================
// ANNOUNCEMENTS
// =============================================================================

/**
 * Load announcements from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR ANNOUNCEMENTS
 * @returns {Promise<Array>} Array of announcement objects
 */
async function loadAnnouncements() {
    try {
        // Rate limiting check
        if (!canCallApi('announcements')) {
            console.warn('⚠️ Rate limit: Using cached announcements');
            return getAnnouncementsFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached announcements');
            return getAnnouncementsFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('announcements');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getAnnouncements();
        
        if (result && result.success && result.data) {
            const announcements = Array.isArray(result.data) ? result.data : [];
            // Cache for offline access
            localStorage.setItem('clubAnnouncements', JSON.stringify(announcements));
            console.log(`✅ Loaded ${announcements.length} announcements from API`);
            return announcements;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached announcements');
        return getAnnouncementsFromCache();
        
    } catch (error) {
        console.error('❌ Error loading announcements from API:', error);
        return getAnnouncementsFromCache();
    }
}

/**
 * Get announcements from cache ONLY
 * FIXED: No longer calls loadAnnouncements() - prevents infinite loop
 * @returns {Array} Cached announcements or empty array
 */
function getAnnouncements() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getAnnouncementsFromCache();
}

/**
 * Get announcements from localStorage cache
 * @returns {Array} Cached announcements or empty array
 */
function getAnnouncementsFromCache() {
    try {
        const cached = localStorage.getItem('clubAnnouncements');
        if (cached) {
            const announcements = JSON.parse(cached);
            console.log(`📦 Loaded ${announcements.length} announcements from cache`);
            return announcements;
        }
    } catch (error) {
        console.error('Error reading cached announcements:', error);
    }
    
    return [];
}

/**
 * Load active announcements (uses cache)
 * @returns {Array} Array of active announcements
 */
async function loadActiveAnnouncements() {
    try {
        const announcements = getAnnouncementsFromCache(); // Use cache only
        
        return announcements
            .filter(a => a.priority !== 'archived' && a.priority !== 'Archived')
            .sort((a, b) => {
                // Sort by priority first (High > Normal > Low)
                const priorityOrder = { 
                    'High': 3, 'high': 3,
                    'Normal': 2, 'normal': 2, 'Medium': 2, 'medium': 2,
                    'Low': 1, 'low': 1
                };
                const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                if (priorityDiff !== 0) return priorityDiff;
                
                // Then sort by date (newest first)
                return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
            });
    } catch (error) {
        console.error('Error loading active announcements:', error);
        return [];
    }
}

/**
 * Load announcement by ID (uses cache)
 * @param {string|number} announcementId - Announcement ID
 * @returns {Object|null} Announcement object or null
 */
async function loadAnnouncementById(announcementId) {
    try {
        const announcements = getAnnouncementsFromCache(); // Use cache only
        return announcements.find(a => a.id == announcementId) || null;
    } catch (error) {
        console.error('Error loading announcement by ID:', error);
        return null;
    }
}

// =============================================================================
// ADMINS
// =============================================================================

/**
 * Load admins from API (PRIMARY) or localStorage (FALLBACK)
 * THIS IS THE ONLY FUNCTION THAT CALLS THE API FOR ADMINS
 * @returns {Promise<Array>} Array of admin objects
 */
async function loadAdmins() {
    try {
        // Rate limiting check
        if (!canCallApi('admins')) {
            console.warn('⚠️ Rate limit: Using cached admins');
            return getAdminsFromCache();
        }

        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached admins');
            return getAdminsFromCache();
        }

        // Update rate limit timestamp
        updateApiCallTimestamp('admins');

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getAdmins();
        
        if (result && result.success && result.data) {
            const admins = Array.isArray(result.data) ? result.data : [];
            // Cache for offline access
            localStorage.setItem('clubAdmins', JSON.stringify(admins));
            console.log(`✅ Loaded ${admins.length} admins from API`);
            return admins;
        }
        
        // API returned error, use cache
        console.warn('⚠️ API returned error, using cached admins');
        return getAdminsFromCache();
        
    } catch (error) {
        console.error('❌ Error loading admins from API:', error);
        return getAdminsFromCache();
    }
}

/**
 * Get admins from cache ONLY
 * FIXED: No longer calls loadAdmins() - prevents infinite loop
 * @returns {Array} Cached admins or empty array
 */
function getAdmins() {
    // CRITICAL FIX: Only return cached data, NEVER call API
    return getAdminsFromCache();
}

/**
 * Get admins from localStorage cache
 * @returns {Array} Cached admins or empty array
 */
function getAdminsFromCache() {
    try {
        const cached = localStorage.getItem('clubAdmins');
        if (cached) {
            const admins = JSON.parse(cached);
            console.log(`📦 Loaded ${admins.length} admins from cache`);
            return admins;
        }
    } catch (error) {
        console.error('Error reading cached admins:', error);
    }
    
    return [];
}

// =============================================================================
// REAL-TIME SYNCHRONIZATION
// =============================================================================

/**
 * Refresh all cached data from API
 * FIXED: Added global isLoading flag to prevent concurrent calls
 * Forces fresh data load from backend
 * @returns {Promise<Object>} Status of all refresh operations
 */
async function refreshAllData() {
    // CRITICAL FIX: Prevent concurrent refresh calls
    if (isLoadingGlobal) {
        console.warn('⚠️ Refresh already in progress, skipping...');
        return {
            clubConfig: false,
            members: false,
            events: false,
            projects: false,
            gallery: false,
            announcements: false,
            admins: false,
            timestamp: new Date().toISOString(),
            skipped: true
        };
    }

    isLoadingGlobal = true;
    console.log('🔄 Refreshing all data from API...');
    
    const results = {
        clubConfig: false,
        members: false,
        events: false,
        projects: false,
        gallery: false,
        announcements: false,
        admins: false,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Check API availability
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, cannot refresh');
            return results;
        }

        // Refresh all data in parallel for better performance
        const [configRes, membersRes, eventsRes, projectsRes, galleryRes, announcementsRes, adminsRes] = 
            await Promise.allSettled([
                window.apiClient.getConfig(),
                window.apiClient.getMembers(),
                window.apiClient.getEvents(),
                window.apiClient.getProjects(),
                window.apiClient.getGalleryItems(),
                window.apiClient.getAnnouncements(),
                window.apiClient.getAdmins()
            ]);

        // Update club config
        if (configRes.status === 'fulfilled' && configRes.value && configRes.value.success) {
            localStorage.setItem('clubConfig', JSON.stringify(configRes.value.data));
            updateApiCallTimestamp('config');
            results.clubConfig = true;
        }

        // Update members
        if (membersRes.status === 'fulfilled' && membersRes.value && membersRes.value.success) {
            const members = Array.isArray(membersRes.value.data) ? membersRes.value.data : [];
            localStorage.setItem('clubMembers', JSON.stringify(members));
            updateApiCallTimestamp('members');
            results.members = true;
        }

        // Update events
        if (eventsRes.status === 'fulfilled' && eventsRes.value && eventsRes.value.success) {
            const events = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : [];
            localStorage.setItem('clubEvents', JSON.stringify(events));
            updateApiCallTimestamp('events');
            results.events = true;
        }

        // Update projects
        if (projectsRes.status === 'fulfilled' && projectsRes.value && projectsRes.value.success) {
            const projects = Array.isArray(projectsRes.value.data) ? projectsRes.value.data : [];
            localStorage.setItem('clubProjects', JSON.stringify(projects));
            updateApiCallTimestamp('projects');
            results.projects = true;
        }

        // Update gallery
        if (galleryRes.status === 'fulfilled' && galleryRes.value && galleryRes.value.success) {
            const gallery = Array.isArray(galleryRes.value.data) ? galleryRes.value.data : [];
            localStorage.setItem('clubGallery', JSON.stringify(gallery));
            updateApiCallTimestamp('gallery');
            results.gallery = true;
        }

        // Update announcements
        if (announcementsRes.status === 'fulfilled' && announcementsRes.value && announcementsRes.value.success) {
            const announcements = Array.isArray(announcementsRes.value.data) ? announcementsRes.value.data : [];
            localStorage.setItem('clubAnnouncements', JSON.stringify(announcements));
            updateApiCallTimestamp('announcements');
            results.announcements = true;
        }

        // Update admins
        if (adminsRes.status === 'fulfilled' && adminsRes.value && adminsRes.value.success) {
            const admins = Array.isArray(adminsRes.value.data) ? adminsRes.value.data : [];
            localStorage.setItem('clubAdmins', JSON.stringify(admins));
            updateApiCallTimestamp('admins');
            results.admins = true;
        }

        const successCount = Object.values(results).filter(v => v === true).length;
        console.log(`✅ Data refresh complete: ${successCount}/7 successful`);
        
        // Trigger custom event for UI updates
        window.dispatchEvent(new CustomEvent('dataRefreshed', { detail: results }));
        
        return results;
    } catch (error) {
        console.error('❌ Error during data refresh:', error);
        return results;
    } finally {
        // CRITICAL FIX: Always release the lock
        isLoadingGlobal = false;
    }
}

/**
 * Start automatic data refresh
 * FIXED: No longer starts automatically - must be called manually
 * Refreshes data every REFRESH_INTERVAL milliseconds
 */
function startAutoRefresh() {
    if (refreshTimer) {
        console.log('⚠️ Auto-refresh already running');
        return;
    }
    
    console.log(`🔄 Starting auto-refresh (every ${REFRESH_INTERVAL / 1000}s)`);
    
    refreshTimer = setInterval(async () => {
        console.log('⏰ Auto-refresh triggered');
        await refreshAllData();
    }, REFRESH_INTERVAL);
}

/**
 * Stop automatic data refresh
 */
function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('🛑 Auto-refresh stopped');
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if running in offline mode
 * @returns {Promise<boolean>} True if offline, false if online
 */
async function isOfflineMode() {
    try {
        if (typeof window.apiClient === 'undefined') {
            return true;
        }
        
        const result = await window.apiClient.getConfig();
        return !(result && result.success);
    } catch (error) {
        return true;
    }
}

/**
 * Clear all cached data from localStorage
 * Use with caution - data will be lost if API is unavailable
 */
function clearCache() {
    const keys = [
        'clubConfig',
        'clubMembers',
        'clubEvents',
        'clubProjects',
        'clubGallery',
        'clubAnnouncements',
        'clubAdmins'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ All cached data cleared');
}

/**
 * Get cache status for all data types
 * @returns {Object} Cache status information
 */
function getCacheStatus() {
    const status = {
        clubConfig: !!localStorage.getItem('clubConfig'),
        members: !!localStorage.getItem('clubMembers'),
        events: !!localStorage.getItem('clubEvents'),
        projects: !!localStorage.getItem('clubProjects'),
        gallery: !!localStorage.getItem('clubGallery'),
        announcements: !!localStorage.getItem('clubAnnouncements'),
        admins: !!localStorage.getItem('clubAdmins')
    };
    
    status.allCached = Object.values(status).every(v => v === true);
    status.noneCached = Object.values(status).every(v => v === false);
    
    return status;
}

/**
 * Get rate limit status for all endpoints
 * @returns {Object} Rate limit information
 */
function getRateLimitStatus() {
    const now = Date.now();
    const status = {};
    
    for (const [endpoint, timestamp] of Object.entries(lastApiCall)) {
        const timeSinceCall = now - timestamp;
        status[endpoint] = {
            lastCall: timestamp,
            timeSinceCall: timeSinceCall,
            canCall: timeSinceCall >= RATE_LIMIT_INTERVAL,
            cooldownRemaining: Math.max(0, RATE_LIMIT_INTERVAL - timeSinceCall)
        };
    }
    
    return status;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize data loading on page load
 * FIXED: No longer runs automatically - must be called manually
 * Pre-loads all data and optionally starts auto-refresh
 * @param {boolean} enableAutoRefresh - Whether to start auto-refresh (default: false)
 */
async function initializeDataLoading(enableAutoRefresh = false) {
    console.log('🚀 Initializing dynamic data loading...');
    
    try {
        // Load all data from API (will cache automatically)
        await refreshAllData();
        
        // FIXED: Only start auto-refresh if explicitly requested
        if (enableAutoRefresh) {
            startAutoRefresh();
            console.log('✅ Data initialization complete (auto-refresh enabled)');
        } else {
            console.log('✅ Data initialization complete (auto-refresh disabled)');
        }
    } catch (error) {
        console.error('❌ Error during data initialization:', error);
    }
}

// CRITICAL FIX: Removed auto-initialization on DOMContentLoaded
// Applications must manually call initializeDataLoading() when needed
// Example usage:
// - Call initializeDataLoading() to load data once
// - Call initializeDataLoading(true) to load data and enable auto-refresh
// - Call refreshAllData() to manually refresh data
// - Call startAutoRefresh() to enable periodic updates

console.log('✅ load-config.js loaded (Manual initialization mode)');
console.log('ℹ️  Call initializeDataLoading() to load data');
console.log('ℹ️  Call initializeDataLoading(true) to enable auto-refresh');

// CRITICAL FIX: Removed visibility change auto-refresh
// Applications can add their own visibility handlers if needed
// Example:
// document.addEventListener('visibilitychange', () => {
//     if (!document.hidden) {
//         refreshAllData();
//     }
// });

// =============================================================================
// EXPORTS (for module systems if needed)
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Club Config
        loadClubConfig,
        getClubConfig,
        getDefaultConfig,
        
        // Members
        loadMembers,
        getMembers,
        loadMemberById,
        loadMembersByRole,
        loadMembersByDepartment,
        
        // Events
        loadEvents,
        getEvents,
        loadEventById,
        loadUpcomingEvents,
        loadPastEvents,
        loadEventsByCategory,
        
        // Projects
        loadProjects,
        getProjects,
        loadProjectById,
        loadProjectsByStatus,
        loadProjectsByCategory,
        
        // Gallery
        loadGallery,
        getGallery,
        loadGalleryItemById,
        loadGalleryByCategory,
        
        // Announcements
        loadAnnouncements,
        getAnnouncements,
        loadAnnouncementById,
        loadActiveAnnouncements,
        
        // Admins
        loadAdmins,
        getAdmins,
        
        // Synchronization
        refreshAllData,
        startAutoRefresh,
        stopAutoRefresh,
        initializeDataLoading,
        
        // Utilities
        isOfflineMode,
        clearCache,
        getCacheStatus,
        getRateLimitStatus
    };
}