/**
 * ====================================
 * Authentication Middleware
 * ====================================
 * Purpose: JWT-based authentication for protecting admin routes
 * Verifies JWT tokens and attaches user info to request object
 * ====================================
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Authenticate JWT token from Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticateToken(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required. Please login first.',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request object
    req.user = decoded;
    
    // Log authentication (optional, for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ User authenticated:', decoded.username);
    }
    
    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        error: 'Token expired. Please login again.',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token. Please login again.',
      });
    }
    
    // Generic error
    return res.status(403).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
}

/**
 * Check if authenticated user is an admin
 * Must be used after authenticateToken middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function isAdmin(req, res, next) {
  // Check if user info exists (should be set by authenticateToken)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
  }

  // Check if user has admin role
  const adminRoles = ['Admin', 'Super Admin', 'Moderator'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.',
    });
  }

  // User is admin, proceed
  next();
}

/**
 * Check if authenticated user is a Super Admin
 * Must be used after authenticateToken middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function isSuperAdmin(req, res, next) {
  // Check if user info exists
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
  }

  // Check if user is Super Admin
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super Admin privileges required.',
    });
  }

  // User is Super Admin, proceed
  next();
}

/**
 * Generate JWT token with payload
 * @param {Object} payload - Data to encode in token (e.g., { id, username, role })
 * @param {string} expiresIn - Token expiration (optional, defaults to env variable)
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = null) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h',
    }
  );
}

/**
 * Verify JWT token without middleware (useful for manual verification)
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null if invalid
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode failed:', error.message);
    return null;
  }
}

module.exports = {
  authenticateToken,
  isAdmin,
  isSuperAdmin,
  generateToken,
  verifyToken,
  decodeToken,
};