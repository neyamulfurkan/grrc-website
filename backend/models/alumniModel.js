const pool = require('../db/pool');

/**
 * Create a new alumni record
 * @param {Object} alumniData - Alumni data object
 * @returns {Promise<Object>} Created alumni object with id and timestamps
 */
const createAlumni = async (alumniData) => {
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
    is_featured,
    display_order
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get all alumni with optional filtering and sorting
 * @param {Object} options - Filter and pagination options
 * @param {string} options.batch_year - Filter by batch year
 * @param {boolean} options.is_featured - Filter by featured status
 * @param {number} options.limit - Limit number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} Array of alumni objects
 */
const getAllAlumni = async (options = {}) => {
  const {
    batch_year = null,
    is_featured = null,
    limit = null,
    offset = 0
  } = options;

  const query = `
    SELECT * FROM alumni
    WHERE ($1::TEXT IS NULL OR batch_year = $1)
      AND ($2::BOOLEAN IS NULL OR is_featured = $2)
    ORDER BY is_featured DESC, batch_year DESC, display_order ASC, name ASC
    LIMIT $3 OFFSET $4
  `;

  const values = [batch_year, is_featured, limit, offset];
  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Get a single alumni by ID
 * @param {number} id - Alumni ID
 * @returns {Promise<Object|null>} Alumni object or null if not found
 */
const getAlumniById = async (id) => {
  const query = 'SELECT * FROM alumni WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Update an alumni record
 * @param {number} id - Alumni ID
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object>} Updated alumni object
 */
const updateAlumni = async (id, updates) => {
  // Remove id and timestamp fields if accidentally included
  const { id: _, created_at, updated_at, ...validUpdates } = updates;

  const fields = Object.keys(validUpdates);
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const values = Object.values(validUpdates);
  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
  
  const query = `
    UPDATE alumni 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $${fields.length + 1} 
    RETURNING *
  `;

  values.push(id);
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Alumni not found');
  }
  
  return result.rows[0];
};

/**
 * Delete an alumni record
 * @param {number} id - Alumni ID
 * @returns {Promise<Object>} Success response
 */
const deleteAlumni = async (id) => {
  const query = 'DELETE FROM alumni WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    throw new Error('Alumni not found');
  }
  
  return { success: true, deleted: true };
};

/**
 * Get featured alumni for homepage
 * @param {number} limit - Maximum number of featured alumni to return
 * @returns {Promise<Array>} Array of featured alumni objects
 */
const getFeaturedAlumni = async (limit = 6) => {
  const query = `
    SELECT * FROM alumni 
    WHERE is_featured = true 
    ORDER BY display_order ASC, name ASC 
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  return result.rows;
};

/**
 * Get list of unique batch years
 * @returns {Promise<Array>} Array of batch year strings
 */
const getAlumniBatches = async () => {
  const query = `
    SELECT DISTINCT batch_year 
    FROM alumni 
    WHERE batch_year IS NOT NULL
    ORDER BY batch_year DESC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.batch_year);
};

/**
 * Get alumni statistics
 * @returns {Promise<Object>} Statistics object with total, total_batches, and featured_count
 */
const getAlumniStatistics = async () => {
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
    total: parseInt(stats.total, 10),
    total_batches: parseInt(stats.total_batches, 10),
    featured_count: parseInt(stats.featured_count, 10)
  };
};

module.exports = {
  createAlumni,
  getAllAlumni,
  getAlumniById,
  updateAlumni,
  deleteAlumni,
  getFeaturedAlumni,
  getAlumniBatches,
  getAlumniStatistics
};