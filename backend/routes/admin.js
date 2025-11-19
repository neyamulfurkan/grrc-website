const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { authenticateToken, isAdmin, checkPermission, checkApprovalRequired, createApprovalRequest, isSuperAdmin } = require('../middleware/auth');
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
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require('../models/contentModel');
const alumniModel = require('../models/alumniModel');

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// ====================================
// CLUB CONFIGURATION
// ====================================

router.put('/config', async (req, res) => {
  try {
    console.log('📥 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
    console.log('📥 bkash_number received:', req.body.bkash_number);
    console.log('📥 membership_fee received:', req.body.membership_fee);
    
    const result = await updateClubConfig(req.body);
    
    if (!result.success) {
      console.error('❌ Config update failed:', result.error);
      return res.status(400).json(result);
    }
    
    console.log(`✏️ Club config updated by ${req.user.username}:`, {
      bkash: result.data?.bkash_number,
      fee: result.data?.membership_fee
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /config:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update club configuration',
    });
  }
});

// ====================================
// MEMBERS
// ====================================

router.post('/members', checkPermission('members', 'create'), async (req, res) => {
  try {
    const { name, department, year, role, email } = req.body;
    
    if (!name || !department || !year || !role || !email) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: name, department, year, role, email',
      });
    }

    const memberData = {
      ...req.body,
      joined_date: req.body.joined_date || req.body.joinedDate
    };
    delete memberData.joinedDate;
    
    // Check if approval is required
    const needsApproval = await checkApprovalRequired('members', 'create');
    
    if (needsApproval && !req.user.is_super_admin) {
      // Create approval request instead of direct creation
      const approvalResult = await createApprovalRequest(
        req.user.id,
        'create',
        'members',
        memberData
      );
      
      if (approvalResult.success) {
        return res.status(202).json({
          success: true,
          message: 'Member creation submitted for approval',
          pending: true
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create approval request'
        });
      }
    }

    // Direct creation (no approval needed or super admin)
    const result = await createMember(memberData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Member created: ${name} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /members:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create member',
    });
  }
});

router.put('/members/:id', checkPermission('members', 'edit'), async (req, res) => {
  try {
    const result = await updateMember(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Member updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /members/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update member',
    });
  }
});

router.delete('/members/:id', checkPermission('members', 'delete'), async (req, res) => {
  try {
    const result = await deleteMember(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Member deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in DELETE /members/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete member',
    });
  }
});

// ====================================
// EVENTS
// ====================================

router.post('/events', checkPermission('events', 'create'), async (req, res) => {
  try {
    const { title, description, date, location, venue } = req.body;
    
    const eventLocation = location || venue;
    
    if (!title || !description || !date || !eventLocation) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, description, date, location (or venue)',
      });
    }

    const eventData = {
      ...req.body,
      location: eventLocation
    };
    delete eventData.venue;
    
    // Check if approval is required
    const needsApproval = await checkApprovalRequired('events', 'create');
    
    if (needsApproval && !req.user.is_super_admin) {
      const approvalResult = await createApprovalRequest(
        req.user.id,
        'create',
        'events',
        eventData
      );
      
      if (approvalResult.success) {
        return res.status(202).json({
          success: true,
          message: 'Event creation submitted for approval',
          pending: true
        });
      }
    }

    const result = await createEvent(eventData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Event created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /events:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
    });
  }
});

router.put('/events/:id', checkPermission('events', 'edit'), async (req, res) => {
  try {
    const result = await updateEvent(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Event updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /events/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
    });
  }
});

router.delete('/events/:id', checkPermission('events', 'delete'), async (req, res) => {
  try {
    const result = await deleteEvent(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Event deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in DELETE /events/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
    });
  }
});

// ====================================
// PROJECTS
// ====================================

router.post('/projects', checkPermission('projects', 'create'), async (req, res) => {
  try {
    const { title, description, category, status } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, description',
      });
    }

    const projectData = {
      ...req.body,
      category: category || 'Other',
      status: status || 'ongoing'
    };
    
    // Check if approval is required
    const needsApproval = await checkApprovalRequired('projects', 'create');
    
    if (needsApproval && !req.user.is_super_admin) {
      const approvalResult = await createApprovalRequest(
        req.user.id,
        'create',
        'projects',
        projectData
      );
      
      if (approvalResult.success) {
        return res.status(202).json({
          success: true,
          message: 'Project creation submitted for approval',
          pending: true
        });
      }
    }

    const result = await createProject(projectData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Project created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /projects:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

router.put('/projects/:id', checkPermission('projects', 'edit'), async (req, res) => {
  try {
    const result = await updateProject(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Project updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /projects/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

router.delete('/projects/:id', checkPermission('projects', 'delete'), async (req, res) => {
  try {
    const result = await deleteProject(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Project deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in DELETE /projects/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

// ====================================
// GALLERY
// ====================================

router.post('/gallery', checkPermission('gallery', 'upload'), async (req, res) => {
  try {
    const { image, title, category, date, description, photographer } = req.body;
    
    // Validate required fields
    if (!image || !title || !category || !date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: image (Cloudinary URL), title, category, date',
      });
    }
    
    // ✅ CRITICAL: REJECT Base64 images completely
    if (image.startsWith('data:image')) {
      console.error('❌ Base64 image rejected');
      return res.status(400).json({
        success: false,
        error: 'Base64 images not allowed. Please upload to Cloudinary first and provide the secure_url.',
      });
    }
    
    // ✅ ONLY accept Cloudinary URLs
    if (!image.startsWith('https://res.cloudinary.com/')) {
      console.error('❌ Invalid image URL:', image.substring(0, 50));
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL. Must be a Cloudinary URL starting with https://res.cloudinary.com/',
      });
    }
    
    console.log('✅ Cloudinary URL validated:', image);
    let imageUrl = image;
    
    // Create gallery item data
    const galleryData = {
      image: imageUrl,
      title,
      category,
      date,
      description: description || null,
      photographer: photographer || null
    };
    
    // Check if approval is required
    const needsApproval = await checkApprovalRequired('gallery', 'create');
    
    if (needsApproval && !req.user.is_super_admin) {
      const approvalResult = await createApprovalRequest(
        req.user.id,
        'create',
        'gallery',
        galleryData
      );
      
      if (approvalResult.success) {
        return res.status(202).json({
          success: true,
          message: 'Gallery upload submitted for approval',
          pending: true
        });
      }
    }

    const result = await createGalleryItem(galleryData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Gallery item created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /gallery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create gallery item',
    });
  }
});

router.put('/gallery/:id', async (req, res) => {
  try {
    const result = await updateGalleryItem(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Gallery item updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /gallery/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update gallery item',
    });
  }
});

router.delete('/gallery/:id', checkPermission('gallery', 'delete'), async (req, res) => {
  try {
    const result = await deleteGalleryItem(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Gallery item deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in DELETE /gallery/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete gallery item',
    });
  }
});

// ====================================
// ANNOUNCEMENTS
// ====================================

router.post('/announcements', checkPermission('announcements', 'create'), async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, content',
      });
    }

    const announcementData = {
      ...req.body,
      date: req.body.date || new Date().toISOString().split('T')[0],
      priority: req.body.priority || 'normal'
    };
    
    // Check if approval is required
    const needsApproval = await checkApprovalRequired('announcements', 'create');
    
    if (needsApproval && !req.user.is_super_admin) {
      const approvalResult = await createApprovalRequest(
        req.user.id,
        'create',
        'announcements',
        announcementData
      );
      
      if (approvalResult.success) {
        return res.status(202).json({
          success: true,
          message: 'Announcement submitted for approval',
          pending: true
        });
      }
    }

    const result = await createAnnouncement(announcementData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Announcement created: ${title} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /announcements:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement',
    });
  }
});

router.put('/announcements/:id', checkPermission('announcements', 'edit'), async (req, res) => {
  try {
    const result = await updateAnnouncement(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Announcement updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /announcements/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update announcement',
    });
  }
});

router.delete('/announcements/:id', checkPermission('announcements', 'delete'), async (req, res) => {
  try {
    const result = await deleteAnnouncement(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Announcement deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in DELETE /announcements/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete announcement',
    });
  }
});

// ====================================
// ADMIN MANAGEMENT (SUPER ADMIN ONLY)
// ====================================

router.get('/admins', isSuperAdmin, async (req, res) => {
  res.status(301).json({
    success: false,
    error: 'Use /api/superadmin/admins instead'
  });
});

router.post('/admins', isSuperAdmin, async (req, res) => {
  res.status(301).json({
    success: false,
    error: 'Use /api/superadmin/admins/create instead'
  });
});

router.put('/admins/:id', isSuperAdmin, async (req, res) => {
  res.status(301).json({
    success: false,
    error: 'Use /api/superadmin/admins/:id/permissions instead'
  });
});

router.delete('/admins/:id', isSuperAdmin, async (req, res) => {
  res.status(301).json({
    success: false,
    error: 'Use super admin panel for admin deletion'
  });
});

// ====================================
// ALUMNI (ADMIN ROUTES)
// ====================================

/**
 * POST /api/admin/alumni
 * Create new alumni record
 * Required fields: name, batch_year, department
 */
router.post('/alumni', checkPermission('alumni', 'create'), async (req, res) => {
  try {
    const { name, batch_year, department } = req.body;
    
    if (!name || !batch_year || !department) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: name, batch_year, department',
      });
    }

    const result = await alumniModel.createAlumni(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`➕ Alumni created: ${name} by ${req.user.username}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /alumni:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create alumni',
    });
  }
});

/**
 * PUT /api/admin/alumni/:id
 * Update alumni record
 */
router.put('/alumni/:id', checkPermission('alumni', 'edit'), async (req, res) => {
  try {
    const result = await alumniModel.updateAlumni(req.params.id, req.body);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`✏️ Alumni updated: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in PUT /alumni/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update alumni',
    });
  }
});

/**
 * DELETE /api/admin/alumni/:id
 * Delete alumni record
 */
router.delete('/alumni/:id', checkPermission('alumni', 'delete'), async (req, res) => {
  try {
    const result = await alumniModel.deleteAlumni(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    console.log(`🗑️ Alumni deleted: ID ${req.params.id} by ${req.user.username}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in DELETE /alumni/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete alumni',
    });
  }
});

/**
 * GET /api/admin/alumni/statistics
 * Get alumni statistics
 */
router.get('/alumni/statistics', checkPermission('alumni', 'view'), async (req, res) => {
  try {
    const result = await alumniModel.getAlumniStatistics();
    res.json(result);
  } catch (error) {
    console.error('❌ Error in GET /alumni/statistics:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alumni statistics',
    });
  }
});

module.exports = router;