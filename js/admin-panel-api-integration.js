/**
 * Admin Panel API Integration
 * =============================
 * This file handles ALL data operations for the admin panel
 * API-FIRST: All saves go to backend first, then cache locally
 * 
 * CRITICAL FIX: Replaces the localStorage-only functions in admin-panel.html
 * 
 * Include this AFTER api-client.js and storage.js in admin-panel.html:
 * <script src="js/admin-panel-api-integration.js"></script>
 */

// ========================================
// MEMBER OPERATIONS
// ========================================

/**
 * Save member (create or update)
 * API-FIRST: Saves to backend, then updates localStorage cache
 */
async function saveMember() {
    try {
        // Get form data
        const photoFile = document.getElementById('memberPhoto').files[0];
        const photoUrl = document.getElementById('memberPhotoUrl').value;
        let photo = photoUrl;

        if (photoFile) {
            photo = await imageToBase64(photoFile);
        }

        const email = document.getElementById('memberEmail').value;
        if (!validateEmail(email)) {
            showToast('Invalid email format', 'error');
            return;
        }

        const phone = document.getElementById('memberPhone').value;
        if (phone && !validatePhone(phone)) {
            showToast('Invalid phone format (use +880XXXXXXXXXX or 01XXXXXXXXX)', 'error');
            return;
        }

        // Prepare member data
        const memberData = {
            name: document.getElementById('memberName').value,
            photo: photo,
            department: document.getElementById('memberDepartment').value,
            year: document.getElementById('memberYear').value,
            role: document.getElementById('memberRole').value,
            email: email,
            phone: phone,
            bio: document.getElementById('memberBio').value,
            skills: memberSkills,
            joined_date: document.getElementById('memberJoinedDate').value
        };

        // Include ID if editing (for approval workflow)
        if (window.currentEditMemberId) {
            memberData.id = window.currentEditMemberId;
        }

        let result;
        
        // Check if editing or creating
        if (currentEditMemberId) {
            // Update existing member - API FIRST
            result = await window.apiClient.updateMember(currentEditMemberId, memberData);
        } else {
            // Create new member - API FIRST
            result = await window.apiClient.createMember(memberData);
        }

        // Check API result
        if (!result.success) {
            showToast(result.error || 'Failed to save member', 'error');
            return;
        }

        // Update localStorage cache after successful API call
        let members = JSON.parse(localStorage.getItem('members')) || [];
        
        if (currentEditMemberId) {
            const index = members.findIndex(m => m.id === currentEditMemberId);
            if (index !== -1) {
                members[index] = { id: currentEditMemberId, ...memberData };
            }
        } else {
            members.push({ id: result.data.id, ...memberData });
        }
        
        localStorage.setItem('members', JSON.stringify(members));

        // Show success message
        showToast(currentEditMemberId ? 'Member updated successfully!' : 'Member added successfully!', 'success');
        
        // Reset form and reload table
        resetMemberForm();
        await loadMembers();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error saving member:', error);
        showToast(error.message || 'Error saving member', 'error');
    }
}

/**
 * Load members from API
 */
async function loadMembers(searchTerm = '') {
    try {
        // Load from API
        const result = await window.apiClient.getMembers();
        
        if (!result.success) {
            console.warn('API failed, loading from cache');
            loadMembersFromCache(searchTerm);
            return;
        }

        let members = result.data || [];
        
        // Cache the data
        localStorage.setItem('members', JSON.stringify(members));
        
        // Apply search filter
        if (searchTerm) {
            members = members.filter(m => 
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        renderMembersTable(members);
        
    } catch (error) {
        console.error('Error loading members:', error);
        loadMembersFromCache(searchTerm);
    }
}

function loadMembersFromCache(searchTerm = '') {
    let members = JSON.parse(localStorage.getItem('members')) || [];
    
    if (searchTerm) {
        members = members.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderMembersTable(members);
}

function renderMembersTable(members) {
    const tbody = document.getElementById('membersTableBody');
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: var(--space-xl);">No members found</td></tr>';
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr>
            <td style="font-weight: 600;">${member.name}</td>
            <td>${member.department}</td>
            <td>${member.year}</td>
            <td><span class="badge ${member.role === 'Executive Member' ? 'badge-success' : 'badge-info'}">${member.role}</span></td>
            <td>${member.email}</td>
            <td class="action-buttons">
                <button class="btn btn-icon btn-edit" onclick="editMember('${member.id}')">✏️</button>
                <button class="btn btn-icon btn-delete" onclick="deleteMemberConfirm('${member.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Delete member with confirmation
 */
async function deleteMemberConfirm(id) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    try {
        const result = await window.apiClient.deleteMember(id);
        
        if (!result.success) {
            showToast(result.error || 'Failed to delete member', 'error');
            return;
        }

        // Update cache
        let members = JSON.parse(localStorage.getItem('members')) || [];
        members = members.filter(m => m.id !== id);
        localStorage.setItem('members', JSON.stringify(members));

        showToast('Member deleted successfully', 'success');
        await loadMembers();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting member:', error);
        showToast('Error deleting member', 'error');
    }
}

// ========================================
// EVENT OPERATIONS
// ========================================

async function saveEvent() {
    try {
        const imageFile = document.getElementById('eventImage').files[0];
        const imageUrl = document.getElementById('eventImageUrl').value;
        let image = imageUrl;

        if (imageFile) {
            image = await imageToBase64(imageFile);
        }

        const eventData = {
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            category: document.getElementById('eventCategory').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            venue: document.getElementById('eventVenue').value,
            image: image,
            status: document.getElementById('eventStatus').value,
            registration_link: document.getElementById('eventRegistrationLink').value
        };

        // Include ID if editing (for approval workflow)
        if (window.currentEditEventId) {
            eventData.id = window.currentEditEventId;
        }

        let result;
        
        if (currentEditEventId) {
            result = await window.apiClient.updateEvent(currentEditEventId, eventData);
        } else {
            result = await window.apiClient.createEvent(eventData);
        }

        if (!result.success) {
            showToast(result.error || 'Failed to save event', 'error');
            return;
        }

        // Update cache
        let events = JSON.parse(localStorage.getItem('events')) || [];
        
        if (currentEditEventId) {
            const index = events.findIndex(e => e.id === currentEditEventId);
            if (index !== -1) {
                events[index] = { id: currentEditEventId, ...eventData };
            }
        } else {
            events.push({ id: result.data.id, ...eventData });
        }
        
        localStorage.setItem('events', JSON.stringify(events));

        showToast(currentEditEventId ? 'Event updated successfully!' : 'Event added successfully!', 'success');
        resetEventForm();
        await loadEvents();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Error saving event', 'error');
    }
}

async function loadEvents(searchTerm = '') {
    try {
        const result = await window.apiClient.getEvents();
        
        if (!result.success) {
            loadEventsFromCache(searchTerm);
            return;
        }

        let events = result.data || [];
        localStorage.setItem('events', JSON.stringify(events));
        
        if (searchTerm) {
            events = events.filter(e => 
                e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.venue.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        renderEventsTable(events);
        
    } catch (error) {
        console.error('Error loading events:', error);
        loadEventsFromCache(searchTerm);
    }
}

function loadEventsFromCache(searchTerm = '') {
    let events = JSON.parse(localStorage.getItem('events')) || [];
    
    if (searchTerm) {
        events = events.filter(e => 
            e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.venue.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderEventsTable(events);
}

function renderEventsTable(events) {
    const tbody = document.getElementById('eventsTableBody');
    
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: var(--space-xl);">No events found</td></tr>';
        return;
    }

    tbody.innerHTML = events.map(event => `
        <tr>
            <td style="font-weight: 600;">${event.title}</td>
            <td>${formatDate(event.date)}</td>
            <td>${event.venue}</td>
            <td><span class="badge ${getStatusBadgeClass(event.status)}">${event.status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-icon btn-edit" onclick="editEvent('${event.id}')">✏️</button>
                <button class="btn btn-icon btn-delete" onclick="deleteEventConfirm('${event.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function deleteEventConfirm(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        const result = await window.apiClient.deleteEvent(id);
        
        if (!result.success) {
            showToast(result.error || 'Failed to delete event', 'error');
            return;
        }

        let events = JSON.parse(localStorage.getItem('events')) || [];
        events = events.filter(e => e.id !== id);
        localStorage.setItem('events', JSON.stringify(events));

        showToast('Event deleted successfully', 'success');
        await loadEvents();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Error deleting event', 'error');
    }
}

// ========================================
// PROJECT OPERATIONS
// ========================================

async function saveProject() {
    try {
        const imageFile = document.getElementById('projectImage').files[0];
        const imageUrl = document.getElementById('projectImageUrl').value;
        let image = imageUrl;

        if (imageFile) {
            image = await imageToBase64(imageFile);
        }

        const teamMembersText = document.getElementById('projectTeamMembers').value;
        const teamMembers = teamMembersText.split('\n').filter(m => m.trim()).map(m => m.trim());

        const projectData = {
            title: document.getElementById('projectTitle').value,
            description: document.getElementById('projectDescription').value,
            category: document.getElementById('projectCategory').value,
            status: document.getElementById('projectStatus').value,
            image: image,
            technologies: projectTechnologies,
            team_members: teamMembers,
            github_link: document.getElementById('projectGithubLink').value,
            live_link: document.getElementById('projectLiveLink').value,
            completion_date: document.getElementById('projectCompletionDate').value
        };

        // Include ID if editing (for approval workflow)
        if (window.currentEditProjectId) {
            projectData.id = window.currentEditProjectId;
        }

        let result;
        
        if (currentEditProjectId) {
            result = await window.apiClient.updateProject(currentEditProjectId, projectData);
        } else {
            result = await window.apiClient.createProject(projectData);
        }

        if (!result.success) {
            showToast(result.error || 'Failed to save project', 'error');
            return;
        }

        let projects = JSON.parse(localStorage.getItem('projects')) || [];
        
        if (currentEditProjectId) {
            const index = projects.findIndex(p => p.id === currentEditProjectId);
            if (index !== -1) {
                projects[index] = { id: currentEditProjectId, ...projectData };
            }
        } else {
            projects.push({ id: result.data.id, ...projectData });
        }
        
        localStorage.setItem('projects', JSON.stringify(projects));

        showToast(currentEditProjectId ? 'Project updated successfully!' : 'Project added successfully!', 'success');
        resetProjectForm();
        await loadProjects();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error saving project:', error);
        showToast('Error saving project', 'error');
    }
}

async function loadProjects(searchTerm = '') {
    try {
        const result = await window.apiClient.getProjects();
        
        if (!result.success) {
            loadProjectsFromCache(searchTerm);
            return;
        }

        let projects = result.data || [];
        localStorage.setItem('projects', JSON.stringify(projects));
        
        if (searchTerm) {
            projects = projects.filter(p => 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        renderProjectsTable(projects);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        loadProjectsFromCache(searchTerm);
    }
}

function loadProjectsFromCache(searchTerm = '') {
    let projects = JSON.parse(localStorage.getItem('projects')) || [];
    
    if (searchTerm) {
        projects = projects.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderProjectsTable(projects);
}

function renderProjectsTable(projects) {
    const tbody = document.getElementById('projectsTableBody');
    
    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: var(--space-xl);">No projects found</td></tr>';
        return;
    }

    tbody.innerHTML = projects.map(project => `
        <tr>
            <td style="font-weight: 600;">${project.title}</td>
            <td>${project.category}</td>
            <td><span class="badge ${getStatusBadgeClass(project.status)}">${project.status}</span></td>
            <td>${(project.technologies || []).slice(0, 3).join(', ')}${(project.technologies || []).length > 3 ? '...' : ''}</td>
            <td class="action-buttons">
                <button class="btn btn-icon btn-edit" onclick="editProject('${project.id}')">✏️</button>
                <button class="btn btn-icon btn-delete" onclick="deleteProjectConfirm('${project.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function deleteProjectConfirm(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        const result = await window.apiClient.deleteProject(id);
        
        if (!result.success) {
            showToast(result.error || 'Failed to delete project', 'error');
            return;
        }

        let projects = JSON.parse(localStorage.getItem('projects')) || [];
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));

        showToast('Project deleted successfully', 'success');
        await loadProjects();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Error deleting project', 'error');
    }
}

// ========================================
// GALLERY OPERATIONS
// ========================================

async function saveGalleryItem() {
    try {
        const imageFile = document.getElementById('galleryImage').files[0];
        const imageUrl = document.getElementById('galleryImageUrl').value;
        let image = imageUrl;

        if (imageFile) {
            image = await imageToBase64(imageFile);
        }

        if (!image) {
            showToast('Image is required', 'error');
            return;
        }

        const galleryData = {
            image: image,
            title: document.getElementById('galleryTitle').value,
            description: document.getElementById('galleryDescription').value,
            category: document.getElementById('galleryCategory').value,
            date: document.getElementById('galleryDate').value,
            photographer: document.getElementById('galleryPhotographer').value
        };

        // Include ID if editing (for approval workflow)
        if (window.currentEditGalleryId) {
            galleryData.id = window.currentEditGalleryId;
        }

        const result = await window.apiClient.createGalleryItem(galleryData);

        if (!result.success) {
            showToast(result.error || 'Failed to save gallery item', 'error');
            return;
        }

        let gallery = JSON.parse(localStorage.getItem('gallery')) || [];
        gallery.push({ id: result.data.id, ...galleryData });
        localStorage.setItem('gallery', JSON.stringify(gallery));

        showToast('Gallery item added successfully!', 'success');
        resetGalleryForm();
        await loadGallery();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error saving gallery item:', error);
        showToast('Error saving gallery item', 'error');
    }
}

async function loadGallery(searchTerm = '') {
    try {
        const result = await window.apiClient.getGallery();
        
        if (!result.success) {
            loadGalleryFromCache(searchTerm);
            return;
        }

        let gallery = result.data || [];
        localStorage.setItem('gallery', JSON.stringify(gallery));
        
        if (searchTerm) {
            gallery = gallery.filter(g => 
                g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        renderGalleryTable(gallery);
        
    } catch (error) {
        console.error('Error loading gallery:', error);
        loadGalleryFromCache(searchTerm);
    }
}

function loadGalleryFromCache(searchTerm = '') {
    let gallery = JSON.parse(localStorage.getItem('gallery')) || [];
    
    if (searchTerm) {
        gallery = gallery.filter(g => 
            g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderGalleryTable(gallery);
}

function renderGalleryTable(gallery) {
    const tbody = document.getElementById('galleryTableBody');
    
    if (gallery.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: var(--space-xl);">No gallery items found</td></tr>';
        return;
    }

    tbody.innerHTML = gallery.map(item => `
        <tr>
            <td><img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"></td>
            <td style="font-weight: 600;">${item.title}</td>
            <td><span class="badge badge-info">${item.category}</span></td>
            <td>${formatDate(item.date)}</td>
            <td class="action-buttons">
                <button class="btn btn-icon btn-delete" onclick="deleteGalleryItemConfirm('${item.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function deleteGalleryItemConfirm(id) {
    if (!confirm('Are you sure you want to delete this gallery item?')) return;
    
    try {
        const result = await window.apiClient.deleteGalleryItem(id);
        
        if (!result.success) {
            showToast(result.error || 'Failed to delete gallery item', 'error');
            return;
        }

        let gallery = JSON.parse(localStorage.getItem('gallery')) || [];
        gallery = gallery.filter(g => g.id !== id);
        localStorage.setItem('gallery', JSON.stringify(gallery));

        showToast('Gallery item deleted successfully', 'success');
        await loadGallery();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        showToast('Error deleting gallery item', 'error');
    }
}

// ========================================
// ANNOUNCEMENT OPERATIONS
// ========================================

async function saveAnnouncement() {
    try {
        const announcementData = {
            title: document.getElementById('announcementTitle').value,
            content: document.getElementById('announcementContent').value,
            priority: document.getElementById('announcementPriority').value,
            date: new Date().toISOString()
        };

        // Include ID if editing (for approval workflow)
        if (window.currentEditAnnouncementId) {
            announcementData.id = window.currentEditAnnouncementId;
        }

        let result;
        
        if (currentEditAnnouncementId) {
            result = await window.apiClient.updateAnnouncement(currentEditAnnouncementId, announcementData);
        } else {
            result = await window.apiClient.createAnnouncement(announcementData);
        }

        if (!result.success) {
            showToast(result.error || 'Failed to save announcement', 'error');
            return;
        }

        let announcements = JSON.parse(localStorage.getItem('announcements')) || [];
        
        if (currentEditAnnouncementId) {
            const index = announcements.findIndex(a => a.id === currentEditAnnouncementId);
            if (index !== -1) {
                announcements[index] = { id: currentEditAnnouncementId, ...announcementData };
            }
        } else {
            announcements.push({ id: result.data.id, ...announcementData });
        }
        
        localStorage.setItem('announcements', JSON.stringify(announcements));

        showToast(currentEditAnnouncementId ? 'Announcement updated!' : 'Announcement added!', 'success');
        resetAnnouncementForm();
        await loadAnnouncements();
        
    } catch (error) {
        console.error('Error saving announcement:', error);
        showToast('Error saving announcement', 'error');
    }
}

async function loadAnnouncements() {
    try {
        const result = await window.apiClient.getAnnouncements();
        
        if (!result.success) {
            loadAnnouncementsFromCache();
            return;
        }

        const announcements = result.data || [];
        localStorage.setItem('announcements', JSON.stringify(announcements));
        renderAnnouncementsTable(announcements);
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        loadAnnouncementsFromCache();
    }
}

function loadAnnouncementsFromCache() {
    const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
    renderAnnouncementsTable(announcements);
}

function renderAnnouncementsTable(announcements) {
    const tbody = document.getElementById('announcementsTableBody');
    
    if (announcements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: var(--space-xl);">No announcements yet</td></tr>';
        return;
    }

    tbody.innerHTML = announcements.map(announcement => `
        <tr>
            <td style="font-weight: 600;">${announcement.title}</td>
            <td><span class="badge ${announcement.priority === 'high' ? 'badge-warning' : 'badge-info'}">${announcement.priority}</span></td>
            <td>${formatDate(announcement.date)}</td>
            <td class="action-buttons">
                <button class="btn btn-icon btn-edit" onclick="editAnnouncement('${announcement.id}')">✏️</button>
                <button class="btn btn-icon btn-delete" onclick="deleteAnnouncementConfirm('${announcement.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function deleteAnnouncementConfirm(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
        const result = await window.apiClient.deleteAnnouncement(id);
        
        if (!result.success) {
            showToast(result.error || 'Failed to delete announcement', 'error');
            return;
        }

        let announcements = JSON.parse(localStorage.getItem('announcements')) || [];
        announcements = announcements.filter(a => a.id !== id);
        localStorage.setItem('announcements', JSON.stringify(announcements));

        showToast('Announcement deleted successfully', 'success');
        await loadAnnouncements();
        
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showToast('Error deleting announcement', 'error');
    }
}

// ========================================
// CLUB CONFIG OPERATIONS
// ========================================

async function saveClubConfig(event) {
    event.preventDefault();
    
    try {
        const logoFile = document.getElementById('logoInput').files[0];
        const logoUrl = document.getElementById('logoUrl').value;
        let logo = logoUrl;

        if (logoFile) {
            logo = await imageToBase64(logoFile);
        }

        const configData = {
            logo: logo,
            name: document.getElementById('clubName').value,
            motto: document.getElementById('clubMotto').value,
            description: document.getElementById('clubDescription').value,
            social_links: []
        };

        // Collect social links
        const socials = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'github', 'email'];
        socials.forEach(platform => {
            const value = document.getElementById(`social${platform.charAt(0).toUpperCase() + platform.slice(1)}`).value;
            if (value) {
                configData.social_links.push({ platform, url: value });
            }
        });

        const result = await window.apiClient.updateConfig(configData);

        if (!result.success) {
            showToast(result.error || 'Failed to save club configuration', 'error');
            return;
        }

        localStorage.setItem('clubConfig', JSON.stringify(configData));
        showToast('Club configuration saved successfully!', 'success');
        loadClubConfigToSidebar();
        
    } catch (error) {
        console.error('Error saving config:', error);
        showToast('Error saving configuration', 'error');
    }
}

console.log('✅ Admin Panel API Integration loaded (API-FIRST mode)');