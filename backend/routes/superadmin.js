const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { authenticateToken, isSuperAdmin } = require('../middleware/auth');

// Apply middleware to all routes
router.use(authenticateToken);
router.use(isSuperAdmin);

// ========== DASHBOARD ==========
router.get('/dashboard', async (req, res) => {
  try {
    const [adminsResult] = await pool.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active FROM admins WHERE is_super_admin = false'
    );
    
    const [approvalsResult] = await pool.query(
      "SELECT COUNT(*) as pending FROM pending_approvals WHERE status = 'pending'"
    );
    
    res.json({
      success: true,
      data: {
        totalAdmins: adminsResult[0].total || 0,
        activeAdmins: adminsResult[0].active || 0,
        pendingApprovals: approvalsResult[0].pending || 0
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// ========== ADMIN MANAGEMENT ==========

// Get all regular admins
router.get('/admins', async (req, res) => {
  try {
    const [admins] = await pool.query(
      `SELECT id, username, permissions, is_active, created_at, last_login, created_by
       FROM admins 
       WHERE is_super_admin = false 
       ORDER BY created_at DESC`
    );
    
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admins' });
  }
});

// Create new admin
router.post('/admins/create', async (req, res) => {
  try {
    const { username, email, permissions } = req.body;
    
    if (!username || !email || !permissions) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, email, and permissions are required' 
      });
    }
    
    // Check if username already exists
    const [existing] = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      [username]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already exists' 
      });
    }
    
    // Generate temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Insert new admin
    const [result] = await pool.query(
      `INSERT INTO admins (username, password_hash, permissions, created_by, is_active, is_super_admin)
       VALUES ($1, $2, $3, $4, true, false)
       RETURNING id, username, permissions, created_at`,
      [username, hashedPassword, JSON.stringify(permissions), req.user.id]
    );
    
    // Log the action
    await logAuditAction(
      req.user.id,
      'create_admin',
      'admin',
      result[0].id,
      { username, email, permissions },
      req
    );
    
    // TODO: Send email with temporary password
    // For now, return it in response (in production, only send via email)
    
    res.status(201).json({
      success: true,
      data: result[0],
      tempPassword: tempPassword, // REMOVE IN PRODUCTION
      message: 'Admin created successfully'
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to create admin' });
  }
});

// Update admin permissions
router.put('/admins/:id/permissions', async (req, res) => {
  try {
    const { permissions } = req.body;
    const adminId = req.params.id;
    
    // Prevent editing super admin
    const [admin] = await pool.query(
      'SELECT is_super_admin FROM admins WHERE id = $1',
      [adminId]
    );
    
    if (admin.length === 0) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    if (admin[0].is_super_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot modify super admin permissions' 
      });
    }
    
    await pool.query(
      'UPDATE admins SET permissions = $1 WHERE id = $2',
      [JSON.stringify(permissions), adminId]
    );
    
    await logAuditAction(
      req.user.id,
      'update_admin_permissions',
      'admin',
      adminId,
      { permissions },
      req
    );
    
    res.json({ success: true, message: 'Permissions updated' });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
});

// Toggle admin active status
router.put('/admins/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    const adminId = req.params.id;
    
    // Prevent deactivating super admin
    const [admin] = await pool.query(
      'SELECT is_super_admin FROM admins WHERE id = $1',
      [adminId]
    );
    
    if (admin.length === 0) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    if (admin[0].is_super_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot deactivate super admin' 
      });
    }
    
    await pool.query(
      'UPDATE admins SET is_active = $1 WHERE id = $2',
      [is_active, adminId]
    );
    
    await logAuditAction(
      req.user.id,
      is_active ? 'activate_admin' : 'deactivate_admin',
      'admin',
      adminId,
      { is_active },
      req
    );
    
    res.json({ 
      success: true, 
      message: `Admin ${is_active ? 'activated' : 'deactivated'}` 
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// Delete admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const adminId = req.params.id;
    
    // Prevent deleting super admin
    const [admin] = await pool.query(
      'SELECT is_super_admin, username FROM admins WHERE id = $1',
      [adminId]
    );
    
    if (admin.length === 0) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    if (admin[0].is_super_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete super admin' 
      });
    }
    
    await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);
    
    await logAuditAction(
      req.user.id,
      'delete_admin',
      'admin',
      adminId,
      { username: admin[0].username },
      req
    );
    
    res.json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete admin' });
  }
});

// Reset admin password
router.post('/admins/:id/reset-password', async (req, res) => {
  try {
    const adminId = req.params.id;
    
    // Prevent resetting super admin password
    const [admin] = await pool.query(
      'SELECT is_super_admin, username FROM admins WHERE id = $1',
      [adminId]
    );
    
    if (admin.length === 0) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    if (admin[0].is_super_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot reset super admin password' 
      });
    }
    
    const newPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE id = $2',
      [hashedPassword, adminId]
    );
    
    await logAuditAction(
      req.user.id,
      'reset_admin_password',
      'admin',
      adminId,
      { username: admin[0].username },
      req
    );
    
    res.json({ 
      success: true, 
      tempPassword: newPassword, // REMOVE IN PRODUCTION
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// ========== APPROVAL WORKFLOW ==========

// Get pending approvals
router.get('/approvals', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT pa.*, a.username as admin_username
      FROM pending_approvals pa
      JOIN admins a ON pa.admin_id = a.id
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE pa.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY pa.created_at DESC';
    
    const [approvals] = await pool.query(query, params);
    
    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approvals' });
  }
});

// Approve request
router.post('/approvals/:id/approve', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const approvalId = req.params.id;
    
    // Get approval details
    const [approval] = await client.query(
      'SELECT * FROM pending_approvals WHERE id = $1 AND status = $2',
      [approvalId, 'pending']
    );
    
    if (approval.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'Approval not found or already processed' 
      });
    }
    
    const { action_type, module, item_data } = approval[0];
    
    // Execute the original action based on module and action_type
    let executionResult;
    
    switch (module) {
      case 'members':
        if (action_type === 'create') {
          executionResult = await client.query(
            `INSERT INTO members (name, photo, department, year, role, email, phone, bio, skills, joined_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
              item_data.name, item_data.photo, item_data.department, 
              item_data.year, item_data.role, item_data.email, 
              item_data.phone, item_data.bio, JSON.stringify(item_data.skills), 
              item_data.joined_date
            ]
          );
        }
        break;
        
      case 'events':
        if (action_type === 'create') {
          executionResult = await client.query(
            `INSERT INTO events (title, description, category, date, time, venue, image, status, registration_link)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
              item_data.title, item_data.description, item_data.category,
              item_data.date, item_data.time, item_data.venue,
              item_data.image, item_data.status, item_data.registration_link
            ]
          );
        }
        break;
        
      case 'projects':
        if (action_type === 'create') {
          executionResult = await client.query(
            `INSERT INTO projects (title, description, category, status, image, technologies, team_members, github_link, live_link, completion_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
              item_data.title, item_data.description, item_data.category,
              item_data.status, item_data.image, JSON.stringify(item_data.technologies),
              JSON.stringify(item_data.team_members), item_data.github_link,
              item_data.live_link, item_data.completion_date
            ]
          );
        }
        break;
        
      case 'gallery':
        if (action_type === 'create') {
          executionResult = await client.query(
            `INSERT INTO gallery (image, title, description, category, date, photographer)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              item_data.image, item_data.title, item_data.description,
              item_data.category, item_data.date, item_data.photographer
            ]
          );
        }
        break;
        
      case 'announcements':
        if (action_type === 'create') {
          executionResult = await client.query(
            `INSERT INTO announcements (title, content, priority, date)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [item_data.title, item_data.content, item_data.priority, item_data.date]
          );
        }
        break;
    }
    
    // Update approval status
    await client.query(
      `UPDATE pending_approvals 
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [req.user.id, approvalId]
    );
    
    // Log the approval
    await logAuditAction(
      req.user.id,
      'approve_request',
      module,
      approvalId,
      { action_type, module },
      req,
      client
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Request approved and executed',
      itemId: executionResult ? executionResult[0].id : null
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve request error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve request' });
  } finally {
    client.release();
  }
});

// Reject request
router.post('/approvals/:id/reject', async (req, res) => {
  try {
    const { notes } = req.body;
    const approvalId = req.params.id;
    
    const [result] = await pool.query(
      `UPDATE pending_approvals 
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [req.user.id, notes, approvalId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Approval not found or already processed' 
      });
    }
    
    await logAuditAction(
      req.user.id,
      'reject_request',
      result[0].module,
      approvalId,
      { action_type: result[0].action_type, notes },
      req
    );
    
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
});

// ========== SETTINGS ==========

// Get all settings
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await pool.query(
      'SELECT * FROM super_admin_settings ORDER BY setting_key'
    );
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO super_admin_settings (setting_key, setting_value)
         VALUES ($1, $2)
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = NOW()`,
        [key, value.toString()]
      );
    }
    
    await logAuditAction(
      req.user.id,
      'update_settings',
      'settings',
      null,
      settings,
      req
    );
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// ========== AUDIT LOGS ==========

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { search, module, admin_id, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT al.*, a.username as admin_username
      FROM admin_audit_log al
      JOIN admins a ON al.admin_id = a.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (al.action_type ILIKE $${paramIndex} OR a.username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (module) {
      query += ` AND al.module = $${paramIndex}`;
      params.push(module);
      paramIndex++;
    }
    
    if (admin_id) {
      query += ` AND al.admin_id = $${paramIndex}`;
      params.push(admin_id);
      paramIndex++;
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const [logs] = await pool.query(query, params);
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// Export audit logs as CSV
router.get('/audit-logs/export', async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT al.created_at, a.username, al.action_type, al.module, al.status, al.ip_address
      FROM admin_audit_log al
      JOIN admins a ON al.admin_id = a.id
      ORDER BY al.created_at DESC
      LIMIT 10000
    `);
    
    // Generate CSV
    let csv = 'Timestamp,Admin,Action,Module,Status,IP Address\n';
    logs.forEach(log => {
      csv += `"${log.created_at}","${log.username}","${log.action_type}","${log.module}","${log.status}","${log.ip_address || 'N/A'}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to export logs' });
  }
});

// ========== HELPER FUNCTIONS ==========

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function logAuditAction(adminId, actionType, module, itemId, details, req, client = null) {
  const dbClient = client || pool;
  
  try {
    await dbClient.query(
      `INSERT INTO admin_audit_log 
       (admin_id, action_type, module, item_id, action_details, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'success')`,
      [
        adminId,
        actionType,
        module,
        itemId,
        JSON.stringify(details),
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

module.exports = router;