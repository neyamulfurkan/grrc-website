/**
 * ====================================
 * Database Configuration Module
 * ====================================
 * Purpose: Centralized database configuration and helper functions
 * Provides database config object, table name constants, and utility functions
 * ====================================
 */

require('dotenv').config();
const pool = require('../db/pool');

/**
 * Database configuration object
 */
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'grrc_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

/**
 * Table name constants
 * Use these constants instead of hardcoding table names
 */
const TABLES = {
  CLUB_CONFIG: 'club_config',
  ADMINS: 'admins',
  MEMBERS: 'members',
  EVENTS: 'events',
  PROJECTS: 'projects',
  GALLERY: 'gallery',
  ANNOUNCEMENTS: 'announcements',
};

/**
 * Test database connection
 * @returns {Promise<Object>} { success, message, error }
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    return {
      success: true,
      message: 'Database connection successful',
      data: {
        timestamp: result.rows[0].time,
        version: result.rows[0].version,
      },
      error: null,
    };
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return {
      success: false,
      message: 'Database connection failed',
      data: null,
      error: error.message,
    };
  }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database size and connection info
 */
async function getDatabaseStats() {
  try {
    const query = `
      SELECT 
        current_database() as database,
        pg_size_pretty(pg_database_size(current_database())) as size,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections
    `;
    const result = await pool.query(query);
    return {
      success: true,
      data: result.rows[0],
      error: null,
    };
  } catch (error) {
    console.error('Error getting database stats:', error.message);
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
}

/**
 * Check if a table exists in the database
 * @param {string} tableName - Name of the table to check
 * @returns {Promise<boolean>}
 */
async function tableExists(tableName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    const result = await pool.query(query, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

module.exports = {
  config,
  TABLES,
  testConnection,
  getDatabaseStats,
  tableExists,
};