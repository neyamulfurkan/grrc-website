/**
 * GSTU Robotics & Research Club - Express.js Server
 * ======================================
 * Production-ready backend API server for Render deployment
 * 
 * @author GSTU Robotics & Research Club
 * @version 2.4.0 - Super Admin Routes Added
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

const corsOptions = {
    origin: function (origin, callback) {
        // Always allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) {
            return callback(null, true);
        }

        // Allow localhost and GitHub Pages
        if (origin.includes('localhost') || 
            origin.includes('127.0.0.1') ||
            origin.includes('github.io') ||
            origin.includes('neyamulfurkan.github.io')) {
            return callback(null, true);
        }

        // Allow specific origins from environment
        const allowedOrigins = [
            process.env.CORS_ORIGIN,
            process.env.FRONTEND_URL,
            process.env.PRODUCTION_URL,
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow all origins in development and production (can restrict later)
        return callback(null, true);
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
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
    maxAge: 600,
    optionsSuccessStatus: 204
};

// ============ MIDDLEWARE CONFIGURATION ============

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Request tracking middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ============ ROUTES ============

/**
 * Root Health Check
 */
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'GSTU Robotics & Research Club API Server',
        version: '2.4.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        status: 'operational'
    });
});

/**
 * Detailed Health Check
 */
app.get('/health', async (req, res) => {
    const health = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: NODE_ENV,
        nodejs: process.version,
        database: {
            status: 'not_configured'
        }
    };

    // Try to check database if configured
    try {
        if (process.env.DATABASE_URL || process.env.DB_HOST) {
            const pool = require('./db/pool');
            const result = await Promise.race([
                pool.query('SELECT NOW() as time'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), 3000)
                )
            ]);
            
            health.database = {
                status: 'connected',
                serverTime: result.rows[0].time
            };
        }
    } catch (error) {
        health.database = {
            status: 'error',
            error: error.message
        };
        health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

// ============ DYNAMIC ROUTE LOADING WITH ERROR HANDLING ============

let routesLoaded = {
    auth: false,
    content: false,
    admin: false,
    membership: false,
    alumniApplication: false,
    superadmin: false,
    upload: false
};

/**
 * Safe route loader - doesn't crash if route file is missing
 */
function loadRoute(name, path, mountPath) {
    try {
        console.log(`📂 Loading ${name} routes...`);
        const routeModule = require(path);
        
        if (typeof routeModule === 'function' || (routeModule && typeof routeModule === 'object')) {
            app.use(mountPath, routeModule);
            console.log(`✅ ${name} routes loaded successfully`);
            routesLoaded[name] = true;
            return true;
        } else {
            throw new Error(`${name} routes did not export a valid router`);
        }
    } catch (error) {
        console.error(`❌ Failed to load ${name} routes:`, error.message);
        console.error(`   Path: ${path}`);
        
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error(`   File not found. Creating placeholder route...`);
        } else {
            console.error(`   Error: ${error.message}`);
        }
        
        if (NODE_ENV === 'development') {
            console.error(`   Stack:`, error.stack);
        }
        
        // Create placeholder route
        createPlaceholderRoute(mountPath, name);
        return false;
    }
}

/**
 * Create placeholder routes for missing route files
 */
function createPlaceholderRoute(mountPath, routeName) {
    const router = express.Router();
    
    router.all('*', (req, res) => {
        res.status(503).json({
            success: false,
            error: `${routeName} routes are not available`,
            message: `The ${routeName} module failed to load. Please check server logs.`,
            route: mountPath,
            timestamp: new Date().toISOString()
        });
    });
    
    app.use(mountPath, router);
    console.log(`⚠️  Placeholder route created for ${mountPath}`);
}

// ✅ Load ALL routes using the dynamic loader
loadRoute('auth', './routes/auth', '/api/auth');
loadRoute('content', './routes/content', '/api/content');
loadRoute('admin', './routes/admin', '/api/admin');
loadRoute('membership', './routes/membership', '/api/membership');
loadRoute('alumniApplication', './routes/alumniApplication', '/api/alumni-application');

// ============ SUPER ADMIN ROUTES ============
loadRoute('superadmin', './routes/superadmin', '/api/superadmin');

// ============ UPLOAD ROUTES ============
loadRoute('upload', './routes/upload', '/api/upload');

/**
 * API Documentation
 */
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'GSTU Robotics & Research Club API Server',
        version: '2.4.0',
        documentation: 'https://github.com/gstu-robotics/grrc-website',
        routesLoaded: routesLoaded,
        endpoints: {
            health: {
                'GET /': 'Server status',
                'GET /health': 'Detailed health check'
            },
            auth: routesLoaded.auth ? {
                'POST /api/auth/login': 'Login',
                'POST /api/auth/logout': 'Logout',
                'GET /api/auth/verify': 'Verify token',
                'GET /api/auth/me': 'Get profile',
                'POST /api/auth/verify-superadmin': 'Verify super admin password'
            } : 'Routes not loaded',
            content: routesLoaded.content ? {
                'GET /api/content/*': 'Public content endpoints'
            } : 'Routes not loaded',
            admin: routesLoaded.admin ? {
                'ALL /api/admin/*': 'Protected admin endpoints'
            } : 'Routes not loaded',
            membership: routesLoaded.membership ? {
                'POST /api/membership/apply': 'Submit membership application',
                'GET /api/membership/applications': 'Get all applications (admin)',
                'GET /api/membership/applications/:id': 'Get specific application',
                'POST /api/membership/applications/:id/approve': 'Approve application',
                'POST /api/membership/applications/:id/reject': 'Reject application',
                'DELETE /api/membership/applications/:id': 'Delete application',
                'GET /api/membership/statistics': 'Get application statistics'
            } : 'Routes not loaded',
            alumniApplication: routesLoaded.alumniApplication ? {
                'POST /api/alumni-application/apply': 'Submit alumni application',
                'GET /api/alumni-application/applications': 'Get all applications (admin)',
                'GET /api/alumni-application/applications/:id': 'Get specific application',
                'POST /api/alumni-application/applications/:id/approve': 'Approve application',
                'POST /api/alumni-application/applications/:id/reject': 'Reject application',
                'DELETE /api/alumni-application/applications/:id': 'Delete application',
                'GET /api/alumni-application/statistics': 'Get application statistics'
            } : 'Routes not loaded',
            superadmin: routesLoaded.superadmin ? {
                'GET /api/superadmin/dashboard': 'Super admin dashboard stats',
                'GET /api/superadmin/admins': 'Get all admins',
                'POST /api/superadmin/admins': 'Create new admin',
                'PUT /api/superadmin/admins/:id': 'Update admin details',
                'DELETE /api/superadmin/admins/:id': 'Delete admin',
                'POST /api/superadmin/admins/:id/approve': 'Approve pending admin',
                'POST /api/superadmin/admins/:id/reject': 'Reject pending admin',
                'GET /api/superadmin/activity-logs': 'Get system activity logs',
                'GET /api/superadmin/backup': 'Trigger database backup',
                'POST /api/superadmin/restore': 'Restore from backup'
            } : 'Routes not loaded'
        }
    });
});

// ============ ERROR HANDLING ============

/**
 * 404 Handler
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
 */
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    console.error('   Request ID:', req.requestId);
    console.error('   Path:', req.path);
    
    if (NODE_ENV === 'development') {
        console.error('   Stack:', err.stack);
    }

    const statusCode = err.statusCode || err.status || 500;
    const errorMessage = NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============ SERVER STARTUP ============

async function startServer() {
    try {
        console.log('\n🔍 Validating environment configuration...');
        
        // Check for DATABASE_URL first (Render/Neon uses this)
        if (process.env.DATABASE_URL) {
            console.log('✅ DATABASE_URL found - using connection string');
        } else {
            const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
            const missingVars = requiredEnvVars.filter(v => !process.env[v]);
            
            if (missingVars.length > 0) {
                console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
                console.warn('   Server will start but database features will be limited');
            } else {
                console.log('✅ All required environment variables present');
            }
        }

        // Test database connection
        console.log('🔍 Testing database connection...');
        try {
            const pool = require('./db/pool');
            const result = await Promise.race([
                pool.query('SELECT NOW() as time, current_database() as db'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                )
            ]);
            
            console.log('✅ Database connected successfully');
            console.log(`   Database: ${result.rows[0].db}`);
            console.log(`   Server time: ${result.rows[0].time}`);
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError.message);
            console.warn('   Server will start anyway (degraded mode)');
        }

        // Start HTTP server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n╔════════════════════════════════════════════════════════╗');
            console.log('║  GSTU Robotics & Research Club API Server - STARTED   ║');
            console.log('╚════════════════════════════════════════════════════════╝\n');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 Environment: ${NODE_ENV}`);
            console.log(`🔒 CORS: ${NODE_ENV === 'development' ? 'Permissive (dev)' : 'Configured'}`);
             console.log(`\n📊 Routes Status:`);
            console.log(`   Auth:                ${routesLoaded.auth ? '✅' : '❌'}`);
            console.log(`   Content:             ${routesLoaded.content ? '✅' : '❌'}`);
            console.log(`   Admin:               ${routesLoaded.admin ? '✅' : '❌'}`);
            console.log(`   Membership:          ${routesLoaded.membership ? '✅' : '❌'}`);
            console.log(`   Alumni Application:  ${routesLoaded.alumniApplication ? '✅' : '❌'}`);
            console.log(`   Super Admin:         ${routesLoaded.superadmin ? '✅' : '❌'}`);
            console.log(`   Upload (Cloudinary): ${routesLoaded.upload ? '✅' : '❌'}`);
            console.log(`\n💡 Health Check: http://localhost:${PORT}/health`);
            console.log(`💡 API Docs: http://localhost:${PORT}/api`);
            console.log(`\n📖 Server ready!\n`);
        });

        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
            
            server.close(async () => {
                console.log('✅ HTTP server closed');
                
                try {
                    const pool = require('./db/pool');
                    await pool.end();
                    console.log('✅ Database connections closed');
                } catch (error) {
                    console.error('❌ Error closing database:', error.message);
                }
                
                console.log('👋 Goodbye!\n');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('❌ Graceful shutdown timeout. Forcing exit...');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error.message);
            if (NODE_ENV === 'development') {
                console.error(error.stack);
            }
            // Don't exit in production for uncaught exceptions
            if (NODE_ENV !== 'production') {
                gracefulShutdown('UNCAUGHT_EXCEPTION');
            }
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection:', reason);
            if (NODE_ENV === 'development') {
                console.error('   Promise:', promise);
            }
            // Don't exit in production for unhandled rejections
        });

    } catch (error) {
        console.error('\n╔════════════════════════════════════════════════════════╗');
        console.error('║     ❌ FAILED TO START SERVER                          ║');
        console.error('╚════════════════════════════════════════════════════════╝\n');
        console.error('Error:', error.message);
        
        if (NODE_ENV === 'development') {
            console.error('Stack:', error.stack);
        }
        
        console.error('\n🔍 Troubleshooting:');
        console.error('   1. Check environment variables in Render dashboard');
        console.error('   2. Verify database is created and accessible');
        console.error('   3. Check that route files exist');
        console.error('   4. Review build logs for missing dependencies\n');
        
        process.exit(1);
    }
}

// Start server
if (require.main === module) {
    startServer();
}

module.exports = app;