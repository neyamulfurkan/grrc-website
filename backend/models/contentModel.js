/**
 * ====================================
 * Content Model - Database Operations
 * ====================================
 * Purpose: All database query functions for CRUD operations
 * Uses parameterized queries to prevent SQL injection
 * Returns consistent format: { success, data, error }
 * ====================================
 */

const pool = require('../db/pool');

// ====================================
// CLUB CONFIGURATION
// ====================================

/**
 * Get club configuration
 * @returns {Promise<Object>} { success, data, error }
 */
async function getClubConfig() {
  try {
    const result = await pool.query('SELECT * FROM club_config LIMIT 1');
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getClubConfig:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update club configuration
 * @param {Object} data - Configuration data to update
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateClubConfig(data) {
  try {
    const { logo, name, motto, description, social_links } = data;
    const query = `
      UPDATE club_config 
      SET logo = COALESCE($1, logo),
          name = COALESCE($2, name),
          motto = COALESCE($3, motto),
          description = COALESCE($4, description),
          social_links = COALESCE($5, social_links),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `;
    const values = [logo, name, motto, description, JSON.stringify(social_links)];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateClubConfig:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// MEMBERS
// ====================================

/**
 * Get all members with optional filters
 * @param {Object} filters - { role, department, year }
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAllMembers(filters = {}) {
  try {
    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.role) {
      query += ` AND role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters.department) {
      query += ` AND department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    if (filters.year) {
      query += ` AND year = $${paramIndex}`;
      params.push(filters.year);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in getAllMembers:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get member by ID
 * @param {number} id - Member ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function getMemberById(id) {
  try {
    const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getMemberById:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create new member
 * @param {Object} data - Member data
 * @returns {Promise<Object>} { success, data, error }
 */
async function createMember(data) {
  try {
    const { name, photo, department, year, role, position, email, phone, bio, skills, joined_date } = data;
    const query = `
      INSERT INTO members (name, photo, department, year, role, position, email, phone, bio, skills, joined_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [name, photo, department, year, role, position, email, phone, bio, JSON.stringify(skills || []), joined_date];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in createMember:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update member
 * @param {number} id - Member ID
 * @param {Object} data - Updated member data
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateMember(id, data) {
  try {
    const { name, photo, department, year, role, position, email, phone, bio, skills, joined_date } = data;
    const query = `
      UPDATE members 
      SET name = COALESCE($1, name),
          photo = COALESCE($2, photo),
          department = COALESCE($3, department),
          year = COALESCE($4, year),
          role = COALESCE($5, role),
          position = COALESCE($6, position),
          email = COALESCE($7, email),
          phone = COALESCE($8, phone),
          bio = COALESCE($9, bio),
          skills = COALESCE($10, skills),
          joined_date = COALESCE($11, joined_date)
      WHERE id = $12
      RETURNING *
    `;
    const values = [name, photo, department, year, role, position, email, phone, bio, skills ? JSON.stringify(skills) : null, joined_date, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Member not found' };
    }
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateMember:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete member
 * @param {number} id - Member ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function deleteMember(id) {
  try {
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Member not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('Error in deleteMember:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Search members by name, department, or email
 * @param {string} query - Search query
 * @returns {Promise<Object>} { success, data, error }
 */
async function searchMembers(searchQuery) {
  try {
    const query = `
      SELECT * FROM members 
      WHERE name ILIKE $1 OR department ILIKE $1 OR email ILIKE $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [`%${searchQuery}%`]);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in searchMembers:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// EVENTS
// ====================================

/**
 * Get all events with optional filters
 * @param {Object} filters - { status, category }
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAllEvents(filters = {}) {
  try {
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await pool.query(query, params);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in getAllEvents:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get event by ID
 * @param {number} id - Event ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function getEventById(id) {
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getEventById:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create new event
 * @param {Object} data - Event data
 * @returns {Promise<Object>} { success, data, error }
 */
async function createEvent(data) {
  try {
    const { title, description, category, date, time, venue, image, status, registration_link, details, organizer } = data;
    const query = `
      INSERT INTO events (title, description, category, date, time, venue, image, status, registration_link, details, organizer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [title, description, category, date, time, venue, image, status || 'upcoming', registration_link, details, organizer];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in createEvent:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update event
 * @param {number} id - Event ID
 * @param {Object} data - Updated event data
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateEvent(id, data) {
  try {
    const { title, description, category, date, time, venue, image, status, registration_link, details, organizer } = data;
    const query = `
      UPDATE events 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          date = COALESCE($4, date),
          time = COALESCE($5, time),
          venue = COALESCE($6, venue),
          image = COALESCE($7, image),
          status = COALESCE($8, status),
          registration_link = COALESCE($9, registration_link),
          details = COALESCE($10, details),
          organizer = COALESCE($11, organizer)
      WHERE id = $12
      RETURNING *
    `;
    const values = [title, description, category, date, time, venue, image, status, registration_link, details, organizer, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Event not found' };
    }
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateEvent:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete event
 * @param {number} id - Event ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function deleteEvent(id) {
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Event not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('Error in deleteEvent:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Search events by title or description
 * @param {string} query - Search query
 * @returns {Promise<Object>} { success, data, error }
 */
async function searchEvents(searchQuery) {
  try {
    const query = `
      SELECT * FROM events 
      WHERE title ILIKE $1 OR description ILIKE $1
      ORDER BY date DESC
    `;
    const result = await pool.query(query, [`%${searchQuery}%`]);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in searchEvents:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// PROJECTS
// ====================================

/**
 * Get all projects with optional filters
 * @param {Object} filters - { status, category }
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAllProjects(filters = {}) {
  try {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in getAllProjects:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get project by ID
 * @param {number} id - Project ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function getProjectById(id) {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getProjectById:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create new project
 * @param {Object} data - Project data
 * @returns {Promise<Object>} { success, data, error }
 */
async function createProject(data) {
  try {
    const { title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date, features, achievements } = data;
    const query = `
      INSERT INTO projects (title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date, features, achievements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      title,
      description,
      category,
      status || 'ongoing',
      image,
      JSON.stringify(technologies || []),
      JSON.stringify(team_members || []),
      github_link,
      live_link,
      completion_date,
      features,
      achievements
    ];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in createProject:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update project
 * @param {number} id - Project ID
 * @param {Object} data - Updated project data
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateProject(id, data) {
  try {
    const { title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date, features, achievements } = data;
    const query = `
      UPDATE projects 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          status = COALESCE($4, status),
          image = COALESCE($5, image),
          technologies = COALESCE($6, technologies),
          team_members = COALESCE($7, team_members),
          github_link = COALESCE($8, github_link),
          live_link = COALESCE($9, live_link),
          completion_date = COALESCE($10, completion_date),
          features = COALESCE($11, features),
          achievements = COALESCE($12, achievements)
      WHERE id = $13
      RETURNING *
    `;
    const values = [
      title,
      description,
      category,
      status,
      image,
      technologies ? JSON.stringify(technologies) : null,
      team_members ? JSON.stringify(team_members) : null,
      github_link,
      live_link,
      completion_date,
      features,
      achievements,
      id
    ];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Project not found' };
    }
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateProject:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete project
 * @param {number} id - Project ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function deleteProject(id) {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Project not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('Error in deleteProject:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Search projects by title or description
 * @param {string} query - Search query
 * @returns {Promise<Object>} { success, data, error }
 */
async function searchProjects(searchQuery) {
  try {
    const query = `
      SELECT * FROM projects 
      WHERE title ILIKE $1 OR description ILIKE $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [`%${searchQuery}%`]);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in searchProjects:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// GALLERY
// ====================================

/**
 * Get all gallery items with optional filters
 * @param {Object} filters - { category }
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAllGalleryItems(filters = {}) {
  try {
    let query = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await pool.query(query, params);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in getAllGalleryItems:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get gallery item by ID
 * @param {number} id - Gallery item ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function getGalleryItemById(id) {
  try {
    const result = await pool.query('SELECT * FROM gallery WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getGalleryItemById:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create new gallery item
 * @param {Object} data - Gallery item data
 * @returns {Promise<Object>} { success, data, error }
 */
async function createGalleryItem(data) {
  try {
    const { image, title, description, category, date, photographer } = data;
    const query = `
      INSERT INTO gallery (image, title, description, category, date, photographer)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [image, title, description, category, date, photographer];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in createGalleryItem:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update gallery item
 * @param {number} id - Gallery item ID
 * @param {Object} data - Updated gallery item data
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateGalleryItem(id, data) {
  try {
    const { image, title, description, category, date, photographer } = data;
    const query = `
      UPDATE gallery 
      SET image = COALESCE($1, image),
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          date = COALESCE($5, date),
          photographer = COALESCE($6, photographer)
      WHERE id = $7
      RETURNING *
    `;
    const values = [image, title, description, category, date, photographer, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Gallery item not found' };
    }
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateGalleryItem:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete gallery item
 * @param {number} id - Gallery item ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function deleteGalleryItem(id) {
  try {
    const result = await pool.query('DELETE FROM gallery WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Gallery item not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('Error in deleteGalleryItem:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// ANNOUNCEMENTS
// ====================================

/**
 * Get all announcements
 * @param {Object} filters - { priority }
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAllAnnouncements(filters = {}) {
  try {
    let query = 'SELECT * FROM announcements WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.priority) {
      query += ` AND priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await pool.query(query, params);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in getAllAnnouncements:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get announcement by ID
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAnnouncementById(id) {
  try {
    const result = await pool.query('SELECT * FROM announcements WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getAnnouncementById:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create new announcement
 * @param {Object} data - Announcement data
 * @returns {Promise<Object>} { success, data, error }
 */
async function createAnnouncement(data) {
  try {
    const { title, content, priority, date } = data;
    const query = `
      INSERT INTO announcements (title, content, priority, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [title, content, priority || 'normal', date];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update announcement
 * @param {number} id - Announcement ID
 * @param {Object} data - Updated announcement data
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateAnnouncement(id, data) {
  try {
    const { title, content, priority, date } = data;
    const query = `
      UPDATE announcements 
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          priority = COALESCE($3, priority),
          date = COALESCE($4, date)
      WHERE id = $5
      RETURNING *
    `;
    const values = [title, content, priority, date, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Announcement not found' };
    }
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateAnnouncement:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete announcement
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function deleteAnnouncement(id) {
  try {
    const result = await pool.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Announcement not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('Error in deleteAnnouncement:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// ADMINS
// ====================================

/**
 * Get all admins (without passwords)
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAllAdmins() {
  try {
    const result = await pool.query('SELECT id, username, role, created_at, last_login FROM admins ORDER BY created_at DESC');
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('Error in getAllAdmins:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get admin by ID (without password)
 * @param {number} id - Admin ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAdminById(id) {
  try {
    const result = await pool.query('SELECT id, username, role, created_at, last_login FROM admins WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getAdminById:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get admin by username (includes password for authentication)
 * @param {string} username - Admin username
 * @returns {Promise<Object>} { success, data, error }
 */
async function getAdminByUsername(username) {
  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Error in getAdminByUsername:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Create new admin
 * @param {Object} data - Admin data (password should be already hashed)
 * @returns {Promise<Object>} { success, data, error }
 */
async function createAdmin(data) {
  try {
    const { username, password_hash, role } = data;
    const query = `
      INSERT INTO admins (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, created_at
    `;
    const values = [username, password_hash, role || 'Admin'];
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in createAdmin:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update admin
 * @param {number} id - Admin ID
 * @param {Object} data - Updated admin data
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateAdmin(id, data) {
  try {
    const { username, password_hash, role } = data;
    const query = `
      UPDATE admins 
      SET username = COALESCE($1, username),
          password_hash = COALESCE($2, password_hash),
          role = COALESCE($3, role)
      WHERE id = $4
      RETURNING id, username, role, created_at, last_login
    `;
    const values = [username, password_hash, role, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Admin not found' };
    }
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateAdmin:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete admin
 * @param {number} id - Admin ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function deleteAdmin(id) {
  try {
    const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Admin not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('Error in deleteAdmin:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update admin last login timestamp
 * @param {number} id - Admin ID
 * @returns {Promise<Object>} { success, data, error }
 */
async function updateLastLogin(id) {
  try {
    const query = 'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, last_login';
    const result = await pool.query(query, [id]);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in updateLastLogin:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// STATISTICS
// ====================================

/**
 * Get statistics for dashboard
 * @returns {Promise<Object>} { success, data, error }
 */
async function getStatistics() {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM members WHERE role = 'Executive Member') as executive_members,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM events WHERE status = 'upcoming') as upcoming_events,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'ongoing') as ongoing_projects,
        (SELECT COUNT(*) FROM gallery) as total_gallery_items,
        (SELECT COUNT(*) FROM announcements) as total_announcements
    `;
    const result = await pool.query(query);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('Error in getStatistics:', error);
    return { success: false, data: null, error: error.message };
  }
}

// ====================================
// EXPORTS
// ====================================

module.exports = {
  // Club Config
  getClubConfig,
  updateClubConfig,
  
  // Members
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  
  // Events
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
  
  // Projects
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  searchProjects,
  
  // Gallery
  getAllGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  
  // Announcements
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  
  // Admins
  getAllAdmins,
  getAdminById,
  getAdminByUsername,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateLastLogin,
  
  // Statistics
  getStatistics,
};