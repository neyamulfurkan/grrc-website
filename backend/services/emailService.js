/**
 * Email Service
 * =============
 * Handles all email operations for the GSTU Robotics Club
 * Features: HTML templates, retry logic, error handling, logging
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const emailConfig = require('../config/email');

let transporter;
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
async function loadTemplate(templateName, data) {
  try {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    let html = await fs.readFile(templatePath, 'utf-8');
    
    html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
    
    console.log(`✅ Template loaded: ${templateName}`);
    return html;
  } catch (error) {
    console.error(`❌ Template loading failed: ${templateName}`, error.message);
    throw new Error(`Template not found: ${templateName}`);
  }
}

/**
 * Send email with automatic retry on failure
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {number} retries - Number of retry attempts remaining
 * @returns {Promise<Object>} Email send result
 */
async function sendEmailWithRetry(mailOptions, retries = emailConfig.options.maxRetries) {
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully: ${result.messageId}`);
    return result;
  } catch (error) {
    if (retries > 0) {
      console.log(`🔄 Retrying email send... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, emailConfig.options.retryDelay));
      return sendEmailWithRetry(mailOptions, retries - 1);
    }
    console.error('❌ Email send failed after all retries:', error.message);
    throw error;
  }
}

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
async function sendEmail(options) {
  try {
    if (!options.to || !options.subject || !options.template) {
      throw new Error('Missing required fields: to, subject, or template');
    }

    const html = await loadTemplate(options.template, options.data);
    
    const mailOptions = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: html,
      cc: options.cc,
      bcc: options.bcc
    };

    const result = await sendEmailWithRetry(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Send email error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendMembershipApplicationEmail(applicantEmail, applicantName, applicationId) {
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
}

async function sendAdminMembershipNotification(adminEmail, applicationData) {
  return sendEmail({
    to: adminEmail || emailConfig.adminEmail,
    subject: 'New Membership Application Received',
    template: 'admin-membership-notification',
    data: {
      ...applicationData,
      year: new Date().getFullYear()
    }
  });
}

async function sendMembershipApprovalEmail(applicantEmail, applicantName) {
  return sendEmail({
    to: applicantEmail,
    subject: 'Your Membership Application has been Approved! 🎉',
    template: 'membership-approved',
    data: {
      name: applicantName,
      year: new Date().getFullYear()
    }
  });
}

async function sendMembershipRejectionEmail(applicantEmail, applicantName, reason) {
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
}

async function sendAlumniApplicationEmail(applicantEmail, applicantName, applicationId) {
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
}

async function sendAdminAlumniNotification(adminEmail, applicationData) {
  return sendEmail({
    to: adminEmail || emailConfig.adminEmail,
    subject: 'New Alumni Application Received',
    template: 'admin-alumni-notification',
    data: {
      ...applicationData,
      year: new Date().getFullYear()
    }
  });
}

async function sendAlumniApprovalEmail(applicantEmail, applicantName) {
  return sendEmail({
    to: applicantEmail,
    subject: 'Your Alumni Application has been Approved! 🎉',
    template: 'alumni-approved',
    data: {
      name: applicantName,
      year: new Date().getFullYear()
    }
  });
}

async function sendAlumniRejectionEmail(applicantEmail, applicantName, reason) {
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
}

async function sendNewMemberAnnouncement(memberEmails, newMemberData) {
  return sendEmail({
    to: emailConfig.adminEmail,
    bcc: Array.isArray(memberEmails) ? memberEmails.join(', ') : memberEmails,
    subject: 'Welcome Our Newest Member! 🎉',
    template: 'new-member-announcement',
    data: {
      ...newMemberData,
      year: new Date().getFullYear()
    }
  });
}

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