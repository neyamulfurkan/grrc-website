const pool = require('../db/pool');

/**
 * Creates a new alumni application
 * @param {Object} applicationData - The application data
 * @returns {Promise<Object>} The created application with id, full_name, email, status, and applied_date
 */
const createApplication = async (applicationData) => {
  const {
    full_name,
    email,
    phone,
    batch_year,
    department,
    role_in_club,
    achievements,
    current_position,
    current_company,
    bio,
    linkedin,
    github,
    facebook,
    photo
  } = applicationData;

  try {
    console.log('🔍 Creating alumni application for:', email);
    console.log('📝 Application data:', {
      full_name,
      email,
      phone,
      batch_year,
      department
    });

    // ✅ CRITICAL: Validate required fields
    if (!full_name || !email || !phone || !batch_year || !department || !bio) {
      throw new Error('Missing required fields: full_name, email, phone, batch_year, department, or bio');
    }

    // ✅ Validate batch_year format (YYYY-YYYY)
    const batchYearPattern = /^\d{4}-\d{4}$/;
    if (!batchYearPattern.test(batch_year)) {
      throw new Error('Invalid batch_year format. Use YYYY-YYYY (e.g., 2020-2021)');
    }

    // ✅ CRITICAL: Check if pool is configured
    if (!pool || typeof pool.query !== 'function') {
      console.error('❌ Database pool not configured!');
      throw new Error('Database connection not available');
    }

    const query = `
      INSERT INTO alumni_applications (
        full_name, email, phone, batch_year, department, role_in_club,
        achievements, current_position, current_company, bio,
        linkedin, github, facebook, photo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, full_name, email, status, applied_date
    `;

    const values = [
      full_name,
      email,
      phone,
      batch_year,
      department,
      role_in_club || null,
      achievements || null,
      current_position || null,
      current_company || null,
      bio,
      linkedin || null,
      github || null,
      facebook || null,
      photo || null
    ];

    console.log('📤 Executing query with values:', values.map((v, i) => 
      i === 1 ? v : (v ? '✓' : 'null') // Only show email, hide other sensitive data
    ));

    const result = await pool.query(query, values);
    
    console.log('✅ Alumni application created successfully:', result.rows[0]);
    
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

    // Handle table not found
    if (error.code === '42P01') {
      throw new Error('Database table "alumni_applications" does not exist. Please run database migrations.');
    }

    // Re-throw the error with more context
    throw new Error(`Failed to create alumni application: ${error.message}`);
  }
};

/**
 * Fetches all alumni applications, optionally filtered by status
 * @param {string|null} status - Filter by status: 'pending', 'approved', 'rejected', or null for all
 * @returns {Promise<Array>} Array of application objects with admin username
 */
const getAllApplications = async (status = null) => {
  try {
    console.log('🔍 Fetching alumni applications with status:', status || 'all');

    // ✅ CRITICAL FIX: Different query based on whether status is provided
    let query, values;
    
    if (status === null || status === undefined || status === 'all') {
      // Get all applications - no WHERE clause needed
      query = `
        SELECT 
          aa.*,
          a.username as reviewer_username
        FROM alumni_applications aa
        LEFT JOIN admins a ON aa.reviewed_by = a.id
        ORDER BY aa.applied_date DESC
      `;
      values = [];
    } else {
      // Filter by specific status
      query = `
        SELECT 
          aa.*,
          a.username as reviewer_username
        FROM alumni_applications aa
        LEFT JOIN admins a ON aa.reviewed_by = a.id
        WHERE aa.status = $1
        ORDER BY aa.applied_date DESC
      `;
      values = [status];
    }

    const result = await pool.query(query, values);

    console.log(`✅ Fetched ${result.rows.length} alumni applications`);

    return result.rows;
  } catch (error) {
    console.error('❌ Error in getAllApplications:', error.message);
    throw new Error(`Failed to fetch alumni applications: ${error.message}`);
  }
};

/**
 * Fetches a single alumni application by ID
 * @param {number} id - The application ID
 * @returns {Promise<Object|null>} The application object or null if not found
 */
const getApplicationById = async (id) => {
  try {
    console.log('🔍 Fetching alumni application by ID:', id);

    const query = `
      SELECT 
        aa.*,
        a.username as reviewer_username
      FROM alumni_applications aa
      LEFT JOIN admins a ON aa.reviewed_by = a.id
      WHERE aa.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      console.warn(`⚠️ Alumni application ${id} not found`);
      return null;
    }

    console.log(`✅ Fetched alumni application ${id}`);

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in getApplicationById:', error.message);
    throw new Error(`Failed to fetch alumni application: ${error.message}`);
  }
};

/**
 * Updates the status of an alumni application
 * @param {number} id - The application ID
 * @param {string} status - The new status: 'approved' or 'rejected'
 * @param {number} adminId - The ID of the admin reviewing the application
 * @param {string} adminNotes - Optional notes from the admin
 * @returns {Promise<Object>} The updated application object
 */
const updateApplicationStatus = async (id, status, adminId, adminNotes = '') => {
  try {
    console.log('🔄 Updating alumni application status:', { id, status, adminId });

    const query = `
      UPDATE alumni_applications 
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
      throw new Error('Alumni application not found');
    }

    console.log(`✅ Alumni application ${id} status updated to ${status}`);

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in updateApplicationStatus:', error.message);

    // Handle foreign key constraint violation for invalid admin ID
    if (error.code === '23503') {
      throw new Error('Invalid admin ID');
    }
    throw new Error(`Failed to update alumni application: ${error.message}`);
  }
};

/**
 * Deletes an alumni application by ID
 * @param {number} id - The application ID
 * @returns {Promise<Object>} Success object with deleted flag
 */
const deleteApplication = async (id) => {
  try {
    console.log('🗑️ Deleting alumni application:', id);

    const query = `
      DELETE FROM alumni_applications 
      WHERE id = $1 
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Alumni application not found');
    }

    console.log(`✅ Alumni application ${id} deleted`);

    return { success: true, deleted: true };
  } catch (error) {
    console.error('❌ Error in deleteApplication:', error.message);
    throw new Error(`Failed to delete alumni application: ${error.message}`);
  }
};

/**
 * Gets statistics about alumni applications
 * @returns {Promise<Object>} Statistics object with total, pending, approved, and rejected counts
 */
const getApplicationStatistics = async () => {
  try {
    console.log('📊 Fetching alumni application statistics');

    const query = `
      SELECT status, COUNT(*) as count 
      FROM alumni_applications 
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

    console.log('✅ Alumni application statistics fetched:', statistics);

    return statistics;
  } catch (error) {
    console.error('❌ Error in getApplicationStatistics:', error.message);
    throw new Error(`Failed to fetch alumni application statistics: ${error.message}`);
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