/**
 * GSTU Robotics Club - Express.js Server
 * ======================================
 * Main entry point for the backend API server.
 * 
 * PRODUCTION-READY VERSION with Flexible CORS Configuration
 * - Supports file:// protocol (direct HTML opening)
 * - Supports localhost development on any port
 * - Supports production deployment with custom domains
 * - Comprehensive error handling and logging
 * - Database connection pooling and health checks
 * 
 * Features:
 * - RESTful API endpoints for club content management
 * - JWT-based authentication for admin operations
 * - PostgreSQL database integration
 * - Security middleware (Helmet, CORS)
 * - Request logging and error handling
 * - Graceful shutdown handling
 * 
 * Routes:
 * - GET  /                    - Health check
 * - POST /api/auth/*          - Authentication endpoints
 * - GET  /api/content/*       - Public content endpoints
 * - *    /api/admin/*         - Protected admin endpoints (requires auth)
 * 
 * @author GSTU Robotics Club
 * @version 2.0.0 - Production Ready with Flexible CORS
 */

// ============ DEPENDENCIES ============

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// ============ INITIALIZE EXPRESS ============

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============ CORS CONFIGURATION ============

/**
 * Advanced CORS Configuration
 * Supports multiple scenarios:
 * 1. Local development (file:// protocol)
 * 2. Localhost servers (any port)
 * 3. Production domains (from environment)
 * 4. Mobile apps and API clients (no origin)
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Log incoming origin for debugging (only in development)
        if (NODE_ENV === 'development') {
            console.log(`🌐 CORS Request from origin: ${origin || 'no-origin (file:// or direct)'}`);
        }

        // SCENARIO 1: No origin (file://, mobile apps, curl, Postman)
        if (!origin) {
            console.log('✅ CORS: Allowing request with no origin (file:// or API client)');
            return callback(null, true);
        }

        // SCENARIO 2: Localhost development (any port)
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            console.log('✅ CORS: Allowing localhost origin:', origin);
            return callback(null, true);
        }

        // SCENARIO 3: Explicit allowed origins from environment
        const allowedOrigins = [
            process.env.CORS_ORIGIN,
            process.env.FRONTEND_URL,
            process.env.PRODUCTION_URL,
        ].filter(Boolean); // Remove undefined/null values

        if (allowedOrigins.includes(origin)) {
            console.log('✅ CORS: Allowing whitelisted origin:', origin);
            return callback(null, true);
        }

        // SCENARIO 4: Development mode - allow all
        if (NODE_ENV === 'development') {
            console.log('✅ CORS: Allowing all origins in development mode');
            return callback(null, true);
        }

        // SCENARIO 5: Production - strict checking
        console.warn('⚠️ CORS: Blocked origin:', origin);
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Total-Count'
    ],
    maxAge: 600, // Cache preflight for 10 minutes
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// ============ MIDDLEWARE CONFIGURATION ============

/**
 * Security Middleware
 * - Sets various HTTP headers for security
 * - Protects against common vulnerabilities
 * - Relaxed for development, strict for production
 */
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * Apply CORS middleware
 */
app.use(cors(corsOptions));

/**
 * Handle preflight requests explicitly
 * Some browsers send OPTIONS before actual request
 */
app.options('*', cors(corsOptions));

/**
 * Body Parsing Middleware
 * - Increased limit to 10MB for base64 image uploads
 * - Parses JSON and URL-encoded bodies
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * HTTP Request Logging
 * - Detailed in development, minimal in production
 */
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    // Combined format in production (includes IP, user agent)
    app.use(morgan('combined'));
}

/**
 * Request Timestamp and ID Middleware
 * - Adds timestamp and unique ID to all requests for tracking
 */
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.requestId);
    
    next();
});

/**
 * Security headers for all responses
 */
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ============ ROUTES ============

/**
 * Root Health Check Endpoint
 * GET /
 * Returns server status and basic information
 */
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'GSTU Robotics Club API Server',
        version: '2.0.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        status: 'operational'
    });
});

/**
 * Detailed Health Check Endpoint
 * GET /health
 * Used by monitoring tools and load balancers
 */
app.get('/health', async (req, res) => {
    try {
        const pool = require('./db/pool');
        
        // Test database connection with timeout
        const dbCheckPromise = pool.query('SELECT NOW() as time, version() as version');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), 5000)
        );
        
        const result = await Promise.race([dbCheckPromise, timeoutPromise]);
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            database: {
                status: 'connected',
                serverTime: result.rows[0].time,
                version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
            },
            environment: NODE_ENV,
            nodejs: process.version
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: {
                status: 'disconnected',
                error: error.message
            },
            environment: NODE_ENV
        });
    }
});

// ============ DYNAMIC ROUTE LOADING ============

/**
 * Load routes dynamically with comprehensive error handling
 * This prevents the entire server from crashing if a route file has issues
 */

// Authentication Routes
try {
    console.log('📂 Loading authentication routes...');
    const authRoutes = require('./routes/auth');
    if (typeof authRoutes === 'function' || (authRoutes && typeof authRoutes === 'object')) {
        app.use('/api/auth', authRoutes);
        console.log('✅ Authentication routes loaded');
    } else {
        throw new Error('auth routes did not export a valid router');
    }
} catch (error) {
    console.error('❌ Failed to load authentication routes:', error.message);
    console.error('   Make sure ./routes/auth.js exists and exports a router');
    if (NODE_ENV === 'development') {
        console.error('   Stack:', error.stack);
    }
}

// Public Content Routes
try {
    console.log('📂 Loading content routes...');
    const contentRoutes = require('./routes/content');
    if (typeof contentRoutes === 'function' || (contentRoutes && typeof contentRoutes === 'object')) {
        app.use('/api/content', contentRoutes);
        console.log('✅ Content routes loaded');
    } else {
        throw new Error('content routes did not export a valid router');
    }
} catch (error) {
    console.error('❌ Failed to load content routes:', error.message);
    console.error('   Make sure ./routes/content.js exists and exports a router');
    if (NODE_ENV === 'development') {
        console.error('   Stack:', error.stack);
    }
}

// Admin Routes (Protected)
try {
    console.log('📂 Loading admin routes...');
    const adminRoutes = require('./routes/admin');
    if (typeof adminRoutes === 'function' || (adminRoutes && typeof adminRoutes === 'object')) {
        app.use('/api/admin', adminRoutes);
        console.log('✅ Admin routes loaded');
    } else {
        throw new Error('admin routes did not export a valid router');
    }
} catch (error) {
    console.error('❌ Failed to load admin routes:', error.message);
    console.error('   Make sure ./routes/admin.js exists and exports a router');
    if (NODE_ENV === 'development') {
        console.error('   Stack:', error.stack);
    }
}

/**
 * API Documentation Route
 * GET /api
 * Returns list of available endpoints
 */
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'GSTU Robotics Club API',
        version: '2.0.0',
        documentation: 'https://github.com/gstu-robotics/grrc-website',
        endpoints: {
            health: {
                'GET /': 'Server status',
                'GET /health': 'Detailed health check'
            },
            auth: {
                'POST /api/auth/login': 'Login with username and password',
                'POST /api/auth/logout': 'Logout current session',
                'GET /api/auth/verify': 'Verify authentication token',
                'GET /api/auth/me': 'Get current admin profile'
            },
            content: {
                'GET /api/content/config': 'Get club configuration',
                'GET /api/content/members': 'Get all members (with filters)',
                'GET /api/content/members/:id': 'Get member by ID',
                'GET /api/content/events': 'Get all events (with filters)',
                'GET /api/content/events/:id': 'Get event by ID',
                'GET /api/content/projects': 'Get all projects (with filters)',
                'GET /api/content/projects/:id': 'Get project by ID',
                'GET /api/content/gallery': 'Get gallery items (with filters)',
                'GET /api/content/gallery/:id': 'Get gallery item by ID',
                'GET /api/content/announcements': 'Get active announcements',
                'GET /api/content/statistics': 'Get club statistics'
            },
            admin: {
                note: 'All admin endpoints require JWT token in Authorization header',
                config: 'PUT /api/admin/config - Update club configuration',
                members: 'POST/PUT/DELETE /api/admin/members - Manage members',
                events: 'POST/PUT/DELETE /api/admin/events - Manage events',
                projects: 'POST/PUT/DELETE /api/admin/projects - Manage projects',
                gallery: 'POST/PUT/DELETE /api/admin/gallery - Manage gallery',
                announcements: 'POST/PUT/DELETE /api/admin/announcements - Manage announcements',
                admins: 'GET/POST/PUT/DELETE /api/admin/admins - Manage admin users'
            }
        },
        cors: {
            note: 'CORS is configured to accept requests from:',
            allowed: [
                'file:// protocol (local HTML files)',
                'localhost on any port',
                'Custom domains specified in environment variables'
            ]
        }
    });
});

// ============ ERROR HANDLING ============

/**
 * 404 Handler - Unknown Routes
 * Catches all requests that don't match any route
 */
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        availableRoutes: '/api'
    });
});

/**
 * Global Error Handler
 * Must be the last middleware
 * Catches all errors from routes and other middleware
 */
app.use((err, req, res, next) => {
    // Log error details
    console.error('❌ Error:', err.message);
    console.error('   Request ID:', req.requestId);
    console.error('   Path:', req.path);
    console.error('   Method:', req.method);
    
    if (NODE_ENV === 'development') {
        console.error('   Stack:', err.stack);
    }

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Don't expose internal errors in production
    const errorMessage = NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message || 'Internal server error';

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        ...(NODE_ENV === 'development' && { 
            stack: err.stack,
            details: err.details || null
        })
    });
});

// ============ SERVER STARTUP ============

/**
 * Start the Express server
 * - Tests database connection first
 * - Starts HTTP server on configured port
 * - Sets up graceful shutdown handlers
 * - Validates environment configuration
 */
async function startServer() {
    try {
        // Validate environment variables
        console.log('🔍 Validating environment configuration...');
        const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
            console.warn('   Server will start but some features may not work');
        }

        // Test database connection
        console.log('🔍 Testing database connection...');
        
        try {
            const { testConnection } = require('./config/database');
            const dbTest = await testConnection();
            
            if (dbTest.success) {
                console.log('✅ Database connected successfully');
                console.log(`   Database: ${process.env.DB_NAME}`);
                console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
            } else {
                throw new Error(dbTest.error);
            }
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError.message);
            console.warn('   Server will start but database operations will fail');
            console.warn('   Please check your .env file and database configuration');
            console.warn('   Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
        }

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log('\n╔════════════════════════════════════════════════════════╗');
            console.log('║     GSTU Robotics Club API Server - STARTED          ║');
            console.log('╚════════════════════════════════════════════════════════╝\n');
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📝 Environment: ${NODE_ENV}`);
            console.log(`🔒 CORS Configuration:`);
            
            if (NODE_ENV === 'development') {
                console.log(`   ✅ Accepting requests from ANY origin (development mode)`);
                console.log(`   ✅ file:// protocol supported`);
                console.log(`   ✅ All localhost ports supported`);
            } else {
                console.log(`   ✅ Production mode - restricted origins`);
                if (process.env.CORS_ORIGIN) {
                    console.log(`   ✅ Allowed: ${process.env.CORS_ORIGIN}`);
                }
            }
            
            console.log(`\n📊 Database: ${process.env.DB_NAME || 'not configured'}`);
            console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : '❌ missing'}`);
            console.log(`\n💡 API Documentation: http://localhost:${PORT}/api`);
            console.log(`💡 Health Check: http://localhost:${PORT}/health`);
            console.log(`\n📖 Ready to accept requests!\n`);
        });

        // Increase keep-alive timeout for long-running requests
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        /**
         * Graceful Shutdown Handler
         * - Closes HTTP server first (stop accepting new connections)
         * - Waits for existing requests to complete
         * - Closes database connection pool
         * - Exits process with appropriate code
         */
        const gracefulShutdown = async (signal) => {
            console.log(`\n⚠️  ${signal} received. Initiating graceful shutdown...`);
            
            // Stop accepting new connections
            server.close(async () => {
                console.log('✅ HTTP server closed (no longer accepting requests)');
                
                try {
                    // Close database connections
                    const pool = require('./db/pool');
                    await pool.end();
                    console.log('✅ Database connections closed');
                    console.log('✅ All resources cleaned up');
                    console.log('👋 Goodbye!\n');
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error during shutdown:', error.message);
                    process.exit(1);
                }
            });

            // Force shutdown after 10 seconds if graceful shutdown fails
            setTimeout(() => {
                console.error('❌ Graceful shutdown timeout. Forcing shutdown...');
                process.exit(1);
            }, 10000);
        };

        // Register shutdown handlers
        process.on('SIGINT', () => gracefulShutdown('SIGINT (Ctrl+C)'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise);
            console.error('   Reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

    } catch (error) {
        console.error('\n╔════════════════════════════════════════════════════════╗');
        console.error('║     ❌ FAILED TO START SERVER                          ║');
        console.error('╚════════════════════════════════════════════════════════╝\n');
        console.error('Error:', error.message);
        console.error('\n🔍 Troubleshooting:');
        console.error('   1. Check if PostgreSQL is running');
        console.error('   2. Verify .env file exists with correct values');
        console.error('   3. Ensure port', PORT, 'is not already in use');
        console.error('   4. Run: npm install (to check dependencies)');
        console.error('   5. Check that ./routes/ directory exists with route files\n');
        
        if (NODE_ENV === 'development') {
            console.error('Stack trace:', error.stack);
        }
        
        console.error('\n📧 Need help? Check the documentation or contact the team\n');
        process.exit(1);
    }
}

// ============ START THE SERVER ============

// Only start server if this file is run directly (not imported)
if (require.main === module) {
    startServer();
}

// Export app for testing purposes
module.exports = app;