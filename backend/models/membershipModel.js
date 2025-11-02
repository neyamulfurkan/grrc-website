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
    linkedin_profile
  } = applicationData;

  try {
    // Convert skills array to JSON string for JSONB storage
    const skillsJson = JSON.stringify(skills);

    const query = `
      INSERT INTO membership_applications (
        full_name, email, phone, student_id, department, year, 
        bio, skills, previous_experience, github_profile, linkedin_profile
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, full_name, email, status, applied_date
    `;

    const values = [
      full_name,
      email,
      phone,
      student_id,
      department,
      year,
      bio,
      skillsJson,
      previous_experience,
      github_profile,
      linkedin_profile
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    // Handle duplicate email error
    if (error.code === '23505') {
      throw new Error('Email already used for an application');
    }
    throw new Error(error.message);
  }
};

/**
 * Fetches all membership applications, optionally filtered by status
 * @param {string|null} status - Filter by status: 'pending', 'approved', 'rejected', or null for all
 * @returns {Promise<Array>} Array of application objects with admin username
 */
const getAllApplications = async (status = null) => {
  try {
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

    // Parse skills JSON for each application
    return result.rows.map(row => ({
      ...row,
      skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills
    }));
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 * Fetches a single application by ID
 * @param {number} id - The application ID
 * @returns {Promise<Object|null>} The application object or null if not found
 */
const getApplicationById = async (id) => {
  try {
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
      return null;
    }

    const application = result.rows[0];
    
    // Parse skills JSON
    return {
      ...application,
      skills: typeof application.skills === 'string' 
        ? JSON.parse(application.skills) 
        : application.skills
    };
  } catch (error) {
    throw new Error(error.message);
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

    // Parse skills JSON
    return {
      ...application,
      skills: typeof application.skills === 'string' 
        ? JSON.parse(application.skills) 
        : application.skills
    };
  } catch (error) {
    // Handle foreign key constraint violation for invalid admin ID
    if (error.code === '23503') {
      throw new Error('Invalid admin ID');
    }
    throw new Error(error.message);
  }
};

/**
 * Deletes a membership application by ID
 * @param {number} id - The application ID
 * @returns {Promise<Object>} Success object with deleted flag
 */
const deleteApplication = async (id) => {
  try {
    const query = `
      DELETE FROM membership_applications 
      WHERE id = $1 
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    return { success: true, deleted: true };
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 * Gets statistics about membership applications
 * @returns {Promise<Object>} Statistics object with total, pending, approved, and rejected counts
 */
const getApplicationStatistics = async () => {
  try {
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

    return statistics;
  } catch (error) {
    throw new Error(error.message);
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