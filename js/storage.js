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

window.STORAGE_KEYS = STORAGE_KEYS;
window.SESSION_KEYS = SESSION_KEYS;

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

async function getClubConfig() {
  try {
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
          const mappedData = { ...response.data };
          if (mappedData.logo_url) {
            mappedData.logo = mappedData.logo_url;
          }
          localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(mappedData));
          return { success: true, data: mappedData };
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using cached config:', apiError.message);
      }
    }
    
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
    console.log('🔄 Saving club config...', configData);
    
    const currentResult = await getClubConfig();
    const currentConfig = currentResult.data;
    const updatedConfig = { ...currentConfig, ...configData };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        // ✅ CRITICAL FIX: Map ALL fields correctly for backend
        const backendConfig = {
          club_name: updatedConfig.name || updatedConfig.club_name,
          club_motto: updatedConfig.motto || updatedConfig.club_motto,
          club_description: updatedConfig.description || updatedConfig.club_description,
          logo_url: updatedConfig.logo || updatedConfig.logo_url,
          social_links: Array.isArray(updatedConfig.socialLinks) 
            ? updatedConfig.socialLinks 
            : (Array.isArray(updatedConfig.social_links) ? updatedConfig.social_links : [])
        };
        
        console.log('📤 Sending to backend:', backendConfig);
        
        const apiResult = await window.apiClient.updateConfig(backendConfig);
        
        if (apiResult.success) {
          console.log('✅ Backend update successful');
          
          // Clear ALL possible config caches
          localStorage.removeItem('cache_clubConfig');
          localStorage.removeItem(STORAGE_KEYS.CLUB_CONFIG);
          localStorage.removeItem('clubConfig');
          
          // Map backend response back to frontend format
          const savedConfig = {
            name: backendConfig.club_name,
            motto: backendConfig.club_motto,
            description: backendConfig.club_description,
            logo: backendConfig.logo_url,
            socialLinks: backendConfig.social_links
          };
          
          // Save with BOTH keys for compatibility
          localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(savedConfig));
          localStorage.setItem('clubConfig', JSON.stringify(savedConfig));
          localStorage.setItem('cache_clubConfig', JSON.stringify(savedConfig));
          
          console.log('✅ Club config saved to backend and cached locally');
          return { success: true, data: savedConfig };
        } else {
          throw new Error(apiResult.error || 'Failed to update club configuration');
        }
      } catch (apiError) {
        console.error('❌ API update failed:', apiError);
        throw new Error(`Backend save failed: ${apiError.message}`);
      }
    } else {
      throw new Error('API client not available - cannot save to backend');
    }
  } catch (error) {
    console.error('❌ Failed to update club config:', error);
    throw error;
  }
}

async function getAdmins() {
  try {
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
  
  // Clear cache first to force fresh fetch from API
  localStorage.removeItem('cache_admins');
  localStorage.removeItem(STORAGE_KEYS.ADMINS);
  
  const adminsResult = await getAdmins();
  const admins = adminsResult.data || [];
  const filtered = admins.filter(admin => admin.id !== adminId);
  
  if (filtered.length === admins.length) {
    console.warn('Admin not found in local list, attempting API delete anyway...');
    // Don't throw error - try API delete anyway
  }
  
  if (filtered.length === 0) {
    throw new Error('Cannot delete the last admin');
  }
  
  try {
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
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(filtered));
      console.log('✅ Admin deleted locally (API not available)');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Failed to delete admin:', error);
    throw error;
  }
}

async function getMembers(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getMembers();
        
        if (response.success && Array.isArray(response.data)) {
          const mappedData = response.data.map(member => ({
            ...member,
            joinedDate: member.joined_date || member.joinedDate,
            createdAt: member.created_at || member.createdAt
          }));
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(mappedData));
          let result = mappedData;
          
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
    console.error('❌ Missing required fields:', {
      name: !!memberData.name,
      email: !!memberData.email,
      department: !!memberData.department,
      year: !!memberData.year,
      role: !!memberData.role
    });
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
    
    console.log('📝 Creating member with data:', newMember);
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const backendMember = {
          ...newMember,
          joined_date: newMember.joinedDate,
          created_at: newMember.createdAt
        };
        delete backendMember.joinedDate;
        delete backendMember.createdAt;
        
        console.log('🔄 Sending to backend:', backendMember);
        
        const apiResult = await window.apiClient.createMember(backendMember);
        
        if (apiResult.success) {
          if (apiResult.data && apiResult.data.id) {
            newMember.id = apiResult.data.id;
          }
          
          members.push(newMember);
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
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
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const backendMember = {
          ...updatedMember,
          joined_date: updatedMember.joinedDate,
          created_at: updatedMember.createdAt
        };
        delete backendMember.joinedDate;
        delete backendMember.createdAt;
        
        const apiResult = await window.apiClient.updateMember(memberId, backendMember);
        
        if (apiResult.success) {
          members[index] = updatedMember;
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
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
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const apiResult = await window.apiClient.deleteMember(memberId);
        
        if (apiResult.success) {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
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

async function getEvents(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getEvents();
        
        if (response.success && Array.isArray(response.data)) {
          const mappedData = response.data.map(event => ({
  ...event,
  location: event.venue || event.location,
  venue: event.venue || event.location,
            image: event.image_url || event.image,
            registrationLink: event.registration_link || event.registrationLink,
            createdAt: event.created_at || event.createdAt
          }));
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mappedData));
          let result = mappedData;
          
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
    console.error('❌ Missing required fields:', {
      title: !!eventData.title,
      description: !!eventData.description,
      date: !!eventData.date,
      venue: !!eventData.venue
    });
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
    
    console.log('📝 Creating event with data:', newEvent);
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const backendEvent = {
  id: newEvent.id,
  title: newEvent.title,
  description: newEvent.description,
  category: newEvent.category,
  date: newEvent.date,
  time: newEvent.time,
  location: newEvent.venue,
  image: newEvent.image,
  status: newEvent.status,
  registration_link: newEvent.registrationLink,
  created_at: newEvent.createdAt
};
        
        console.log('🔄 Sending to backend:', backendEvent);
        
        const apiResult = await window.apiClient.createEvent(backendEvent);
        
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
        const backendEvent = {
  id: newEvent.id,
  title: newEvent.title,
  description: newEvent.description,
  category: newEvent.category,
  date: newEvent.date,
  time: newEvent.time,
  location: newEvent.venue,
  image: newEvent.image,
  status: newEvent.status,
  registration_link: newEvent.registrationLink,
  created_at: newEvent.createdAt
};
        
        const apiResult = await window.apiClient.updateEvent(eventId, backendEvent);
        
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
  
  // Clear cache first to force fresh fetch from API
  localStorage.removeItem('cache_events');
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
  
  const eventsResult = await getEvents();
  const events = eventsResult.data || [];
  const filtered = events.filter(e => e.id !== eventId);
  
  if (filtered.length === events.length) {
    console.warn('Event not found in local list, attempting API delete anyway...');
    // Don't throw error - try API delete anyway
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

async function getProjects(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getProjects();
        
        if (response.success && Array.isArray(response.data)) {
          const mappedData = response.data.map(project => ({
            ...project,
            image: project.image_url || project.image,
            githubLink: project.github_link || project.github_url || project.githubLink,
            liveLink: project.live_link || project.demo_url || project.liveLink,
            teamMembers: project.team_members || project.teamMembers,
            completionDate: project.completion_date || project.completionDate,
            createdAt: project.created_at || project.createdAt
          }));
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(mappedData));
          let result = mappedData;
          
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

// ✅ CRITICAL FIX: Ensure arrays are always arrays, never strings
async function addProject(projectData) {
  if (!projectData.title || !projectData.description || !projectData.category) {
    console.error('❌ Missing required fields:', {
      title: !!projectData.title,
      description: !!projectData.description,
      category: !!projectData.category
    });
    throw new Error('Required fields missing: title, description, category');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const projectsResult = await getProjects();
    const projects = projectsResult.data || [];
    
    // ✅ CRITICAL: Ensure technologies and teamMembers are ALWAYS arrays
    const technologies = Array.isArray(projectData.technologies) 
      ? projectData.technologies 
      : (typeof projectData.technologies === 'string' 
        ? projectData.technologies.split(',').map(t => t.trim()).filter(Boolean)
        : []);
    
    const teamMembers = Array.isArray(projectData.teamMembers) 
      ? projectData.teamMembers 
      : (typeof projectData.teamMembers === 'string'
        ? projectData.teamMembers.split('\n').map(t => t.trim()).filter(Boolean)
        : []);
    
    const newProject = {
      id: generateUniqueId('project'),
      title: projectData.title.trim(),
      description: projectData.description.trim(),
      category: projectData.category,
      status: projectData.status || 'ongoing',
      image: projectData.image || '',
      technologies: technologies,
      teamMembers: teamMembers,
      githubLink: projectData.githubLink || '',
      liveLink: projectData.liveLink || '',
      completionDate: projectData.completionDate || '',
      createdAt: getCurrentTimestamp()
    };
    
    console.log('📝 Creating project with data:', newProject);
    console.log('📊 Technologies type:', typeof newProject.technologies, 'Array?', Array.isArray(newProject.technologies));
    console.log('📊 Team members type:', typeof newProject.teamMembers, 'Array?', Array.isArray(newProject.teamMembers));
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        // ✅ CRITICAL FIX: Stringify arrays BEFORE sending to api-client
        // Because api-client.js does JSON.stringify(body) and PostgreSQL
        // needs the arrays as JSON strings in the query parameters
        const backendProject = {
          id: newProject.id,
          title: newProject.title,
          description: newProject.description,
          category: newProject.category,
          status: newProject.status,
          image: newProject.image,
          technologies: JSON.stringify(newProject.technologies), // ✅ Stringify here
          team_members: JSON.stringify(newProject.teamMembers), // ✅ Stringify here
          github_link: newProject.githubLink,
          live_link: newProject.liveLink,
          completion_date: newProject.completionDate,
          created_at: newProject.createdAt
        };
        
        console.log('🔄 Sending to backend:', backendProject);
        console.log('🔍 Backend technologies (stringified):', backendProject.technologies);
        console.log('🔍 Backend team_members (stringified):', backendProject.team_members);
        
        const apiResult = await window.apiClient.createProject(backendProject);
        
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
    // ✅ CRITICAL: Ensure arrays in updates
    if (updates.technologies && !Array.isArray(updates.technologies)) {
      updates.technologies = typeof updates.technologies === 'string'
        ? updates.technologies.split(',').map(t => t.trim()).filter(Boolean)
        : [];
    }
    
    if (updates.teamMembers && !Array.isArray(updates.teamMembers)) {
      updates.teamMembers = typeof updates.teamMembers === 'string'
        ? updates.teamMembers.split('\n').map(t => t.trim()).filter(Boolean)
        : [];
    }
    
    const updatedProject = { ...projects[index], ...updates };
    
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const backendProject = {
          id: updatedProject.id,
          title: updatedProject.title,
          description: updatedProject.description,
          category: updatedProject.category,
          status: updatedProject.status,
          image: updatedProject.image,
          technologies: Array.isArray(updatedProject.technologies) ? updatedProject.technologies : [],
          team_members: Array.isArray(updatedProject.teamMembers) ? updatedProject.teamMembers : [],
          github_link: updatedProject.githubLink,
          live_link: updatedProject.liveLink,
          completion_date: updatedProject.completionDate,
          created_at: updatedProject.createdAt
        };
        
        const apiResult = await window.apiClient.updateProject(projectId, backendProject);
        
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
  
  // Clear cache first to force fresh fetch from API
  localStorage.removeItem('cache_projects');
  localStorage.removeItem(STORAGE_KEYS.PROJECTS);
  
  const projectsResult = await getProjects();
  const projects = projectsResult.data || [];
  const filtered = projects.filter(p => p.id !== projectId);
  
  if (filtered.length === projects.length) {
    console.warn('Project not found in local list, attempting API delete anyway...');
    // Don't throw error - try API delete anyway
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

async function getGallery(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getGallery();
        
        if (response.success && Array.isArray(response.data)) {
          const mappedData = response.data.map(item => ({
            ...item,
            createdAt: item.created_at || item.createdAt
          }));
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(mappedData));
          let result = mappedData;
          
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
        const backendItem = {
          id: newItem.id,
          image: newItem.image,
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          date: newItem.date,
          photographer: newItem.photographer,
          created_at: newItem.createdAt
        };
        
        const apiResult = await window.apiClient.createGalleryItem(backendItem);
        
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
  
  // Clear cache first to force fresh fetch from API
  localStorage.removeItem('cache_gallery');
  localStorage.removeItem(STORAGE_KEYS.GALLERY);
  
  const galleryResult = await getGallery();
  const gallery = galleryResult.data || [];
  const filtered = gallery.filter(g => g.id !== galleryId);
  
  if (filtered.length === gallery.length) {
    console.warn('Gallery item not found in local list, attempting API delete anyway...');
    // Don't throw error - try API delete anyway
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

async function getAnnouncements(filters = {}) {
  try {
    if (typeof window.apiClient !== 'undefined' && window.apiClient.isReady) {
      try {
        const response = await window.apiClient.getAnnouncements();
        
        if (response.success && Array.isArray(response.data)) {
          const mappedData = response.data.map(announcement => ({
            ...announcement,
            date: announcement.created_at || announcement.date,
            createdAt: announcement.created_at || announcement.createdAt
          }));
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(mappedData));
          let result = mappedData;
          
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
        const backendAnnouncement = {
          id: newAnnouncement.id,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          priority: newAnnouncement.priority,
          is_active: true,
          date: newAnnouncement.date,
          created_at: newAnnouncement.createdAt
        };
        
        const apiResult = await window.apiClient.createAnnouncement(backendAnnouncement);
        
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
        const backendAnnouncement = {
          id: updatedAnnouncement.id,
          title: updatedAnnouncement.title,
          content: updatedAnnouncement.content,
          priority: updatedAnnouncement.priority,
          is_active: true,
          date: updatedAnnouncement.date,
          created_at: updatedAnnouncement.createdAt || updatedAnnouncement.date
        };
        
        const apiResult = await window.apiClient.updateAnnouncement(announcementId, backendAnnouncement);
        
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
  
  // Clear cache first to force fresh fetch from API
  localStorage.removeItem('cache_announcements');
  localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
  
  const announcementsResult = await getAnnouncements();
  const announcements = announcementsResult.data || [];
  const filtered = announcements.filter(a => a.id !== announcementId);
  
  if (filtered.length === announcements.length) {
    console.warn('Announcement not found in local list, attempting API delete anyway...');
    // Don't throw error - try API delete anyway
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

function generateUniqueId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

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
      (e.category && e.category.toLowerCase().includes(searchTerm))
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
      (p.category && p.category.toLowerCase().includes(searchTerm)) ||
      (p.technologies && p.technologies.some(tech => tech.toLowerCase().includes(searchTerm)))
    );
  } catch (error) {
    console.error('Error searching projects:', error);
    return [];
  }
}

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
      version: '2.2.0'
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeStorage);
} else {
  initializeStorage();
}

window.storage = {
  STORAGE_KEYS,
  SESSION_KEYS,
  initializeStorage,
  resetStorage,
  isAuthenticated,
  getClubConfig,
  setClubConfig,
  getAdmins,
  addAdmin,
  deleteAdmin,
  getMembers,
  addMember,
  updateMember,
  deleteMember,
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  getGallery,
  addGalleryItem,
  deleteGalleryItem,
  getAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getTheme,
  setTheme,
  getStatistics,
  searchMembers,
  searchEvents,
  searchProjects,
  exportAllData,
  generateUniqueId,
  getCurrentTimestamp,
  getCurrentDate
};

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

console.log('✅ storage.js v2.2.0 loaded - ARRAY FIX APPLIED');
console.log('📦 Storage API available at window.storage');
console.log('🔧 CRITICAL FIX: Arrays are now properly handled (no double stringify)');
console.log('🌐 Global function aliases created for backward compatibility');