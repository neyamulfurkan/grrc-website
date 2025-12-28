const { withConnection } = require('../db/pool');

async function getClubConfig() {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM club_config LIMIT 1');
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateClubConfig(data) {
  return withConnection(async (client) => {
    const { 
      logo, logo_url, 
      club_name, name,
      club_motto, motto,
      club_description, description,
      social_links, socialLinks,
      bkash_number,
      membership_fee
    } = data;
    
    const finalLogo = logo || logo_url;
    const finalName = name || club_name || 'GSTU Robotics & Research Club';
    const finalMotto = motto || club_motto || '';
    const finalDescription = description || club_description || '';
    const finalBkash = bkash_number || '01712345678';
    const finalFee = membership_fee || 500;
    
    let finalSocialLinks = social_links || socialLinks;
    if (finalSocialLinks && typeof finalSocialLinks === 'object') {
      finalSocialLinks = JSON.stringify(finalSocialLinks);
    }
    
    const checkResult = await client.query('SELECT id FROM club_config LIMIT 1');
    
    if (checkResult.rows.length === 0) {
      const insertQuery = `
        INSERT INTO club_config (logo, club_name, club_motto, club_description, social_links, bkash_number, membership_fee)
        VALUES (COALESCE($1, 'assets/default-logo.jpg'), COALESCE($2, 'GSTU Robotics & Research Club'), COALESCE($3, ''), COALESCE($4, ''), COALESCE($5::jsonb, '[]'::jsonb), COALESCE($6, '01712345678'), COALESCE($7, 500))
        RETURNING *
      `;
      const result = await client.query(insertQuery, [finalLogo, finalName, finalMotto, finalDescription, finalSocialLinks, finalBkash, finalFee]);
      return { success: true, data: result.rows[0], error: null };
    }
    
    const updateQuery = `
      UPDATE club_config 
      SET logo = COALESCE($1, logo),
          club_name = COALESCE($2, club_name),
          club_motto = COALESCE($3, club_motto),
          club_description = COALESCE($4, club_description),
          social_links = COALESCE($5::jsonb, social_links),
          bkash_number = COALESCE($6, bkash_number),
          membership_fee = COALESCE($7, membership_fee),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM club_config LIMIT 1)
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [finalLogo, finalName, finalMotto, finalDescription, finalSocialLinks, finalBkash, finalFee]);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllMembers(filters = {}) {
  return withConnection(async (client) => {
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
    const result = await client.query(query, params);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getMemberById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM members WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function createMember(data) {
  return withConnection(async (client) => {
    const { name, photo, department, year, role, position, email, phone, bio, skills, joined_date, joinedDate } = data;
    const memberJoinedDate = joined_date || joinedDate;
    
    const query = `
      INSERT INTO members (name, photo, department, year, role, position, email, phone, bio, skills, joined_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [name, photo, department, year, role, position, email, phone, bio, JSON.stringify(skills || []), memberJoinedDate];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateMember(id, data) {
  return withConnection(async (client) => {
    const { name, photo, department, year, role, position, email, phone, bio, skills, joined_date } = data;
    const query = `
      UPDATE members 
      SET name = COALESCE($1, name), photo = COALESCE($2, photo), department = COALESCE($3, department),
          year = COALESCE($4, year), role = COALESCE($5, role), position = COALESCE($6, position),
          email = COALESCE($7, email), phone = COALESCE($8, phone), bio = COALESCE($9, bio),
          skills = COALESCE($10, skills), joined_date = COALESCE($11, joined_date)
      WHERE id = $12
      RETURNING *
    `;
    const values = [name, photo, department, year, role, position, email, phone, bio, skills ? JSON.stringify(skills) : null, joined_date, id];
    const result = await client.query(query, values);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Member not found' };
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function deleteMember(id) {
  return withConnection(async (client) => {
    const result = await client.query('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Member not found' };
    return { success: true, data: { id: result.rows[0].id }, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function searchMembers(searchQuery) {
  return withConnection(async (client) => {
    const query = `SELECT * FROM members WHERE name ILIKE $1 OR department ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC`;
    const result = await client.query(query, [`%${searchQuery}%`]);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllEvents(filters = {}) {
  return withConnection(async (client) => {
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
    const result = await client.query(query, params);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getEventById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM events WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function createEvent(data) {
  return withConnection(async (client) => {
    const { title, description, category, date, time, venue, location, image, image_url, status, registration_link, details, organizer } = data;
    const eventVenue = venue || location;
    const eventImage = image || image_url;
    
    const query = `
      INSERT INTO events (title, description, category, date, time, venue, image, status, registration_link, details, organizer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [title, description, category || 'General', date, time || null, eventVenue, eventImage, status || 'upcoming', registration_link, details, organizer];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateEvent(id, data) {
  return withConnection(async (client) => {
    const { title, description, category, date, time, venue, image, status, registration_link, details, organizer } = data;
    const query = `
      UPDATE events 
      SET title = COALESCE($1, title), description = COALESCE($2, description), category = COALESCE($3, category),
          date = COALESCE($4, date), time = COALESCE($5, time), venue = COALESCE($6, venue),
          image = COALESCE($7, image), status = COALESCE($8, status), registration_link = COALESCE($9, registration_link),
          details = COALESCE($10, details), organizer = COALESCE($11, organizer)
      WHERE id = $12
      RETURNING *
    `;
    const values = [title, description, category, date, time, venue, image, status, registration_link, details, organizer, id];
    const result = await client.query(query, values);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Event not found' };
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function deleteEvent(id) {
  return withConnection(async (client) => {
    const result = await client.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Event not found' };
    return { success: true, data: { id: result.rows[0].id }, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function searchEvents(searchQuery) {
  return withConnection(async (client) => {
    const query = `SELECT * FROM events WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY date DESC`;
    const result = await client.query(query, [`%${searchQuery}%`]);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllProjects(filters = {}) {
  return withConnection(async (client) => {
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
    const result = await client.query(query, params);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getProjectById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function createProject(data) {
  return withConnection(async (client) => {
    const { title, description, category, status, image, image_url, technologies, team_members, github_link, github_url, live_link, demo_url, completion_date, features, achievements } = data;
    
    const query = `
      INSERT INTO projects (title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date, features, achievements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [title, description, category || 'Other', status || 'ongoing', image_url || image, technologies || [], team_members || [], github_link || github_url, live_link || demo_url, completion_date, features, achievements];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateProject(id, data) {
  return withConnection(async (client) => {
    const { title, description, category, status, image, image_url, technologies, team_members, github_link, github_url, live_link, demo_url, completion_date, features, achievements } = data;
    
    const query = `
      UPDATE projects 
      SET title = COALESCE($1, title), description = COALESCE($2, description), category = COALESCE($3, category),
          status = COALESCE($4, status), image = COALESCE($5, image), technologies = COALESCE($6, technologies),
          team_members = COALESCE($7, team_members), github_link = COALESCE($8, github_link),
          live_link = COALESCE($9, live_link), completion_date = COALESCE($10, completion_date),
          features = COALESCE($11, features), achievements = COALESCE($12, achievements)
      WHERE id = $13
      RETURNING *
    `;
    const values = [title, description, category, status, image_url || image, technologies || [], team_members || [], github_link || github_url, live_link || demo_url, completion_date, features, achievements, id];
    const result = await client.query(query, values);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Project not found' };
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function deleteProject(id) {
  return withConnection(async (client) => {
    const result = await client.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Project not found' };
    return { success: true, data: { id: result.rows[0].id }, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function searchProjects(searchQuery) {
  return withConnection(async (client) => {
    const query = `SELECT * FROM projects WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC`;
    const result = await client.query(query, [`%${searchQuery}%`]);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllGalleryItems(filters = {}) {
  return withConnection(async (client) => {
    let query = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';
    const result = await client.query(query, params);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getGalleryItemById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM gallery WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function createGalleryItem(data) {
  return withConnection(async (client) => {
    const { image, title, description, category, date, photographer, show_on_homepage } = data;
    const query = `
      INSERT INTO gallery (image, title, description, category, date, photographer, show_on_homepage)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [image, title, description, category, date, photographer, show_on_homepage || false];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateGalleryItem(id, data) {
  return withConnection(async (client) => {
    const { image, title, description, category, date, photographer, show_on_homepage } = data;
    const query = `
      UPDATE gallery 
      SET image = COALESCE($1, image), title = COALESCE($2, title), description = COALESCE($3, description),
          category = COALESCE($4, category), date = COALESCE($5, date), photographer = COALESCE($6, photographer),
          show_on_homepage = COALESCE($7, show_on_homepage)
      WHERE id = $8
      RETURNING *
    `;
    const values = [image, title, description, category, date, photographer, show_on_homepage, id];
    const result = await client.query(query, values);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Gallery item not found' };
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function deleteGalleryItem(id) {
  return withConnection(async (client) => {
    const result = await client.query('DELETE FROM gallery WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Gallery item not found' };
    return { success: true, data: { id: result.rows[0].id }, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllAnnouncements(filters = {}) {
  return withConnection(async (client) => {
    let query = 'SELECT * FROM announcements WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.priority) {
      query += ` AND priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';
    const result = await client.query(query, params);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAnnouncementById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM announcements WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function createAnnouncement(data) {
  return withConnection(async (client) => {
    const { title, content, priority, date } = data;
    const announcementDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      INSERT INTO announcements (title, content, priority, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [title, content, priority || 'normal', announcementDate];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateAnnouncement(id, data) {
  return withConnection(async (client) => {
    const { title, content, priority, date } = data;
    const query = `
      UPDATE announcements 
      SET title = COALESCE($1, title), content = COALESCE($2, content),
          priority = COALESCE($3, priority), date = COALESCE($4, date)
      WHERE id = $5
      RETURNING *
    `;
    const values = [title, content, priority, date, id];
    const result = await client.query(query, values);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Announcement not found' };
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function deleteAnnouncement(id) {
  return withConnection(async (client) => {
    const result = await client.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Announcement not found' };
    return { success: true, data: { id: result.rows[0].id }, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function createAlumni(alumniData) {
  return withConnection(async (client) => {
    const { name, photo, batch_year, department, role_in_club, achievements, current_position, current_company, bio, email, phone, linkedin, github, facebook, is_featured = false, display_order = 0 } = alumniData;

    const query = `
      INSERT INTO alumni (name, photo, batch_year, department, role_in_club, achievements, current_position, current_company, bio, email, phone, linkedin, github, facebook, is_featured, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const values = [name, photo || '', batch_year, department, role_in_club || null, achievements || null, current_position || null, current_company || null, bio, email, phone, linkedin || null, github || null, facebook || null, is_featured, display_order];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllAlumni(filters = {}) {
  return withConnection(async (client) => {
    let query = 'SELECT * FROM alumni WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.batch_year) {
      query += ` AND batch_year = $${paramIndex}`;
      params.push(filters.batch_year);
      paramIndex++;
    }
    if (filters.is_featured !== undefined) {
      query += ` AND is_featured = $${paramIndex}`;
      params.push(filters.is_featured);
      paramIndex++;
    }

    query += ' ORDER BY is_featured DESC, batch_year DESC, display_order ASC, name ASC';
    const result = await client.query(query, params);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAlumniById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT * FROM alumni WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function updateAlumni(id, updates) {
  return withConnection(async (client) => {
    const { id: _, created_at, updated_at, ...validUpdates } = updates;
    const fields = Object.keys(validUpdates);
    
    if (fields.length === 0) {
      return { success: false, data: null, error: 'No valid fields to update' };
    }

    const values = Object.values(validUpdates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    const query = `UPDATE alumni SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`;
    values.push(id);
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) return { success: false, data: null, error: 'Alumni not found' };
    return { success: true, data: result.rows[0], error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function deleteAlumni(id) {
  return withConnection(async (client) => {
    const result = await client.query('DELETE FROM alumni WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return { success: false, data: null, error: 'Alumni not found' };
    return { success: true, data: { id: result.rows[0].id }, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getFeaturedAlumni(limit = 6) {
  return withConnection(async (client) => {
    const query = `SELECT * FROM alumni WHERE is_featured = true ORDER BY display_order ASC, name ASC LIMIT $1`;
    const result = await client.query(query, [limit]);
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAlumniBatches() {
  return withConnection(async (client) => {
    const query = `SELECT DISTINCT batch_year FROM alumni WHERE batch_year IS NOT NULL ORDER BY batch_year DESC`;
    const result = await client.query(query);
    return { success: true, data: result.rows.map(row => row.batch_year), error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAlumniStatistics() {
  return withConnection(async (client) => {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT batch_year) as total_batches,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_count
      FROM alumni
    `;
    const result = await client.query(query);
    const stats = result.rows[0];
    return {
      success: true,
      data: {
        total: parseInt(stats.total, 10),
        total_batches: parseInt(stats.total_batches, 10),
        featured_count: parseInt(stats.featured_count, 10)
      },
      error: null
    };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAllAdmins() {
  return withConnection(async (client) => {
    const result = await client.query('SELECT id, username, role, created_at, last_login FROM admins ORDER BY created_at DESC');
    return { success: true, data: result.rows, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAdminById(id) {
  return withConnection(async (client) => {
    const result = await client.query('SELECT id, username, role, is_super_admin, permissions, is_active, password_hash, created_at, last_login FROM admins WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  }).catch(error => ({ success: false, data: null, error: error.message }));
}

async function getAdminByUsername(username) {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT id, username, email, password_hash, role, is_super_admin, COALESCE(permissions, '{}'::jsonb) as permissions, is_active, created_at, last_login
      FROM admins WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    if (result.rows.length === 0) return { success: false, error: 'Admin not found' };
    return { success: true, data: result.rows[0] };
  }).catch(error => ({ success: false, error: error.message }));
}

async function createAdmin(data) {
  return withConnection(async (client) => {
    const { username, password_hash, role } = data;
    const query = `INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at`;
    const values = [username, password_hash, role || 'Admin'];
    const result = await client.query(query, values);
    return { success: true, data: result.rows[0], error: null };
}).catch(error => ({ success: false, data: null, error: error.message }));
}
async function updateAdmin(id, data) {
return withConnection(async (client) => {
const { username, password_hash, role } = data;
const query = `
      UPDATE admins 
      SET username = COALESCE($1, username), password_hash = COALESCE($2, password_hash), role = COALESCE($3, role)
      WHERE id = $4
      RETURNING id, username, role, created_at, last_login
    `;
const values = [username, password_hash, role, id];
const result = await client.query(query, values);
if (result.rows.length === 0) return { success: false, data: null, error: 'Admin not found' };
return { success: true, data: result.rows[0], error: null };
}).catch(error => ({ success: false, data: null, error: error.message }));
}
async function deleteAdmin(id) {
return withConnection(async (client) => {
const checkResult = await client.query('SELECT id FROM admins WHERE id = $1', [id]);
if (checkResult.rows.length === 0) return { success: false, data: null, error: 'Admin not found' };
const result = await client.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
return { success: true, data: { id: result.rows[0].id }, error: null };
}).catch(error => ({ success: false, data: null, error: error.message }));
}
async function updateLastLogin(id) {
return withConnection(async (client) => {
const query = 'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, last_login';
const result = await client.query(query, [id]);
return { success: true, data: result.rows[0], error: null };
}).catch(error => ({ success: false, data: null, error: error.message }));
}
async function getStatistics() {
return withConnection(async (client) => {
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
const result = await client.query(query);
return { success: true, data: result.rows[0], error: null };
}).catch(error => ({ success: false, data: null, error: error.message }));
}
async function getAllMemberEmails() {
return withConnection(async (client) => {
const query = `SELECT email FROM members WHERE email IS NOT NULL AND email != '' ORDER BY email ASC`;
const result = await client.query(query);
return result.rows.map(row => row.email);
}).catch(error => {
throw new Error(`Failed to fetch member emails: ${error.message}`);
});
}
module.exports = {
getClubConfig, updateClubConfig, getAllMembers, getMemberById, createMember, updateMember, deleteMember, searchMembers,
getAllEvents, getEventById, createEvent, updateEvent, deleteEvent, searchEvents,
getAllProjects, getProjectById, createProject, updateProject, deleteProject, searchProjects,
getAllGalleryItems, getGalleryItemById, createGalleryItem, updateGalleryItem, deleteGalleryItem,
getAllAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement,
createAlumni, getAllAlumni, getAlumniById, updateAlumni, deleteAlumni, getFeaturedAlumni, getAlumniBatches, getAlumniStatistics,
getAllAdmins, getAdminById, getAdminByUsername, createAdmin, updateAdmin, deleteAdmin, updateLastLogin, getStatistics, getAllMemberEmails
};