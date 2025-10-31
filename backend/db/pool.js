/**
 * ====================================
 * PostgreSQL Connection Pool
 * ====================================
 * Purpose: Creates and manages database connection pool for the application
 * Uses pg library for PostgreSQL connectivity
 * Loads configuration from environment variables
 * ====================================
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Create PostgreSQL connection pool with configuration from .env
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'grrc_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

/**
 * Test database connection on startup
 */
pool.query('SELECT NOW() as current_time, current_database() as database', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
    console.error('Please check your database configuration in .env file');
    process.exit(1);
  } else {
    console.log('✅ Connected to PostgreSQL database:', res.rows[0].database);
    console.log('⏰ Server time:', res.rows[0].current_time);
  }
});

/**
 * Handle pool errors
 */
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  // Don't exit the process, just log the error
});

/**
 * Graceful shutdown handler
 * Closes all database connections when the application is terminated
 */
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
    process.exit(1);
  }
});

module.exports = pool;