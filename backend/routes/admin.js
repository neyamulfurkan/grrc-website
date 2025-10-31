/**
 * ====================================
 * Admin Routes - Protected Content Management
 * ====================================
 * Purpose: CRUD operations for all content (requires authentication)
 * Routes: /api/admin/*
 * All routes require valid JWT token in Authorization header
 * ====================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const {
  updateClubConfig,
  createMember,
  updateMember,
  deleteMember,
  createEvent,
  updateEvent,
  deleteEvent,
  createProject,
  updateProject,
  deleteProject,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require('../models/contentModel');

// Apply authentication middleware to ALL admin routes
router.use(authenticateToken);
router.use(isAdmin);

// ====================================
// CLUB CONFIGURATION
// ====================================

/**
 * PUT /api/admin/config
 * Update club configuration
 * Body: { logo, name, motto, description, social_links }
 */
router.put('/config', async (req, res) => {
  try {
    const result = await updateClubConfig(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`✏️ Club config updated by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating club config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update club configuration',
    });
  }
});

// ====================================
// MEMBERS MANAGEMENT
// ====================================

/**
 * POST /api/admin/members
 * Create new member
 * Body: { name, photo, department, year, role, position, email, phone, bio, skills, joined_date }
 */
router.post('/members', async (req, res) => {
  try {
    // Validate required fields
    const { name, department, year, role, email } = req.body;
    if (!name || !department || !year || !role || !email) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: name, department, year, role, email',
      });
    }

    const result = await createMember(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Member created: ${name} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create member',
    });
  }
});

/**
 * PUT /api/admin/members/:id
 * Update member
 * Body: Partial member data
 */
router.put('/members/:id', async (req, res) => {
  try {
    const result = await updateMember(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Member updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update member',
    });
  }
});

/**
 * DELETE /api/admin/members/:id
 * Delete member
 */
router.delete('/members/:id', async (req, res) => {
  try {
    const result = await deleteMember(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Member deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete member',
    });
  }
});

// ====================================
// EVENTS MANAGEMENT
// ====================================

/**
 * POST /api/admin/events
 * Create new event
 * Body: { title, description, category, date, time, venue, image, status, registration_link, details, organizer }
 */
router.post('/events', async (req, res) => {
  try {
    // Validate required fields
    const { title, description, date, venue } = req.body;
    if (!title || !description || !date || !venue) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, description, date, venue',
      });
    }

    const result = await createEvent(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Event created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
    });
  }
});

/**
 * PUT /api/admin/events/:id
 * Update event
 * Body: Partial event data
 */
router.put('/events/:id', async (req, res) => {
  try {
    const result = await updateEvent(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Event updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
    });
  }
});

/**
 * DELETE /api/admin/events/:id
 * Delete event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const result = await deleteEvent(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Event deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
    });
  }
});

// ====================================
// PROJECTS MANAGEMENT
// ====================================

/**
 * POST /api/admin/projects
 * Create new project
 * Body: { title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date, features, achievements }
 */
router.post('/projects', async (req, res) => {
  try {
    // Validate required fields
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, description, category',
      });
    }

    const result = await createProject(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Project created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

/**
 * PUT /api/admin/projects/:id
 * Update project
 * Body: Partial project data
 */
router.put('/projects/:id', async (req, res) => {
  try {
    const result = await updateProject(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Project updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

/**
 * DELETE /api/admin/projects/:id
 * Delete project
 */
router.delete('/projects/:id', async (req, res) => {
  try {
    const result = await deleteProject(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Project deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

// ====================================
// GALLERY MANAGEMENT
// ====================================

/**
 * POST /api/admin/gallery
 * Create new gallery item
 * Body: { image, title, description, category, date, photographer }
 */
router.post('/gallery', async (req, res) => {
  try {
    // Validate required fields
    const { image, title, category, date } = req.body;
    if (!image || !title || !category || !date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: image, title, category, date',
      });
    }

    const result = await createGalleryItem(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Gallery item created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create gallery item',
    });
  }
});

/**
 * PUT /api/admin/gallery/:id
 * Update gallery item
 * Body: Partial gallery item data
 */
router.put('/gallery/:id', async (req, res) => {
  try {
    const result = await updateGalleryItem(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Gallery item updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update gallery item',
    });
  }
});

/**
 * DELETE /api/admin/gallery/:id
 * Delete gallery item
 */
router.delete('/gallery/:id', async (req, res) => {
  try {
    const result = await deleteGalleryItem(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Gallery item deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete gallery item',
    });
  }
});

// ====================================
// ANNOUNCEMENTS MANAGEMENT
// ====================================

/**
 * POST /api/admin/announcements
 * Create new announcement
 * Body: { title, content, priority, date }
 */
router.post('/announcements', async (req, res) => {
  try {
    // Validate required fields
    const { title, content, date } = req.body;
    if (!title || !content || !date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, content, date',
      });
    }

    const result = await createAnnouncement(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Announcement created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement',
    });
  }
});

/**
 * PUT /api/admin/announcements/:id
 * Update announcement
 * Body: Partial announcement data
 */
router.put('/announcements/:id', async (req, res) => {
  try {
    const result = await updateAnnouncement(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Announcement updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update announcement',
    });
  }
});

/**
 * DELETE /api/admin/announcements/:id
 * Delete announcement
 */
router.delete('/announcements/:id', async (req, res) => {
  try {
    const result = await deleteAnnouncement(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Announcement deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete announcement',
    });
  }
});

// ====================================
// ADMINS MANAGEMENT
// ====================================

/**
 * GET /api/admin/admins
 * Get all admins (without passwords)
 */
router.get('/admins', async (req, res) => {
  try {
    const result = await getAllAdmins();
    res.json(result);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admins',
    });
  }
});

/**
 * POST /api/admin/admins
 * Create new admin
 * Body: { username, password, role }
 */
router.post('/admins', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await createAdmin({
      username,
      password_hash,
      role: role || 'Admin',
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Admin created: ${username} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create admin',
    });
  }
});

/**
 * PUT /api/admin/admins/:id
 * Update admin
 * Body: { username, password (optional), role }
 */
router.put('/admins/:id', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };

    // If password is provided, hash it
    if (password) {
      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);
    }

    const result = await updateAdmin(req.params.id, updateData);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Admin updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update admin',
    });
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete admin
 */
router.delete('/admins/:id', async (req, res) => {
  try {
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own admin account',
      });
    }

    const result = await deleteAdmin(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Admin deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete admin',
    });
  }
});

module.exports = router;