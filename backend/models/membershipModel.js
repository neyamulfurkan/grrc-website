const pool = require('../db/pool');

/**
 * Creates a new membership application
 * @param {Object} applicationData - The application data
 * @returns {Promise<Object>} The created application with id, full_name, email, status, and applied_date
 */
const createApplication = async (applicationData) => {
  const {
    full_name,
    email,
    phone,
    student_id,
    department,
    year,
    bio,
    skills,
    previous_experience,
    github_profile,
    linkedin_profile,
    photo,
    payment_screenshot,
    transaction_id
  } = applicationData;

  try {
    console.log('🔍 Creating application for:', email);
    console.log('📝 Application data:', {
      full_name,
      email,
      phone,
      department,
      year,
      skills_count: Array.isArray(skills) ? skills.length : 0
    });

    // ✅ CRITICAL: Validate required fields
    if (!full_name || !email || !phone || !department || !year || !bio) {
      throw new Error('Missing required fields: full_name, email, phone, department, year, or bio');
    }

    if (!Array.isArray(skills) || skills.length < 2) {
      throw new Error('Skills must be an array with at least 2 items');
    }

    // ✅ CRITICAL: Properly handle skills - ensure it's a valid JSON string
    let skillsJson;
    try {
      skillsJson = JSON.stringify(skills);
      console.log('✅ Skills serialized:', skillsJson);
    } catch (jsonError) {
      console.error('❌ Failed to serialize skills:', jsonError);
      throw new Error('Invalid skills format');
    }

    // ✅ CRITICAL: Check if pool is configured
    if (!pool || typeof pool.query !== 'function') {
      console.error('❌ Database pool not configured!');
      throw new Error('Database connection not available');
    }

    const query = `
      INSERT INTO membership_applications (
        full_name, email, phone, student_id, department, year, 
        bio, skills, previous_experience, github_profile, linkedin_profile,
        photo, payment_screenshot, transaction_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14)
      RETURNING id, full_name, email, status, applied_date
    `;

    const values = [
      full_name,
      email,
      phone,
      student_id || null,
      department,
      year,
      bio,
      skillsJson,  // ✅ Now properly stringified
      previous_experience || null,
      github_profile || null,
      linkedin_profile || null,
      applicationData.photo || null,
      applicationData.payment_screenshot || null,
      applicationData.transaction_id || null
    ];

    console.log('📤 Executing query with values:', values);

    const result = await pool.query(query, values);
    
    console.log('✅ Application created successfully:', result.rows[0]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in createApplication:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });

    // Handle duplicate email error
    if (error.code === '23505') {
      throw new Error('Email already used for an application');
    }

    // Handle invalid JSON error
    if (error.message.includes('invalid input syntax for type json')) {
      throw new Error('Invalid data format for skills');
    }

    // Handle table not found
    if (error.code === '42P01') {
      throw new Error('Database table "membership_applications" does not exist. Please run database migrations.');
    }

    // Re-throw the error with more context
    throw new Error(`Failed to create application: ${error.message}`);
  }
};

/**
 * Fetches all membership applications, optionally filtered by status
 * @param {string|null} status - Filter by status: 'pending', 'approved', 'rejected', or null for all
 * @returns {Promise<Array>} Array of application objects with admin username
 */
const getAllApplications = async (status = null) => {
  try {
    console.log('🔍 Fetching applications with status:', status || 'all');

    const query = `
      SELECT 
        ma.*,
        a.username as reviewer_username
      FROM membership_applications ma
      LEFT JOIN admins a ON ma.reviewed_by = a.id
      WHERE $1 IS NULL OR ma.status = $1
      ORDER BY ma.applied_date DESC
    `;

    const result = await pool.query(query, [status]);

    console.log(`✅ Fetched ${result.rows.length} applications`);

    // Parse skills JSON for each application
    return result.rows.map(row => ({
      ...row,
      skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills
    }));
  } catch (error) {
    console.error('❌ Error in getAllApplications:', error.message);
    throw new Error(`Failed to fetch applications: ${error.message}`);
  }
};

/**
 * Fetches a single application by ID
 * @param {number} id - The application ID
 * @returns {Promise<Object|null>} The application object or null if not found
 */
const getApplicationById = async (id) => {
  try {
    console.log('🔍 Fetching application by ID:', id);

    const query = `
      SELECT 
        ma.*,
        a.username as reviewer_username
      FROM membership_applications ma
      LEFT JOIN admins a ON ma.reviewed_by = a.id
      WHERE ma.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      console.warn(`⚠️ Application ${id} not found`);
      return null;
    }

    const application = result.rows[0];
    
    console.log(`✅ Fetched application ${id}`);

    // Parse skills JSON
    return {
      ...application,
      skills: typeof application.skills === 'string' 
        ? JSON.parse(application.skills) 
        : application.skills
    };
  } catch (error) {
    console.error('❌ Error in getApplicationById:', error.message);
    throw new Error(`Failed to fetch application: ${error.message}`);
  }
};

/**
 * Updates the status of a membership application
 * @param {number} id - The application ID
 * @param {string} status - The new status: 'approved' or 'rejected'
 * @param {number} adminId - The ID of the admin reviewing the application
 * @param {string} adminNotes - Optional notes from the admin
 * @returns {Promise<Object>} The updated application object
 */
const updateApplicationStatus = async (id, status, adminId, adminNotes = '') => {
  try {
    console.log('🔄 Updating application status:', { id, status, adminId });

    const query = `
      UPDATE membership_applications 
      SET 
        status = $1, 
        reviewed_by = $2, 
        reviewed_date = CURRENT_TIMESTAMP, 
        admin_notes = $3
      WHERE id = $4
      RETURNING *
    `;

    const values = [status, adminId, adminNotes, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    const application = result.rows[0];

    console.log(`✅ Application ${id} status updated to ${status}`);

    // Parse skills JSON
    return {
      ...application,
      skills: typeof application.skills === 'string' 
        ? JSON.parse(application.skills) 
        : application.skills
    };
  } catch (error) {
    console.error('❌ Error in updateApplicationStatus:', error.message);

    // Handle foreign key constraint violation for invalid admin ID
    if (error.code === '23503') {
      throw new Error('Invalid admin ID');
    }
    throw new Error(`Failed to update application: ${error.message}`);
  }
};

/**
 * Deletes a membership application by ID
 * @param {number} id - The application ID
 * @returns {Promise<Object>} Success object with deleted flag
 */
const deleteApplication = async (id) => {
  try {
    console.log('🗑️ Deleting application:', id);

    const query = `
      DELETE FROM membership_applications 
      WHERE id = $1 
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    console.log(`✅ Application ${id} deleted`);

    return { success: true, deleted: true };
  } catch (error) {
    console.error('❌ Error in deleteApplication:', error.message);
    throw new Error(`Failed to delete application: ${error.message}`);
  }
};

/**
 * Gets statistics about membership applications
 * @returns {Promise<Object>} Statistics object with total, pending, approved, and rejected counts
 */
const getApplicationStatistics = async () => {
  try {
    console.log('📊 Fetching application statistics');

    const query = `
      SELECT status, COUNT(*) as count 
      FROM membership_applications 
      GROUP BY status
    `;

    const result = await pool.query(query);

    // Initialize statistics object
    const statistics = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    // Populate statistics from query results
    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      statistics.total += count;
      
      if (row.status === 'pending') {
        statistics.pending = count;
      } else if (row.status === 'approved') {
        statistics.approved = count;
      } else if (row.status === 'rejected') {
        statistics.rejected = count;
      }
    });

    console.log('✅ Statistics fetched:', statistics);

    return statistics;
  } catch (error) {
    console.error('❌ Error in getApplicationStatistics:', error.message);
    throw new Error(`Failed to fetch statistics: ${error.message}`);
  }
};

module.exports = {
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStatistics
};