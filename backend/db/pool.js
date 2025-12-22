/**
 * ====================================
 * PostgreSQL Connection Pool
 * ====================================
 * Purpose: Create and manage database connection pool
 * Supports both DATABASE_URL and individual credentials
 * ====================================
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Parse DATABASE_URL into connection config
 * Supports postgresql:// and postgres:// formats
 */
function parseConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading '/'
      user: url.username,
      password: decodeURIComponent(url.password), // Decode URL-encoded password
      ssl: {
        rejectUnauthorized: false // Required for most cloud databases
      }
    };
  } catch (error) {
    console.error('❌ Failed to parse DATABASE_URL:', error.message);
    return null;
  }
}

/**
 * Get database configuration
 * Priority: DATABASE_URL > Individual environment variables > Defaults
 */
function getDatabaseConfig() {
  // Try DATABASE_URL first (best for Render deployment)
  if (process.env.DATABASE_URL) {
    console.log('📡 Using DATABASE_URL for connection');
    const config = parseConnectionString(process.env.DATABASE_URL);
    
    if (config) {
      // Add query timeout and other pool settings
      return {
        ...config,
        max: 20, // Maximum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false
      };
    }
    
    console.warn('⚠️  Failed to parse DATABASE_URL, falling back to individual variables');
  }

  // Fall back to individual environment variables
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('📡 Using individual DB credentials for connection');
    
        return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'grrc_db',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 30000,
      allowExitOnIdle: false
    };
  }

  // No valid configuration found
  console.warn('⚠️  No database configuration found');
  return null;
}

// Create pool with configuration
const poolConfig = getDatabaseConfig();

let pool;

if (poolConfig) {
  pool = new Pool(poolConfig);

  // Log connection info (without sensitive data)
  console.log('🔧 Database pool configured:');
  console.log(`   Host: ${poolConfig.host}`);
  console.log(`   Database: ${poolConfig.database}`);
  console.log(`   Port: ${poolConfig.port}`);
  console.log(`   SSL: ${poolConfig.ssl ? 'Enabled' : 'Disabled'}`);

  // Handle pool errors
  pool.on('error', (err, client) => {
    console.error('❌ Unexpected database pool error:', err.message);
    console.error('   This error occurred on an idle client');
  });

  // Handle pool connection
  pool.on('connect', (client) => {
    console.log('✅ New database client connected');
  });

  // Handle pool removal
  pool.on('remove', (client) => {
    console.log('🔌 Database client disconnected');
  });

  // Test connection on startup
  (async () => {
    try {
      const client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      const result = await Promise.race([
        client.query('SELECT NOW() as time, current_database() as db'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 3000)
        )
      ]);
      console.log('✅ Database connection test successful');
      console.log(`   Connected to: ${result.rows[0].db}`);
      console.log(`   Server time: ${result.rows[0].time}`);
      client.release();
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL database:', error.message);
      console.error('Please check your database configuration in .env file');
      
      // Don't exit - let server run in degraded mode
      // process.exit(1);
    }
  })();

} else {
  // Create a mock pool for development without database
  console.warn('⚠️  Running without database connection (mock mode)');
  
  pool = {
    query: async () => {
      throw new Error('Database not configured. Please set DATABASE_URL or individual DB credentials.');
    },
    connect: async () => {
      throw new Error('Database not configured. Please set DATABASE_URL or individual DB credentials.');
    },
    end: async () => {
      console.log('Mock pool closed');
    }
  };
}

/**
 * Graceful pool shutdown
 */
async function closePool() {
  if (pool && typeof pool.end === 'function') {
    try {
      await pool.end();
      console.log('✅ Database pool closed successfully');
    } catch (error) {
      console.error('❌ Error closing database pool:', error.message);
    }
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    return {
      success: true,
      message: 'Database connection successful',
      time: result.rows[0].time,
      version: result.rows[0].version.split(',')[0]
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database connection failed',
      error: error.message
    };
  }
}

module.exports = pool;
module.exports.closePool = closePool;
module.exports.testConnection = testConnection;
module.exports.isConfigured = !!poolConfig;