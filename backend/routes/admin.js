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
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require('../models/contentModel');

router.use(authenticateToken);
router.use(isAdmin);

router.put('/config', async (req, res) => {
  try {
    const result = await updateClubConfig(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    console.log(`✏️ Club config updated by ${req.user.username}`);
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

router.post('/members', async (req, res) => {
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

router.put('/members/:id', async (req, res) => {
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

router.delete('/members/:id', async (req, res) => {
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

router.post('/events', async (req, res) => {
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

router.put('/events/:id', async (req, res) => {
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

router.delete('/events/:id', async (req, res) => {
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

router.post('/projects', async (req, res) => {
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

router.put('/projects/:id', async (req, res) => {
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

router.delete('/projects/:id', async (req, res) => {
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

router.post('/gallery', async (req, res) => {
  try {
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
    console.error('❌ Error in POST /gallery:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
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

router.delete('/gallery/:id', async (req, res) => {
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

router.post('/announcements', async (req, res) => {
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

router.put('/announcements/:id', async (req, res) => {
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

router.delete('/announcements/:id', async (req, res) => {
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

router.get('/admins', async (req, res) => {
  try {
    const result = await getAllAdmins();
    res.json(result);
  } catch (error) {
    console.error('❌ Error in GET /admins:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admins',
    });
  }
});

router.post('/admins', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

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
    console.error('❌ Error in POST /admins:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create admin',
    });
  }
});

router.put('/admins/:id', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };

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
    console.error('❌ Error in PUT /admins/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update admin',
    });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    const adminCheck = await getAdminById(req.params.id);
    if (!adminCheck.success || !adminCheck.data) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
      });
    }

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
    console.error('❌ Error in DELETE /admins/:id:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete admin',
    });
  }
});

module.exports = router;