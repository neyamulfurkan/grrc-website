/**
 * Alumni Application Model
 * ========================
 * Database operations for alumni applications
 */

const pool = require('../db/pool');
const { withConnection } = require('../db/pool');

/**
 * Create a new alumni application
 * @param {Object} applicationData - Application data
 * @returns {Promise<Object>} Created application with id
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

  // Validate batch_year format (YYYY-YYYY)
  const batchYearRegex = /^\d{4}-\d{4}$/;
  if (!batchYearRegex.test(batch_year)) {
    throw new Error('Invalid batch_year format. Expected format: YYYY-YYYY (e.g., 2020-2021)');
  }

  const query = `
    INSERT INTO alumni_applications (
      full_name, email, phone, batch_year, department,
      role_in_club, achievements, current_position, current_company,
      bio, linkedin, github, facebook, photo, status, applied_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', CURRENT_TIMESTAMP)
    RETURNING 
      id, full_name, email, phone, batch_year, department,
      role_in_club, achievements, current_position, current_company,
      bio, linkedin, github, facebook, photo, status, applied_date,
      created_at
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

  try {
    const result = await withConnection(async (client) => {
      return await client.query(query, values);
    });
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation (duplicate email)
    if (error.code === '23505') {
      throw new Error('Email already used in another application');
    }
    throw error;
  }
};

/**
 * Get all alumni applications with optional status filter
 * @param {string|null} status - Filter by status ('pending', 'approved', 'rejected') or null for all
 * @returns {Promise<Array>} Array of applications
 */
const getAllApplications = async (status = null) => {
  let query = `
    SELECT 
      aa.*,
      a.username as reviewed_by_username
    FROM alumni_applications aa
    LEFT JOIN admins a ON aa.reviewed_by = a.id
  `;

  const values = [];

  if (status) {
    query += ' WHERE aa.status = $1';
    values.push(status);
  }

  query += ' ORDER BY aa.applied_date DESC';

  const result = await withConnection(async (client) => {
    return await client.query(query, values);
  });
  return result.rows;
};

/**
 * Get a single alumni application by ID
 * @param {number} id - Application ID
 * @returns {Promise<Object|null>} Application object or null
 */
const getApplicationById = async (id) => {
  const query = `
    SELECT 
      aa.*,
      a.username as reviewed_by_username
    FROM alumni_applications aa
    LEFT JOIN admins a ON aa.reviewed_by = a.id
    WHERE aa.id = $1
  `;

  const result = await withConnection(async (client) => {
    return await client.query(query, [id]);
  });
  return result.rows[0] || null;
};

/**
 * Update application status (approve/reject)
 * @param {number} id - Application ID
 * @param {string} status - New status ('approved' or 'rejected')
 * @param {number} reviewedBy - Admin user ID
 * @param {string} adminNotes - Admin notes/comments
 * @returns {Promise<Object>} Updated application
 */
const updateApplicationStatus = async (id, status, reviewedBy, adminNotes = '') => {
  const query = `
    UPDATE alumni_applications
    SET 
      status = $1,
      reviewed_by = $2,
      reviewed_date = CURRENT_TIMESTAMP,
      admin_notes = $3
    WHERE id = $4
    RETURNING 
      id, full_name, email, phone, batch_year, department,
      role_in_club, achievements, current_position, current_company,
      bio, linkedin, github, facebook, photo, status, 
      applied_date, reviewed_date, reviewed_by, admin_notes
  `;

  const values = [status, reviewedBy, adminNotes, id];

  const result = await withConnection(async (client) => {
    return await client.query(query, values);
  });

  if (result.rows.length === 0) {
    throw new Error(`Alumni application with ID ${id} not found`);
  }

  return result.rows[0];
};

/**
 * Delete an alumni application
 * @param {number} id - Application ID
 * @returns {Promise<Object>} Success response
 */
const deleteApplication = async (id) => {
  const query = 'DELETE FROM alumni_applications WHERE id = $1 RETURNING id';
  const result = await withConnection(async (client) => {
    return await client.query(query, [id]);
  });

  if (result.rows.length === 0) {
    throw new Error(`Alumni application with ID ${id} not found`);
  }

  return { success: true, deleted: true, id: result.rows[0].id };
};

/**
 * Get application statistics
 * @returns {Promise<Object>} Statistics object
 */
const getApplicationStatistics = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_applications,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
      COUNT(DISTINCT batch_year) as unique_batches,
      COUNT(DISTINCT department) as unique_departments
    FROM alumni_applications
  `;

  const result = await withConnection(async (client) => {
    return await client.query(query);
  });
  const stats = result.rows[0];

  return {
    total: parseInt(stats.total_applications, 10),
    pending: parseInt(stats.pending_count, 10),
    approved: parseInt(stats.approved_count, 10),
    rejected: parseInt(stats.rejected_count, 10),
    unique_batches: parseInt(stats.unique_batches, 10),
    unique_departments: parseInt(stats.unique_departments, 10)
  };
};

/**
 * Check if email already exists in applications
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
const emailExists = async (email) => {
  const query = 'SELECT id FROM alumni_applications WHERE email = $1';
  const result = await withConnection(async (client) => {
    return await client.query(query, [email]);
  });
  return result.rows.length > 0;
};

module.exports = {
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStatistics,
  emailExists
};