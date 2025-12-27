/**
 * ====================================
 * PostgreSQL Connection Pool
 * ====================================
 * Purpose: Create and manage database connection pool
 * Optimized for Supabase Free Tier + Render Free Tier
 * 
 * Key Optimizations:
 * - Reduced pool size (3 max) to stay within Supabase limits
 * - Increased timeouts for geographic latency
 * - Automatic connection recovery
 * - Health monitoring with auto-healing
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
      // ✅ OPTIMIZED FOR SUPABASE FREE TIER + RENDER FREE TIER
      return {
        ...config,
        // Connection Pool Settings
        max: 3,                           // ✅ Max 3 connections (Supabase free tier limit: 15-20)
        min: 1,                           // ✅ Keep 1 alive to avoid cold starts
        
        // Timeout Settings (increased for geographic latency)
        connectionTimeoutMillis: 30000,   // ✅ 30s connection timeout
        idleTimeoutMillis: 25000,         // ✅ 25s idle timeout (close unused faster)
        
        // Query Timeouts
        query_timeout: 25000,             // ✅ 25s query timeout
        statement_timeout: 25000,         // ✅ 25s statement timeout
        
        // Pool Management
        allowExitOnIdle: false,           // ✅ Keep pool alive even when idle
        
        // Keep-Alive (prevents connection drops)
        keepAlive: true,
        keepAliveInitialDelayMillis: 3000 // ✅ Start keepalive after 3s
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
      connectionTimeoutMillis: 30000,
      query_timeout: 30000,
      statement_timeout: 30000,
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: 3000
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

if (poolConfig) {
  pool = new Pool(poolConfig);

  // Log connection info (without sensitive data)
  console.log('🔧 Database pool configured:');
  console.log(`   Host: ${poolConfig.host}`);
  console.log(`   Database: ${poolConfig.database}`);
  console.log(`   Port: ${poolConfig.port}`);
  console.log(`   SSL: ${poolConfig.ssl ? 'Enabled' : 'Disabled'}`);
  console.log(`   Max Connections: ${poolConfig.max}`);
  console.log(`   Connection Timeout: ${poolConfig.connectionTimeoutMillis}ms`);

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
    isHealthy = false;
    
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
    
    // ✅ Auto-recovery for timeout/connection reset errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
      console.log('🔄 Attempting automatic recovery...');
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * consecutiveFailures, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const testClient = await pool.connect();
        await testClient.query('SELECT 1');
        testClient.release();
        console.log('✅ Auto-recovery successful');
        consecutiveFailures = 0;
        isHealthy = true;
      } catch (recoverError) {
        console.error('❌ Auto-recovery failed:', recoverError.message);
      }
    }
  });

  // ✅ REMOVE EVENT: Client removed from pool
  pool.on('remove', (client) => {
    // Only log if pool is unhealthy to reduce noise
    if (!isHealthy || pool.idleCount === 0) {
      console.log('🔌 Database client removed from pool');
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
        const connectionPromise = pool.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 30000)
        );
        
        const client = await Promise.race([connectionPromise, timeoutPromise]);
        
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
          // Exponential backoff: 2s, 3s, 4s, 5s
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
  
  // ✅ HEALTH MONITORING: Check pool health every 30 seconds
  setInterval(async () => {
    try {
      const poolStatus = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // Only log detailed status if there are issues
      if (poolStatus.waiting > 0 || poolStatus.idle === 0 || !isHealthy) {
        console.log('⚠️ Pool health check - Status:', poolStatus);
      }
      
      // Quick health check with 5s timeout
      const healthCheckPromise = pool.query('SELECT 1 as health');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
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
      
      console.error('❌ Pool health check failed:', {
        error: healthError.message,
        consecutiveFailures,
        poolStatus: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      });
      
      // ✅ Try forced recovery if multiple failures
      if (consecutiveFailures >= 2) {
        console.log('🔄 Attempting forced connection recovery...');
        
        try {
          const client = await pool.connect();
          await client.query('SELECT NOW()');
          client.release();
          console.log('✅ Forced connection successful');
          consecutiveFailures = 0;
          isHealthy = true;
        } catch (forceError) {
          console.error('❌ Forced connection failed:', forceError.message);
          
          // If 5+ consecutive failures, suggest restart
          if (consecutiveFailures >= 5) {
            console.error('🚨 CRITICAL: 5+ consecutive connection failures');
            console.error('   Consider restarting the server or checking Supabase status');
          }
        }
      }
    }
  }, 30000); // Every 30 seconds

  // ✅ GRACEFUL SHUTDOWN: Handle termination signals
  const shutdownHandler = async (signal) => {
    console.log(`🛑 ${signal} received, closing database pool gracefully...`);
    
    try {
      // Give existing queries 10s to complete
      await Promise.race([
        pool.end(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Pool close timeout')), 10000)
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
module.exports.closePool = closePool;
module.exports.testConnection = testConnection;
module.exports.getPoolStatus = getPoolStatus;
module.exports.isConfigured = !!poolConfig;