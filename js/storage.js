/**
 * storage.js - Local Storage Management System
 * FIXED VERSION - Properly exposes all functions globally
 * Handles all localStorage operations for the club website
 * Version: 2.1.0 - Fixed global function exposure
 */

// =============================================================================
// STORAGE KEYS CONFIGURATION
// =============================================================================

const STORAGE_KEYS = {
  CLUB_CONFIG: 'clubConfig',
  ADMINS: 'admins',
  MEMBERS: 'members',
  EVENTS: 'events',
  PROJECTS: 'projects',
  GALLERY: 'gallery',
  ANNOUNCEMENTS: 'announcements',
  THEME: 'theme',
  INITIALIZED: 'grrc_initialized'
};

const SESSION_KEYS = {
  ADMIN_SESSION: 'adminSession',
  REMEMBERED_ADMIN: 'rememberedAdmin'
};

// Make globally available
window.STORAGE_KEYS = STORAGE_KEYS;
window.SESSION_KEYS = SESSION_KEYS;

// =============================================================================
// DEFAULT DATA STRUCTURES
// =============================================================================

const CLUB_DEFAULTS = {
  name: 'GSTU Robotics & Research Club',
  shortName: 'GRRC',
  motto: 'A Hub of Robothinkers',
  description: 'Empowering students to explore robotics, AI, and innovative technologies through hands-on projects and collaborative learning.',
  university: 'Gonoshasthaya Samaj Vittik Medical College',
  email: 'contact@gstrrc.edu.bd',
  phone: '+880123456789',
  address: 'Dhaka, Bangladesh',
  foundedYear: '2020',
  logo: 'assets/default-logo.jpg',
  socialLinks: []
};

// =============================================================================
// INITIALIZATION
// =============================================================================

function initializeStorage() {
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    
    if (!isInitialized) {
      console.log('🔧 First time initialization');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return false;
  }
}

function resetStorage() {
  try {
    const confirmed = confirm('This will delete ALL data and reset to defaults. Are you sure?');
    if (!confirmed) return false;
    
    localStorage.clear();
    sessionStorage.clear();
    initializeStorage();
    
    console.log('✅ Storage reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting storage:', error);
    return false;
  }
}

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

function isAuthenticated() {
  try {
    const session = sessionStorage.getItem('adminSession');
    const token = localStorage.getItem('grrc_auth_token');
    return !!(session && token);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// =============================================================================
// CLUB CONFIGURATION
// =============================================================================

async function getClubConfig() {
  try {
    // Try API first if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      console.log('🔄 Fetching club config from API...');
      try {
        const response = await Promise.race([
          window.apiClient.getConfig(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), 8000)
          )
        ]);
        
        if (response.success && response.data) {
          console.log('✅ Club config fetched from API');
          localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(response.data));
          return { success: true, data: response.data };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached config:', apiError.message);
      }
    }
    
    // Fallback to localStorage
    const cached = localStorage.getItem(STORAGE_KEYS.CLUB_CONFIG);
    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }
    
    return { success: true, data: CLUB_DEFAULTS };
  } catch (error) {
    console.error('Error getting club config:', error);
    return { success: true, data: CLUB_DEFAULTS };
  }
}

async function setClubConfig(configData) {
  if (!configData || typeof configData !== 'object') {
    throw new Error('Invalid config data');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const currentResult = await getClubConfig();
    const currentConfig = currentResult.data;
    const updatedConfig = { ...currentConfig, ...configData };
    
    // Try API if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.updateConfig(updatedConfig);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(updatedConfig));
          // Clear cache
          localStorage.removeItem('cache_clubConfig');
          console.log('✅ Club config saved to backend and cached locally');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to update club configuration');
        }
      } catch (apiError) {
        console.warn('⚠️ API update failed:', apiError.message);
        throw apiError;
      }
    } else {
      // Fallback to localStorage only
      localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(updatedConfig));
      localStorage.removeItem('cache_clubConfig');
      console.log('✅ Club config saved locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to update club config:', error);
    throw error;
  }
}

// =============================================================================
// ADMINS
// =============================================================================

async function getAdmins() {
  try {
    // Try API first if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getAdmins();
        
        if (response.success && Array.isArray(response.data)) {
          localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(response.data));
          return { success: true, data: response.data };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached admins:', apiError.message);
      }
    }
    
    // Fallback to localStorage
    const cached = localStorage.getItem(STORAGE_KEYS.ADMINS);
    return { success: true, data: cached ? JSON.parse(cached) : [] };
  } catch (error) {
    console.error('Error getting admins:', error);
    return { success: true, data: [] };
  }
}

async function addAdmin(adminData) {
  if (!adminData.username || !adminData.password) {
    throw new Error('Username and password are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const adminsResult = await getAdmins();
  const admins = adminsResult.data || [];
  
  if (admins.some(admin => admin.username === adminData.username)) {
    throw new Error('Username already exists');
  }
  
  try {
    const newAdmin = {
      id: generateUniqueId('admin'),
      username: adminData.username.trim(),
      password: adminData.password,
      role: adminData.role || 'Admin',
      createdAt: getCurrentTimestamp()
    };
    
    // Try API if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.createAdmin(newAdmin);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newAdmin.id = apiResult.data.id;
          }
          
          admins.push(newAdmin);
          localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
          console.log('✅ Admin saved:', newAdmin.username);
          return { success: true, data: newAdmin };
        } else {
          throw new Error(apiResult.error || 'Failed to create admin');
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed:', apiError.message);
        throw apiError;
      }
    } else {
      // Fallback to localStorage only
      admins.push(newAdmin);
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
      console.log('✅ Admin saved locally (API not available)');
      return { success: true, data: newAdmin };
    }
  } catch (error) {
    console.error('❌ Failed to add admin:', error);
    throw error;
  }
}

async function deleteAdmin(adminId) {
  if (!adminId) {
    throw new Error('Admin ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const adminsResult = await getAdmins();
  const admins = adminsResult.data || [];
  const filtered = admins.filter(admin => admin.id !== adminId);
  
  if (filtered.length === admins.length) {
    throw new Error('Admin not found');
  }
  
  if (filtered.length === 0) {
    throw new Error('Cannot delete the last admin');
  }
  
  try {
    // Try API if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteAdmin(adminId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(filtered));
          console.log('✅ Admin deleted');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to delete admin');
        }
      } catch (apiError) {
        console.warn('⚠️ API delete failed:', apiError.message);
        throw apiError;
      }
    } else {
      // Fallback to localStorage only
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(filtered));
      console.log('✅ Admin deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete admin:', error);
    throw error;
  }
}

// =============================================================================
// MEMBERS
// =============================================================================

async function getMembers(filters = {}) {
  try {
    // Try API first if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getMembers();
        
        if (response.success && Array.isArray(response.data)) {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(response.data));
          let result = response.data;
          
          if (filters.role) {
            result = result.filter(m => m.role === filters.role);
          }
          if (filters.department) {
            result = result.filter(m => m.department === filters.department);
          }
          if (filters.year) {
            result = result.filter(m => m.year === filters.year);
          }
          
          return { success: true, data: result };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached members:', apiError.message);
      }
    }
    
    // Fallback to localStorage
    const cached = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.role) {
      result = result.filter(m => m.role === filters.role);
    }
    if (filters.department) {
      result = result.filter(m => m.department === filters.department);
    }
    if (filters.year) {
      result = result.filter(m => m.year === filters.year);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting members:', error);
    return { success: true, data: [] };
  }
}

async function addMember(memberData) {
  if (!memberData.name || !memberData.email || !memberData.department || !memberData.year || !memberData.role) {
    throw new Error('Required fields missing: name, email, department, year, role');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const membersResult = await getMembers();
  const members = membersResult.data || [];
  
  if (members.some(m => m.email === memberData.email)) {
    throw new Error('Email already exists');
  }
  
  try {
    const newMember = {
      id: generateUniqueId('member'),
      name: memberData.name.trim(),
      photo: memberData.photo || '',
      department: memberData.department,
      year: memberData.year,
      role: memberData.role,
      position: memberData.position || '',
      email: memberData.email.trim().toLowerCase(),
      phone: memberData.phone ? memberData.phone.trim() : '',
      bio: memberData.bio || '',
      skills: Array.isArray(memberData.skills) ? memberData.skills : [],
      joinedDate: memberData.joinedDate || getCurrentDate(),
      createdAt: getCurrentTimestamp()
    };
    
    // Try API if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.createMember(newMember);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newMember.id = apiResult.data.id;
          }
          
          members.push(newMember);
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
          // Clear caches
          localStorage.removeItem('cache_members');
          console.log('✅ Member saved:', newMember.name);
          return { success: true, data: newMember };
        } else {
          throw new Error(apiResult.error || 'Failed to create member');
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed:', apiError.message);
        throw apiError;
      }
    } else {
      // Fallback to localStorage only
      members.push(newMember);
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      localStorage.removeItem('cache_members');
      console.log('✅ Member saved locally (API not available)');
      return { success: true, data: newMember };
    }
  } catch (error) {
    console.error('❌ Failed to add member:', error);
    throw error;
  }
}

async function updateMember(memberId, updates) {
  if (!memberId || !updates) {
    throw new Error('Member ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const membersResult = await getMembers();
  const members = membersResult.data || [];
  const index = members.findIndex(m => m.id === memberId);
  
  if (index === -1) {
    throw new Error('Member not found');
  }
  
  try {
    const updatedMember = { ...members[index], ...updates };
    
    // Try API if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.updateMember(memberId, updatedMember);
        
        if (apiResult.success) {
          members[index] = updatedMember;
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
          // Clear caches
          localStorage.removeItem('cache_members');
          console.log('✅ Member updated');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to update member');
        }
      } catch (apiError) {
        console.warn('⚠️ API update failed:', apiError.message);
        throw apiError;
      }
    } else {
      // Fallback to localStorage only
      members[index] = updatedMember;
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      localStorage.removeItem('cache_members');
      console.log('✅ Member updated locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to update member:', error);
    throw error;
  }
}

async function deleteMember(memberId) {
  if (!memberId) {
    throw new Error('Member ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const membersResult = await getMembers();
  const members = membersResult.data || [];
  const filtered = members.filter(m => m.id !== memberId);
  
  if (filtered.length === members.length) {
    throw new Error('Member not found');
  }
  
  try {
    // Try API if available
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteMember(memberId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
          // Clear caches
          localStorage.removeItem('cache_members');
          console.log('✅ Member deleted');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to delete member');
        }
      } catch (apiError) {
        console.warn('⚠️ API delete failed:', apiError.message);
        throw apiError;
      }
    } else {
      // Fallback to localStorage only
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
      localStorage.removeItem('cache_members');
      console.log('✅ Member deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete member:', error);
    throw error;
  }
}

// =============================================================================
// EVENTS (Similar pattern - I'll include key functions)
// =============================================================================

async function getEvents(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getEvents();
        
        if (response.success && Array.isArray(response.data)) {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(response.data));
          let result = response.data;
          
          if (filters.status) {
            result = result.filter(e => e.status === filters.status);
          }
          if (filters.category) {
            result = result.filter(e => e.category === filters.category);
          }
          
          return { success: true, data: result };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached events:', apiError.message);
      }
    }
    
    const cached = localStorage.getItem(STORAGE_KEYS.EVENTS);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(e => e.category === filters.category);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting events:', error);
    return { success: true, data: [] };
  }
}

async function addEvent(eventData) {
  if (!eventData.title || !eventData.description || !eventData.date || !eventData.venue) {
    throw new Error('Required fields missing: title, description, date, venue');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const eventsResult = await getEvents();
    const events = eventsResult.data || [];
    
    const newEvent = {
      id: generateUniqueId('event'),
      title: eventData.title.trim(),
      description: eventData.description.trim(),
      category: eventData.category || 'General',
      date: eventData.date,
      time: eventData.time || '',
      venue: eventData.venue.trim(),
      image: eventData.image || '',
      status: eventData.status || 'upcoming',
      registrationLink: eventData.registrationLink || '',
      createdAt: getCurrentTimestamp()
    };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.createEvent(newEvent);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newEvent.id = apiResult.data.id;
          }
          
          events.push(newEvent);
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
          localStorage.removeItem('cache_events');
          console.log('✅ Event saved:', newEvent.title);
          return { success: true, data: newEvent };
        } else {
          throw new Error(apiResult.error || 'Failed to create event');
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed:', apiError.message);
        throw apiError;
      }
    } else {
      events.push(newEvent);
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      localStorage.removeItem('cache_events');
      console.log('✅ Event saved locally (API not available)');
      return { success: true, data: newEvent };
    }
  } catch (error) {
    console.error('❌ Failed to add event:', error);
    throw error;
  }
}

async function updateEvent(eventId, updates) {
  if (!eventId || !updates) {
    throw new Error('Event ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const eventsResult = await getEvents();
  const events = eventsResult.data || [];
  const index = events.findIndex(e => e.id === eventId);
  
  if (index === -1) {
    throw new Error('Event not found');
  }
  
  try {
    const updatedEvent = { ...events[index], ...updates };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.updateEvent(eventId, updatedEvent);
        
        if (apiResult.success) {
          events[index] = updatedEvent;
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
          localStorage.removeItem('cache_events');
          console.log('✅ Event updated');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to update event');
        }
      } catch (apiError) {
        console.warn('⚠️ API update failed:', apiError.message);
        throw apiError;
      }
    } else {
      events[index] = updatedEvent;
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      localStorage.removeItem('cache_events');
      console.log('✅ Event updated locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to update event:', error);
    throw error;
  }
}

async function deleteEvent(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const eventsResult = await getEvents();
  const events = eventsResult.data || [];
  const filtered = events.filter(e => e.id !== eventId);
  
  if (filtered.length === events.length) {
    throw new Error('Event not found');
  }
  
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteEvent(eventId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
          localStorage.removeItem('cache_events');
          console.log('✅ Event deleted');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to delete event');
        }
      } catch (apiError) {
        console.warn('⚠️ API delete failed:', apiError.message);
        throw apiError;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
      localStorage.removeItem('cache_events');
      console.log('✅ Event deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete event:', error);
    throw error;
  }
}

// =============================================================================
// PROJECTS (Similar pattern)
// =============================================================================

async function getProjects(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getProjects();
        
        if (response.success && Array.isArray(response.data)) {
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(response.data));
          let result = response.data;
          
          if (filters.status) {
            result = result.filter(p => p.status === filters.status);
          }
          if (filters.category) {
            result = result.filter(p => p.category === filters.category);
          }
          
          return { success: true, data: result };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached projects:', apiError.message);
      }
    }
    
    const cached = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting projects:', error);
    return { success: true, data: [] };
  }
}

async function addProject(projectData) {
  if (!projectData.title || !projectData.description || !projectData.category || !projectData.status) {
    throw new Error('Required fields missing: title, description, category, status');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const projectsResult = await getProjects();
    const projects = projectsResult.data || [];
    
    const newProject = {
      id: generateUniqueId('project'),
      title: projectData.title.trim(),
      description: projectData.description.trim(),
      category: projectData.category,
      status: projectData.status,
      image: projectData.image || '',
      technologies: Array.isArray(projectData.technologies) ? projectData.technologies : [],
      teamMembers: Array.isArray(projectData.teamMembers) ? projectData.teamMembers : [],
      githubLink: projectData.githubLink || '',
      liveLink: projectData.liveLink || '',
      completionDate: projectData.completionDate || '',
      createdAt: getCurrentTimestamp()
    };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.createProject(newProject);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newProject.id = apiResult.data.id;
          }
          
          projects.push(newProject);
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
          localStorage.removeItem('cache_projects');
          console.log('✅ Project saved:', newProject.title);
          return { success: true, data: newProject };
        } else {
          throw new Error(apiResult.error || 'Failed to create project');
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed:', apiError.message);
        throw apiError;
      }
    } else {
      projects.push(newProject);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      localStorage.removeItem('cache_projects');
      console.log('✅ Project saved locally (API not available)');
      return { success: true, data: newProject };
    }
  } catch (error) {
    console.error('❌ Failed to add project:', error);
    throw error;
  }
}

async function updateProject(projectId, updates) {
  if (!projectId || !updates) {
    throw new Error('Project ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const projectsResult = await getProjects();
  const projects = projectsResult.data || [];
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index === -1) {
    throw new Error('Project not found');
  }
  
  try {
    const updatedProject = { ...projects[index], ...updates };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.updateProject(projectId, updatedProject);
        
        if (apiResult.success) {
          projects[index] = updatedProject;
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
          localStorage.removeItem('cache_projects');
          console.log('✅ Project updated');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to update project');
        }
      } catch (apiError) {
        console.warn('⚠️ API update failed:', apiError.message);
        throw apiError;
      }
    } else {
      projects[index] = updatedProject;
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      localStorage.removeItem('cache_projects');
      console.log('✅ Project updated locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to update project:', error);
    throw error;
  }
}

async function deleteProject(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const projectsResult = await getProjects();
  const projects = projectsResult.data || [];
  const filtered = projects.filter(p => p.id !== projectId);
  
  if (filtered.length === projects.length) {
    throw new Error('Project not found');
  }
  
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteProject(projectId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
          localStorage.removeItem('cache_projects');
          console.log('✅ Project deleted');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to delete project');
        }
      } catch (apiError) {
        console.warn('⚠️ API delete failed:', apiError.message);
        throw apiError;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
      localStorage.removeItem('cache_projects');
      console.log('✅ Project deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete project:', error);
    throw error;
  }
}

// =============================================================================
// GALLERY
// =============================================================================

async function getGallery(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getGallery();
        
        if (response.success && Array.isArray(response.data)) {
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(response.data));
          let result = response.data;
          
          if (filters.category) {
            result = result.filter(g => g.category === filters.category);
          }
          
          return { success: true, data: result };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached gallery:', apiError.message);
      }
    }
    
    const cached = localStorage.getItem(STORAGE_KEYS.GALLERY);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.category) {
      result = result.filter(g => g.category === filters.category);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting gallery:', error);
    return { success: true, data: [] };
  }
}

async function addGalleryItem(galleryData) {
  if (!galleryData.image || !galleryData.title || !galleryData.category) {
    throw new Error('Required fields missing: image, title, category');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const galleryResult = await getGallery();
    const gallery = galleryResult.data || [];
    
    const newItem = {
      id: generateUniqueId('gallery'),
      image: galleryData.image,
      title: galleryData.title.trim(),
      description: galleryData.description || '',
      category: galleryData.category,
      date: galleryData.date || getCurrentDate(),
      photographer: galleryData.photographer || '',
      createdAt: getCurrentTimestamp()
    };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.createGalleryItem(newItem);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newItem.id = apiResult.data.id;
          }
          
          gallery.push(newItem);
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
          localStorage.removeItem('cache_gallery');
          console.log('✅ Gallery item saved');
          return { success: true, data: newItem };
        } else {
          throw new Error(apiResult.error || 'Failed to save gallery item');
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed:', apiError.message);
        throw apiError;
      }
    } else {
      gallery.push(newItem);
      localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
      localStorage.removeItem('cache_gallery');
      console.log('✅ Gallery item saved locally (API not available)');
      return { success: true, data: newItem };
    }
  } catch (error) {
    console.error('❌ Failed to add gallery item:', error);
    throw error;
  }
}

async function deleteGalleryItem(galleryId) {
  if (!galleryId) {
    throw new Error('Gallery ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const galleryResult = await getGallery();
  const gallery = galleryResult.data || [];
  const filtered = gallery.filter(g => g.id !== galleryId);
  
  if (filtered.length === gallery.length) {
    throw new Error('Gallery item not found');
  }
  
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteGalleryItem(galleryId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(filtered));
          localStorage.removeItem('cache_gallery');
          console.log('✅ Gallery item deleted');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to delete gallery item');
        }
      } catch (apiError) {
        console.warn('⚠️ API delete failed:', apiError.message);
        throw apiError;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(filtered));
      localStorage.removeItem('cache_gallery');
      console.log('✅ Gallery item deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete gallery item:', error);
    throw error;
  }
}

// =============================================================================
// ANNOUNCEMENTS
// =============================================================================

async function getAnnouncements(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getAnnouncements();
        
        if (response.success && Array.isArray(response.data)) {
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(response.data));
          let result = response.data;
          
          if (filters.priority) {
            result = result.filter(a => a.priority === filters.priority);
          }
          
          return { success: true, data: result };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached announcements:', apiError.message);
      }
    }
    
    const cached = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.priority) {
      result = result.filter(a => a.priority === filters.priority);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting announcements:', error);
    return { success: true, data: [] };
  }
}

async function addAnnouncement(announcementData) {
  if (!announcementData.title || !announcementData.content) {
    throw new Error('Required fields missing: title, content');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const announcementsResult = await getAnnouncements();
    const announcements = announcementsResult.data || [];
    
    const newAnnouncement = {
      id: generateUniqueId('announcement'),
      title: announcementData.title.trim(),
      content: announcementData.content.trim(),
      priority: announcementData.priority || 'normal',
      date: getCurrentTimestamp(),
      createdAt: getCurrentTimestamp()
    };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.createAnnouncement(newAnnouncement);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newAnnouncement.id = apiResult.data.id;
          }
          
          announcements.push(newAnnouncement);
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
          localStorage.removeItem('cache_announcements');
          console.log('✅ Announcement saved:', newAnnouncement.title);
          return { success: true, data: newAnnouncement };
        } else {
          throw new Error(apiResult.error || 'Failed to create announcement');
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed:', apiError.message);
        throw apiError;
      }
    } else {
      announcements.push(newAnnouncement);
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
      localStorage.removeItem('cache_announcements');
      console.log('✅ Announcement saved locally (API not available)');
      return { success: true, data: newAnnouncement };
    }
  } catch (error) {
    console.error('❌ Failed to add announcement:', error);
    throw error;
  }
}

async function updateAnnouncement(announcementId, updates) {
  if (!announcementId || !updates) {
    throw new Error('Announcement ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const announcementsResult = await getAnnouncements();
  const announcements = announcementsResult.data || [];
  const index = announcements.findIndex(a => a.id === announcementId);
  
  if (index === -1) {
    throw new Error('Announcement not found');
  }
  
  try {
    const updatedAnnouncement = { ...announcements[index], ...updates };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.updateAnnouncement(announcementId, updatedAnnouncement);
        
        if (apiResult.success) {
          announcements[index] = updatedAnnouncement;
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
          localStorage.removeItem('cache_announcements');
          console.log('✅ Announcement updated');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to update announcement');
        }
      } catch (apiError) {
        console.warn('⚠️ API update failed:', apiError.message);
        throw apiError;
      }
    } else {
      announcements[index] = updatedAnnouncement;
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
      localStorage.removeItem('cache_announcements');
      console.log('✅ Announcement updated locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to update announcement:', error);
    throw error;
  }
}

async function deleteAnnouncement(announcementId) {
  if (!announcementId) {
    throw new Error('Announcement ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  const announcementsResult = await getAnnouncements();
  const announcements = announcementsResult.data || [];
  const filtered = announcements.filter(a => a.id !== announcementId);
  
  if (filtered.length === announcements.length) {
    throw new Error('Announcement not found');
  }
  
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteAnnouncement(announcementId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(filtered));
          localStorage.removeItem('cache_announcements');
          console.log('✅ Announcement deleted');
          return { success: true };
        } else {
          throw new Error(apiResult.error || 'Failed to delete announcement');
        }
      } catch (apiError) {
        console.warn('⚠️ API delete failed:', apiError.message);
        throw apiError;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(filtered));
      localStorage.removeItem('cache_announcements');
      console.log('✅ Announcement deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete announcement:', error);
    throw error;
  }
}

// =============================================================================
// THEME
// =============================================================================

function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch (error) {
    console.error('Error loading theme:', error);
    return 'light';
  }
}

function setTheme(theme) {
  try {
    if (theme !== 'light' && theme !== 'dark') {
      console.error('Invalid theme. Use "light" or "dark"');
      return false;
    }
    
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    console.log('✅ Theme set to:', theme);
    return true;
  } catch (error) {
    console.error('Error setting theme:', error);
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateUniqueId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// =============================================================================
// STATISTICS
// =============================================================================

async function getStatistics() {
  try {
    const membersResult = await getMembers();
    const eventsResult = await getEvents();
    const projectsResult = await getProjects();
    const galleryResult = await getGallery();
    const announcementsResult = await getAnnouncements();
    const adminsResult = await getAdmins();
    
    const members = membersResult.data || [];
    const events = eventsResult.data || [];
    const projects = projectsResult.data || [];
    const gallery = galleryResult.data || [];
    const announcements = announcementsResult.data || [];
    const admins = adminsResult.data || [];
    
    return {
      totalMembers: members.length,
      executiveMembers: members.filter(m => m.role === 'Executive Member').length,
      generalMembers: members.filter(m => m.role === 'General Member').length,
      
      totalEvents: events.length,
      upcomingEvents: events.filter(e => e.status === 'upcoming').length,
      ongoingEvents: events.filter(e => e.status === 'ongoing').length,
      completedEvents: events.filter(e => e.status === 'completed').length,
      
      totalProjects: projects.length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      ongoingProjects: projects.filter(p => p.status === 'ongoing').length,
      plannedProjects: projects.filter(p => p.status === 'planned').length,
      
      totalPhotos: gallery.length,
      totalAnnouncements: announcements.length,
      totalAdmins: admins.length
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      totalMembers: 0,
      executiveMembers: 0,
      generalMembers: 0,
      totalEvents: 0,
      upcomingEvents: 0,
      ongoingEvents: 0,
      completedEvents: 0,
      totalProjects: 0,
      completedProjects: 0,
      ongoingProjects: 0,
      plannedProjects: 0,
      totalPhotos: 0,
      totalAnnouncements: 0,
      totalAdmins: 0
    };
  }
}

// =============================================================================
// SEARCH FUNCTIONS
// =============================================================================

async function searchMembers(query) {
  try {
    if (!query) {
      const result = await getMembers();
      return result.data || [];
    }
    
    const membersResult = await getMembers();
    const members = membersResult.data || [];
    const searchTerm = query.toLowerCase().trim();
    
    return members.filter(m => 
      m.name.toLowerCase().includes(searchTerm) ||
      m.department.toLowerCase().includes(searchTerm) ||
      m.email.toLowerCase().includes(searchTerm) ||
      (m.bio && m.bio.toLowerCase().includes(searchTerm)) ||
      (m.skills && m.skills.some(skill => skill.toLowerCase().includes(searchTerm)))
    );
  } catch (error) {
    console.error('Error searching members:', error);
    return [];
  }
}

async function searchEvents(query) {
  try {
    if (!query) {
      const result = await getEvents();
      return result.data || [];
    }
    
    const eventsResult = await getEvents();
    const events = eventsResult.data || [];
    const searchTerm = query.toLowerCase().trim();
    
    return events.filter(e => 
      e.title.toLowerCase().includes(searchTerm) ||
      e.description.toLowerCase().includes(searchTerm) ||
      e.venue.toLowerCase().includes(searchTerm) ||
      e.category.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching events:', error);
    return [];
  }
}

async function searchProjects(query) {
  try {
    if (!query) {
      const result = await getProjects();
      return result.data || [];
    }
    
    const projectsResult = await getProjects();
    const projects = projectsResult.data || [];
    const searchTerm = query.toLowerCase().trim();
    
    return projects.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      (p.technologies && p.technologies.some(tech => tech.toLowerCase().includes(searchTerm)))
    );
  } catch (error) {
    console.error('Error searching projects:', error);
    return [];
  }
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

async function exportAllData() {
  try {
    const clubConfigResult = await getClubConfig();
    const membersResult = await getMembers();
    const eventsResult = await getEvents();
    const projectsResult = await getProjects();
    const galleryResult = await getGallery();
    const announcementsResult = await getAnnouncements();
    
    const exportData = {
      clubConfig: clubConfigResult.data,
      members: membersResult.data || [],
      events: eventsResult.data || [],
      projects: projectsResult.data || [],
      gallery: galleryResult.data || [],
      announcements: announcementsResult.data || [],
      exportDate: getCurrentTimestamp(),
      version: '2.1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grrc-data-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ Data exported successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// INITIALIZATION ON LOAD
// =============================================================================

// Auto-initialize storage when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeStorage);
} else {
  initializeStorage();
}

// =============================================================================
// GLOBAL EXPORTS - CRITICAL FIX
// =============================================================================

// Create the main storage object first
window.storage = {
  // Keys
  STORAGE_KEYS,
  SESSION_KEYS,
  
  // Initialization
  initializeStorage,
  resetStorage,
  
  // Authentication
  isAuthenticated,
  
  // Club Config
  getClubConfig,
  setClubConfig,
  
  // Admins
  getAdmins,
  addAdmin,
  deleteAdmin,
  
  // Members
  getMembers,
  addMember,
  updateMember,
  deleteMember,
  
  // Events
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  
  // Projects
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  
  // Gallery
  getGallery,
  addGalleryItem,
  deleteGalleryItem,
  
  // Announcements
  getAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  
  // Theme
  getTheme,
  setTheme,
  
  // Utilities
  getStatistics,
  searchMembers,
  searchEvents,
  searchProjects,
  exportAllData,
  generateUniqueId,
  getCurrentTimestamp,
  getCurrentDate
};

// =============================================================================
// GLOBAL FUNCTION ALIASES - CRITICAL FIX
// =============================================================================

// Expose ALL functions globally for backward compatibility
window.initializeStorage = initializeStorage;
window.resetStorage = resetStorage;
window.isAuthenticated = isAuthenticated;

window.getClubConfig = getClubConfig;
window.setClubConfig = setClubConfig;

window.getAdmins = getAdmins;
window.addAdmin = addAdmin;
window.deleteAdmin = deleteAdmin;

window.getMembers = getMembers;
window.addMember = addMember;
window.updateMember = updateMember;
window.deleteMember = deleteMember;

window.getEvents = getEvents;
window.addEvent = addEvent;
window.updateEvent = updateEvent;
window.deleteEvent = deleteEvent;

window.getProjects = getProjects;
window.addProject = addProject;
window.updateProject = updateProject;
window.deleteProject = deleteProject;

window.getGallery = getGallery;
window.addGalleryItem = addGalleryItem;
window.deleteGalleryItem = deleteGalleryItem;

window.getAnnouncements = getAnnouncements;
window.addAnnouncement = addAnnouncement;
window.updateAnnouncement = updateAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;

window.getTheme = getTheme;
window.setTheme = setTheme;

window.getStatistics = getStatistics;
window.searchMembers = searchMembers;
window.searchEvents = searchEvents;
window.searchProjects = searchProjects;
window.exportAllData = exportAllData;

console.log('✅ storage.js v2.1.0 loaded successfully');
console.log('📦 Storage API available at window.storage');
console.log('🌐 Global function aliases created for backward compatibility');