const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import models
const alumniApplicationModel = require('../models/alumniApplicationModel');
const contentModel = require('../models/contentModel');

// Import middleware
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => err.msg),
      message: errors.array()[0].msg
    });
  }
  next();
};

// Bangladesh phone number validation regex
const bangladeshPhoneRegex = /^(\+8801|01)[3-9]\d{8}$/;

// Batch year validation regex (YYYY-YYYY format)
const batchYearRegex = /^\d{4}-\d{4}$/;

// 1. POST /api/alumni-application/apply (PUBLIC - No Auth Required)
router.post(
  '/apply',
  [
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(bangladeshPhoneRegex)
      .withMessage('Invalid Bangladesh phone number format (use +8801XXXXXXXXX or 01XXXXXXXXX)'),
    
    body('batch_year')
      .trim()
      .notEmpty()
      .withMessage('Batch year is required')
      .matches(batchYearRegex)
      .withMessage('Invalid batch year format. Use YYYY-YYYY (e.g., 2020-2021)'),
    
    body('department')
      .trim()
      .notEmpty()
      .withMessage('Department is required')
      .isLength({ max: 100 })
      .withMessage('Department must not exceed 100 characters'),
    
    body('role_in_club')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Role in club must not exceed 100 characters'),
    
    body('current_position')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('Current position must not exceed 255 characters'),
    
    body('current_company')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('Current company must not exceed 255 characters'),
    
    body('bio')
      .trim()
      .notEmpty()
      .withMessage('Bio is required')
      .isLength({ min: 50, max: 2000 })
      .withMessage('Bio must be between 50 and 2000 characters'),
    
    body('achievements')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Achievements must not exceed 2000 characters'),
    
    body('linkedin')
      .optional({ checkFalsy: true })
      .trim()
      .custom((value) => {
        if (value && value.length > 0) {
          try {
            new URL(value);
            return true;
          } catch (e) {
            throw new Error('LinkedIn profile must be a valid URL');
          }
        }
        return true;
      }),
    
    body('github')
      .optional({ checkFalsy: true })
      .trim()
      .custom((value) => {
        if (value && value.length > 0) {
          try {
            new URL(value);
            return true;
          } catch (e) {
            throw new Error('GitHub profile must be a valid URL');
          }
        }
        return true;
      }),
    
    body('facebook')
      .optional({ checkFalsy: true })
      .trim()
      .custom((value) => {
        if (value && value.length > 0) {
          try {
            new URL(value);
            return true;
          } catch (e) {
            throw new Error('Facebook profile must be a valid URL');
          }
        }
        return true;
      }),
    
    body('photo')
      .optional({ checkFalsy: true })
      .trim()
      .withMessage('Photo must be text (base64 or URL)')
  ],
  validateRequest,
  async (req, res) => {
    try {
      console.log('📝 Received alumni application');
      console.log('   Name:', req.body.full_name);
      console.log('   Email:', req.body.email);
      console.log('   Phone:', req.body.phone);
      console.log('   Batch Year:', req.body.batch_year);
      console.log('   Department:', req.body.department);

      const applicationData = {
        full_name: req.body.full_name,
        email: req.body.email,
        phone: req.body.phone,
        batch_year: req.body.batch_year,
        department: req.body.department,
        role_in_club: req.body.role_in_club || null,
        achievements: req.body.achievements || null,
        current_position: req.body.current_position || null,
        current_company: req.body.current_company || null,
        bio: req.body.bio,
        linkedin: req.body.linkedin || null,
        github: req.body.github || null,
        facebook: req.body.facebook || null,
        photo: req.body.photo || null
      };

      const result = await alumniApplicationModel.createApplication(applicationData);

      console.log('✅ Alumni application created successfully');
      console.log('   ID:', result.id);
      console.log('   Status:', result.status);

      res.status(201).json({
        success: true,
        message: 'Alumni application submitted successfully. We will review it and contact you soon.',
        data: {
          id: result.id,
          full_name: result.full_name,
          email: result.email,
          status: result.status,
          applied_date: result.applied_date
        }
      });
    } catch (error) {
      console.error('❌ Error submitting alumni application:', error.message);

      // Handle duplicate email error
      if (error.code === '23505' || 
          error.message.includes('UNIQUE constraint') || 
          error.message.includes('Email already used')) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate email',
          message: 'An alumni application with this email already exists. Please use a different email or contact us if you need help.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to submit alumni application',
        message: 'An unexpected error occurred. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// 2. GET /api/alumni-application/applications (ADMIN - Auth Required)
router.get('/applications', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status parameter',
        message: 'Status must be one of: pending, approved, rejected'
      });
    }

    const applications = await alumniApplicationModel.getAllApplications(status);

    console.log(`✅ Fetched ${applications.length} alumni applications (status: ${status || 'all'})`);

    res.status(200).json({
      success: true,
      data: applications,
      total: applications.length
    });
  } catch (error) {
    console.error('❌ Error fetching alumni applications:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alumni applications',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 3. GET /api/alumni-application/applications/:id (ADMIN - Auth Required)
router.get('/applications/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await alumniApplicationModel.getApplicationById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: `No alumni application found with ID ${id}`
      });
    }

    console.log(`✅ Fetched alumni application ${id}`);

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('❌ Error fetching alumni application:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alumni application',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 4. POST /api/alumni-application/applications/:id/approve (ADMIN - Auth Required)
// ✅ THIS IS THE FIXED SECTION
router.post(
  '/applications/:id/approve',
  authenticateToken,
  isAdmin,
  [
    body('admin_notes')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Admin notes must not exceed 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      console.log(`📋 Approving alumni application ${id}`);

      // Fetch application
      const application = await alumniApplicationModel.getApplicationById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
          message: `No alumni application found with ID ${id}`
        });
      }

      // Check if already processed
      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Application already processed',
          message: `This application has already been ${application.status}`
        });
      }

      // ✅ FIX: Prepare alumni data
      const alumniData = {
        name: application.full_name,
        email: application.email,
        phone: application.phone,
        batch_year: application.batch_year,
        department: application.department,
        role_in_club: application.role_in_club,
        achievements: application.achievements,
        current_position: application.current_position,
        current_company: application.current_company,
        bio: application.bio,
        linkedin: application.linkedin,
        github: application.github,
        facebook: application.facebook,
        photo: application.photo || '',
        is_featured: false,
        display_order: 0
      };

      console.log('📝 Creating alumni record with data:', {
        name: alumniData.name,
        email: alumniData.email,
        batch_year: alumniData.batch_year
      });

      // ✅ FIX: createAlumni returns alumni object DIRECTLY, not wrapped
      let alumni;
      try {
        alumni = await contentModel.createAlumni(alumniData);
        
        // Verify we got valid data back
        if (!alumni || !alumni.id) {
          throw new Error('Invalid alumni data returned from database');
        }
        
        console.log('✅ Alumni created successfully');
        console.log('   Alumni ID:', alumni.id);
        console.log('   Alumni Name:', alumni.name);
        
      } catch (alumniError) {
        console.error('❌ Failed to create alumni:', alumniError.message);
        
        // Don't update application status since alumni creation failed
        return res.status(500).json({
          success: false,
          error: 'Failed to create alumni record',
          message: alumniError.message || 'Could not create alumni. Please try again.'
        });
      }

      // ✅ Only update application status AFTER alumni is created successfully
      try {
        await alumniApplicationModel.updateApplicationStatus(
          id,
          'approved',
          req.user.id,
          admin_notes || null
        );
        
        console.log(`✅ Alumni application ${id} approved`);
        
      } catch (statusError) {
        console.error('❌ Failed to update application status:', statusError.message);
        console.warn('⚠️ Alumni created but status update failed');
        
        // Alumni is created, but we couldn't update the application status
        // This is not ideal but not critical - respond with partial success
        return res.status(200).json({
          success: true,
          message: 'Alumni record created successfully, but application status update failed',
          data: { 
            application_id: parseInt(id),
            alumni_id: alumni.id,
            alumni_name: alumni.name,
            alumni_email: alumni.email,
            warning: 'Application status may not reflect approval'
          }
        });
      }

      // ✅ Success - both alumni created and status updated
      res.status(200).json({
        success: true,
        message: 'Alumni application approved successfully and alumni record created',
        data: { 
          application_id: parseInt(id),
          alumni_id: alumni.id,
          alumni_name: alumni.name,
          alumni_email: alumni.email
        }
      });
      
    } catch (error) {
      console.error('❌ Error approving alumni application:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to approve alumni application',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// 5. POST /api/alumni-application/applications/:id/reject (ADMIN - Auth Required)
router.post(
  '/applications/:id/reject',
  authenticateToken,
  isAdmin,
  [
    body('admin_notes')
      .trim()
      .notEmpty()
      .withMessage('Admin notes are required for rejection')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Admin notes must be between 10 and 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      console.log(`📋 Rejecting alumni application ${id}`);

      // Fetch application
      const application = await alumniApplicationModel.getApplicationById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
          message: `No alumni application found with ID ${id}`
        });
      }

      // Check if already processed
      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Application already processed',
          message: `This application has already been ${application.status}`
        });
      }

      // Update application status
      const updatedApplication = await alumniApplicationModel.updateApplicationStatus(
        id,
        'rejected',
        req.user.id,
        admin_notes
      );

      console.log(`✅ Alumni application ${id} rejected`);

      res.status(200).json({
        success: true,
        message: 'Alumni application rejected successfully',
        data: {
          id: updatedApplication.id,
          status: updatedApplication.status,
          admin_notes: updatedApplication.admin_notes,
          reviewed_date: updatedApplication.reviewed_date
        }
      });
    } catch (error) {
      console.error('❌ Error rejecting alumni application:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to reject alumni application',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// 6. DELETE /api/alumni-application/applications/:id (ADMIN - Auth Required)
router.delete('/applications/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting alumni application ${id}`);

    // Check if application exists
    const application = await alumniApplicationModel.getApplicationById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: `No alumni application found with ID ${id}`
      });
    }

    // Delete application
    await alumniApplicationModel.deleteApplication(id);

    console.log(`✅ Alumni application ${id} deleted`);

    res.status(200).json({
      success: true,
      message: 'Alumni application deleted successfully',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('❌ Error deleting alumni application:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alumni application',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 7. GET /api/alumni-application/statistics (ADMIN - Auth Required)
router.get('/statistics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const statistics = await alumniApplicationModel.getApplicationStatistics();

    console.log('✅ Fetched alumni application statistics');

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('❌ Error fetching alumni application statistics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alumni application statistics',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;