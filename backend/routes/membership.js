const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import models
const membershipModel = require('../models/membershipModel');
const contentModel = require('../models/contentModel');

// Import services
const emailService = require('../services/emailService');

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
      .optional({ nullable: true, checkFalsy: true })
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
      .trim()
      .notEmpty()
      .withMessage('Year is required')
      .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', '1st', '2nd', '3rd', '4th'])
      .withMessage('Year must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year'),
    
    body('bio')
      .trim()
      .notEmpty()
      .withMessage('Bio is required')
      .isLength({ min: 20, max: 1000 })
      .withMessage('Bio must be between 20 and 1000 characters'),
    
    body('skills')
      .isArray({ min: 2 })
      .withMessage('At least 2 skills are required'),
    
    body('skills.*')
      .trim()
      .notEmpty()
      .withMessage('Each skill must be a non-empty string'),
    
    body('previous_experience')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Previous experience must not exceed 2000 characters'),
    
    body('github_profile')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .custom((value) => {
        if (!value || value === '' || value === null) return true;
        try {
          new URL(value);
          return true;
        } catch (e) {
          throw new Error('GitHub profile must be a valid URL');
        }
      }),
    
    body('linkedin_profile')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .custom((value) => {
        if (!value || value === '' || value === null) return true;
        try {
          new URL(value);
          return true;
        } catch (e) {
          throw new Error('LinkedIn profile must be a valid URL');
        }
      }),
    
    body('photo')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (!value) return true;
        // Allow data URLs (base64) or regular URLs
        if (value.startsWith('data:image/')) return true;
        try {
          new URL(value);
          return true;
        } catch (e) {
          throw new Error('Photo must be a valid URL or base64 image');
        }
      }),
    
    body('payment_screenshot')
      .custom((value) => {
        if (!value || value === '') {
          throw new Error('Payment screenshot is required');
        }
        // Allow data URLs (base64) or regular URLs
        if (value.startsWith('data:image/')) return true;
        try {
          new URL(value);
          return true;
        } catch (e) {
          throw new Error('Payment screenshot must be a valid URL or base64 image');
        }
      }),
    
    body('transaction_id')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Transaction ID must not exceed 100 characters')
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
        linkedin_profile: req.body.linkedin_profile || null,
        photo: req.body.photo || null,
        payment_screenshot: req.body.payment_screenshot,
        transaction_id: req.body.transaction_id || null
      };

      const result = await membershipModel.createApplication(applicationData);

      console.log('✅ Application created successfully');
      console.log('   ID:', result.id);
      console.log('   Status:', result.status);

      // Send confirmation email to applicant (fire-and-forget)
      emailService.sendMembershipApplicationEmail(
        result.email,
        result.full_name,
        result.id
      ).catch(err => {
        console.error('⚠️ Failed to send confirmation email:', err.message);
      });

      // Send notification email to admin (fire-and-forget)
      emailService.sendAdminMembershipNotification(
        process.env.ADMIN_EMAIL || 'grrcgstu@gmail.com',
        {
          full_name: result.full_name,
          email: result.email,
          phone: result.phone,
          student_id: result.student_id || 'N/A',
          department: result.department,
          year: result.year,
          bio: result.bio,
          skills: Array.isArray(result.skills) ? result.skills.join(', ') : JSON.stringify(result.skills),
          previous_experience: result.previous_experience || 'None provided',
          github_profile: result.github_profile || 'Not provided',
          linkedin_profile: result.linkedin_profile || 'Not provided',
          applicationId: result.id,
          applied_date: result.applied_date
        }
      ).catch(err => {
        console.error('⚠️ Failed to send admin notification email:', err.message);
      });

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
      console.error('   Stack:', error.stack);

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
    let { status } = req.query;

    // ✅ CRITICAL FIX: Handle 'all' status or missing status
    if (status === 'all' || status === '' || status === undefined) {
      status = null; // null means fetch all applications
    }

    // ✅ Validate status if it's not null
    if (status !== null && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status parameter',
        message: 'Status must be one of: pending, approved, rejected, all, or omitted'
      });
    }

    console.log(`📋 Fetching applications with status: ${status || 'all'}`);

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

      // Update application status to approved
      await membershipModel.updateApplicationStatus(
        id,
        'approved',
        req.user.id,
        admin_notes || null
      );

      // Create member account
      const memberData = {
        name: application.full_name,
        email: application.email,
        phone: application.phone,
        department: application.department,
        year: application.year,
        bio: application.bio,
        skills: application.skills,
        role: 'General Member',
        photo: application.photo || '',
        joined_date: new Date().toISOString().split('T')[0]
      };

      console.log('📝 Creating member with data:', memberData);

      const memberResult = await contentModel.createMember(memberData);

      console.log('📦 createMember response:', memberResult);

      if (!memberResult.success) {
        console.error('❌ Failed to create member:', memberResult.error);
        
        // Rollback application approval
        try {
          await membershipModel.updateApplicationStatus(
            id,
            'pending',
            req.user.id,
            'Auto-rollback: Member creation failed - ' + memberResult.error
          );
          console.log('↩️  Application rolled back to pending');
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError.message);
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to create member account',
          message: memberResult.error || 'Could not create member after approving application'
        });
      }

      const member = memberResult.data;

      if (!member || !member.id) {
        console.error('❌ Invalid member data returned');
        
        await membershipModel.updateApplicationStatus(
          id,
          'pending',
          req.user.id,
          'Auto-rollback: Invalid member data returned'
        );
        
        return res.status(500).json({
          success: false,
          error: 'Failed to create member account',
          message: 'Invalid member data returned from database'
        });
      }

      console.log(`✅ Application ${id} approved and member created`);
      console.log(`   Member ID: ${member.id}`);
      console.log(`   Member Name: ${member.name}`);

      // Send approval email to applicant (fire-and-forget)
      emailService.sendMembershipApprovalEmail(
        application.email,
        application.full_name
      ).catch(err => {
        console.error('⚠️ Failed to send approval email:', err.message);
      });

      // Send new member announcement to all members (fire-and-forget)
      try {
        const memberEmails = await contentModel.getAllMemberEmails();
        if (memberEmails && memberEmails.length > 0) {
          emailService.sendNewMemberAnnouncement(memberEmails, {
            name: member.name,
            department: member.department,
            year: member.year,
            role: member.role,
            bio: member.bio,
            skills: Array.isArray(member.skills) ? member.skills.join(', ') : '',
            email: member.email
          }).catch(err => {
            console.error('⚠️ Failed to send member announcement:', err.message);
          });
        }
      } catch (emailError) {
        console.error('⚠️ Failed to fetch member emails:', emailError.message);
      }

      res.status(200).json({
        success: true,
        message: 'Application approved successfully and member account created',
        data: { 
          application_id: parseInt(id),
          member_id: member.id,
          member_name: member.name,
          member_email: member.email
        }
      });
    } catch (error) {
      console.error('❌ Error approving application:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to approve application',
        message: error.message || 'An unexpected error occurred',
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

      // Send rejection email to applicant (fire-and-forget)
      emailService.sendMembershipRejectionEmail(
        application.email,
        application.full_name,
        admin_notes || 'Please consider reapplying after improving your skills and experience.'
      ).catch(err => {
        console.error('⚠️ Failed to send rejection email:', err.message);
      });

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