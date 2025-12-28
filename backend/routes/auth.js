const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getAdminByUsername, updateLastLogin } = require('../models/contentModel');
const { generateToken, authenticateToken, isSuperAdmin } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format',
      });
    }

    const result = await getAdminByUsername(username);
    
    if (!result.success || !result.data) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const admin = result.data;
    
    // CRITICAL DEBUG: Check permissions from database
    console.log('📋 Admin data from database:', {
      username: admin.username,
      role: admin.role,
      is_super_admin: admin.is_super_admin,
      permissions: admin.permissions,
      permissions_type: typeof admin.permissions,
      permissions_content: admin.permissions ? JSON.stringify(admin.permissions) : 'null'
    });
    
    // CRITICAL FIX: Verify permissions exist and are valid
    if (!admin.permissions || Object.keys(admin.permissions).length === 0) {
      console.warn('⚠️ Admin has no permissions set!');
    }

    console.log('🔍 Comparing password for admin:', username);
    console.log('📋 Password received:', password);
    console.log('📋 Password length:', password.length);
    console.log('📋 Password hash from DB:', admin.password_hash);
    console.log('📋 Hash length:', admin.password_hash.length);
    
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('🔐 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password mismatch for admin:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // CRITICAL: Ensure permissions is properly serialized
    let permissions = admin.permissions || {};
    
    // If permissions is a string (from JSONB), parse it
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        console.error('Failed to parse permissions:', e);
        permissions = {};
      }
    }
    
    console.log('🔐 Preparing token payload with permissions...');
    
    // CRITICAL FIX: Ensure permissions is always a plain object, never a string
    let finalPermissions = permissions;
    if (typeof permissions === 'string') {
      try {
        finalPermissions = JSON.parse(permissions);
      } catch (e) {
        console.error('Failed to parse permissions:', e);
        finalPermissions = {};
      }
    }
    
    console.log('🔐 Token payload:', {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      is_super_admin: admin.is_super_admin || false,
      permissions: finalPermissions,
      permissionsType: typeof finalPermissions
    });
    
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      is_super_admin: admin.is_super_admin || false,
      permissions: finalPermissions
    });
    
    console.log('✅ Token generated successfully');

    await updateLastLogin(admin.id);

    console.log(`✅ Admin logged in: ${admin.username} (${admin.role}) [Super: ${admin.is_super_admin}]`);

    // CRITICAL FIX: Ensure permissions are properly formatted in response
    const adminResponse = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      is_super_admin: admin.is_super_admin || false,
      permissions: finalPermissions, // Use the normalized permissions
      is_active: admin.is_active !== false
    };
    
    console.log('📤 Sending login response with permissions:', {
      username: adminResponse.username,
      permissionsKeys: Object.keys(adminResponse.permissions)
    });
    
    res.json({
      success: true,
      data: {
        token,
        admin: adminResponse,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

router.post('/verify-superadmin', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    const { getAdminById } = require('../models/contentModel');
    const result = await getAdminById(req.user.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    
    const admin = result.data;
    
    if (!admin.is_super_admin) {
      return res.status(403).json({
        success: false,
        error: 'Not a super admin'
      });
    }
    
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
      console.log(`❌ Failed super admin access attempt by ${admin.username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }
    
    const superAdminToken = generateToken(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        is_super_admin: true,
        permissions: admin.permissions || {}
      },
      '30m'
    );
    
    console.log(`✅ Super admin access granted to ${admin.username}`);
    
    res.json({
      success: true,
      data: {
        token: superAdminToken
      },
      message: 'Super admin access granted'
    });
    
  } catch (error) {
    console.error('Super admin verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

router.post('/change-password', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    const pool = require('../db/pool');
    
    const admin = await pool.query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [req.user.id]
    );
    
    if (admin.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, admin.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  try {
    console.log(`👋 Admin logged out: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

router.get('/verify', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
      },
      message: 'Token is valid',
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
    });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { getAdminById } = require('../models/contentModel');
    const result = await getAdminById(req.user.id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Admin profile not found',
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
});

module.exports = router;