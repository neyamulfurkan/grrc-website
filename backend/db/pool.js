/**
 * ====================================
 * PostgreSQL Connection Pool - FIXED VERSION
 * ====================================
 * Purpose: Create and manage database connection pool
 * Optimized for FREE TIER: Supabase Free + Render Free
 * 
 * Key Fixes:
 * - Increased pool size from 3 to 10 (Supabase free tier allows 60-100)
 * - Proper connection release (prevents leaks)
 * - Reduced health check frequency (every 5min instead of 30s)
 * - Better timeout handling
 * - Connection reuse and recycling
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
    // Remove query parameters that interfere with pg connection
    const cleanUrl = connectionString.split('?')[0];
    const url = new URL(cleanUrl);
    
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
      // ✅ OPTIMIZED FOR FREE TIER (Supabase allows 60-100 connections)
      return {
        ...config,
        // Connection Pool Settings
        max: 10,                          // ✅ INCREASED: 10 connections (safe for free tier)
        min: 2,                           // ✅ INCREASED: Keep 2 alive for instant response
        
        // Timeout Settings (optimized for Render + Supabase)
        connectionTimeoutMillis: 15000,   // ✅ INCREASED: 15s connection timeout
        idleTimeoutMillis: 120000,        // ✅ INCREASED: 2 minutes idle (was 25s)
        
        // Query Timeouts
        query_timeout: 60000,             // ✅ INCREASED: 60s query timeout
        statement_timeout: 60000,         // ✅ INCREASED: 60s statement timeout
        
        // Pool Management
        allowExitOnIdle: false,           // ✅ Keep pool alive even when idle
        
        // Keep-Alive (prevents connection drops)
        keepAlive: true,
        keepAliveInitialDelayMillis: 5000 // ✅ Start keepalive after 5s
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
      max: 10,
      min: 2,
      idleTimeoutMillis: 120000,
      connectionTimeoutMillis: 15000,
      query_timeout: 60000,
      statement_timeout: 60000,
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000
    };
  }

  console.warn('⚠️  No database configuration found');
  return null;
}

// Create pool with configuration
const poolConfig = getDatabaseConfig();

let pool;
let isHealthy = true;
let consecutiveFailures = 0;
let healthCheckInterval = null;

if (poolConfig) {
  pool = new Pool(poolConfig);

  // Log connection info (without sensitive data)
  console.log('🔧 Database pool configured:');
  console.log(`   Host: ${poolConfig.host}`);
  console.log(`   Database: ${poolConfig.database}`);
  console.log(`   Port: ${poolConfig.port}`);
  console.log(`   SSL: ${poolConfig.ssl ? 'Enabled' : 'Disabled'}`);
  console.log(`   Max Connections: ${poolConfig.max}`);
  console.log(`   Min Connections: ${poolConfig.min}`);
  console.log(`   Connection Timeout: ${poolConfig.connectionTimeoutMillis}ms`);
  console.log(`   Idle Timeout: ${poolConfig.idleTimeoutMillis}ms`);

  // ✅ CONNECTION EVENT: New client connected
  pool.on('connect', (client) => {
    consecutiveFailures = 0;
    if (!isHealthy) {
      console.log('✅ Database connection restored');
      isHealthy = true;
    }
  });

  // ✅ ERROR EVENT: Handle pool errors with auto-recovery
  pool.on('error', async (err, client) => {
    consecutiveFailures++;
    
    // Only log critical errors, not every error
    if (consecutiveFailures === 1 || consecutiveFailures % 5 === 0) {
      console.error('❌ Database pool error:', {
        message: err.message,
        code: err.code,
        consecutiveFailures,
        poolStatus: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      });
    }
    
    // ✅ Auto-recovery for timeout/connection reset errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
      // Wait before retry (exponential backoff, max 5s)
      const delay = Math.min(1000 * consecutiveFailures, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const testClient = await pool.connect();
        await testClient.query('SELECT 1');
        testClient.release();
        console.log('✅ Auto-recovery successful');
        consecutiveFailures = 0;
        isHealthy = true;
      } catch (recoverError) {
        // Silent fail, will retry on next attempt
      }
    }
  });

  // ✅ REMOVE EVENT: Client removed from pool
  pool.on('remove', (client) => {
    // Only log if pool is critically low
    if (pool.idleCount === 0 && pool.waitingCount > 0) {
      console.log('⚠️ Database client removed - pool under pressure');
    }
  });

  // ✅ STARTUP: Test connection with retries
  (async () => {
    const maxRetries = 5;
    let connected = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting database connection (${attempt}/${maxRetries})...`);
        
        // Create connection with timeout
        const client = await pool.connect();
        
        // Test query
        const result = await client.query('SELECT NOW() as server_time, current_database() as database');
        client.release();
        
        console.log('✅ Database connection test successful');
        console.log(`   Connected to: ${result.rows[0].database}`);
        console.log(`   Server time: ${result.rows[0].server_time}`);
        
        connected = true;
        isHealthy = true;
        consecutiveFailures = 0;
        break;
        
      } catch (error) {
        consecutiveFailures++;
        console.error(`❌ Connection attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 3s, 4s, 5s, 6s
          const delay = (attempt + 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms... (${maxRetries - attempt} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ Database connection failed after all retries');
          console.error('   Please check:');
          console.error('   1. DATABASE_URL is correct in Render environment variables');
          console.error('   2. Supabase project is active (not paused)');
          console.error('   3. Supabase connection pooler is enabled');
          console.error('   4. Network connectivity between Render and Supabase');
          console.error('   Server will continue in degraded mode');
          isHealthy = false;
        }
      }
    }
  })();
  
  // ✅ HEALTH MONITORING: Check pool health every 5 MINUTES (reduced from 30s)
  healthCheckInterval = setInterval(async () => {
    try {
      const poolStatus = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // ✅ FIX: Only log if there are REAL issues
      const hasIssues = poolStatus.waiting > 3 || poolStatus.idle === 0 || !isHealthy;
      
      if (hasIssues) {
        console.log('⚠️ Pool health check:', poolStatus);
      }
      
      // ✅ FIX: Quick health check with 10s timeout (increased from 5s)
      const healthCheckPromise = pool.query('SELECT 1 as health');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 10000)
      );
      
      await Promise.race([healthCheckPromise, timeoutPromise]);
      
      // Success - reset failure counter
      if (consecutiveFailures > 0) {
        console.log('✅ Pool health check passed (recovered)');
        consecutiveFailures = 0;
        isHealthy = true;
      }
      
    } catch (healthError) {
      consecutiveFailures++;
      isHealthy = false;
      
      // ✅ FIX: Only log every 5th failure to reduce spam
      if (consecutiveFailures === 1 || consecutiveFailures % 5 === 0) {
        console.error('❌ Pool health check failed:', {
          error: healthError.message,
          consecutiveFailures,
          poolStatus: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          }
        });
      }
      
      // ✅ FIX: Try forced recovery only if 3+ failures (not 2)
      if (consecutiveFailures >= 3 && consecutiveFailures % 3 === 0) {
        console.log('🔄 Attempting forced connection recovery...');
        
        try {
          const client = await pool.connect();
          await client.query('SELECT NOW()');
          client.release();
          console.log('✅ Forced connection successful');
          consecutiveFailures = 0;
          isHealthy = true;
        } catch (forceError) {
          // Silent fail, will retry on next health check
        }
      }
      
      // ✅ FIX: Only warn at 10+ failures (not 5)
      if (consecutiveFailures >= 10) {
        console.error('🚨 CRITICAL: 10+ consecutive connection failures');
        console.error('   Consider restarting the server or checking database status');
      }
    }
  }, 300000); // ✅ CHANGED: Every 5 minutes (300000ms) instead of 30 seconds

  // ✅ GRACEFUL SHUTDOWN: Handle termination signals
  const shutdownHandler = async (signal) => {
    console.log(`🛑 ${signal} received, closing database pool gracefully...`);
    
    // Clear health check interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    
    try {
      // Give existing queries 15s to complete (increased from 10s)
      await Promise.race([
        pool.end(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Pool close timeout')), 15000)
        )
      ]);
      console.log('✅ Database pool closed successfully');
    } catch (error) {
      console.error('❌ Error during pool shutdown:', error.message);
      console.log('⚠️ Forcing pool close...');
      // Force close
      process.exit(signal === 'SIGTERM' ? 0 : 1);
    }
  };

  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

} else {
  // ✅ MOCK POOL: For development without database
  console.warn('⚠️  Running without database connection (mock mode)');
  
  pool = {
    query: async () => {
      throw new Error('Database not configured. Please set DATABASE_URL or individual DB credentials.');
    },
    connect: async () => {
      throw new Error('Database not configured. Please set DATABASE_URL or individual DB credentials.');
    },
    end: async () => {
      console.log('✅ Mock pool closed');
    },
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0
  };
  
  isHealthy = false;
}

/**
 * ✅ NEW: Wrapper function to ensure connections are always released
 * Use this in all models to prevent connection leaks
 */
async function withConnection(callback) {
  const client = await pool.connect();
  try {
    // Set query timeout to prevent hanging queries
    await client.query('SET statement_timeout = 60000'); // 60 seconds
    return await callback(client);
  } finally {
    // ✅ CRITICAL: Always release connection back to pool
    client.release();
  }
}

/**
 * Graceful pool shutdown
 */
async function closePool() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
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

/**
 * Get pool health status
 */
function getPoolStatus() {
  return {
    isHealthy,
    consecutiveFailures,
    poolStats: {
      total: pool.totalCount || 0,
      idle: pool.idleCount || 0,
      waiting: pool.waitingCount || 0
    }
  };
}

module.exports = pool;
module.exports.withConnection = withConnection; // ✅ NEW: Export wrapper function
module.exports.closePool = closePool;
module.exports.testConnection = testConnection;
module.exports.getPoolStatus = getPoolStatus;
module.exports.isConfigured = !!poolConfig;