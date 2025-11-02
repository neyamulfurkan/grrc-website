const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import models
const membershipModel = require('../models/membershipModel');
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

// Bangladesh phone number validation regex - FIXED to accept both formats
const bangladeshPhoneRegex = /^(\+8801|01)[3-9]\d{8}$/;

// 1. POST /api/membership/apply (PUBLIC - No Auth Required)
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
    
    body('student_id')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Student ID must not exceed 50 characters'),
    
    body('department')
      .trim()
      .notEmpty()
      .withMessage('Department is required')
      .isLength({ max: 100 })
      .withMessage('Department must not exceed 100 characters'),
    
    // FIXED: Accept "1st Year" format from frontend
    body('year')
      .trim()
      .notEmpty()
      .withMessage('Year is required')
      .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', '1st', '2nd', '3rd', '4th'])
      .withMessage('Year must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year'),
    
    // FIXED: Changed minimum from 50 to 100 to match frontend
    body('bio')
      .trim()
      .notEmpty()
      .withMessage('Bio is required')
      .isLength({ min: 100, max: 1000 })
      .withMessage('Bio must be between 100 and 1000 characters'),
    
    // FIXED: Changed minimum from 1 to 2 to match frontend requirement
    body('skills')
      .isArray({ min: 2 })
      .withMessage('At least 2 skills are required'),
    
    body('skills.*')
      .trim()
      .notEmpty()
      .withMessage('Each skill must be a non-empty string'),
    
    body('previous_experience')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Previous experience must not exceed 2000 characters'),
    
    body('github_profile')
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
    
    body('linkedin_profile')
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
      })
  ],
  validateRequest,
  async (req, res) => {
    try {
      console.log('📝 Received membership application');
      console.log('   Name:', req.body.full_name);
      console.log('   Email:', req.body.email);
      console.log('   Phone:', req.body.phone);
      console.log('   Year:', req.body.year);
      console.log('   Skills:', req.body.skills);

      const applicationData = {
        full_name: req.body.full_name,
        email: req.body.email,
        phone: req.body.phone,
        student_id: req.body.student_id || null,
        department: req.body.department,
        year: req.body.year,
        bio: req.body.bio,
        skills: req.body.skills,
        previous_experience: req.body.previous_experience || null,
        github_profile: req.body.github_profile || null,
        linkedin_profile: req.body.linkedin_profile || null
      };

      const result = await membershipModel.createApplication(applicationData);

      console.log('✅ Application created successfully');
      console.log('   ID:', result.id);
      console.log('   Status:', result.status);

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully. We will review it and contact you soon.',
        data: {
          id: result.id,
          full_name: result.full_name,
          email: result.email,
          status: result.status,
          applied_date: result.applied_date
        }
      });
    } catch (error) {
      console.error('❌ Error submitting application:', error.message);

      // Handle duplicate email error
      if (error.code === '23505' || 
          error.message.includes('UNIQUE constraint') || 
          error.message.includes('Email already used')) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate email',
          message: 'An application with this email already exists. Please use a different email or contact us if you need help.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to submit application',
        message: 'An unexpected error occurred. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// 2. GET /api/membership/applications (ADMIN - Auth Required)
router.get('/applications', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    // Validate status parameter if provided
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status parameter',
        message: 'Status must be one of: pending, approved, rejected'
      });
    }

    const applications = await membershipModel.getAllApplications(status);

    console.log(`✅ Fetched ${applications.length} applications (status: ${status || 'all'})`);

    res.status(200).json({
      success: true,
      data: applications,
      total: applications.length
    });
  } catch (error) {
    console.error('❌ Error fetching applications:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 3. GET /api/membership/applications/:id (ADMIN - Auth Required)
router.get('/applications/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await membershipModel.getApplicationById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: `No application found with ID ${id}`
      });
    }

    console.log(`✅ Fetched application ${id}`);

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('❌ Error fetching application:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 4. POST /api/membership/applications/:id/approve (ADMIN - Auth Required)
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

      console.log(`📋 Approving application ${id}`);

      // Fetch application
      const application = await membershipModel.getApplicationById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
          message: `No application found with ID ${id}`
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
      await membershipModel.updateApplicationStatus(
        id,
        'approved',
        req.user.id,
        admin_notes || null
      );

      // Create member in members table
      const memberData = {
        name: application.full_name,
        email: application.email,
        phone: application.phone,
        department: application.department,
        year: application.year,
        bio: application.bio,
        skills: application.skills,
        role: 'General Member',
        photo: ''
      };

      const member = await contentModel.createMember(memberData);

      console.log(`✅ Application ${id} approved and member created`);

      res.status(200).json({
        success: true,
        message: 'Application approved successfully and member account created',
        data: { 
          application_id: id,
          member_id: member.id,
          member_name: member.name
        }
      });
    } catch (error) {
      console.error('❌ Error approving application:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to approve application',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// 5. POST /api/membership/applications/:id/reject (ADMIN - Auth Required)
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

      console.log(`📋 Rejecting application ${id}`);

      // Fetch application
      const application = await membershipModel.getApplicationById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
          message: `No application found with ID ${id}`
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
      const updatedApplication = await membershipModel.updateApplicationStatus(
        id,
        'rejected',
        req.user.id,
        admin_notes
      );

      console.log(`✅ Application ${id} rejected`);

      res.status(200).json({
        success: true,
        message: 'Application rejected successfully',
        data: {
          id: updatedApplication.id,
          status: updatedApplication.status,
          admin_notes: updatedApplication.admin_notes,
          reviewed_date: updatedApplication.reviewed_date
        }
      });
    } catch (error) {
      console.error('❌ Error rejecting application:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to reject application',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// 6. DELETE /api/membership/applications/:id (ADMIN - Auth Required)
router.delete('/applications/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting application ${id}`);

    // Check if application exists
    const application = await membershipModel.getApplicationById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: `No application found with ID ${id}`
      });
    }

    // Delete application
    await membershipModel.deleteApplication(id);

    console.log(`✅ Application ${id} deleted`);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('❌ Error deleting application:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete application',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 7. GET /api/membership/statistics (ADMIN - Auth Required)
router.get('/statistics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const statistics = await membershipModel.getApplicationStatistics();

    console.log('✅ Fetched membership statistics');

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;