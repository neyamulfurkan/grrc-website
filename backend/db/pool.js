/**
 * ====================================
 * PostgreSQL Connection Pool
 * ====================================
 * Purpose: Create and manage database connection pool
 * Optimized for Supabase Pooler (Transaction Mode)
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
      database: url.pathname.slice(1),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: {
        rejectUnauthorized: false
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
      // Optimized pool settings for Supabase Pooler with proper free tier limits
      return {
        ...config,
        max: 3,                           // ✅ REDUCED: Supabase pooler has ~5 connection limit
        min: 0,                           // ✅ REDUCED: Let connections close when idle
        idleTimeoutMillis: 30000,         // ✅ Close idle connections after 30s
        connectionTimeoutMillis: 60000,   // ✅ INCREASED to 60s for cold starts
        acquireTimeoutMillis: 60000,      // ✅ INCREASED to 60s
        createTimeoutMillis: 60000,       // ✅ INCREASED to 60s
        destroyTimeoutMillis: 10000,      // ✅ Give more time to clean up
        reapIntervalMillis: 5000,         // ✅ Check for idle connections less frequently
        createRetryIntervalMillis: 500,   // ✅ Wait longer between retries
        allowExitOnIdle: false,           // ✅ Keep pool alive
        query_timeout: 120000,            // ✅ INCREASED to 120s (2 minutes)
        statement_timeout: 120000,        // ✅ INCREASED to 120s
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
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
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 60000,
      query_timeout: 60000,
      statement_timeout: 60000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 10000,
      allowExitOnIdle: true
    };
  }

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
  });

  // Handle pool connection
  pool.on('connect', (client) => {
    console.log('✅ Database client connected');
  });

  // Handle pool removal
  pool.on('remove', (client) => {
    console.log('🔌 Database client removed from pool');
  });

  // Test connection on startup with extended timeout
  (async () => {
    let retries = 5;
    let connected = false;
    
    while (retries > 0 && !connected) {
      try {
        console.log(`🔄 Attempting database connection (${6 - retries}/5)...`);
        
        // ✅ INCREASED timeout from 5s to 15s
        const client = await Promise.race([
          pool.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15000))
        ]);
        
        const result = await client.query('SELECT NOW() as time, current_database() as db');
        
        console.log('✅ Database connection test successful');
        console.log(`   Connected to: ${result.rows[0].db}`);
        console.log(`   Server time: ${result.rows[0].time}`);
        client.release();
        connected = true;
      } catch (error) {
        retries--;
        console.error(`❌ Connection attempt failed: ${error.message}`);
        
        if (retries > 0) {
          // ✅ INCREASED max delay from 3s to 5s
          const delay = Math.min(2000 * (6 - retries), 5000);
          console.log(`⏳ Retrying in ${delay}ms... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All connection attempts failed');
          console.error('   Please check:');
          console.error('   1. DATABASE_URL is correct in Render');
          console.error('   2. Use direct connection (port 5432) not pooler (port 6543)');
          console.error('   3. Supabase project is active and accessible');
          console.error('   Server will continue in degraded mode');
        }
      }
    }
  })();
  
  // Add connection error recovery
  pool.on('error', async (err) => {
    console.error('❌ Database pool error:', err.message);
    console.log('🔄 Attempting to recover connection...');
    
    try {
      const client = await pool.connect();
      client.release();
      console.log('✅ Connection recovered');
    } catch (recoverError) {
      console.error('❌ Recovery failed:', recoverError.message);
    }
  });

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