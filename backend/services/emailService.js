/**
 * Email Service
 * =============
 * Handles all email operations for the GSTU Robotics & Research Club
 * Features: HTML templates, retry logic, error handling, logging
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const emailConfig = require('../config/email');

// Create reusable transporter
let transporter = null;

try {
  transporter = nodemailer.createTransport(emailConfig.smtp);
  console.log('✅ Email transporter created successfully');
} catch (error) {
  console.error('❌ Failed to create email transporter:', error.message);
}

/**
 * Load and populate an HTML email template
 * @param {string} templateName - Name of template file (without .html)
 * @param {Object} data - Key-value pairs to replace in template
 * @returns {Promise<string>} Populated HTML content
 */
const loadTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    let html = await fs.readFile(templatePath, 'utf-8');

    // Replace all {{key}} placeholders with data values
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, data[key] || '');
    });

    return html;
  } catch (error) {
    console.error(`❌ Failed to load template "${templateName}":`, error.message);
    throw new Error(`Template "${templateName}" not found or invalid`);
  }
};

/**
 * Send email with automatic retry on failure
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {number} retries - Number of retry attempts remaining
 * @returns {Promise<Object>} Email send result
 */
const sendEmailWithRetry = async (mailOptions, retries = emailConfig.options.maxRetries) => {
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error(`❌ Email send failed (${emailConfig.options.maxRetries - retries + 1}/${emailConfig.options.maxRetries}):`, error.message);

    if (retries > 0) {
      console.log(`🔄 Retrying in ${emailConfig.options.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, emailConfig.options.retryDelay));
      return sendEmailWithRetry(mailOptions, retries - 1);
    } else {
      throw error;
    }
  }
};

/**
 * Send an email (main public API)
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (without .html)
 * @param {Object} options.data - Template data
 * @param {string} [options.cc] - CC recipients
 * @param {string} [options.bcc] - BCC recipients
 * @returns {Promise<Object>} { success: boolean, messageId?: string, error?: string }
 */
const sendEmail = async (options) => {
  try {
    // Validate required fields
    if (!options.to || !options.subject || !options.template) {
      throw new Error('Missing required fields: to, subject, or template');
    }

    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    // Load and populate template
    const html = await loadTemplate(options.template, options.data);

    // Construct mail options
    const mailOptions = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: html,
      cc: options.cc,
      bcc: options.bcc
    };

    console.log(`📧 Sending email to: ${mailOptions.to}`);
    console.log(`   Subject: ${options.subject}`);

    // Send email with retry logic
    const result = await sendEmailWithRetry(mailOptions);

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send membership application confirmation email
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {number} applicationId - Application ID
 * @returns {Promise<Object>} Send result
 */
const sendMembershipApplicationEmail = async (applicantEmail, applicantName, applicationId) => {
  return sendEmail({
    to: applicantEmail,
    subject: 'Thank You for Your Membership Application',
    template: 'membership-application-received',
    data: {
      name: applicantName,
      applicationId: applicationId,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send admin notification for new membership application
 * @param {string} adminEmail - Admin email address
 * @param {Object} applicationData - Application details
 * @returns {Promise<Object>} Send result
 */
const sendAdminMembershipNotification = async (adminEmail, applicationData) => {
  return sendEmail({
    to: adminEmail || emailConfig.adminEmail,
    subject: 'New Membership Application Received',
    template: 'admin-membership-notification',
    data: {
      ...applicationData,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send membership approval email
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @returns {Promise<Object>} Send result
 */
const sendMembershipApprovalEmail = async (applicantEmail, applicantName) => {
  return sendEmail({
    to: applicantEmail,
    subject: 'Your Membership Application has been Approved! 🎉',
    template: 'membership-approved',
    data: {
      name: applicantName,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send membership rejection email
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Send result
 */
const sendMembershipRejectionEmail = async (applicantEmail, applicantName, reason) => {
  return sendEmail({
    to: applicantEmail,
    subject: 'Membership Application Status Update',
    template: 'membership-rejected',
    data: {
      name: applicantName,
      reason: reason,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send alumni application confirmation email
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {number} applicationId - Application ID
 * @returns {Promise<Object>} Send result
 */
const sendAlumniApplicationEmail = async (applicantEmail, applicantName, applicationId) => {
  return sendEmail({
    to: applicantEmail,
    subject: 'Thank You for Your Alumni Application',
    template: 'alumni-application-received',
    data: {
      name: applicantName,
      applicationId: applicationId,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send admin notification for new alumni application
 * @param {string} adminEmail - Admin email address
 * @param {Object} applicationData - Application details
 * @returns {Promise<Object>} Send result
 */
const sendAdminAlumniNotification = async (adminEmail, applicationData) => {
  return sendEmail({
    to: adminEmail || emailConfig.adminEmail,
    subject: 'New Alumni Application Received',
    template: 'admin-alumni-notification',
    data: {
      ...applicationData,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send alumni approval email
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @returns {Promise<Object>} Send result
 */
const sendAlumniApprovalEmail = async (applicantEmail, applicantName) => {
  return sendEmail({
    to: applicantEmail,
    subject: 'Your Alumni Application has been Approved! 🎉',
    template: 'alumni-approved',
    data: {
      name: applicantName,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send alumni rejection email
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Send result
 */
const sendAlumniRejectionEmail = async (applicantEmail, applicantName, reason) => {
  return sendEmail({
    to: applicantEmail,
    subject: 'Alumni Application Status Update',
    template: 'alumni-rejected',
    data: {
      name: applicantName,
      reason: reason,
      year: new Date().getFullYear()
    }
  });
};

/**
 * Send new member announcement to all existing members
 * @param {string[]} memberEmails - Array of member email addresses
 * @param {Object} newMemberData - New member information
 * @returns {Promise<Object>} Send result
 */
const sendNewMemberAnnouncement = async (memberEmails, newMemberData) => {
  return sendEmail({
    to: emailConfig.adminEmail, // Primary recipient (to satisfy email requirements)
    bcc: memberEmails.join(', '), // BCC all members for privacy
    subject: 'Welcome Our Newest Member! 🎉',
    template: 'new-member-announcement',
    data: {
      ...newMemberData,
      year: new Date().getFullYear()
    }
  });
};

module.exports = {
  sendEmail,
  sendMembershipApplicationEmail,
  sendAdminMembershipNotification,
  sendMembershipApprovalEmail,
  sendMembershipRejectionEmail,
  sendAlumniApplicationEmail,
  sendAdminAlumniNotification,
  sendAlumniApprovalEmail,
  sendAlumniRejectionEmail,
  sendNewMemberAnnouncement
};