/**
 * Upload Routes - Image Upload to Cloudinary
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

/**
 * POST /api/upload/public-image
 * Public upload endpoint for membership applications (NO AUTH REQUIRED)
 */
router.post('/public-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }
    
    // Check if image is base64
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Must be base64 data URL'
      });
    }
    
    console.log('📤 Uploading PUBLIC image to Cloudinary...');
    console.log('📦 Image size:', Math.round(image.length / 1024), 'KB');
    
    // Upload to Cloudinary with optimization (profile photos)
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'grrc-membership',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },    // Profile photos don't need 1920px
        { quality: 'auto:eco' },                        // Eco quality sufficient for profiles
        { fetch_format: 'auto' },                       // WebP conversion
        { gravity: 'face', crop: 'thumb' }              // Auto-crop to face if detected
      ],
      resource_type: 'image'
    });
    
    console.log('✅ PUBLIC image uploaded successfully');
    console.log('📍 Cloudinary URL:', uploadResult.secure_url);
    
    res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes
    });
    
  } catch (error) {
    console.error('❌ PUBLIC upload error:', error);
    
    if (error.message.includes('Invalid image file')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image file format'
      });
    }
    
    if (error.message.includes('File size too large')) {
      return res.status(413).json({
        success: false,
        error: 'Image file is too large. Maximum size is 10MB'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload image: ' + error.message
    });
  }
});

// Apply authentication to all routes BELOW this point
router.use(authenticateToken);

/**
 * POST /api/upload/image
 * Upload image to Cloudinary
 */
router.post('/image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }
    
    // Check if image is base64
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Must be base64 data URL'
      });
    }
    
    console.log('📤 Uploading image to Cloudinary...');
    console.log('📦 Image size:', Math.round(image.length / 1024), 'KB');
    
    // Upload to Cloudinary with optimization
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'grrc-gallery',
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      resource_type: 'image'
    });
    
    console.log('✅ Image uploaded successfully');
    console.log('📍 Cloudinary URL:', uploadResult.secure_url);
    
    res.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    if (error.message.includes('Invalid image file')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image file format'
      });
    }
    
    if (error.message.includes('File size too large')) {
      return res.status(413).json({
        success: false,
        error: 'Image file is too large. Maximum size is 10MB'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload image: ' + error.message
    });
  }
});

/**
 * DELETE /api/upload/image/:publicId
 * Delete image from Cloudinary
 */
router.delete('/image/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'No public ID provided'
      });
    }
    
    console.log('🗑️ Deleting image from Cloudinary:', publicId);
    
    const result = await cloudinary.uploader.destroy(`grrc-gallery/${publicId}`);
    
    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully');
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      console.warn('⚠️ Image not found or already deleted');
      res.json({
        success: true,
        message: 'Image not found or already deleted'
      });
    }
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image: ' + error.message
    });
  }
});

module.exports = router;