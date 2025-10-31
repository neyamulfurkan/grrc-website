async function loadClubConfiguration() {
  try {
    console.log('Loading club configuration from backend...');
    
    const config = await getClubConfig();
    
    if (!config) {
      console.error('Failed to load club configuration');
      return false;
    }
    
    const logoElements = document.querySelectorAll('.club-logo');
    logoElements.forEach(el => {
      if (config.logo) {
        el.src = config.logo;
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
    if (favicon && config.logo) {
      favicon.href = config.logo;
    }
    
    console.log('Club configuration loaded successfully');
    return true;
    
  } catch (error) {
    console.error('Error loading club configuration:', error);
    return false;
  }
}

async function loadRecentEvents(limit = 3) {
  try {
    console.log('Loading recent events from backend...');
    
    const events = await getEvents({ status: 'upcoming' });
    
    const container = document.getElementById('recent-events-container');
    if (!container) return false;
    
    if (events.length === 0) {
      container.innerHTML = '<p class="no-data">No upcoming events at the moment.</p>';
      return true;
    }
    
    container.innerHTML = '';
    
    const recentEvents = events.slice(0, limit);
    
    recentEvents.forEach(event => {
      const eventCard = createEventCard(event);
      container.appendChild(eventCard);
    });
    
    console.log(`Loaded ${recentEvents.length} recent events`);
    return true;
    
  } catch (error) {
    console.error('Error loading recent events:', error);
    const container = document.getElementById('recent-events-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Failed to load events. Please try again later.</p>';
    }
    return false;
  }
}

async function loadFeaturedProjects(limit = 6) {
  try {
    console.log('Loading featured projects from backend...');
    
    const projects = await getProjects({ status: 'completed' });
    
    const container = document.getElementById('featured-projects-container');
    if (!container) return false;
    
    if (projects.length === 0) {
      container.innerHTML = '<p class="no-data">No projects to display yet.</p>';
      return true;
    }
    
    container.innerHTML = '';
    
    const featuredProjects = projects.slice(0, limit);
    
    featuredProjects.forEach(project => {
      const projectCard = createProjectCard(project);
      container.appendChild(projectCard);
    });
    
    console.log(`Loaded ${featuredProjects.length} featured projects`);
    return true;
    
  } catch (error) {
    console.error('Error loading featured projects:', error);
    const container = document.getElementById('featured-projects-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Failed to load projects. Please try again later.</p>';
    }
    return false;
  }
}

async function loadExecutiveMembers(limit = 4) {
  try {
    console.log('Loading executive members from backend...');
    
    const members = await getMembers({ role: 'Executive Member' });
    
    const container = document.getElementById('executive-members-container');
    if (!container) return false;
    
    if (members.length === 0) {
      container.innerHTML = '<p class="no-data">No executive members listed yet.</p>';
      return true;
    }
    
    container.innerHTML = '';
    
    const executiveMembers = members.slice(0, limit);
    
    executiveMembers.forEach(member => {
      const memberCard = createMemberCard(member);
      container.appendChild(memberCard);
    });
    
    console.log(`Loaded ${executiveMembers.length} executive members`);
    return true;
    
  } catch (error) {
    console.error('Error loading executive members:', error);
    const container = document.getElementById('executive-members-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Failed to load members. Please try again later.</p>';
    }
    return false;
  }
}

async function loadGalleryPreview(limit = 8) {
  try {
    console.log('Loading gallery preview from backend...');
    
    const gallery = await getGallery();
    
    const container = document.getElementById('gallery-preview-container');
    if (!container) return false;
    
    if (gallery.length === 0) {
      container.innerHTML = '<p class="no-data">No photos in gallery yet.</p>';
      return true;
    }
    
    container.innerHTML = '';
    
    const previewItems = gallery.slice(0, limit);
    
    previewItems.forEach(item => {
      const galleryItem = createGalleryItem(item);
      container.appendChild(galleryItem);
    });
    
    console.log(`Loaded ${previewItems.length} gallery items`);
    return true;
    
  } catch (error) {
    console.error('Error loading gallery preview:', error);
    const container = document.getElementById('gallery-preview-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Failed to load gallery. Please try again later.</p>';
    }
    return false;
  }
}

async function loadAnnouncements(limit = 5) {
  try {
    console.log('Loading announcements from backend...');
    
    const announcements = await getAnnouncements();
    
    const container = document.getElementById('announcements-container');
    if (!container) return false;
    
    if (announcements.length === 0) {
      container.innerHTML = '<p class="no-data">No announcements at the moment.</p>';
      return true;
    }
    
    container.innerHTML = '';
    
    const recentAnnouncements = announcements.slice(0, limit);
    
    recentAnnouncements.forEach(announcement => {
      const announcementItem = createAnnouncementItem(announcement);
      container.appendChild(announcementItem);
    });
    
    console.log(`Loaded ${recentAnnouncements.length} announcements`);
    return true;
    
  } catch (error) {
    console.error('Error loading announcements:', error);
    const container = document.getElementById('announcements-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Failed to load announcements. Please try again later.</p>';
    }
    return false;
  }
}

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

function viewEventDetails(eventId) {
  window.location.href = `events.html?id=${eventId}`;
}

function viewProjectDetails(projectId) {
  window.location.href = `projects.html?id=${projectId}`;
}

function viewGalleryItem(galleryId) {
  window.location.href = `gallery.html?id=${galleryId}`;
}

async function initializePage() {
  try {
    console.log('Initializing page...');
    
    await loadClubConfiguration();
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'index.html' || currentPage === '') {
      await Promise.all([
        loadRecentEvents(3),
        loadFeaturedProjects(6),
        loadExecutiveMembers(4),
        loadGalleryPreview(8),
        loadAnnouncements(5)
      ]);
    } else if (currentPage === 'events.html') {
      await loadAllEvents();
    } else if (currentPage === 'projects.html') {
      await loadAllProjects();
    } else if (currentPage === 'members.html') {
      await loadAllMembers();
    } else if (currentPage === 'gallery.html') {
      await loadAllGallery();
    }
    
    console.log('Page initialized successfully');
    
  } catch (error) {
    console.error('Error initializing page:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

console.log('load-config.js loaded successfully (TRUE API-FIRST loader)');