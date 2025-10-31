/**
 * ====================================
 * Authentication Routes
 * ====================================
 * Purpose: Handle admin login, logout, and token verification
 * Routes: /api/auth/*
 * ====================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getAdminByUsername, updateLastLogin } = require('../models/contentModel');
const { generateToken, authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authenticate admin and return JWT token
 * Body: { username: string, password: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    // Validate input types
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format',
      });
    }

    // Get admin from database
    const result = await getAdminByUsername(username);
    
    if (!result.success || !result.data) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const admin = result.data;

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
    });

    // Update last login timestamp
    await updateLastLogin(admin.id);

    // Log successful login
    console.log(`✅ Admin logged in: ${admin.username} (${admin.role})`);

    // Return response (without password hash)
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
        },
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

/**
 * POST /api/auth/logout
 * Logout admin (client-side token deletion)
 * This is mostly handled on client side, but endpoint exists for logging
 */
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // Log logout
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

/**
 * GET /api/auth/verify
 * Verify if current JWT token is valid
 * Requires: Authorization header with Bearer token
 */
router.get('/verify', authenticateToken, (req, res) => {
  try {
    // If authenticateToken middleware passed, token is valid
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

/**
 * GET /api/auth/me
 * Get current authenticated admin's full profile
 * Requires: Authorization header with Bearer token
 */
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