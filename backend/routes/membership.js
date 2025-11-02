const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import models
const membershipModel = require('../models/membershipModel');
const contentModel = require('../models/contentModel');

// Import middleware - CORRECTED: Import the specific functions from auth middleware
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

// Bangladesh phone number validation regex
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
    
    body('year')
      .notEmpty()
      .withMessage('Year is required')
      .isIn(['1st', '2nd', '3rd', '4th'])
      .withMessage('Year must be one of: 1st, 2nd, 3rd, 4th'),
    
    body('bio')
      .trim()
      .notEmpty()
      .withMessage('Bio is required')
      .isLength({ min: 50, max: 1000 })
      .withMessage('Bio must be between 50 and 1000 characters'),
    
    body('skills')
      .isArray({ min: 1 })
      .withMessage('Skills must be a non-empty array'),
    
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
      .isURL()
      .withMessage('GitHub profile must be a valid URL'),
    
    body('linkedin_profile')
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('LinkedIn profile must be a valid URL')
  ],
  validateRequest,
  async (req, res) => {
    try {
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

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: {
          id: result.id,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Error submitting application:', error);

      // Handle duplicate email error
      if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint') || error.message.includes('Email already used')) {
        return res.status(409).json({
          success: false,
          message: 'An application with this email already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: 'Invalid status. Must be one of: pending, approved, rejected'
      });
    }

    const applications = await membershipModel.getAllApplications(status);

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

      // Fetch application
      const application = await membershipModel.getApplicationById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check if already processed
      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Application has already been ${application.status}`
        });
      }

      // Update application status - CORRECTED: Use req.user.id instead of req.admin.id
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

      res.status(200).json({
        success: true,
        message: 'Application approved and member created',
        data: { member }
      });
    } catch (error) {
      console.error('Error approving application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

      // Fetch application
      const application = await membershipModel.getApplicationById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check if already processed
      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Application has already been ${application.status}`
        });
      }

      // Update application status - CORRECTED: Use req.user.id instead of req.admin.id
      const updatedApplication = await membershipModel.updateApplicationStatus(
        id,
        'rejected',
        req.user.id,
        admin_notes
      );

      res.status(200).json({
        success: true,
        message: 'Application rejected',
        data: updatedApplication
      });
    } catch (error) {
      console.error('Error rejecting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// 6. DELETE /api/membership/applications/:id (ADMIN - Auth Required)
router.delete('/applications/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if application exists
    const application = await membershipModel.getApplicationById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Delete application
    await membershipModel.deleteApplication(id);

    res.status(200).json({
      success: true,
      message: 'Application deleted'
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 7. GET /api/membership/statistics (ADMIN - Auth Required)
router.get('/statistics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const statistics = await membershipModel.getApplicationStatistics();

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;