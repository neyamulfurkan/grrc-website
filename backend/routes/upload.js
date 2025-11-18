const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('☁️ Cloudinary configured:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'
});

// Upload image to Cloudinary
router.post('/image', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image provided' 
      });
    }

    console.log('📤 Uploading image to Cloudinary...');

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder: 'grrc-gallery',
      resource_type: 'auto',
      transformation: [
        { width: 1920, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful:', result.secure_url);

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format
    });

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;