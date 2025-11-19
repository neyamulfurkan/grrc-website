/**
 * ====================================
 * Authentication Middleware
 * ====================================
 * Purpose: JWT-based authentication for protecting admin routes
 * Verifies JWT tokens and attaches user info to request object
 * Includes role-based access control and permission checking
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
    console.log('❌ No token provided in request');
    return res.status(401).json({
      success: false,
      error: 'Access token required. Please login first.',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // CRITICAL FIX: Normalize permissions - ensure it's always an object
    if (decoded.permissions) {
      if (typeof decoded.permissions === 'string') {
        try {
          decoded.permissions = JSON.parse(decoded.permissions);
        } catch (e) {
          console.error('❌ Failed to parse token permissions string:', e);
          decoded.permissions = {};
        }
      }
    } else {
      decoded.permissions = {};
    }
    
    // Normalize is_super_admin flag
    decoded.is_super_admin = decoded.is_super_admin === true || decoded.is_super_admin === 1 || decoded.role === 'Super Admin';
    
    // Attach user info to request object
    req.user = decoded;
    
    // Log authentication (optional, for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ User authenticated:', decoded.username, 'Permissions:', decoded.permissions);
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
 * Checks both role-based and flag-based super admin status
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

  // Check both role-based and flag-based super admin status
  const isSuperAdminByRole = req.user.role === 'Super Admin';
  const isSuperAdminByFlag = req.user.is_super_admin === true;
  
  if (!isSuperAdminByRole && !isSuperAdminByFlag) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super Admin privileges required.',
    });
  }

  // User is Super Admin, proceed
  next();
}

/**
 * Check if user has specific permission
 * Usage: checkPermission('members', 'create')
 * Super admins automatically have all permissions
 * @param {string} module - Module name (e.g., 'members', 'events')
 * @param {string} action - Action type (e.g., 'create', 'edit', 'delete')
 * @returns {Function} Express middleware function
 */
function checkPermission(module, action) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    // Super admin has all permissions - CHECK ROLE FIRST
    if (req.user.role === 'Super Admin' || req.user.is_super_admin === true) {
      console.log(`✅ Super Admin bypassing permission check for ${module}.${action}`);
      return next();
    }
    
    // Check if admin account is active
    if (req.user.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact a Super Admin.',
      });
    }
    
    // Check specific permission
    let permissions = req.user.permissions;
    
    // CRITICAL FIX: Handle permissions being a string (JSON)
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        console.error('❌ Failed to parse permissions JSON:', e);
        permissions = {};
      }
    }
    
    // Ensure permissions is an object
    if (!permissions || typeof permissions !== 'object') {
      console.warn(`⚠️ Admin ${req.user.username} has invalid permissions:`, permissions);
      return res.status(403).json({
        success: false,
        error: `Permission denied: Invalid permissions structure. Contact your Super Admin.`,
      });
    }
    
    // Check if module exists and has the action permission set to true
    if (!permissions[module] || permissions[module][action] !== true) {
      console.warn(`❌ Permission denied for ${req.user.username}: ${module}.${action}`, {
        hasModule: !!permissions[module],
        modulePerms: permissions[module],
        actionValue: permissions[module]?.[action]
      });
      return res.status(403).json({
        success: false,
        error: `Permission denied: You don't have permission to ${action} ${module}.`,
      });
    }
    
    // ✅ FIXED: Check if approval is required for CREATE actions
    if (action === 'create') {
      const approvalRequired = await checkApprovalRequired(module);
      if (approvalRequired) {
        console.log(`⏳ Approval required for ${req.user.username}: ${module}.${action} - BLOCKING AND CREATING PENDING APPROVAL`);
        
        // Create pending approval request
        const pool = require('../db/pool');
        try {
          const result = await pool.query(
            `INSERT INTO pending_approvals (admin_id, action_type, module, item_data, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING id`,
            [req.user.id, action, module, JSON.stringify(req.body)]
          );
          
          console.log(`✅ Pending approval created: ID ${result.rows[0].id}`);
          
          return res.status(202).json({
            success: true,
            message: `Your ${module} creation request has been submitted for Super Admin approval.`,
            requiresApproval: true,
            pending: true,
            approvalId: result.rows[0].id
          });
        } catch (error) {
          console.error('❌ Failed to create approval request:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to submit approval request. Please contact your administrator.'
          });
        }
      }
    }
    
    console.log(`✅ Permission granted for ${req.user.username}: ${module}.${action}`);
    next();
  };
}

/**
 * Check if approval is required for a specific action
 * Queries super_admin_settings table
 * @param {string} module - Module name
 * @param {string} action - Action type
 * @returns {Promise<boolean>} True if approval required, false otherwise
 */
async function checkApprovalRequired(module) {
  try {
    const pool = require('../db/pool');
    const settingKey = `require_approval_${module}`;
    
    const result = await pool.query(
      'SELECT setting_value FROM super_admin_settings WHERE setting_key = $1',
      [settingKey]
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log(`ℹ️ No approval setting found for ${module}, defaulting to false`);
      return false;
    }
    
    const isRequired = result.rows[0].setting_value === 'true';
    console.log(`🔍 Approval required for ${module}: ${isRequired}`);
    return isRequired;
  } catch (error) {
    console.error('❌ Check approval required error:', error);
    return false; // Default to no approval required on error
  }
}

/**
 * Create a pending approval request
 * Used when an admin action requires super admin approval
 * @param {number} adminId - ID of admin making the request
 * @param {string} actionType - Type of action (e.g., 'create', 'edit', 'delete')
 * @param {string} module - Module name
 * @param {Object} itemData - Data for the action
 * @returns {Promise<Object>} Result object with success status and approval ID
 */
async function createApprovalRequest(adminId, actionType, module, itemData) {
  try {
    const pool = require('../db/pool');
    
    const [result] = await pool.query(
      `INSERT INTO pending_approvals (admin_id, action_type, module, item_data, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [adminId, actionType, module, JSON.stringify(itemData)]
    );
    
    return { success: true, id: result[0].id };
  } catch (error) {
    console.error('❌ Create approval request error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate JWT token with payload
 * @param {Object} payload - Data to encode in token (e.g., { id, username, role, permissions })
 * @param {string} expiresIn - Token expiration (optional, defaults to env variable)
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = null) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
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
    console.error('❌ Token verification failed:', error.message);
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
    console.error('❌ Token decode failed:', error.message);
    return null;
  }
}

module.exports = {
  authenticateToken,
  isAdmin,
  isSuperAdmin,
  checkPermission,
  checkApprovalRequired,
  createApprovalRequest,
  generateToken,
  verifyToken,
  decodeToken,
};