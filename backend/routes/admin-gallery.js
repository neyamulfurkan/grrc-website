/**
 * Admin Gallery Routes - Protected
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, checkPermission } = require('../middleware/auth');
const pool = require('../db/pool');

// Apply authentication to all routes
router.use(authenticateToken);

// ========== CREATE GALLERY ITEM ==========
router.post('/', checkPermission('gallery', 'upload'), async (req, res) => {
  try {
    const { image, title, description, category, date, photographer } = req.body;
    
    if (!image || !title || !category || !date) {
      return res.status(400).json({
        success: false,
        error: 'Image, title, category, and date are required'
      });
    }
    
    // Upload to Cloudinary with aggressive optimization for gallery
    const cloudinary = require('../config/cloudinary');
    
    let cloudinaryUrl = image;
    if (image.startsWith('data:image')) {
      console.log('📤 Uploading gallery image to Cloudinary with optimization...');
      const uploadResult = await cloudinary.uploader.upload(image, {
        folder: 'grrc-gallery',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },  // Reduced from 1920x1080
          { quality: 'auto:eco' },                       // Changed from 'auto:good' to 'auto:eco'
          { fetch_format: 'auto' },                      // WebP conversion
          { flags: 'progressive' }                       // Progressive loading
        ],
        resource_type: 'image'
      });
      cloudinaryUrl = uploadResult.secure_url;
      console.log('✅ Gallery image optimized and uploaded');
    }
    
    const result = await pool.query(
      `INSERT INTO gallery (image, title, description, category, date, photographer, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [cloudinaryUrl, title, description, category, date, photographer, req.user.id]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Gallery item created successfully'
    });
  } catch (error) {
    console.error('Create gallery item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create gallery item'
    });
  }
});

// ========== UPDATE GALLERY ITEM ==========
router.put('/:id', checkPermission('gallery', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { image, title, description, category, date, photographer } = req.body;
    
    const result = await pool.query(
      `UPDATE gallery 
       SET image = $1, title = $2, description = $3, category = $4, date = $5, photographer = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [image, title, description, category, date, photographer, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gallery item not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Gallery item updated successfully'
    });
  } catch (error) {
    console.error('Update gallery item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update gallery item'
    });
  }
});

// ========== DELETE GALLERY ITEM ==========
router.delete('/:id', checkPermission('gallery', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM gallery WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gallery item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Gallery item deleted successfully'
    });
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete gallery item'
    });
  }
});

module.exports = router;