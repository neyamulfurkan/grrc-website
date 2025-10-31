/**
 * load-config.js - Dynamic Club Data Loading Module
 * 
 * CRITICAL FIX: API-FIRST architecture for real-time data synchronization
 * - Fetches fresh data from backend API on every page load
 * - Changes on one browser/device immediately visible on all others
 * - Falls back to localStorage cache only if API is unavailable
 * - Auto-refreshes data periodically to stay synchronized
 * 
 * REQUIRES: api-client.js must be loaded before this file
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const REFRESH_INTERVAL = 30000; // Auto-refresh every 30 seconds
let refreshTimer = null;

// =============================================================================
// CLUB CONFIGURATION
// =============================================================================

/**
 * Load club configuration from API (PRIMARY) or localStorage (FALLBACK)
 * @returns {Promise<Object>} Club configuration object
 */
async function loadClubConfig() {
    try {
        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached data');
            return getClubConfigFromCache();
        }

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getConfig();
        
        if (result.success && result.data) {
            // Cache for offline access
            localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(result.data));
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
 * Get club config from localStorage cache
 * @returns {Object} Cached club config or default
 */
function getClubConfigFromCache() {
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.CLUB_CONFIG);
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
 * @returns {Promise<Array>} Array of member objects
 */
async function loadMembers() {
    try {
        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached members');
            return getMembersFromCache();
        }

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getMembers();
        
        if (result.success && Array.isArray(result.data)) {
            // Cache for offline access
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(result.data));
            console.log(`✅ Loaded ${result.data.length} members from API`);
            return result.data;
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
 * Get members from localStorage cache
 * @returns {Array} Cached members or empty array
 */
function getMembersFromCache() {
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.MEMBERS);
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
 * Load a single member by ID
 * @param {string|number} memberId - Member ID
 * @returns {Promise<Object|null>} Member object or null
 */
async function loadMemberById(memberId) {
    try {
        const members = await loadMembers();
        return members.find(m => m.id == memberId) || null;
    } catch (error) {
        console.error('Error loading member by ID:', error);
        return null;
    }
}

/**
 * Filter members by role
 * @param {string} role - Member role (e.g., 'Executive', 'General')
 * @returns {Promise<Array>} Filtered members array
 */
async function loadMembersByRole(role) {
    try {
        const members = await loadMembers();
        return members.filter(m => m.role === role);
    } catch (error) {
        console.error('Error filtering members by role:', error);
        return [];
    }
}

/**
 * Filter members by department
 * @param {string} department - Department name
 * @returns {Promise<Array>} Filtered members array
 */
async function loadMembersByDepartment(department) {
    try {
        const members = await loadMembers();
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
 * @returns {Promise<Array>} Array of event objects
 */
async function loadEvents() {
    try {
        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached events');
            return getEventsFromCache();
        }

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getEvents();
        
        if (result.success && Array.isArray(result.data)) {
            // Cache for offline access
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(result.data));
            console.log(`✅ Loaded ${result.data.length} events from API`);
            return result.data;
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
 * Get events from localStorage cache
 * @returns {Array} Cached events or empty array
 */
function getEventsFromCache() {
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.EVENTS);
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
 * Load upcoming events (future events only)
 * @returns {Promise<Array>} Array of upcoming events
 */
async function loadUpcomingEvents() {
    try {
        const events = await loadEvents();
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
 * Load past events
 * @returns {Promise<Array>} Array of past events (sorted newest first)
 */
async function loadPastEvents() {
    try {
        const events = await loadEvents();
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
 * Filter events by category
 * @param {string} category - Event category
 * @returns {Promise<Array>} Filtered events array
 */
async function loadEventsByCategory(category) {
    try {
        const events = await loadEvents();
        return events.filter(e => e.category === category);
    } catch (error) {
        console.error('Error filtering events by category:', error);
        return [];
    }
}

/**
 * Load event by ID
 * @param {string|number} eventId - Event ID
 * @returns {Promise<Object|null>} Event object or null
 */
async function loadEventById(eventId) {
    try {
        const events = await loadEvents();
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
 * @returns {Promise<Array>} Array of project objects
 */
async function loadProjects() {
    try {
        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached projects');
            return getProjectsFromCache();
        }

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getProjects();
        
        if (result.success && Array.isArray(result.data)) {
            // Cache for offline access
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(result.data));
            console.log(`✅ Loaded ${result.data.length} projects from API`);
            return result.data;
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
 * Get projects from localStorage cache
 * @returns {Array} Cached projects or empty array
 */
function getProjectsFromCache() {
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.PROJECTS);
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
 * Filter projects by status
 * @param {string} status - Project status (e.g., 'Completed', 'Ongoing', 'Planned')
 * @returns {Promise<Array>} Filtered projects array
 */
async function loadProjectsByStatus(status) {
    try {
        const projects = await loadProjects();
        return projects.filter(p => p.status === status);
    } catch (error) {
        console.error('Error filtering projects by status:', error);
        return [];
    }
}

/**
 * Filter projects by category
 * @param {string} category - Project category
 * @returns {Promise<Array>} Filtered projects array
 */
async function loadProjectsByCategory(category) {
    try {
        const projects = await loadProjects();
        return projects.filter(p => p.category === category);
    } catch (error) {
        console.error('Error filtering projects by category:', error);
        return [];
    }
}

/**
 * Load project by ID
 * @param {string|number} projectId - Project ID
 * @returns {Promise<Object|null>} Project object or null
 */
async function loadProjectById(projectId) {
    try {
        const projects = await loadProjects();
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
 * @returns {Promise<Array>} Array of gallery objects
 */
async function loadGallery() {
    try {
        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached gallery');
            return getGalleryFromCache();
        }

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getGalleryItems();
        
        if (result.success && Array.isArray(result.data)) {
            // Cache for offline access
            localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(result.data));
            console.log(`✅ Loaded ${result.data.length} gallery items from API`);
            return result.data;
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
 * Get gallery from localStorage cache
 * @returns {Array} Cached gallery or empty array
 */
function getGalleryFromCache() {
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.GALLERY);
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
 * Filter gallery by category
 * @param {string} category - Gallery category
 * @returns {Promise<Array>} Filtered gallery array
 */
async function loadGalleryByCategory(category) {
    try {
        const gallery = await loadGallery();
        return gallery.filter(g => g.category === category);
    } catch (error) {
        console.error('Error filtering gallery by category:', error);
        return [];
    }
}

/**
 * Load gallery item by ID
 * @param {string|number} galleryId - Gallery item ID
 * @returns {Promise<Object|null>} Gallery object or null
 */
async function loadGalleryItemById(galleryId) {
    try {
        const gallery = await loadGallery();
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
 * @returns {Promise<Array>} Array of announcement objects
 */
async function loadAnnouncements() {
    try {
        // Check if API client is available
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, using cached announcements');
            return getAnnouncementsFromCache();
        }

        // Fetch from API (PRIMARY source)
        const result = await window.apiClient.getAnnouncements();
        
        if (result.success && Array.isArray(result.data)) {
            // Cache for offline access
            localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(result.data));
            console.log(`✅ Loaded ${result.data.length} announcements from API`);
            return result.data;
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
 * Get announcements from localStorage cache
 * @returns {Array} Cached announcements or empty array
 */
function getAnnouncementsFromCache() {
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
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
 * Load active announcements (sorted by priority and date)
 * @returns {Promise<Array>} Array of active announcements
 */
async function loadActiveAnnouncements() {
    try {
        const announcements = await loadAnnouncements();
        
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
 * Load announcement by ID
 * @param {string|number} announcementId - Announcement ID
 * @returns {Promise<Object|null>} Announcement object or null
 */
async function loadAnnouncementById(announcementId) {
    try {
        const announcements = await loadAnnouncements();
        return announcements.find(a => a.id == announcementId) || null;
    } catch (error) {
        console.error('Error loading announcement by ID:', error);
        return null;
    }
}

// =============================================================================
// REAL-TIME SYNCHRONIZATION
// =============================================================================

/**
 * Refresh all cached data from API
 * Forces fresh data load from backend
 * @returns {Promise<Object>} Status of all refresh operations
 */
async function refreshAllData() {
    console.log('🔄 Refreshing all data from API...');
    
    const results = {
        clubConfig: false,
        members: false,
        events: false,
        projects: false,
        gallery: false,
        announcements: false,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Check API availability
        if (typeof window.apiClient === 'undefined') {
            console.warn('⚠️ API client not available, cannot refresh');
            return results;
        }

        // Refresh all data in parallel for better performance
        const [configRes, membersRes, eventsRes, projectsRes, galleryRes, announcementsRes] = 
            await Promise.allSettled([
                window.apiClient.getConfig(),
                window.apiClient.getMembers(),
                window.apiClient.getEvents(),
                window.apiClient.getProjects(),
                window.apiClient.getGalleryItems(),
                window.apiClient.getAnnouncements()
            ]);

        // Update club config
        if (configRes.status === 'fulfilled' && configRes.value.success) {
            localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(configRes.value.data));
            results.clubConfig = true;
        }

        // Update members
        if (membersRes.status === 'fulfilled' && membersRes.value.success) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(membersRes.value.data || []));
            results.members = true;
        }

        // Update events
        if (eventsRes.status === 'fulfilled' && eventsRes.value.success) {
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(eventsRes.value.data || []));
            results.events = true;
        }

        // Update projects
        if (projectsRes.status === 'fulfilled' && projectsRes.value.success) {
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projectsRes.value.data || []));
            results.projects = true;
        }

        // Update gallery
        if (galleryRes.status === 'fulfilled' && galleryRes.value.success) {
            localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(galleryRes.value.data || []));
            results.gallery = true;
        }

        // Update announcements
        if (announcementsRes.status === 'fulfilled' && announcementsRes.value.success) {
            localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcementsRes.value.data || []));
            results.announcements = true;
        }

        const successCount = Object.values(results).filter(v => v === true).length;
        console.log(`✅ Data refresh complete: ${successCount}/6 successful`);
        
        // Trigger custom event for UI updates
        window.dispatchEvent(new CustomEvent('dataRefreshed', { detail: results }));
        
        return results;
    } catch (error) {
        console.error('❌ Error during data refresh:', error);
        return results;
    }
}

/**
 * Start automatic data refresh
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
        return !result.success;
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
        STORAGE_KEYS.CLUB_CONFIG,
        STORAGE_KEYS.MEMBERS,
        STORAGE_KEYS.EVENTS,
        STORAGE_KEYS.PROJECTS,
        STORAGE_KEYS.GALLERY,
        STORAGE_KEYS.ANNOUNCEMENTS
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
        clubConfig: !!localStorage.getItem(STORAGE_KEYS.CLUB_CONFIG),
        members: !!localStorage.getItem(STORAGE_KEYS.MEMBERS),
        events: !!localStorage.getItem(STORAGE_KEYS.EVENTS),
        projects: !!localStorage.getItem(STORAGE_KEYS.PROJECTS),
        gallery: !!localStorage.getItem(STORAGE_KEYS.GALLERY),
        announcements: !!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)
    };
    
    status.allCached = Object.values(status).every(v => v === true);
    status.noneCached = Object.values(status).every(v => v === false);
    
    return status;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize data loading on page load
 * Pre-loads all data and starts auto-refresh
 */
async function initializeDataLoading() {
    console.log('🚀 Initializing dynamic data loading...');
    
    try {
        // Load all data from API (will cache automatically)
        await refreshAllData();
        
        // Start auto-refresh for real-time sync
        startAutoRefresh();
        
        console.log('✅ Data initialization complete');
    } catch (error) {
        console.error('❌ Error during data initialization:', error);
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDataLoading);
} else {
    initializeDataLoading();
}

// Stop auto-refresh when page is hidden (save resources)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        refreshAllData(); // Immediate refresh when page becomes visible
    }
});

// =============================================================================
// EXPORTS (for module systems if needed)
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Club Config
        loadClubConfig,
        getDefaultConfig,
        
        // Members
        loadMembers,
        loadMemberById,
        loadMembersByRole,
        loadMembersByDepartment,
        
        // Events
        loadEvents,
        loadEventById,
        loadUpcomingEvents,
        loadPastEvents,
        loadEventsByCategory,
        
        // Projects
        loadProjects,
        loadProjectById,
        loadProjectsByStatus,
        loadProjectsByCategory,
        
        // Gallery
        loadGallery,
        loadGalleryItemById,
        loadGalleryByCategory,
        
        // Announcements
        loadAnnouncements,
        loadAnnouncementById,
        loadActiveAnnouncements,
        
        // Synchronization
        refreshAllData,
        startAutoRefresh,
        stopAutoRefresh,
        
        // Utilities
        isOfflineMode,
        clearCache,
        getCacheStatus
    };
}

console.log('✅ load-config.js loaded (Dynamic API-First Mode)');