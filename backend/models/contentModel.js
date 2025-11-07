const pool = require('../db/pool');

async function getClubConfig() {
  try {
    const result = await pool.query('SELECT * FROM club_config LIMIT 1');
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getClubConfig:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function updateClubConfig(data) {
  try {
    console.log('&#128269; updateClubConfig received data:', JSON.stringify(data, null, 2));
    
    const { logo, club_name, club_motto, club_description, social_links, logo_url } = data;
    
    const finalLogo = logo_url || logo;
    
    let finalSocialLinks = social_links;
    if (social_links && typeof social_links === 'object') {
      finalSocialLinks = JSON.stringify(social_links);
      console.log('🔄 Converted social_links to JSON string:', finalSocialLinks);
    }
    
    const checkResult = await pool.query('SELECT id FROM club_config LIMIT 1');
    
    if (checkResult.rows.length === 0) {
      console.log('➕ No config found, inserting new row...');
      const insertQuery = `
        INSERT INTO club_config (logo, club_name, club_motto, club_description, social_links)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
      `;
      const insertValues = [
        finalLogo || 'assets/default-logo.jpg',
        club_name || 'GSTU Robotics Club',
        club_motto || '',
        club_description || '',
        finalSocialLinks || '[]'
      ];
      
      console.log('📤 Insert values:', insertValues);
      const result = await pool.query(insertQuery, insertValues);
      console.log('✅ Club config inserted:', result.rows[0]);
      return { success: true, data: result.rows[0], error: null };
    }
    
    console.log('✏️ Updating existing config...');
    const updateQuery = `
      UPDATE club_config 
      SET logo = COALESCE($1, logo),
          club_name = COALESCE($2, club_name),
          club_motto = COALESCE($3, club_motto),
          club_description = COALESCE($4, club_description),
          social_links = COALESCE($5::jsonb, social_links),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM club_config LIMIT 1)
      RETURNING *
    `;
    
    const values = [
      finalLogo, 
      club_name, 
      club_motto, 
      club_description, 
      finalSocialLinks
    ];
    
    console.log('📤 Update values:', values);
    const result = await pool.query(updateQuery, values);
    
    console.log('✅ Club config updated successfully:', result.rows[0]);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in updateClubConfig:', error.message);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
      receivedData: data
    });
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in getAllMembers:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getMemberById(id) {
  try {
    const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getMemberById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function createMember(data) {
  try {
    const { 
      name, photo, department, year, role, position, 
      email, phone, bio, skills, 
      joined_date, joinedDate 
    } = data;
    
    const memberJoinedDate = joined_date || joinedDate;
    
    const query = `
      INSERT INTO members (name, photo, department, year, role, position, email, phone, bio, skills, joined_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      name, photo, department, year, role, position, 
      email, phone, bio, 
      JSON.stringify(skills || []), 
      memberJoinedDate
    ];
    
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in createMember:', {
      error: error.message,
      data: data
    });
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in updateMember:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function deleteMember(id) {
  try {
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Member not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteMember:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in searchMembers:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in getAllEvents:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getEventById(id) {
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getEventById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function createEvent(data) {
  try {
    const { 
      title, description, category, date, time, 
      venue, location,
      image, image_url,
      status, registration_link, details, organizer 
    } = data;
    
    const eventVenue = venue || location;
    const eventImage = image || image_url;
    
    const query = `
      INSERT INTO events (title, description, category, date, time, venue, image, status, registration_link, details, organizer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      title, 
      description, 
      category || 'General',
      date, 
      time || null,
      eventVenue,
      eventImage, 
      status || 'upcoming', 
      registration_link, 
      details, 
      organizer
    ];
    
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in createEvent:', {
      error: error.message,
      data: data
    });
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in updateEvent:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function deleteEvent(id) {
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Event not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteEvent:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in searchEvents:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in getAllProjects:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getProjectById(id) {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getProjectById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function createProject(data) {
  try {
    const { 
      title, description, category, status, 
      image, image_url,
      technologies, team_members, 
      github_link, github_url,
      live_link, demo_url,
      completion_date, features, achievements 
    } = data;
    
    const query = `
      INSERT INTO projects (title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date, features, achievements)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      title,
      description,
      category || 'Other',
      status || 'ongoing',
      image_url || image,
      technologies || [],
      team_members || [],
      github_link || github_url,
      live_link || demo_url,
      completion_date,
      features,
      achievements
    ];
    
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in createProject:', {
      error: error.message,
      data: data
    });
    return { success: false, data: null, error: error.message };
  }
}

async function updateProject(id, data) {
  try {
    const { 
      title, description, category, status, 
      image, image_url,
      technologies, team_members, 
      github_link, github_url,
      live_link, demo_url,
      completion_date, features, achievements 
    } = data;
    
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
      image_url || image,
      technologies || [],
      team_members || [],
      github_link || github_url,
      live_link || demo_url,
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
    console.error('❌ Error in updateProject:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function deleteProject(id) {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Project not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteProject:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in searchProjects:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in getAllGalleryItems:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getGalleryItemById(id) {
  try {
    const result = await pool.query('SELECT * FROM gallery WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getGalleryItemById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in createGalleryItem:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in updateGalleryItem:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function deleteGalleryItem(id) {
  try {
    const result = await pool.query('DELETE FROM gallery WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Gallery item not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteGalleryItem:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in getAllAnnouncements:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getAnnouncementById(id) {
  try {
    const result = await pool.query('SELECT * FROM announcements WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getAnnouncementById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function createAnnouncement(data) {
  try {
    const { title, content, priority, date } = data;
    
    const announcementDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      INSERT INTO announcements (title, content, priority, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      title, 
      content, 
      priority || 'normal', 
      announcementDate
    ];
    
    const result = await pool.query(query, values);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in createAnnouncement:', {
      error: error.message,
      data: data
    });
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in updateAnnouncement:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function deleteAnnouncement(id) {
  try {
    const result = await pool.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Announcement not found' };
    }
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteAnnouncement:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

// ============================================
// ALUMNI FUNCTIONS (ADDED - THIS WAS MISSING!)
// ============================================

/**
 * Create a new alumni record
 * This function is called when an alumni application is approved
 */
async function createAlumni(alumniData) {
  try {
    console.log('&#128269; createAlumni called with data:', alumniData);
    
    const {
      name,
      photo,
      batch_year,
      department,
      role_in_club,
      achievements,
      current_position,
      current_company,
      bio,
      email,
      phone,
      linkedin,
      github,
      facebook,
      is_featured = false,
      display_order = 0
    } = alumniData;

    const query = `
      INSERT INTO alumni (
        name, photo, batch_year, department, role_in_club, achievements,
        current_position, current_company, bio, email, phone, linkedin,
        github, facebook, is_featured, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      name,
      photo || '',
      batch_year,
      department,
      role_in_club || null,
      achievements || null,
      current_position || null,
      current_company || null,
      bio,
      email,
      phone,
      linkedin || null,
      github || null,
      facebook || null,
      is_featured,
      display_order
    ];

    console.log('📤 Executing alumni insert query');
    const result = await pool.query(query, values);
    
    console.log('✅ Alumni created successfully:', result.rows[0]);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in createAlumni:', error.message);
    console.error('📋 Error details:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get all alumni with optional filtering
 */
async function getAllAlumni(filters = {}) {
  try {
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

    const result = await pool.query(query, params);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('❌ Error in getAllAlumni:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get alumni by ID
 */
async function getAlumniById(id) {
  try {
    const result = await pool.query('SELECT * FROM alumni WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getAlumniById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Update an alumni record
 */
async function updateAlumni(id, updates) {
  try {
    const { id: _, created_at, updated_at, ...validUpdates } = updates;

    const fields = Object.keys(validUpdates);
    
    if (fields.length === 0) {
      return { success: false, data: null, error: 'No valid fields to update' };
    }

    const values = Object.values(validUpdates);
    const setClause = fields.map((field, i) => `${field} = ${i + 1}`).join(', ');
    
    const query = `
      UPDATE alumni 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${fields.length + 1} 
      RETURNING *
    `;

    values.push(id);
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Alumni not found' };
    }
    
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in updateAlumni:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Delete an alumni record
 */
async function deleteAlumni(id) {
  try {
    const result = await pool.query('DELETE FROM alumni WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return { success: false, data: null, error: 'Alumni not found' };
    }
    
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteAlumni:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get featured alumni
 */
async function getFeaturedAlumni(limit = 6) {
  try {
    const query = `
      SELECT * FROM alumni 
      WHERE is_featured = true 
      ORDER BY display_order ASC, name ASC 
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('❌ Error in getFeaturedAlumni:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get list of unique batch years
 */
async function getAlumniBatches() {
  try {
    const query = `
      SELECT DISTINCT batch_year 
      FROM alumni 
      WHERE batch_year IS NOT NULL
      ORDER BY batch_year DESC
    `;
    
    const result = await pool.query(query);
    return { success: true, data: result.rows.map(row => row.batch_year), error: null };
  } catch (error) {
    console.error('❌ Error in getAlumniBatches:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get alumni statistics
 */
async function getAlumniStatistics() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT batch_year) as total_batches,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_count
      FROM alumni
    `;
    
    const result = await pool.query(query);
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
  } catch (error) {
    console.error('❌ Error in getAlumniStatistics:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

async function getAllAdmins() {
  try {
    const result = await pool.query('SELECT id, username, role, created_at, last_login FROM admins ORDER BY created_at DESC');
    return { success: true, data: result.rows, error: null };
  } catch (error) {
    console.error('❌ Error in getAllAdmins:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getAdminById(id) {
  try {
    const result = await pool.query('SELECT id, username, role, created_at, last_login FROM admins WHERE id = $1', [id]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getAdminById:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function getAdminByUsername(username) {
  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    return { success: true, data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('❌ Error in getAdminByUsername:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in createAdmin:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in updateAdmin:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function deleteAdmin(id) {
  try {
    const checkResult = await pool.query('SELECT id FROM admins WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return { success: false, data: null, error: 'Admin not found' };
    }
    
    const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
    
    console.log(`✅ Admin deleted: ID ${id}`);
    return { success: true, data: { id: result.rows[0].id }, error: null };
  } catch (error) {
    console.error('❌ Error in deleteAdmin:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

async function updateLastLogin(id) {
  try {
    const query = 'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, last_login';
    const result = await pool.query(query, [id]);
    return { success: true, data: result.rows[0], error: null };
  } catch (error) {
    console.error('❌ Error in updateLastLogin:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

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
    console.error('❌ Error in getStatistics:', error.message);
    return { success: false, data: null, error: error.message };
  }
}

module.exports = {
  getClubConfig,
  updateClubConfig,
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  searchProjects,
  getAllGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  // Alumni functions (ADDED - CRITICAL FIX!)
  createAlumni,
  getAllAlumni,
  getAlumniById,
  updateAlumni,
  deleteAlumni,
  getFeaturedAlumni,
  getAlumniBatches,
  getAlumniStatistics,
  // Admin functions
  getAllAdmins,
  getAdminById,
  getAdminByUsername,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateLastLogin,
  getStatistics,
};