/**
 * load-config.js - FIXED VERSION
 * Dynamic content loader with proper cache invalidation
 * Version: 3.0.0 - Fixed cache invalidation and API integration
 */

// Global flag to prevent duplicate page initialization
let isPageLoading = false;
let initializationPromise = null;

// =============================================================================
// CACHE MANAGEMENT WITH PROPER INVALIDATION
// =============================================================================

/**
 * Load data from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null
 */
async function loadFromCache(key) {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    console.log(`📦 Loaded ${key} from cache (${data.length || 0} items)`);
    return data;
  } catch (error) {
    console.warn(`⚠️ Error loading ${key} from cache:`, error);
    return null;
  }
}

/**
 * Save data to cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @returns {Promise<boolean>} Success status
 */
async function saveToCache(key, data) {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    console.log(`💾 Saved ${key} to cache (${data.length || 0} items)`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Error saving ${key} to cache:`, error);
    return false;
  }
}

/**
 * Clear specific cache or all caches
 * @param {string|null} key - Cache key to clear, or null for all
 */
function clearCache(key = null) {
  try {
    if (key) {
      localStorage.removeItem(`cache_${key}`);
      console.log(`🗑️ Cleared cache: ${key}`);
    } else {
      const keys = ['clubConfig', 'members', 'events', 'projects', 'gallery', 'announcements'];
      keys.forEach(k => {
        localStorage.removeItem(`cache_${k}`);
        localStorage.removeItem(k);
      });
      console.log('🗑️ Cleared all caches');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Expose cache clearing function globally
window.clearCache = clearCache;

// =============================================================================
// CLUB CONFIGURATION
// =============================================================================

async function loadClubConfiguration() {
  try {
    console.log('🔄 Loading club configuration...');
    
    // Try API first if available
    if (window.apiClient && window.apiClient.isReady) {
      try {
        const result = await window.apiClient.getConfig();
        
        if (result.success && result.data) {
          await saveToCache('clubConfig', result.data);
          updateClubConfigDOM(result.data);
          console.log('✅ Club configuration loaded from API');
          return true;
        }
      } catch (apiError) {
        console.warn('⚠️ API failed, trying cache:', apiError.message);
      }
    }
    
    // Fallback to cache
    const cached = await loadFromCache('clubConfig');
    if (cached) {
      updateClubConfigDOM(cached);
      console.log('✅ Club configuration loaded from cache');
      return true;
    }
    
    console.warn('⚠️ No club configuration available');
    return false;
    
  } catch (error) {
    console.error('❌ Error loading club configuration:', error);
    return false;
  }
}

function updateClubConfigDOM(config) {
  if (!config) return;
  
  // Update logo
  const logoElements = document.querySelectorAll('.club-logo, #sidebarLogo');
  logoElements.forEach(el => {
    if (config.logo) {
      el.src = config.logo;
      el.alt = config.shortName || 'Club Logo';
      el.onerror = function() {
        this.src = 'assets/default-logo.jpg';
      };
    }
  });
  
  // Update club name
  const clubNameElements = document.querySelectorAll('.club-name, .admin-subtitle');
  clubNameElements.forEach(el => {
    el.textContent = config.name || config.club_name || 'Robotics Club';
  });
  
  // Update motto
  const clubMottoElements = document.querySelectorAll('.club-motto');
  clubMottoElements.forEach(el => {
    el.textContent = config.motto || config.club_motto || '';
  });
  
  // Update description
  const clubDescriptionElements = document.querySelectorAll('.club-description');
  clubDescriptionElements.forEach(el => {
    el.textContent = config.description || config.club_description || '';
  });
  
  // Update social links
  if (config.social_links && Array.isArray(config.social_links) && config.social_links.length > 0) {
    const socialContainer = document.querySelector('.social-links-container');
    if (socialContainer) {
      socialContainer.innerHTML = '';
      
      config.social_links.forEach(link => {
        if (link.url) {
          const anchor = document.createElement('a');
          anchor.href = link.url;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.className = 'social-link';
          anchor.title = link.platform || 'Social Link';
          
          const icon = document.createElement('span');
          icon.textContent = link.icon || '🔗';
          anchor.appendChild(icon);
          
          socialContainer.appendChild(anchor);
        }
      });
    }
  }
  
  // Update page title
  document.title = `${config.shortName || 'Club'} - ${config.name || config.club_name || 'Robotics Club'}`;
}

// =============================================================================
// EVENTS
// =============================================================================

async function loadRecentEvents(limit = 3) {
  try {
    console.log('🔄 Loading recent events...');
    
    // Try API first
    if (window.apiClient && window.apiClient.isReady) {
      try {
        const result = await window.apiClient.getEvents();
        
        if (result.success && Array.isArray(result.data)) {
          await saveToCache('events', result.data);
          displayRecentEvents(result.data, limit);
          console.log('✅ Events loaded from API');
          return true;
        }
      } catch (apiError) {
        console.warn('⚠️ API failed, trying cache:', apiError.message);
      }
    }
    
    // Fallback to cache
    const cached = await loadFromCache('events');
    if (cached && Array.isArray(cached)) {
      displayRecentEvents(cached, limit);
      console.log('✅ Events loaded from cache');
      return true;
    }
    
    displayEmptyEvents();
    return false;
    
  } catch (error) {
    console.error('❌ Error loading events:', error);
    displayEmptyEvents();
    return false;
  }
}

function displayRecentEvents(events, limit) {
  const container = document.getElementById('recent-events-container');
  if (!container) return;
  
  const upcomingEvents = events.filter(e => 
    e.status === 'upcoming' || e.status === 'Upcoming'
  );
  
  if (upcomingEvents.length === 0) {
    container.innerHTML = '<p class="no-data">No upcoming events at the moment.</p>';
    return;
  }
  
  container.innerHTML = '';
  const recentEvents = upcomingEvents.slice(0, limit);
  
  recentEvents.forEach(event => {
    const eventCard = createEventCard(event);
    container.appendChild(eventCard);
  });
  
  console.log(`✅ Displayed ${recentEvents.length} recent events`);
}

function displayEmptyEvents() {
  const container = document.getElementById('recent-events-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No upcoming events at the moment.</p>';
  }
}

// =============================================================================
// PROJECTS
// =============================================================================

async function loadFeaturedProjects(limit = 6) {
  try {
    console.log('🔄 Loading featured projects...');
    
    // Try API first
    if (window.apiClient && window.apiClient.isReady) {
      try {
        const result = await window.apiClient.getProjects();
        
        if (result.success && Array.isArray(result.data)) {
          await saveToCache('projects', result.data);
          displayFeaturedProjects(result.data, limit);
          console.log('✅ Projects loaded from API');
          return true;
        }
      } catch (apiError) {
        console.warn('⚠️ API failed, trying cache:', apiError.message);
      }
    }
    
    // Fallback to cache
    const cached = await loadFromCache('projects');
    if (cached && Array.isArray(cached)) {
      displayFeaturedProjects(cached, limit);
      console.log('✅ Projects loaded from cache');
      return true;
    }
    
    displayEmptyProjects();
    return false;
    
  } catch (error) {
    console.error('❌ Error loading projects:', error);
    displayEmptyProjects();
    return false;
  }
}

function displayFeaturedProjects(projects, limit) {
  const container = document.getElementById('featured-projects-container');
  if (!container) return;
  
  if (projects.length === 0) {
    container.innerHTML = '<p class="no-data">No projects to display yet.</p>';
    return;
  }
  
  container.innerHTML = '';
  const featuredProjects = projects.slice(0, limit);
  
  featuredProjects.forEach(project => {
    const projectCard = createProjectCard(project);
    container.appendChild(projectCard);
  });
  
  console.log(`✅ Displayed ${featuredProjects.length} featured projects`);
}

function displayEmptyProjects() {
  const container = document.getElementById('featured-projects-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No projects to display yet.</p>';
  }
}

// =============================================================================
// MEMBERS
// =============================================================================

async function loadExecutiveMembers(limit = 4) {
  try {
    console.log('🔄 Loading executive members...');
    
    // Try API first
    if (window.apiClient && window.apiClient.isReady) {
      try {
        const result = await window.apiClient.getMembers();
        
        if (result.success && Array.isArray(result.data)) {
          await saveToCache('members', result.data);
          displayExecutiveMembers(result.data, limit);
          console.log('✅ Members loaded from API');
          return true;
        }
      } catch (apiError) {
        console.warn('⚠️ API failed, trying cache:', apiError.message);
      }
    }
    
    // Fallback to cache
    const cached = await loadFromCache('members');
    if (cached && Array.isArray(cached)) {
      displayExecutiveMembers(cached, limit);
      console.log('✅ Members loaded from cache');
      return true;
    }
    
    displayEmptyMembers();
    return false;
    
  } catch (error) {
    console.error('❌ Error loading members:', error);
    displayEmptyMembers();
    return false;
  }
}

function displayExecutiveMembers(members, limit) {
  const container = document.getElementById('executive-members-container');
  if (!container) return;
  
  const executiveMembers = members.filter(m => 
    m.role === 'Executive Member' || m.role === 'Executive'
  );
  
  if (executiveMembers.length === 0) {
    container.innerHTML = '<p class="no-data">No executive members listed yet.</p>';
    return;
  }
  
  container.innerHTML = '';
  const displayMembers = executiveMembers.slice(0, limit);
  
  displayMembers.forEach(member => {
    const memberCard = createMemberCard(member);
    container.appendChild(memberCard);
  });
  
  console.log(`✅ Displayed ${displayMembers.length} executive members`);
}

function displayEmptyMembers() {
  const container = document.getElementById('executive-members-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No executive members listed yet.</p>';
  }
}

// =============================================================================
// GALLERY
// =============================================================================

async function loadGalleryPreview(limit = 8) {
  try {
    console.log('🔄 Loading gallery preview...');
    
    // Try API first
    if (window.apiClient && window.apiClient.isReady) {
      try {
        const result = await window.apiClient.getGallery();
        
        if (result.success && Array.isArray(result.data)) {
          await saveToCache('gallery', result.data);
          displayGalleryPreview(result.data, limit);
          console.log('✅ Gallery loaded from API');
          return true;
        }
      } catch (apiError) {
        console.warn('⚠️ API failed, trying cache:', apiError.message);
      }
    }
    
    // Fallback to cache
    const cached = await loadFromCache('gallery');
    if (cached && Array.isArray(cached)) {
      displayGalleryPreview(cached, limit);
      console.log('✅ Gallery loaded from cache');
      return true;
    }
    
    displayEmptyGallery();
    return false;
    
  } catch (error) {
    console.error('❌ Error loading gallery:', error);
    displayEmptyGallery();
    return false;
  }
}

function displayGalleryPreview(gallery, limit) {
  const container = document.getElementById('gallery-preview-container');
  if (!container) return;
  
  if (gallery.length === 0) {
    container.innerHTML = '<p class="no-data">No photos in gallery yet.</p>';
    return;
  }
  
  container.innerHTML = '';
  const previewItems = gallery.slice(0, limit);
  
  previewItems.forEach(item => {
    const galleryItem = createGalleryItem(item);
    container.appendChild(galleryItem);
  });
  
  console.log(`✅ Displayed ${previewItems.length} gallery items`);
}

function displayEmptyGallery() {
  const container = document.getElementById('gallery-preview-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No photos in gallery yet.</p>';
  }
}

// =============================================================================
// ANNOUNCEMENTS
// =============================================================================

async function loadAnnouncements(limit = 5) {
  try {
    console.log('🔄 Loading announcements...');
    
    // Try API first
    if (window.apiClient && window.apiClient.isReady) {
      try {
        const result = await window.apiClient.getAnnouncements();
        
        if (result.success && Array.isArray(result.data)) {
          await saveToCache('announcements', result.data);
          displayAnnouncements(result.data, limit);
          console.log('✅ Announcements loaded from API');
          return true;
        }
      } catch (apiError) {
        console.warn('⚠️ API failed, trying cache:', apiError.message);
      }
    }
    
    // Fallback to cache
    const cached = await loadFromCache('announcements');
    if (cached && Array.isArray(cached)) {
      displayAnnouncements(cached, limit);
      console.log('✅ Announcements loaded from cache');
      return true;
    }
    
    displayEmptyAnnouncements();
    return false;
    
  } catch (error) {
    console.error('❌ Error loading announcements:', error);
    displayEmptyAnnouncements();
    return false;
  }
}

function displayAnnouncements(announcements, limit) {
  const container = document.getElementById('announcements-container');
  if (!container) return;
  
  if (announcements.length === 0) {
    container.innerHTML = '<p class="no-data">No announcements at the moment.</p>';
    return;
  }
  
  container.innerHTML = '';
  const recentAnnouncements = announcements.slice(0, limit);
  
  recentAnnouncements.forEach(announcement => {
    const announcementItem = createAnnouncementItem(announcement);
    container.appendChild(announcementItem);
  });
  
  console.log(`✅ Displayed ${recentAnnouncements.length} announcements`);
}

function displayEmptyAnnouncements() {
  const container = document.getElementById('announcements-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No announcements at the moment.</p>';
  }
}

// =============================================================================
// CARD CREATION FUNCTIONS
// =============================================================================

function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.dataset.eventId = event.id;
  
  if (event.image) {
    const img = document.createElement('img');
    img.src = event.image;
    img.alt = event.title;
    img.className = 'event-image';
    img.onerror = function() {
      this.src = 'assets/default-event.jpg';
    };
    card.appendChild(img);
  }
  
  const content = document.createElement('div');
  content.className = 'event-content';
  
  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = event.title;
  content.appendChild(title);
  
  const category = document.createElement('span');
  category.className = 'event-category';
  category.textContent = event.category;
  content.appendChild(category);
  
  const date = document.createElement('p');
  date.className = 'event-date';
  date.innerHTML = `<strong>Date:</strong> ${formatDateDisplay(event.date)}`;
  content.appendChild(date);
  
  const venue = document.createElement('p');
  venue.className = 'event-venue';
  venue.innerHTML = `<strong>Venue:</strong> ${event.venue}`;
  content.appendChild(venue);
  
  const description = document.createElement('p');
  description.className = 'event-description';
  description.textContent = truncateText(event.description, 120);
  content.appendChild(description);
  
  const actions = document.createElement('div');
  actions.className = 'event-actions';
  
  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'btn-primary';
  detailsBtn.textContent = 'View Details';
  detailsBtn.onclick = () => viewEventDetails(event.id);
  actions.appendChild(detailsBtn);
  
  if (event.registrationLink) {
    const registerBtn = document.createElement('a');
    registerBtn.href = event.registrationLink;
    registerBtn.className = 'btn-secondary';
    registerBtn.textContent = 'Register';
    registerBtn.target = '_blank';
    registerBtn.rel = 'noopener noreferrer';
    actions.appendChild(registerBtn);
  }
  
  content.appendChild(actions);
  card.appendChild(content);
  
  return card;
}

function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.projectId = project.id;
  
  if (project.image) {
    const img = document.createElement('img');
    img.src = project.image;
    img.alt = project.title;
    img.className = 'project-image';
    img.onerror = function() {
      this.src = 'assets/default-project.jpg';
    };
    card.appendChild(img);
  }
  
  const content = document.createElement('div');
  content.className = 'project-content';
  
  const title = document.createElement('h3');
  title.className = 'project-title';
  title.textContent = project.title;
  content.appendChild(title);
  
  const category = document.createElement('span');
  category.className = 'project-category';
  category.textContent = project.category;
  content.appendChild(category);
  
  const description = document.createElement('p');
  description.className = 'project-description';
  description.textContent = truncateText(project.description, 120);
  content.appendChild(description);
  
  if (project.technologies && project.technologies.length > 0) {
    const techContainer = document.createElement('div');
    techContainer.className = 'project-technologies';
    
    project.technologies.slice(0, 5).forEach(tech => {
      const techBadge = document.createElement('span');
      techBadge.className = 'tech-badge';
      techBadge.textContent = tech;
      techContainer.appendChild(techBadge);
    });
    
    content.appendChild(techContainer);
  }
  
  const actions = document.createElement('div');
  actions.className = 'project-actions';
  
  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'btn-primary';
  detailsBtn.textContent = 'View Details';
  detailsBtn.onclick = () => viewProjectDetails(project.id);
  actions.appendChild(detailsBtn);
  
  if (project.githubLink) {
    const githubBtn = document.createElement('a');
    githubBtn.href = project.githubLink;
    githubBtn.className = 'btn-secondary';
    githubBtn.textContent = 'GitHub';
    githubBtn.target = '_blank';
    githubBtn.rel = 'noopener noreferrer';
    actions.appendChild(githubBtn);
  }
  
  content.appendChild(actions);
  card.appendChild(content);
  
  return card;
}

function createMemberCard(member) {
  const card = document.createElement('div');
  card.className = 'member-card';
  card.dataset.memberId = member.id;
  
  if (member.photo) {
    const img = document.createElement('img');
    img.src = member.photo;
    img.alt = member.name;
    img.className = 'member-photo';
    img.onerror = function() {
      this.src = 'assets/default-avatar.jpg';
    };
    card.appendChild(img);
  }
  
  const content = document.createElement('div');
  content.className = 'member-content';
  
  const name = document.createElement('h3');
  name.className = 'member-name';
  name.textContent = member.name;
  content.appendChild(name);
  
  if (member.position) {
    const position = document.createElement('p');
    position.className = 'member-position';
    position.textContent = member.position;
    content.appendChild(position);
  }
  
  const department = document.createElement('p');
  department.className = 'member-department';
  department.textContent = `${member.department} - ${member.year} Year`;
  content.appendChild(department);
  
  if (member.bio) {
    const bio = document.createElement('p');
    bio.className = 'member-bio';
    bio.textContent = truncateText(member.bio, 100);
    content.appendChild(bio);
  }
  
  const contact = document.createElement('div');
  contact.className = 'member-contact';
  
  if (member.email) {
    const email = document.createElement('a');
    email.href = `mailto:${member.email}`;
    email.textContent = '📧';
    email.title = 'Email';
    contact.appendChild(email);
  }
  
  if (member.phone) {
    const phone = document.createElement('a');
    phone.href = `tel:${member.phone}`;
    phone.textContent = '📞';
    phone.title = 'Phone';
    contact.appendChild(phone);
  }
  
  content.appendChild(contact);
  card.appendChild(content);
  
  return card;
}

function createGalleryItem(item) {
  const galleryItem = document.createElement('div');
  galleryItem.className = 'gallery-item';
  galleryItem.dataset.galleryId = item.id;
  
  const img = document.createElement('img');
  img.src = item.image;
  img.alt = item.title;
  img.className = 'gallery-image';
  img.onclick = () => viewGalleryItem(item.id);
  img.onerror = function() {
    this.src = 'assets/default-image.jpg';
  };
  galleryItem.appendChild(img);
  
  const overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';
  
  const title = document.createElement('h4');
  title.textContent = item.title;
  overlay.appendChild(title);
  
  if (item.description) {
    const description = document.createElement('p');
    description.textContent = truncateText(item.description, 80);
    overlay.appendChild(description);
  }
  
  galleryItem.appendChild(overlay);
  
  return galleryItem;
}

function createAnnouncementItem(announcement) {
  const item = document.createElement('div');
  item.className = `announcement-item priority-${announcement.priority || 'normal'}`;
  item.dataset.announcementId = announcement.id;
  
  const header = document.createElement('div');
  header.className = 'announcement-header';
  
  const title = document.createElement('h4');
  title.className = 'announcement-title';
  title.textContent = announcement.title;
  header.appendChild(title);
  
  const date = document.createElement('span');
  date.className = 'announcement-date';
  date.textContent = formatDateShort(announcement.date);
  header.appendChild(date);
  
  item.appendChild(header);
  
  const content = document.createElement('p');
  content.className = 'announcement-content';
  content.textContent = truncateText(announcement.content, 150);
  item.appendChild(content);
  
  return item;
}

// =============================================================================
// NAVIGATION FUNCTIONS
// =============================================================================

function viewEventDetails(eventId) {
  window.location.href = `events.html?id=${eventId}`;
}

function viewProjectDetails(projectId) {
  window.location.href = `projects.html?id=${projectId}`;
}

function viewGalleryItem(galleryId) {
  window.location.href = `gallery.html?id=${galleryId}`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatDateDisplay(dateString) {
  if (!dateString) return 'Date TBA';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    return dateString;
  }
}

function formatDateShort(dateString) {
  if (!dateString) return 'TBA';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return dateString;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// FULL PAGE LOAD FUNCTIONS
// =============================================================================

async function loadAllMembers() {
  try {
    console.log('Loading all members...');
    
    if (window.apiClient && window.apiClient.isReady) {
      const result = await window.apiClient.getMembers();
      if (result.success && Array.isArray(result.data)) {
        await saveToCache('members', result.data);
        displayAllMembers(result.data);
        return true;
      }
    }
    
    const cached = await loadFromCache('members');
    if (cached && Array.isArray(cached)) {
      displayAllMembers(cached);
      return true;
    }
    
    displayAllMembers([]);
    return false;
  } catch (error) {
    console.error('Error loading all members:', error);
    displayAllMembers([]);
    return false;
  }
}

function displayAllMembers(members) {
  const container = document.getElementById('members-container');
  if (!container) return;
  
  if (members.length === 0) {
    container.innerHTML = '<p class="no-data">No members found.</p>';
    return;
  }
  
  container.innerHTML = '';
  members.forEach(member => {
    const memberCard = createMemberCard(member);
    container.appendChild(memberCard);
  });
}

async function loadAllEvents() {
  try {
    console.log('Loading all events...');
    
    if (window.apiClient && window.apiClient.isReady) {
      const result = await window.apiClient.getEvents();
      if (result.success && Array.isArray(result.data)) {
        await saveToCache('events', result.data);
        displayAllEvents(result.data);
        return true;
      }
    }
    
    const cached = await loadFromCache('events');
    if (cached && Array.isArray(cached)) {
      displayAllEvents(cached);
      return true;
    }
    
    displayAllEvents([]);
    return false;
  } catch (error) {
    console.error('Error loading all events:', error);
    displayAllEvents([]);
    return false;
  }
}

function displayAllEvents(events) {
  const container = document.getElementById('events-container');
  if (!container) return;
  
  if (events.length === 0) {
    container.innerHTML = '<p class="no-data">No events found.</p>';
    return;
  }
  
  container.innerHTML = '';
  events.forEach(event => {
    const eventCard = createEventCard(event);
    container.appendChild(eventCard);
  });
}

async function loadAllProjects() {
  try {
    console.log('Loading all projects...');
    
    if (window.apiClient && window.apiClient.isReady) {
      const result = await window.apiClient.getProjects();
      if (result.success && Array.isArray(result.data)) {
        await saveToCache('projects', result.data);
        displayAllProjects(result.data);
        return true;
      }
    }
    
    const cached = await loadFromCache('projects');
    if (cached && Array.isArray(cached)) {
      displayAllProjects(cached);
      return true;
    }
    
    displayAllProjects([]);
    return false;
  } catch (error) {
    console.error('Error loading all projects:', error);
    displayAllProjects([]);
    return false;
  }
}

function displayAllProjects(projects) {
  const container = document.getElementById('projects-container');
  if (!container) return;
  
  if (projects.length === 0) {
    container.innerHTML = '<p class="no-data">No projects found.</p>';
    return;
  }
  
  container.innerHTML = '';
  projects.forEach(project => {
    const projectCard = createProjectCard(project);
    container.appendChild(projectCard);
  });
}

async function loadAllGallery() {
  try {
    console.log('Loading all gallery...');
    
    if (window.apiClient && window.apiClient.isReady) {
      const result = await window.apiClient.getGallery();
      if (result.success && Array.isArray(result.data)) {
        await saveToCache('gallery', result.data);
        displayAllGallery(result.data);
        return true;
      }
    }
    
    const cached = await loadFromCache('gallery');
    if (cached && Array.isArray(cached)) {
      displayAllGallery(cached);
      return true;
    }
    
    displayAllGallery([]);
    return false;
  } catch (error) {
    console.error('Error loading all gallery:', error);
    displayAllGallery([]);
    return false;
  }
}

function displayAllGallery(gallery) {
  const container = document.getElementById('gallery-container');
  if (!container) return;
  
  if (gallery.length === 0) {
    container.innerHTML = '<p class="no-data">No gallery items found.</p>';
    return;
  }
  
  container.innerHTML = '';
  gallery.forEach(item => {
    const galleryItem = createGalleryItem(item);
    container.appendChild(galleryItem);
  });
}

// =============================================================================
// PAGE INITIALIZATION
// =============================================================================

async function initializePage() {
  // Prevent duplicate initialization
  if (isPageLoading) {
    console.log('⏳ Page already loading, waiting for completion...');
    return initializationPromise;
  }
  
  isPageLoading = true;
  
  // Create a promise for this initialization
  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing page...');
      
      // Always load club configuration first
      await loadClubConfiguration();
      await delay(100);
      
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      
      if (currentPage === 'index.html' || currentPage === '') {
        // Home page - load all sections
        await loadRecentEvents(3);
        await delay(100);
        
        await loadFeaturedProjects(6);
        await delay(100);
        
        await loadExecutiveMembers(4);
        await delay(100);
        
        await loadGalleryPreview(8);
        await delay(100);
        
        await loadAnnouncements(5);
      } else if (currentPage === 'events.html') {
        await loadAllEvents();
      } else if (currentPage === 'projects.html') {
        await loadAllProjects();
      } else if (currentPage === 'members.html') {
        await loadAllMembers();
      } else if (currentPage === 'gallery.html') {
        await loadAllGallery();
      }
      
      console.log('✅ Page initialized successfully');
      
    } catch (error) {
      console.error('❌ Error during page initialization:', error);
    } finally {
      isPageLoading = false;
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Wait for both DOM and API client to be ready
function waitForDependencies() {
  return new Promise((resolve) => {
    let domReady = document.readyState !== 'loading';
    let apiReady = window.apiClient && window.apiClient.isReady;
    
    if (domReady && apiReady) {
      resolve();
      return;
    }
    
    const checkReady = () => {
      domReady = document.readyState !== 'loading';
      apiReady = window.apiClient && window.apiClient.isReady;
      
      if (domReady && apiReady) {
        resolve();
      }
    };
    
    if (!domReady) {
      document.addEventListener('DOMContentLoaded', checkReady);
    }
    
    // Check API readiness every 100ms
    const apiCheckInterval = setInterval(() => {
      if (window.apiClient && window.apiClient.isReady) {
        clearInterval(apiCheckInterval);
        checkReady();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(apiCheckInterval);
      console.warn('⚠️ API client not ready after 5 seconds, initializing anyway');
      resolve();
    }, 5000);
  });
}

// Initialize when ready
waitForDependencies().then(() => {
  console.log('✅ Dependencies ready, initializing page');
  initializePage();
});

console.log('✅ load-config.js v3.0.0 loaded successfully');