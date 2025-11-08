/**
 * Email Configuration
 * ===================
 * SMTP and email settings for automated notifications
 * Uses Gmail SMTP by default, configurable via environment variables
 */

/**
 * Environment Variables:
 * =====================
 * REQUIRED:
 * - EMAIL_USER: Gmail account for sending emails
 * - EMAIL_PASSWORD: Gmail App-Specific Password (NOT regular password)
 *   Generate at: https://myaccount.google.com/security → App passwords
 * 
 * OPTIONAL (with defaults):
 * - EMAIL_HOST: SMTP server hostname (default: smtp.gmail.com)
 * - EMAIL_PORT: SMTP server port (default: 587)
 * - EMAIL_SECURE: Use TLS/SSL (default: false for port 587)
 * - EMAIL_FROM_NAME: Sender display name (default: GSTU Robotics Club)
 * - EMAIL_FROM_ADDRESS: Sender email address (default: EMAIL_USER)
 * - ADMIN_EMAIL: Admin notification email (default: EMAIL_USER)
 * 
 * NOTE: For Gmail, use port 587 with secure=false for STARTTLS
 *       Or use port 465 with secure=true for SSL/TLS
 */

// SMTP Server Configuration
const smtp = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true', // true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// Sender Information
const from = {
  name: process.env.EMAIL_FROM_NAME || 'GSTU Robotics Club',
  address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
};

// Admin Email for System Notifications
const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// Email Service Options
const options = {
  maxRetries: 3,         // Number of retry attempts for failed emails
  retryDelay: 5000,      // Delay between retries (5 seconds)
  timeout: 10000         // Connection timeout (10 seconds)
};

// Export Email Configuration
module.exports = {
  smtp,
  from,
  adminEmail,
  options
};