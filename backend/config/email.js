/**
 * Email Configuration
 * ===================
 * SMTP and email settings for automated notifications
 * Uses Gmail SMTP by default, configurable via environment variables
 * 
 * Required Environment Variables:
 * - EMAIL_USER: Gmail account email address
 * - EMAIL_PASSWORD: Gmail App Password (NOT regular password)
 * 
 * Optional Environment Variables (with defaults):
 * - EMAIL_HOST: SMTP host (default: smtp.gmail.com)
 * - EMAIL_PORT: SMTP port (default: 587)
 * - EMAIL_SECURE: Use TLS (default: false for port 587)
 * - EMAIL_FROM_NAME: Sender display name
 * - EMAIL_FROM_ADDRESS: Sender email (defaults to EMAIL_USER)
 * - ADMIN_EMAIL: Admin notification email (defaults to EMAIL_USER)
 * 
 * Note: You must use Gmail App Password, not your regular Gmail password
 * Generate at: https://myaccount.google.com/apppasswords
 */

require('dotenv').config();

const emailConfig = {
  // SMTP Connection Settings
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  },

  // Email Sender Information
  from: {
    name: process.env.EMAIL_FROM_NAME || 'GSTU Robotics Club',
    address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
  },

  // Admin Email for Notifications
  adminEmail: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,

  // Email Service Options
  options: {
    maxRetries: 3,           // Maximum retry attempts for failed emails
    retryDelay: 5000,        // Delay between retries (milliseconds)
    timeout: 10000           // SMTP connection timeout (milliseconds)
  }
};

// Validation warning (log only, don't block)
if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
  console.warn('⚠️  Email credentials not configured. Email features will not work.');
  console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in your .env file');
}

module.exports = emailConfig;