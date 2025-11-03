/**
 * Alumni Application Routes
 * =========================
 * Handles alumni application submissions and management
 */

const express = require('express');
const router = express.Router();
const alumniApplicationModel = require('../models/alumniApplication');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/alumni-application/apply
 * @desc    Submit a new alumni application
 * @access  Public
 */
router.post('/apply', async (req, res) => {
  try {
    console.log('📥 Received alumni application submission');
    
    const applicationData = req.body;

    // Validate required fields
    const requiredFields = ['full_name', 'email', 'phone', 'batch_year', 'department', 'bio'];
    const missingFields = requiredFields.filter(field => !applicationData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields,
        message: `Please provide: ${missingFields.join(', ')}`
      });
    }

    // Create the application
    const application = await alumniApplicationModel.createApplication(applicationData);

    res.status(201).json({
      success: true,
      message: 'Alumni application submitted successfully',
      data: application
    });

  } catch (error) {
    console.error('❌ Error in POST /apply:', error);
    
    // Handle specific error messages
    if (error.message && error.message.includes('Email already used')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate application',
        message: 'An application with this email already exists'
      });
    }

    if (error.message && error.message.includes('Invalid batch_year format')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format',
        message: 'Batch year must be in YYYY-YYYY format (e.g., 2020-2021)'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Application submission failed',
      message: error.message || 'An error occurred while submitting your application'
    });
  }
});

/**
 * @route   GET /api/alumni-application/applications
 * @desc    Get all alumni applications (with optional status filter)
 * @access  Admin only
 * @query   status - Optional filter: 'pending', 'approved', 'rejected', or 'all'
 */
router.get('/applications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching alumni applications');
    
    const { status } = req.query;
    
    // Validate status parameter if provided
    const validStatuses = ['pending', 'approved', 'rejected', 'all'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status parameter',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const statusFilter = status === 'all' ? null : status;
    const applications = await alumniApplicationModel.getAllApplications(statusFilter);

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });

  } catch (error) {
    console.error('❌ Error in GET /applications:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      message: error.message || 'An error occurred while fetching applications'
    });
  }
});

/**
 * @route   GET /api/alumni-application/applications/:id
 * @desc    Get a specific alumni application by ID
 * @access  Admin only
 */
router.get('/applications/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Application ID must be a valid number'
      });
    }

    const application = await alumniApplicationModel.getApplicationById(parseInt(id));

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: `No application found with ID ${id}`
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('❌ Error in GET /applications/:id:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application',
      message: error.message || 'An error occurred while fetching the application'
    });
  }
});

/**
 * @route   POST /api/alumni-application/applications/:id/approve
 * @desc    Approve an alumni application
 * @access  Admin only
 */
router.post('/applications/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.user.id;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Application ID must be a valid number'
      });
    }

    console.log(`✅ Approving alumni application ${id} by admin ${adminId}`);

    const updatedApplication = await alumniApplicationModel.updateApplicationStatus(
      parseInt(id),
      'approved',
      adminId,
      admin_notes || ''
    );

    res.json({
      success: true,
      message: 'Alumni application approved successfully',
      data: updatedApplication
    });

  } catch (error) {
    console.error('❌ Error in POST /applications/:id/approve:', error);
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to approve application',
      message: error.message || 'An error occurred while approving the application'
    });
  }
});

/**
 * @route   POST /api/alumni-application/applications/:id/reject
 * @desc    Reject an alumni application
 * @access  Admin only
 */
router.post('/applications/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.user.id;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Application ID must be a valid number'
      });
    }

    console.log(`❌ Rejecting alumni application ${id} by admin ${adminId}`);

    const updatedApplication = await alumniApplicationModel.updateApplicationStatus(
      parseInt(id),
      'rejected',
      adminId,
      admin_notes || ''
    );

    res.json({
      success: true,
      message: 'Alumni application rejected',
      data: updatedApplication
    });

  } catch (error) {
    console.error('❌ Error in POST /applications/:id/reject:', error);
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to reject application',
      message: error.message || 'An error occurred while rejecting the application'
    });
  }
});

/**
 * @route   DELETE /api/alumni-application/applications/:id
 * @desc    Delete an alumni application
 * @access  Admin only
 */
router.delete('/applications/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Application ID must be a valid number'
      });
    }

    console.log(`🗑️ Deleting alumni application ${id}`);

    await alumniApplicationModel.deleteApplication(parseInt(id));

    res.json({
      success: true,
      message: 'Alumni application deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /applications/:id:', error);
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete application',
      message: error.message || 'An error occurred while deleting the application'
    });
  }
});

/**
 * @route   GET /api/alumni-application/statistics
 * @desc    Get alumni application statistics
 * @access  Admin only
 */
router.get('/statistics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching alumni application statistics');

    const statistics = await alumniApplicationModel.getApplicationStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('❌ Error in GET /statistics:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message || 'An error occurred while fetching statistics'
    });
  }
});

/**
 * Health check for alumni application routes
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Alumni application routes are operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;