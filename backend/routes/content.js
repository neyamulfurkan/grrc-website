/**
 * ====================================
 * Public Content Routes
 * ====================================
 * Purpose: Serve public data to frontend pages (no authentication required)
 * Routes: /api/content/*
 * Used by: index.html, members.html, events.html, projects.html, gallery.html
 * ====================================
 */

const express = require('express');
const router = express.Router();
const {
  getClubConfig,
  getAllMembers,
  getMemberById,
  searchMembers,
  getAllEvents,
  getEventById,
  searchEvents,
  getAllProjects,
  getProjectById,
  searchProjects,
  getAllGalleryItems,
  getGalleryItemById,
  getAllAnnouncements,
  getAnnouncementById,
  getStatistics,
} = require('../models/contentModel');

// ====================================
// CLUB CONFIGURATION
// ====================================

/**
 * GET /api/content/config
 * Get club configuration (logo, name, motto, description, social links)
 */
router.get('/config', async (req, res) => {
  try {
    const result = await getClubConfig();
    res.json(result);
  } catch (error) {
    console.error('Error fetching club config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch club configuration',
    });
  }
});

// ====================================
// MEMBERS
// ====================================

/**
 * GET /api/content/members
 * Get all members with optional filters
 * Query params: ?role=Executive Member&department=CSE&year=4th Year
 */
router.get('/members', async (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      department: req.query.department,
      year: req.query.year,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await getAllMembers(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
    });
  }
});

/**
 * GET /api/content/members/:id
 * Get single member by ID
 */
router.get('/members/:id', async (req, res) => {
  try {
    const result = await getMemberById(req.params.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch member',
    });
  }
});

/**
 * GET /api/content/members/search
 * Search members by name, department, or email
 * Query param: ?q=search_query
 */
router.get('/members/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }
    
    const result = await searchMembers(query);
    res.json(result);
  } catch (error) {
    console.error('Error searching members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search members',
    });
  }
});

// ====================================
// EVENTS
// ====================================

/**
 * GET /api/content/events
 * Get all events with optional filters
 * Query params: ?status=upcoming&category=Workshop
 */
router.get('/events', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await getAllEvents(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

/**
 * GET /api/content/events/:id
 * Get single event by ID
 */
router.get('/events/:id', async (req, res) => {
  try {
    const result = await getEventById(req.params.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
    });
  }
});

/**
 * GET /api/content/events/search
 * Search events by title or description
 * Query param: ?q=search_query
 */
router.get('/events/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }
    
    const result = await searchEvents(query);
    res.json(result);
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search events',
    });
  }
});

// ====================================
// PROJECTS
// ====================================

/**
 * GET /api/content/projects
 * Get all projects with optional filters
 * Query params: ?status=completed&category=Robotics
 */
router.get('/projects', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await getAllProjects(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

/**
 * GET /api/content/projects/:id
 * Get single project by ID
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const result = await getProjectById(req.params.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

/**
 * GET /api/content/projects/search
 * Search projects by title or description
 * Query param: ?q=search_query
 */
router.get('/projects/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }
    
    const result = await searchProjects(query);
    res.json(result);
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search projects',
    });
  }
});

// ====================================
// GALLERY
// ====================================

/**
 * GET /api/content/gallery
 * Get all gallery items with optional filters
 * Query param: ?category=Events
 */
router.get('/gallery', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await getAllGalleryItems(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching gallery items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gallery items',
    });
  }
});

/**
 * GET /api/content/gallery/:id
 * Get single gallery item by ID
 */
router.get('/gallery/:id', async (req, res) => {
  try {
    const result = await getGalleryItemById(req.params.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Gallery item not found',
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching gallery item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gallery item',
    });
  }
});

// ====================================
// ANNOUNCEMENTS
// ====================================

/**
 * GET /api/content/announcements
 * Get all announcements
 * Query param: ?priority=high
 */
router.get('/announcements', async (req, res) => {
  try {
    const filters = {
      priority: req.query.priority,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await getAllAnnouncements(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements',
    });
  }
});

/**
 * GET /api/content/announcements/:id
 * Get single announcement by ID
 */
router.get('/announcements/:id', async (req, res) => {
  try {
    const result = await getAnnouncementById(req.params.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found',
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch announcement',
    });
  }
});

// ====================================
// STATISTICS
// ====================================

/**
 * GET /api/content/statistics
 * Get dashboard statistics (counts for members, events, projects, etc.)
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = await getStatistics();
    res.json(result);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

module.exports = router;