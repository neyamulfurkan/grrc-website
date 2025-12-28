/**
 * ====================================
 * PostgreSQL Connection Pool - CORRECTED VERSION
 * ====================================
 * Purpose: Create and manage database connection pool
 * Optimized for: Supabase Transaction Pooler (port 6543) + Render Free Tier
 * 
 * Key Fixes:
 * 1. Preserves pgbouncer=true query parameter (required for port 6543)
 * 2. Sets min: 0 to prevent startup timeout crashes
 * 3. Sets max: 4 to stay within free tier limits
 * 4. idleTimeoutMillis: 30000 (30s) - Proper balance for Supabase free tier
 * 5. Keep-alive ping every 60 seconds
 * ====================================
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Parse DATABASE_URL into connection config
 * CRITICAL: Preserves query parameters for PGBouncer compatibility
 */
function parseConnectionString(connectionString) {
  try {
    // Keep the full connection string including query parameters for PGBouncer
    const cleanUrl = connectionString;
    const url = new URL(cleanUrl);
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6543, // Default to 6543 for Supabase pooler
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
 * Priority: DATABASE_URL > Individual environment variables
 */
function getDatabaseConfig() {
  // Try DATABASE_URL first (best for Render deployment)
  if (process.env.DATABASE_URL) {
    console.log('📡 Using DATABASE_URL for connection');
    
    // Log partial connection string for debugging (hide password)
    const urlParts = process.env.DATABASE_URL.split('@');
    if (urlParts.length > 1) {
      console.log('🔍 Connecting to:', urlParts[1].substring(0, 50) + '...');
    }
    
    const config = parseConnectionString(process.env.DATABASE_URL);
    
    if (config) {
      // ✅ CORRECTED FOR SUPABASE TRANSACTION POOLER
      return {
        ...config,
        // Connection Pool Settings
        max: 4,                           // Stay within free tier limits
        min: 0,                           // Prevent startup timeout crashes
        
        // Timeout Settings (optimized for cross-region Render + Supabase)
        connectionTimeoutMillis: 30000,   // 30s connection timeout
        idleTimeoutMillis: 30000,         // 30s idle timeout (balanced for Supabase)
        
        // Query Timeouts
        query_timeout: 30000,             // 30s query timeout
        statement_timeout: 60000,         // 60s statement timeout
        
        // Pool Management
        allowExitOnIdle: false,           // Keep pool alive even when idle
        
        // Keep-Alive (prevents connection drops)
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000 // Start keepalive after 10s
      };
    }
    
    console.warn('⚠️  Failed to parse DATABASE_URL, falling back to individual variables');
  }
  
  // Fall back to individual environment variables
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('📡 Using individual DB credentials for connection');
    
    return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 6543,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      max: 4,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 60000,
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };
  }
  
  console.warn('⚠️  No database configuration found');
  return null;
}

// Create pool with configuration
const poolConfig = getDatabaseConfig();
let pool;
let isHealthy = false; // Start as false until first successful connection
let consecutiveFailures = 0;
let healthCheckInterval = null;
let keepAliveInterval = null;

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
  
  // Connection event: New client connected
  pool.on('connect', (client) => {
    consecutiveFailures = 0;
    if (!isHealthy) {
      console.log('✅ Database connection restored');
      isHealthy = true;
    }
  });
  
  // Error event: Handle pool errors gracefully
  pool.on('error', async (err, client) => {
    consecutiveFailures++;
    
    // Only log critical errors periodically
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
    
    // Auto-recovery for timeout/connection errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
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
  
  // Remove event: Client removed from pool
  pool.on('remove', (client) => {
    // Only log if pool is under pressure
    if (pool.idleCount === 0 && pool.waitingCount > 0) {
      console.log('⚠️ Database client removed - pool under pressure');
    }
  });
  
  // Startup: Test connection with retries
  (async () => {
    const maxRetries = 5;
    let connected = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting database connection (${attempt}/${maxRetries})...`);
        
        const client = await pool.connect();
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
          const delay = (attempt + 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms... (${maxRetries - attempt} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ Database connection failed after all retries');
          console.error('   Please check:');
          console.error('   1. DATABASE_URL includes ?pgbouncer=true&sslmode=require');
          console.error('   2. Port is 6543 (transaction pooler)');
          console.error('   3. Supabase project is active (not paused)');
          console.error('   4. Network connectivity between Render and Supabase');
          console.error('   Server will continue - connections will be attempted on demand');
          isHealthy = false;
        }
      }
    }
  })();
  
  // CRITICAL: Keep-alive ping every 60 seconds to prevent connection timeout
  // Supabase free tier drops idle connections after ~90 seconds
  keepAliveInterval = setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      // Silent fail - health check will handle recovery
    }
  }, 60000); // Every 60 seconds
  
  // Health monitoring: Check pool health every 5 minutes
  healthCheckInterval = setInterval(async () => {
    try {
      const poolStatus = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // Only log if there are issues
      const hasIssues = poolStatus.waiting > 3 || poolStatus.idle === 0 || !isHealthy;
      
      if (hasIssues) {
        console.log('⚠️ Pool health check:', poolStatus);
      }
      
      // Quick health check with 10s timeout
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
      
      // Only log every 5th failure
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
      
      // Try forced recovery after 3+ failures
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
      
      // Critical warning at 10+ failures
      if (consecutiveFailures >= 10) {
        console.error('🚨 CRITICAL: 10+ consecutive connection failures');
        console.error('   Consider restarting the server or checking database status');
      }
    }
  }, 300000); // Every 5 minutes
  
  // Graceful shutdown: Handle termination signals
  const shutdownHandler = async (signal) => {
    console.log(`🛑 ${signal} received, closing database pool gracefully...`);
    
    // Clear intervals
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    try {
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
      process.exit(signal === 'SIGTERM' ? 0 : 1);
    }
  };
  
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
  
} else {
  // Mock pool for development without database
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
 * Wrapper function to ensure connections are always released
 * Use this in all models to prevent connection leaks
 */
async function withConnection(callback) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('Database pool not initialized');
  }
  const client = await pool.connect();
  try {
    // Set query timeout to prevent hanging queries
    await client.query('SET statement_timeout = 60000'); // 60 seconds
    return await callback(client);
  } finally {
    // CRITICAL: Always release connection back to pool
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
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
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
module.exports.withConnection = withConnection;
module.exports.closePool = closePool;
module.exports.testConnection = testConnection;
module.exports.getPoolStatus = getPoolStatus;
module.exports.isConfigured = !!poolConfig;