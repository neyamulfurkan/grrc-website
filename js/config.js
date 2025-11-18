// ====================================
// CLOUDINARY UPLOAD HELPER
// ====================================
const CLOUDINARY_CONFIG = {
  cloudName: 'dotluykrf',
  uploadPreset: 'grrc_gallery_upload',
  folder: 'grrc-gallery'
};

async function uploadToCloudinary(file) {
  try {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please select an image.');
    }

    console.log(`📤 Uploading to Cloudinary: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder);
    formData.append('tags', 'gallery,grrc');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();
    
    console.log(`✅ Cloudinary upload successful: ${data.secure_url}`);
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      size: data.bytes,
      format: data.format
    };
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ====================================
// END CLOUDINARY HELPER
// ====================================

// ====================================
// CLOUDINARY UPLOAD HELPER
// ====================================
const CLOUDINARY_CONFIG = {
  cloudName: 'dotluykrf',
  uploadPreset: 'grrc_gallery_upload',
  folder: 'grrc-gallery'
};

async function uploadToCloudinary(file) {
  try {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please select an image.');
    }

    console.log(`📤 Uploading to Cloudinary: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder);
    formData.append('tags', 'gallery,grrc');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();
    
    console.log(`✅ Cloudinary upload successful: ${data.secure_url}`);
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      size: data.bytes,
      format: data.format
    };
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ====================================
// END CLOUDINARY HELPER
// ====================================

// Global flag to prevent duplicate page initialization
let isPageLoading = false;

// FIXED: Cache-first approach with graceful fallback
async function loadClubConfiguration() {
  try {
    console.log('Loading club configuration...');
    
    // Check if API client exists
    if (!window.apiClient || !window.apiClient.isReady) {
      console.warn('API client not ready, using cached data');
      const cached = await loadFromCache('clubConfig');
      if (cached) {
        updateClubConfigDOM(cached);
      }
      return cached !== null;
    }
    
    // Try to get from cache first
    const cached = await loadFromCache('clubConfig');
    if (cached) {
      console.log('Using cached club configuration');
      updateClubConfigDOM(cached);
      return true;
    }
    
    // Cache miss - try API call
    const result = await getClubConfig();
    
    if (result.success && result.data) {
      // Save to cache
      await saveToCache('clubConfig', result.data);
      updateClubConfigDOM(result.data);
      console.log('Club configuration loaded from API and cached');
      return true;
    }
    
    console.error('Failed to load club configuration');
    return false;
    
  } catch (error) {
    console.warn('Error loading club configuration, using cache:', error);
    const cached = await loadFromCache('clubConfig');
    if (cached) {
      updateClubConfigDOM(cached);
      return true;
    }
    return false;
  }
}

// Helper function to update DOM with club config
function updateClubConfigDOM(config) {
  if (!config) return;
  
  const logoElements = document.querySelectorAll('.club-logo');
  logoElements.forEach(el => {
    const logoValue = config.logo || config.logo_url;
    if (logoValue) {
      el.src = logoValue;
      el.alt = config.shortName || 'Club Logo';
    }
  });
  
  const clubNameElements = document.querySelectorAll('.club-name');
  clubNameElements.forEach(el => {
    el.textContent = config.name || 'Robotics Club';
  });
  
  const clubShortNameElements = document.querySelectorAll('.club-short-name');
  clubShortNameElements.forEach(el => {
    el.textContent = config.shortName || 'RC';
  });
  
  const clubMottoElements = document.querySelectorAll('.club-motto');
  clubMottoElements.forEach(el => {
    el.textContent = config.motto || '';
  });
  
  const universityNameElements = document.querySelectorAll('.university-name');
  universityNameElements.forEach(el => {
    el.textContent = config.university || '';
  });
  
  const clubDescriptionElements = document.querySelectorAll('.club-description');
  clubDescriptionElements.forEach(el => {
    el.textContent = config.description || '';
  });
  
  const clubEmailElements = document.querySelectorAll('.club-email');
  clubEmailElements.forEach(el => {
    if (el.tagName === 'A') {
      el.href = `mailto:${config.email || ''}`;
      el.textContent = config.email || '';
    } else {
      el.textContent = config.email || '';
    }
  });
  
  const clubPhoneElements = document.querySelectorAll('.club-phone');
  clubPhoneElements.forEach(el => {
    if (el.tagName === 'A') {
      el.href = `tel:${config.phone || ''}`;
      el.textContent = config.phone || '';
    } else {
      el.textContent = config.phone || '';
    }
  });
  
  const clubAddressElements = document.querySelectorAll('.club-address');
  clubAddressElements.forEach(el => {
    el.textContent = config.address || '';
  });
  
  const clubFoundedYearElements = document.querySelectorAll('.club-founded-year');
  clubFoundedYearElements.forEach(el => {
    el.textContent = config.foundedYear || '';
  });
  
  if (config.socialLinks && Array.isArray(config.socialLinks) && config.socialLinks.length > 0) {
    const socialContainer = document.querySelector('.social-links-container');
    if (socialContainer) {
      socialContainer.innerHTML = '';
      
      config.socialLinks.forEach(link => {
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
  
  document.title = `${config.shortName || 'Club'} - ${config.name || 'Robotics Club'}`;
  
  const favicon = document.querySelector('link[rel="icon"]');
  const logoValue = config.logo || config.logo_url;
  if (favicon && logoValue) {
    favicon.href = logoValue;
  }
}

// FIXED: Cache-first with error boundaries
async function loadRecentEvents(limit = 3) {
  try {
    console.log('Loading recent events...');
    
    // Try cache first
    const cached = await loadFromCache('events');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached events');
      displayRecentEvents(cached, limit);
      return true;
    }
    
    // Cache miss - try API if available
    if (!window.apiClient) {
      console.warn('API client not available');
      displayEmptyEvents();
      return false;
    }
    
    const result = await window.apiClient.getEvents();
    
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('events', result.data);
      displayRecentEvents(result.data, limit);
      console.log('Events loaded from API and cached');
      return true;
    }
    
    displayEmptyEvents();
    return false;
    
  } catch (error) {
    console.warn('Error loading events, showing empty state:', error);
    displayEmptyEvents();
    return false;
  }
}

function displayRecentEvents(events, limit) {
  const container = document.getElementById('recent-events-container');
  if (!container) return;
  
  const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'Upcoming');
  
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
  
  console.log(`Displayed ${recentEvents.length} recent events`);
}

function displayEmptyEvents() {
  const container = document.getElementById('recent-events-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No upcoming events at the moment.</p>';
  }
}

// FIXED: Cache-first with error boundaries
async function loadFeaturedProjects(limit = 6) {
  try {
    console.log('Loading featured projects...');
    
    // Try cache first
    const cached = await loadFromCache('projects');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached projects');
      displayFeaturedProjects(cached, limit);
      return true;
    }
    
    // Cache miss - try API if available
    if (!window.apiClient) {
      console.warn('API client not available');
      displayEmptyProjects();
      return false;
    }
    
    const result = await window.apiClient.getProjects();
    
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('projects', result.data);
      displayFeaturedProjects(result.data, limit);
      console.log('Projects loaded from API and cached');
      return true;
    }
    
    displayEmptyProjects();
    return false;
    
  } catch (error) {
    console.warn('Error loading projects, showing empty state:', error);
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
  
  console.log(`Displayed ${featuredProjects.length} featured projects`);
}

function displayEmptyProjects() {
  const container = document.getElementById('featured-projects-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No projects to display yet.</p>';
  }
}

// FIXED: Cache-first with error boundaries
async function loadExecutiveMembers(limit = 4) {
  try {
    console.log('Loading executive members...');
    
    // Try cache first
    const cached = await loadFromCache('members');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached members');
      displayExecutiveMembers(cached, limit);
      return true;
    }
    
    // Cache miss - try API if available
    if (!window.apiClient) {
      console.warn('API client not available');
      displayEmptyMembers();
      return false;
    }
    
    const result = await window.apiClient.getMembers();
    
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('members', result.data);
      displayExecutiveMembers(result.data, limit);
      console.log('Members loaded from API and cached');
      return true;
    }
    
    displayEmptyMembers();
    return false;
    
  } catch (error) {
    console.warn('Error loading members, showing empty state:', error);
    displayEmptyMembers();
    return false;
  }
}

function displayExecutiveMembers(members, limit) {
  const container = document.getElementById('executive-members-container');
  if (!container) return;
  
  const executiveMembers = members.filter(m => m.role === 'Executive Member' || m.role === 'Executive');
  
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
  
  console.log(`Displayed ${displayMembers.length} executive members`);
}

function displayEmptyMembers() {
  const container = document.getElementById('executive-members-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No executive members listed yet.</p>';
  }
}

// FIXED: Cache-first with error boundaries
async function loadGalleryPreview(limit = 8) {
  try {
    console.log('Loading gallery preview...');
    
    // Try cache first
    const cached = await loadFromCache('gallery');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached gallery');
      displayGalleryPreview(cached, limit);
      return true;
    }
    
    // Cache miss - try API if available
    if (!window.apiClient) {
      console.warn('API client not available');
      displayEmptyGallery();
      return false;
    }
    
    const result = await window.apiClient.getGalleryItems();
    
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('gallery', result.data);
      displayGalleryPreview(result.data, limit);
      console.log('Gallery loaded from API and cached');
      return true;
    }
    
    displayEmptyGallery();
    return false;
    
  } catch (error) {
    console.warn('Error loading gallery, showing empty state:', error);
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
  
  console.log(`Displayed ${previewItems.length} gallery items`);
}

function displayEmptyGallery() {
  const container = document.getElementById('gallery-preview-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No photos in gallery yet.</p>';
  }
}

// FIXED: Cache-first with error boundaries
async function loadAnnouncements(limit = 5) {
  try {
    console.log('Loading announcements...');
    
    // Try cache first
    const cached = await loadFromCache('announcements');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached announcements');
      displayAnnouncements(cached, limit);
      return true;
    }
    
    // Cache miss - try API if available
    if (!window.apiClient) {
      console.warn('API client not available');
      displayEmptyAnnouncements();
      return false;
    }
    
    const result = await window.apiClient.getAnnouncements();
    
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('announcements', result.data);
      displayAnnouncements(result.data, limit);
      console.log('Announcements loaded from API and cached');
      return true;
    }
    
    displayEmptyAnnouncements();
    return false;
    
  } catch (error) {
    console.warn('Error loading announcements, showing empty state:', error);
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
  
  console.log(`Displayed ${recentAnnouncements.length} announcements`);
}

function displayEmptyAnnouncements() {
  const container = document.getElementById('announcements-container');
  if (container) {
    container.innerHTML = '<p class="no-data">No announcements at the moment.</p>';
  }
}

// Cache helper functions using localStorage
async function loadFromCache(key) {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn(`Error loading ${key} from cache:`, error);
    return null;
  }
}

async function saveToCache(key, data) {
  try {
    // Skip caching for gallery to avoid quota issues with Base64 images
    if (key === 'gallery' || key.includes('gallery')) {
      console.log('⏭️ Skipping gallery cache (using Cloudinary URLs instead)');
      return true;
    }
    
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to cache:`, error);
    
    // If quota exceeded, clear old caches
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ LocalStorage quota exceeded, clearing old caches...');
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('cache_')) {
          localStorage.removeItem(k);
        }
      });
    }
    
    return false;
  }
}

// Card creation functions (unchanged)
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.dataset.eventId = event.id;
  
  if (event.image) {
    const img = document.createElement('img');
    img.src = event.image;
    img.alt = event.title;
    img.className = 'event-image';
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

// Navigation functions (unchanged)
function viewEventDetails(eventId) {
  window.location.href = `events.html?id=${eventId}`;
}

function viewProjectDetails(projectId) {
  window.location.href = `projects.html?id=${projectId}`;
}

function viewGalleryItem(galleryId) {
  window.location.href = `gallery.html?id=${galleryId}`;
}

// Helper function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// FIXED: Sequential loading with delays and error boundaries
async function initializePage() {
  // Prevent duplicate initialization
  if (isPageLoading) {
    console.log('Page already loading, skipping duplicate call');
    return;
  }
  
  isPageLoading = true;
  
  try {
    console.log('Initializing page...');
    
    // Step 1: Load club configuration first
    try {
      await loadClubConfiguration();
    } catch (error) {
      console.error('Error loading club configuration:', error);
    }
    
    await delay(100);
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'index.html' || currentPage === '') {
      // Step 2: Load recent events
      try {
        await loadRecentEvents(3);
      } catch (error) {
        console.error('Error loading events:', error);
      }
      
      await delay(100);
      
      // Step 3: Load featured projects
      try {
        await loadFeaturedProjects(6);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
      
      await delay(100);
      
      // Step 4: Load executive members
      try {
        await loadExecutiveMembers(4);
      } catch (error) {
        console.error('Error loading members:', error);
      }
      
      await delay(100);
      
      // Step 5: Load gallery preview
      try {
        await loadGalleryPreview(8);
      } catch (error) {
        console.error('Error loading gallery:', error);
      }
      
      await delay(100);
      
      // Step 6: Load announcements
      try {
        await loadAnnouncements(5);
      } catch (error) {
        console.error('Error loading announcements:', error);
      }
    } else if (currentPage === 'events.html') {
      try {
        await loadAllEvents();
      } catch (error) {
        console.error('Error loading all events:', error);
      }
    } else if (currentPage === 'projects.html') {
      try {
        await loadAllProjects();
      } catch (error) {
        console.error('Error loading all projects:', error);
      }
    } else if (currentPage === 'members.html') {
      try {
        await loadAllMembers();
      } catch (error) {
        console.error('Error loading all members:', error);
      }
    } else if (currentPage === 'gallery.html') {
      try {
        await loadAllGallery();
      } catch (error) {
        console.error('Error loading all gallery:', error);
      }
    }
    
    console.log('Page initialized successfully');
    
  } catch (error) {
    console.error('Error during page initialization:', error);
  } finally {
    isPageLoading = false;
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

// Full page load functions for individual pages
async function loadAllMembers() {
  try {
    console.log('Loading all members...');
    const cached = await loadFromCache('members');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached members');
      displayAllMembers(cached);
      return true;
    }
    
    if (!window.apiClient) {
      console.warn('API client not available');
      displayAllMembers([]);
      return false;
    }
    
    const result = await window.apiClient.getMembers();
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('members', result.data);
      displayAllMembers(result.data);
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
    const cached = await loadFromCache('events');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached events');
      displayAllEvents(cached);
      return true;
    }
    
    if (!window.apiClient) {
      console.warn('API client not available');
      displayAllEvents([]);
      return false;
    }
    
    const result = await window.apiClient.getEvents();
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('events', result.data);
      displayAllEvents(result.data);
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
    const cached = await loadFromCache('projects');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached projects');
      displayAllProjects(cached);
      return true;
    }
    
    if (!window.apiClient) {
      console.warn('API client not available');
      displayAllProjects([]);
      return false;
    }
    
    const result = await window.apiClient.getProjects();
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('projects', result.data);
      displayAllProjects(result.data);
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
    const cached = await loadFromCache('gallery');
    if (cached && Array.isArray(cached)) {
      console.log('Using cached gallery');
      displayAllGallery(cached);
      return true;
    }
    
    if (!window.apiClient) {
      console.warn('API client not available');
      displayAllGallery([]);
      return false;
    }
    
    const result = await window.apiClient.getGallery();
    if (result.success && Array.isArray(result.data)) {
      await saveToCache('gallery', result.data);
      displayAllGallery(result.data);
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
console.log('✅ config.js loaded successfully (CACHE-FIRST with error boundaries)');