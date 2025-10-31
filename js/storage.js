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

function initializeStorage() {
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    
    if (!isInitialized) {
      console.log('First time initialization - will fetch from backend');
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
    
    console.log('Storage reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting storage:', error);
    return false;
  }
}

function isAuthenticated() {
  try {
    const authData = localStorage.getItem('adminAuth');
    if (!authData) return false;
    
    const parsed = JSON.parse(authData);
    return parsed && parsed.isAuthenticated === true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

async function getClubConfig() {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getConfig();
    
    if (response.success && response.data) {
      localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(response.data));
      return response.data;
    }
    
    throw new Error('Failed to fetch config from backend');
  } catch (error) {
    console.warn('API failed, using cached config:', error.message);
    
    const cached = localStorage.getItem(STORAGE_KEYS.CLUB_CONFIG);
    if (cached) {
      return JSON.parse(cached);
    }
    
    return getDefaultDataStructure()[STORAGE_KEYS.CLUB_CONFIG];
  }
}

async function setClubConfig(configData) {
  if (!configData || typeof configData !== 'object') {
    throw new Error('Invalid config data');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update club configuration');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  try {
    const currentConfig = await getClubConfig();
    const updatedConfig = { ...currentConfig, ...configData };
    
    const apiResult = await window.apiClient.updateConfig(updatedConfig);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update club configuration');
    }
    
    localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(updatedConfig));
    
    console.log('Club config saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update club config:', error);
    throw error;
  }
}

async function getAdmins() {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getAdmins();
    
    if (response.success && Array.isArray(response.data)) {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(response.data));
      return response.data;
    }
    
    throw new Error('Failed to fetch admins from backend');
  } catch (error) {
    console.warn('API failed, using cached admins:', error.message);
    
    const cached = localStorage.getItem(STORAGE_KEYS.ADMINS);
    return cached ? JSON.parse(cached) : [];
  }
}

async function addAdmin(adminData) {
  if (!adminData.username || !adminData.password) {
    throw new Error('Username and password are required');
  }
  
  if (!isValidTextLength(adminData.username, 'name')) {
    throw new Error('Invalid username length');
  }
  
  if (!isValidPassword(adminData.password)) {
    throw new Error('Invalid password');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to add admins');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const admins = await getAdmins();
  
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
    
    const apiResult = await window.apiClient.createAdmin(newAdmin);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to create admin');
    }
    
    if (apiResult.data && apiResult.data.id) {
      newAdmin.id = apiResult.data.id;
    }
    
    admins.push(newAdmin);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    
    console.log('Admin saved to backend and cached locally:', newAdmin.username);
    return newAdmin;
    
  } catch (error) {
    console.error('Failed to add admin:', error);
    throw error;
  }
}

async function updateAdmin(adminId, updates) {
  if (!adminId || !updates) {
    throw new Error('Admin ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update admins');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const admins = await getAdmins();
  const index = admins.findIndex(admin => admin.id === adminId);
  
  if (index === -1) {
    throw new Error('Admin not found');
  }
  
  if (updates.username) {
    if (admins.some((admin, i) => i !== index && admin.username === updates.username)) {
      throw new Error('Username already exists');
    }
  }
  
  try {
    const updatedAdmin = { ...admins[index], ...updates };
    
    const apiResult = await window.apiClient.updateAdmin(adminId, updatedAdmin);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update admin');
    }
    
    admins[index] = updatedAdmin;
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    
    console.log('Admin update saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update admin:', error);
    throw error;
  }
}

async function deleteAdmin(adminId) {
  if (!adminId) {
    throw new Error('Admin ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to delete admins');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const admins = await getAdmins();
  const filtered = admins.filter(admin => admin.id !== adminId);
  
  if (filtered.length === admins.length) {
    throw new Error('Admin not found');
  }
  
  if (filtered.length === 0) {
    throw new Error('Cannot delete the last admin');
  }
  
  try {
    const apiResult = await window.apiClient.deleteAdmin(adminId);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to delete admin');
    }
    
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(filtered));
    
    console.log('Admin deleted from backend and cache');
    return true;
    
  } catch (error) {
    console.error('Failed to delete admin:', error);
    throw error;
  }
}

async function getMembers(filters = {}) {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getMembers();
    
    if (response.success && Array.isArray(response.data)) {
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
      
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(response.data));
      return result;
    }
    
    throw new Error('Failed to fetch members from backend');
  } catch (error) {
    console.warn('API failed, using cached members:', error.message);
    
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
    
    return result;
  }
}

async function getMemberById(memberId) {
  try {
    const members = await getMembers();
    return members.find(m => m.id === memberId) || null;
  } catch (error) {
    console.error('Error getting member:', error);
    return null;
  }
}

async function addMember(memberData) {
  if (!memberData.name || !memberData.email || !memberData.department || !memberData.year || !memberData.role) {
    throw new Error('Required fields missing: name, email, department, year, role');
  }
  
  if (!isValidEmail(memberData.email)) {
    throw new Error('Invalid email format');
  }
  
  if (memberData.phone && !isValidPhone(memberData.phone)) {
    throw new Error('Invalid phone format');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to add members');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const members = await getMembers();
  
  if (members.some(m => m.email === memberData.email)) {
    throw new Error('Email already exists');
  }
  
  try {
    const newMember = {
      id: generateUniqueId('member'),
      name: sanitizeText(memberData.name),
      photo: memberData.photo || '',
      department: memberData.department,
      year: memberData.year,
      role: memberData.role,
      position: memberData.position || '',
      email: memberData.email.trim().toLowerCase(),
      phone: memberData.phone ? memberData.phone.trim() : '',
      bio: memberData.bio ? sanitizeText(memberData.bio) : '',
      skills: Array.isArray(memberData.skills) ? memberData.skills : [],
      joinedDate: memberData.joinedDate || getCurrentDate(),
      createdAt: getCurrentTimestamp()
    };
    
    const apiResult = await window.apiClient.createMember(newMember);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to create member');
    }
    
    if (apiResult.data && apiResult.data.id) {
      newMember.id = apiResult.data.id;
    }
    
    members.push(newMember);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    
    console.log('Member saved to backend and cached locally:', newMember.name);
    return newMember;
    
  } catch (error) {
    console.error('Failed to add member:', error);
    throw error;
  }
}

async function updateMember(memberId, updates) {
  if (!memberId || !updates) {
    throw new Error('Member ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update members');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const members = await getMembers();
  const index = members.findIndex(m => m.id === memberId);
  
  if (index === -1) {
    throw new Error('Member not found');
  }
  
  if (updates.email) {
    if (!isValidEmail(updates.email)) {
      throw new Error('Invalid email format');
    }
    if (members.some((m, i) => i !== index && m.email === updates.email)) {
      throw new Error('Email already exists');
    }
  }
  
  if (updates.phone && !isValidPhone(updates.phone)) {
    throw new Error('Invalid phone format');
  }
  
  try {
    if (updates.name) updates.name = sanitizeText(updates.name);
    if (updates.bio) updates.bio = sanitizeText(updates.bio);
    
    const updatedMember = { ...members[index], ...updates };
    
    const apiResult = await window.apiClient.updateMember(memberId, updatedMember);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update member');
    }
    
    members[index] = updatedMember;
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    
    console.log('Member update saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update member:', error);
    throw error;
  }
}

async function deleteMember(memberId) {
  if (!memberId) {
    throw new Error('Member ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to delete members');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const members = await getMembers();
  const filtered = members.filter(m => m.id !== memberId);
  
  if (filtered.length === members.length) {
    throw new Error('Member not found');
  }
  
  try {
    const apiResult = await window.apiClient.deleteMember(memberId);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to delete member');
    }
    
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
    
    console.log('Member deleted from backend and cache');
    return true;
    
  } catch (error) {
    console.error('Failed to delete member:', error);
    throw error;
  }
}

async function getEvents(filters = {}) {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getEvents();
    
    if (response.success && Array.isArray(response.data)) {
      let result = response.data.map(event => {
        if (!event.status || event.status === 'auto') {
          event.status = calculateEventStatus(event.date);
        }
        return event;
      });
      
      if (filters.status) {
        result = result.filter(e => e.status === filters.status);
      }
      if (filters.category) {
        result = result.filter(e => e.category === filters.category);
      }
      
      result.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return filters.status === 'completed' ? dateB - dateA : dateA - dateB;
      });
      
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(response.data));
      return result;
    }
    
    throw new Error('Failed to fetch events from backend');
  } catch (error) {
    console.warn('API failed, using cached events:', error.message);
    
    const cached = localStorage.getItem(STORAGE_KEYS.EVENTS);
    let result = cached ? JSON.parse(cached) : [];
    
    result = result.map(event => {
      if (!event.status || event.status === 'auto') {
        event.status = calculateEventStatus(event.date);
      }
      return event;
    });
    
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(e => e.category === filters.category);
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return filters.status === 'completed' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }
}

async function getEventById(eventId) {
  try {
    const events = await getEvents();
    return events.find(e => e.id === eventId) || null;
  } catch (error) {
    console.error('Error getting event:', error);
    return null;
  }
}

async function addEvent(eventData) {
  if (!eventData.title || !eventData.description || !eventData.date || !eventData.venue) {
    throw new Error('Required fields missing: title, description, date, venue');
  }
  
  if (!isValidTextLength(eventData.title, 'title')) {
    throw new Error('Invalid title length');
  }
  if (!isValidTextLength(eventData.description, 'description')) {
    throw new Error('Invalid description length');
  }
  
  if (eventData.registrationLink && !isValidUrl(eventData.registrationLink)) {
    throw new Error('Invalid registration link');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to add events');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  try {
    const events = await getEvents();
    
    const newEvent = {
      id: generateUniqueId('event'),
      title: sanitizeText(eventData.title),
      description: sanitizeText(eventData.description),
      category: eventData.category || 'General',
      date: eventData.date,
      time: eventData.time || '',
      venue: sanitizeText(eventData.venue),
      image: eventData.image || '',
      status: eventData.status || calculateEventStatus(eventData.date),
      registrationLink: eventData.registrationLink || '',
      details: eventData.details ? sanitizeText(eventData.details) : '',
      organizer: eventData.organizer || CLUB_DEFAULTS.name,
      createdAt: getCurrentTimestamp()
    };
    
    const apiResult = await window.apiClient.createEvent(newEvent);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to create event');
    }
    
    if (apiResult.data && apiResult.data.id) {
      newEvent.id = apiResult.data.id;
    }
    
    events.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    
    console.log('Event saved to backend and cached locally:', newEvent.title);
    return newEvent;
    
  } catch (error) {
    console.error('Failed to add event:', error);
    throw error;
  }
}

async function updateEvent(eventId, updates) {
  if (!eventId || !updates) {
    throw new Error('Event ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update events');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const events = await getEvents();
  const index = events.findIndex(e => e.id === eventId);
  
  if (index === -1) {
    throw new Error('Event not found');
  }
  
  if (updates.title && !isValidTextLength(updates.title, 'title')) {
    throw new Error('Invalid title length');
  }
  if (updates.description && !isValidTextLength(updates.description, 'description')) {
    throw new Error('Invalid description length');
  }
  if (updates.registrationLink && !isValidUrl(updates.registrationLink)) {
    throw new Error('Invalid registration link');
  }
  
  try {
    if (updates.title) updates.title = sanitizeText(updates.title);
    if (updates.description) updates.description = sanitizeText(updates.description);
    if (updates.details) updates.details = sanitizeText(updates.details);
    if (updates.venue) updates.venue = sanitizeText(updates.venue);
    
    if (updates.date && !updates.status) {
      updates.status = calculateEventStatus(updates.date);
    }
    
    const updatedEvent = { ...events[index], ...updates };
    
    const apiResult = await window.apiClient.updateEvent(eventId, updatedEvent);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update event');
    }
    
    events[index] = updatedEvent;
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    
    console.log('Event update saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update event:', error);
    throw error;
  }
}

async function deleteEvent(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to delete events');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const events = await getEvents();
  const filtered = events.filter(e => e.id !== eventId);
  
  if (filtered.length === events.length) {
    throw new Error('Event not found');
  }
  
  try {
    const apiResult = await window.apiClient.deleteEvent(eventId);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to delete event');
    }
    
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
    
    console.log('Event deleted from backend and cache');
    return true;
    
  } catch (error) {
    console.error('Failed to delete event:', error);
    throw error;
  }
}

async function getProjects(filters = {}) {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getProjects();
    
    if (response.success && Array.isArray(response.data)) {
      let result = response.data;
      
      if (filters.status) {
        result = result.filter(p => p.status === filters.status);
      }
      if (filters.category) {
        result = result.filter(p => p.category === filters.category);
      }
      
      result.sort((a, b) => {
        const dateA = new Date(a.completionDate || a.createdAt);
        const dateB = new Date(b.completionDate || b.createdAt);
        return dateB - dateA;
      });
      
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(response.data));
      return result;
    }
    
    throw new Error('Failed to fetch projects from backend');
  } catch (error) {
    console.warn('API failed, using cached projects:', error.message);
    
    const cached = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.completionDate || a.createdAt);
      const dateB = new Date(b.completionDate || b.createdAt);
      return dateB - dateA;
    });
    
    return result;
  }
}

async function getProjectById(projectId) {
  try {
    const projects = await getProjects();
    return projects.find(p => p.id === projectId) || null;
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

async function addProject(projectData) {
  if (!projectData.title || !projectData.description || !projectData.category || !projectData.status) {
    throw new Error('Required fields missing: title, description, category, status');
  }
  
  if (!isValidTextLength(projectData.title, 'title')) {
    throw new Error('Invalid title length');
  }
  if (!isValidTextLength(projectData.description, 'description')) {
    throw new Error('Invalid description length');
  }
  
  if (projectData.githubLink && !isValidUrl(projectData.githubLink)) {
    throw new Error('Invalid GitHub link');
  }
  if (projectData.liveLink && !isValidUrl(projectData.liveLink)) {
    throw new Error('Invalid live link');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to add projects');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  try {
    const projects = await getProjects();
    
    const newProject = {
      id: generateUniqueId('project'),
      title: sanitizeText(projectData.title),
      description: sanitizeText(projectData.description),
      category: projectData.category,
      status: projectData.status,
      image: projectData.image || '',
      technologies: Array.isArray(projectData.technologies) ? projectData.technologies : [],
      teamMembers: Array.isArray(projectData.teamMembers) ? projectData.teamMembers : [],
      githubLink: projectData.githubLink || '',
      liveLink: projectData.liveLink || '',
      completionDate: projectData.completionDate || '',
      features: projectData.features ? sanitizeText(projectData.features) : '',
      achievements: projectData.achievements ? sanitizeText(projectData.achievements) : '',
      createdAt: getCurrentTimestamp()
    };
    
    const apiResult = await window.apiClient.createProject(newProject);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to create project');
    }
    
    if (apiResult.data && apiResult.data.id) {
      newProject.id = apiResult.data.id;
    }
    
    projects.push(newProject);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    
    console.log('Project saved to backend and cached locally:', newProject.title);
    return newProject;
    
  } catch (error) {
    console.error('Failed to add project:', error);
    throw error;
  }
}

async function updateProject(projectId, updates) {
  if (!projectId || !updates) {
    throw new Error('Project ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update projects');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index === -1) {
    throw new Error('Project not found');
  }
  
  if (updates.title && !isValidTextLength(updates.title, 'title')) {
    throw new Error('Invalid title length');
  }
  if (updates.description && !isValidTextLength(updates.description, 'description')) {
    throw new Error('Invalid description length');
  }
  if (updates.githubLink && !isValidUrl(updates.githubLink)) {
    throw new Error('Invalid GitHub link');
  }
  if (updates.liveLink && !isValidUrl(updates.liveLink)) {
    throw new Error('Invalid live link');
  }
  
  try {
    if (updates.title) updates.title = sanitizeText(updates.title);
    if (updates.description) updates.description = sanitizeText(updates.description);
    if (updates.features) updates.features = sanitizeText(updates.features);
    if (updates.achievements) updates.achievements = sanitizeText(updates.achievements);
    
    const updatedProject = { ...projects[index], ...updates };
    
    const apiResult = await window.apiClient.updateProject(projectId, updatedProject);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update project');
    }
    
    projects[index] = updatedProject;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    
    console.log('Project update saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update project:', error);
    throw error;
  }
}

async function deleteProject(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to delete projects');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  
  if (filtered.length === projects.length) {
    throw new Error('Project not found');
  }
  
  try {
    const apiResult = await window.apiClient.deleteProject(projectId);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to delete project');
    }
    
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
    
    console.log('Project deleted from backend and cache');
    return true;
    
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw error;
  }
}

async function getGallery(filters = {}) {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getGallery();
    
    if (response.success && Array.isArray(response.data)) {
      let result = response.data;
      
      if (filters.category) {
        result = result.filter(g => g.category === filters.category);
      }
      
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(response.data));
      return result;
    }
    
    throw new Error('Failed to fetch gallery from backend');
  } catch (error) {
    console.warn('API failed, using cached gallery:', error.message);
    
    const cached = localStorage.getItem(STORAGE_KEYS.GALLERY);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.category) {
      result = result.filter(g => g.category === filters.category);
    }
    
    result.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return result;
  }
}

async function getGalleryItemById(galleryId) {
  try {
    const gallery = await getGallery();
    return gallery.find(g => g.id === galleryId) || null;
  } catch (error) {
    console.error('Error getting gallery item:', error);
    return null;
  }
}

async function addGalleryItem(galleryData) {
  if (!galleryData.image || !galleryData.title || !galleryData.category) {
    throw new Error('Required fields missing: image, title, category');
  }
  
  if (!isValidTextLength(galleryData.title, 'title')) {
    throw new Error('Invalid title length');
  }
  
  if (!isAuthenticated()) {
    throw new Error('Authentication required to add gallery items');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  try {
    const gallery = await getGallery();
    
    const newItem = {
      id: generateUniqueId('gallery'),
      image: galleryData.image,
      title: sanitizeText(galleryData.title),
      description: galleryData.description ? sanitizeText(galleryData.description) : '',
      category: galleryData.category,
      date: galleryData.date || getCurrentDate(),
      photographer: galleryData.photographer || '',
      createdAt: getCurrentTimestamp()
    };
    
    const apiResult = await window.apiClient.createGalleryItem(newItem);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to save gallery item');
    }
    
    if (apiResult.data && apiResult.data.id) {
      newItem.id = apiResult.data.id;
    }
    
    gallery.push(newItem);
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
    
    console.log('Gallery item saved to backend and cached locally');
    return newItem;
    
  } catch (error) {
    console.error('Failed to add gallery item:', error);
    throw error;
  }
}

async function updateGalleryItem(galleryId, updates) {
  if (!galleryId || !updates) {
    throw new Error('Gallery ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update gallery items');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const gallery = await getGallery();
  const index = gallery.findIndex(g => g.id === galleryId);
  
  if (index === -1) {
    throw new Error('Gallery item not found');
  }
  
  if (updates.title && !isValidTextLength(updates.title, 'title')) {
    throw new Error('Invalid title length');
  }
  
  try {
    if (updates.title) updates.title = sanitizeText(updates.title);
    if (updates.description) updates.description = sanitizeText(updates.description);
    
    const updatedItem = { ...gallery[index], ...updates };
    
    const apiResult = await window.apiClient.updateGalleryItem(galleryId, updatedItem);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update gallery item');
    }
    
    gallery[index] = updatedItem;
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
    
    console.log('Gallery item update saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update gallery item:', error);
    throw error;
  }
}

async function deleteGalleryItem(galleryId) {
  if (!galleryId) {
    throw new Error('Gallery ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to delete gallery items');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const gallery = await getGallery();
  const filtered = gallery.filter(g => g.id !== galleryId);
  
  if (filtered.length === gallery.length) {
    throw new Error('Gallery item not found');
  }
  
  try {
    const apiResult = await window.apiClient.deleteGalleryItem(galleryId);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to delete gallery item');
    }
    
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(filtered));
    
    console.log('Gallery item deleted from backend and cache');
    return true;
    
  } catch (error) {
    console.error('Failed to delete gallery item:', error);
    throw error;
  }
}

async function getAnnouncements(filters = {}) {
  try {
    if (typeof window.apiClient === 'undefined') {
      throw new Error('API client not available');
    }

    const response = await window.apiClient.getAnnouncements();
    
    if (response.success && Array.isArray(response.data)) {
      let result = response.data;
      
      if (filters.priority) {
        result = result.filter(a => a.priority === filters.priority);
      }
      
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(response.data));
      return result;
    }
    
    throw new Error('Failed to fetch announcements from backend');
  } catch (error) {
    console.warn('API failed, using cached announcements:', error.message);
    
    const cached = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    let result = cached ? JSON.parse(cached) : [];
    
    if (filters.priority) {
      result = result.filter(a => a.priority === filters.priority);
    }
    
    result.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return result;
  }
}

async function getAnnouncementById(announcementId) {
  try {
    const announcements = await getAnnouncements();
    return announcements.find(a => a.id === announcementId) || null;
  } catch (error) {
    console.error('Error getting announcement:', error);
    return null;
  }
}

async function addAnnouncement(announcementData) {
  if (!announcementData.title || !announcementData.content) {
    throw new Error('Required fields missing: title, content');
  }
  
  if (!isValidTextLength(announcementData.title, 'title')) {
    throw new Error('Invalid title length');
  }
  if (!isValidTextLength(announcementData.content, 'description')) {
    throw new Error('Invalid content length');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to add announcements');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  try {
    const announcements = await getAnnouncements();
    
    const newAnnouncement = {
      id: generateUniqueId('announcement'),
      title: sanitizeText(announcementData.title),
      content: sanitizeText(announcementData.content),
      priority: announcementData.priority || 'normal',
      date: getCurrentTimestamp(),
      createdAt: getCurrentTimestamp()
    };
    
    const apiResult = await window.apiClient.createAnnouncement(newAnnouncement);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to create announcement');
    }
    
    if (apiResult.data && apiResult.data.id) {
      newAnnouncement.id = apiResult.data.id;
    }
    
    announcements.push(newAnnouncement);
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    
    console.log('Announcement saved to backend and cached locally:', newAnnouncement.title);
    return newAnnouncement;
    
  } catch (error) {
    console.error('Failed to add announcement:', error);
    throw error;
  }
}

async function updateAnnouncement(announcementId, updates) {
  if (!announcementId || !updates) {
    throw new Error('Announcement ID and updates are required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to update announcements');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const announcements = await getAnnouncements();
  const index = announcements.findIndex(a => a.id === announcementId);
  
  if (index === -1) {
    throw new Error('Announcement not found');
  }
  
  if (updates.title && !isValidTextLength(updates.title, 'title')) {
    throw new Error('Invalid title length');
  }
  if (updates.content && !isValidTextLength(updates.content, 'description')) {
    throw new Error('Invalid content length');
  }
  
  try {
    if (updates.title) updates.title = sanitizeText(updates.title);
    if (updates.content) updates.content = sanitizeText(updates.content);
    
    const updatedAnnouncement = { ...announcements[index], ...updates };
    
    const apiResult = await window.apiClient.updateAnnouncement(announcementId, updatedAnnouncement);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to update announcement');
    }
    
    announcements[index] = updatedAnnouncement;
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    
    console.log('Announcement update saved to backend and cached locally');
    return true;
    
  } catch (error) {
    console.error('Failed to update announcement:', error);
    throw error;
  }
}

async function deleteAnnouncement(announcementId) {
  if (!announcementId) {
    throw new Error('Announcement ID is required');
  }
  
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to delete announcements');
  }
  
  if (typeof window.apiClient === 'undefined') {
    throw new Error('API client not available. Please refresh the page.');
  }
  
  const announcements = await getAnnouncements();
  const filtered = announcements.filter(a => a.id !== announcementId);
  
  if (filtered.length === announcements.length) {
    throw new Error('Announcement not found');
  }
  
  try {
    const apiResult = await window.apiClient.deleteAnnouncement(announcementId);
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Failed to delete announcement');
    }
    
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(filtered));
    
    console.log('Announcement deleted from backend and cache');
    return true;
    
  } catch (error) {
    console.error('Failed to delete announcement:', error);
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
    console.log('Theme set to:', theme);
    return true;
  } catch (error) {
    console.error('Error setting theme:', error);
    return false;
  }
}

async function getStatistics() {
  try {
    const members = await getMembers();
    const events = await getEvents();
    const projects = await getProjects();
    const gallery = await getGallery();
    const announcements = await getAnnouncements();
    const admins = await getAdmins();
    
    return {
      totalMembers: members.length,
      executiveMembers: members.filter(m => m.role === 'Executive Member').length,
      generalMembers: members.filter(m => m.role === 'General Member').length,
      alumni: members.filter(m => m.role === 'Alumni').length,
      
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
      alumni: 0,
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
    if (!query) return await getMembers();
    
    const members = await getMembers();
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
    if (!query) return await getEvents();
    
    const events = await getEvents();
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
    if (!query) return await getProjects();
    
    const projects = await getProjects();
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

async function searchGallery(query) {
  try {
    if (!query) return await getGallery();
    
    const gallery = await getGallery();
    const searchTerm = query.toLowerCase().trim();
    
    return gallery.filter(g => 
      g.title.toLowerCase().includes(searchTerm) ||
      (g.description && g.description.toLowerCase().includes(searchTerm)) ||
      g.category.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching gallery:', error);
    return [];
  }
}

async function exportAll