/**
 * Email Service using Resend API
 * ===============================
 * GSTU Robotics & Research Club
 * 
 * Features:
 * - HTTP API-based (works on Render free tier)
 * - Retry logic with exponential backoff
 * - Comprehensive logging
 * - Beautiful HTML email templates
 * - Support for all club email scenarios
 */

const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration from environment variables
const emailConfig = {
  fromName: process.env.EMAIL_FROM_NAME || 'GSTU Robotics Club',
  fromAddress: process.env.EMAIL_FROM_ADDRESS || 'neyamulfurkan22@gmail.com',
  adminEmail: process.env.ADMIN_EMAIL || 'grrcgstu@gmail.com'
};

// Verify configuration on startup
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not configured in environment variables');
  console.error('   Please add RESEND_API_KEY to your Render environment settings');
} else {
  console.log('✅ Resend email service initialized successfully');
  console.log(`   From: ${emailConfig.fromName} <${emailConfig.fromAddress}>`);
  console.log(`   Admin: ${emailConfig.adminEmail}`);
}

/**
 * Core send email function with retry logic
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Object>} { success: boolean, messageId?: string, error?: string }
 */
async function sendEmailWithRetry(to, subject, html, maxRetries = 3) {
  const recipients = Array.isArray(to) ? to : [to];
  
  console.log(`📧 Sending email to: ${recipients.join(', ')}`);
  console.log(`   Subject: ${subject}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`⏳ Attempting to send email (${attempt}/${maxRetries})...`);
      
      const result = await resend.emails.send({
        from: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
        to: recipients,
        subject: subject,
        html: html
      });
      
      console.log('✅ Email sent successfully via Resend');
      console.log(`   Message ID: ${result.data?.id || result.id}`);
      
      return {
        success: true,
        messageId: result.data?.id || result.id
      };
      
    } catch (error) {
      console.error(`❌ Email send failed (${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        const delayMs = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`🔄 Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('❌ All email send attempts failed');
        console.error('   Full error:', error);
        return {
          success: false,
          error: error.message || 'Failed to send email after multiple attempts'
        };
      }
    }
  }
}

/**
 * HTML Email Templates
 * ====================
 */

// Base email wrapper for consistent styling
function getEmailWrapper(content, headerBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: ${headerBg};
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 { 
          font-size: 28px; 
          margin: 0;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px;
          background: #ffffff;
        }
        .content p { 
          margin-bottom: 16px;
          font-size: 16px;
        }
        .content ul {
          margin: 16px 0;
          padding-left: 24px;
        }
        .content li {
          margin-bottom: 8px;
        }
        .highlight {
          background-color: #f0f7ff;
          border-left: 4px solid #667eea;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: #667eea;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          text-align: center;
        }
        .footer { 
          text-align: center; 
          padding: 24px;
          background: #f8f9fa;
          color: #6c757d;
          font-size: 13px;
          border-top: 1px solid #e9ecef;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .celebration {
          font-size: 48px;
          text-align: center;
          margin: 20px 0;
        }
        strong { font-weight: 600; color: #2c3e50; }
        a { color: #667eea; }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${content}
        <div class="footer">
          <p><strong>GSTU Robotics & Research Club</strong></p>
          <p>Gopalganj Science and Technology University</p>
          <p>📧 <a href="mailto:${emailConfig.adminEmail}">${emailConfig.adminEmail}</a></p>
          <p style="margin-top: 12px; color: #999;">© ${new Date().getFullYear()} GSTU Robotics Club. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Template 1: Membership Application Received (sent to applicant)
function getMembershipApplicationReceivedTemplate(name, applicationId) {
  const content = `
    <div class="header">
      <h1>Thank You for Applying! 🎉</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>Thank you for your interest in joining the <strong>GSTU Robotics & Research Club</strong>!</p>
      
      <div class="highlight">
        <p style="margin: 0;"><strong>Application ID:</strong> #${applicationId}</p>
      </div>
      
      <p>We have successfully received your membership application and our team is currently reviewing it.</p>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>✅ Your application is under review by our team</li>
        <li>📧 You'll receive an update via email within 3-5 business days</li>
        <li>🤝 If approved, you'll get access to our member resources and community</li>
        <li>🚀 You'll be invited to join our WhatsApp/Discord group</li>
      </ul>
      
      <p>We appreciate your patience during the review process. Our team carefully evaluates each application to ensure we build a strong, collaborative robotics community.</p>
      
      <p>If you have any questions in the meantime, feel free to reach out to us at <a href="mailto:${emailConfig.adminEmail}">${emailConfig.adminEmail}</a></p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>GSTU Robotics & Research Club Team</strong></p>
    </div>
  `;
  return getEmailWrapper(content);
}

// Template 2: Admin Notification - New Membership Application
function getAdminMembershipNotificationTemplate(applicationData) {
  const skillsList = applicationData.skills?.length > 0 
    ? applicationData.skills.join(', ') 
    : 'None listed';
  
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">
      <h1>🔔 New Membership Application</h1>
    </div>
    <div class="content">
      <p>A new membership application has been submitted and requires your review.</p>
      
      <div class="highlight">
        <p><strong>Application ID:</strong> #${applicationData.id || 'N/A'}</p>
        <p><strong>Submission Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>
      
      <h3 style="margin-top: 24px; color: #2c3e50;">Applicant Information</h3>
      <table style="width: 100%; margin-top: 12px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600; width: 140px;">Full Name:</td>
          <td style="padding: 8px 0;">${applicationData.full_name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${applicationData.email}">${applicationData.email}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
          <td style="padding: 8px 0;">${applicationData.phone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Student ID:</td>
          <td style="padding: 8px 0;">${applicationData.student_id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Department:</td>
          <td style="padding: 8px 0;">${applicationData.department}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Year:</td>
          <td style="padding: 8px 0;">${applicationData.year}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Skills:</td>
          <td style="padding: 8px 0;">${skillsList}</td>
        </tr>
      </table>
      
      <h3 style="margin-top: 24px; color: #2c3e50;">Why They Want to Join</h3>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin-top: 12px;">
        <p style="margin: 0; white-space: pre-wrap;">${applicationData.why_join || 'No reason provided'}</p>
      </div>
      
      <p style="margin-top: 24px;"><strong>Action Required:</strong> Please review this application from the admin panel and approve or reject it.</p>
      
      <a href="https://neyamulfurkan.github.io/admin" class="button">Review in Admin Panel</a>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)');
}

// Template 3: Membership Approved (sent to applicant)
function getMembershipApprovedTemplate(name) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
      <h1>Congratulations! 🎉</h1>
    </div>
    <div class="content">
      <div class="celebration">🎊 🥳 🎉</div>
      
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>We are absolutely thrilled to inform you that your application to join the <strong>GSTU Robotics & Research Club</strong> has been <strong style="color: #11998e;">APPROVED</strong>! 🎊</p>
      
      <div class="highlight" style="border-left-color: #11998e; background: #e8f8f5;">
        <p style="margin: 0; font-size: 18px; color: #11998e;"><strong>✅ You are now officially a member!</strong></p>
      </div>
      
      <p><strong>Welcome to the GSTU Robotics family!</strong> We're excited to have you on board and can't wait to see the amazing projects and innovations you'll contribute to.</p>
      
      <h3 style="color: #2c3e50; margin-top: 24px;">🚀 Your Next Steps:</h3>
      <ul>
        <li>📱 <strong>Join our communication channels</strong> - You'll receive an invite to our WhatsApp/Discord group within 24 hours</li>
        <li>📅 <strong>Attend the next club meeting</strong> - Check your email for meeting schedule and location</li>
        <li>🤝 <strong>Meet your fellow members</strong> - Get to know the team and find your project squad</li>
        <li>🛠️ <strong>Access member resources</strong> - Get access to our lab, equipment, and learning materials</li>
        <li>🎯 <strong>Start building!</strong> - Begin working on exciting robotics and research projects</li>
      </ul>
      
      <p style="margin-top: 24px;">We have an incredible community of passionate students working on cutting-edge robotics projects, participating in competitions, and pushing the boundaries of innovation. You're now part of this journey!</p>
      
      <p>If you have any questions or need assistance getting started, don't hesitate to reach out to us at <a href="mailto:${emailConfig.adminEmail}">${emailConfig.adminEmail}</a></p>
      
      <p style="margin-top: 24px; font-size: 18px;"><strong>Once again, welcome to the team! Let's build something amazing together! 🤖</strong></p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>GSTU Robotics & Research Club Team</strong></p>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)');
}

// Template 4: New Member Announcement (sent to all members)
function getNewMemberAnnouncementTemplate(newMemberName, newMemberDepartment, newMemberYear) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <h1>New Member Alert! 🎉</h1>
    </div>
    <div class="content">
      <div class="celebration">👋 🌟 🤝</div>
      
      <p>Hello GRRC Family,</p>
      
      <p>We're excited to announce that we have a new member joining our robotics community!</p>
      
      <div class="highlight">
        <p style="margin: 0;"><strong style="font-size: 18px; color: #667eea;">Welcome ${newMemberName}!</strong></p>
        <p style="margin-top: 8px; margin-bottom: 0;">
          📚 ${newMemberDepartment} • ${newMemberYear}
        </p>
      </div>
      
      <p><strong>Let's give them a warm GRRC welcome!</strong> 🎊</p>
      
      <p>Please take a moment to introduce yourself when you see them around campus or in our group chats. Help them feel at home and show them what makes our club special!</p>
      
      <p style="margin-top: 24px;"><em>Remember: Every great innovation starts with a great team. Let's continue building our community together!</em></p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>GSTU Robotics & Research Club</strong></p>
    </div>
  `;
  return getEmailWrapper(content);
}

// Template 5: Membership Rejected (sent to applicant)
function getMembershipRejectedTemplate(name, reason) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
      <h1>Application Status Update</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>Thank you for your interest in joining the GSTU Robotics & Research Club and for taking the time to submit your application.</p>
      
      <p>After careful consideration, we regret to inform you that we are unable to approve your membership application at this time.</p>
      
      ${reason ? `
        <div class="highlight" style="border-left-color: #e74c3c; background: #fee;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin-top: 8px; margin-bottom: 0;">${reason}</p>
        </div>
      ` : ''}
      
      <p><strong>This is not the end!</strong> We encourage you to:</p>
      <ul>
        <li>Continue developing your skills in robotics and technology</li>
        <li>Attend our public workshops and events (open to all students)</li>
        <li>Consider applying again in the future when you meet our criteria</li>
        <li>Connect with us to learn about other ways to get involved</li>
      </ul>
      
      <p>Our decision is based on current club capacity, project requirements, and applicant qualifications. We appreciate your understanding and hope you'll continue to pursue your interest in robotics!</p>
      
      <p>If you have any questions or would like feedback on your application, feel free to reach out to us at <a href="mailto:${emailConfig.adminEmail}">${emailConfig.adminEmail}</a></p>
      
      <p style="margin-top: 24px;">Best wishes for your academic journey,<br><strong>GSTU Robotics & Research Club Team</strong></p>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)');
}

// Template 6: Alumni Application Received
function getAlumniApplicationReceivedTemplate(name, applicationId) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
      <h1>Thank You for Your Alumni Application! 🎓</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>Thank you for applying to be recognized as an alumnus of the <strong>GSTU Robotics & Research Club</strong>!</p>
      
      <div class="highlight" style="border-left-color: #f39c12;">
        <p style="margin: 0;"><strong>Application ID:</strong> #${applicationId}</p>
      </div>
      
      <p>We have received your alumni application and will review it shortly. This helps us maintain our alumni network and celebrate the achievements of our former members.</p>
      
      <p>You will receive an email notification once your application has been processed.</p>
      
      <p>Thank you for being part of the GRRC legacy!</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>GSTU Robotics & Research Club Team</strong></p>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)');
}

// Template 7: Admin - New Alumni Application
function getAdminAlumniNotificationTemplate(applicationData) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">
      <h1>🎓 New Alumni Application</h1>
    </div>
    <div class="content">
      <p>A new alumni application has been submitted for review.</p>
      
      <div class="highlight">
        <p><strong>Application ID:</strong> #${applicationData.id || 'N/A'}</p>
        <p><strong>Submission Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
      </div>
      
      <h3 style="margin-top: 24px; color: #2c3e50;">Applicant Information</h3>
      <table style="width: 100%; margin-top: 12px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600; width: 140px;">Full Name:</td>
          <td style="padding: 8px 0;">${applicationData.full_name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${applicationData.email}">${applicationData.email}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
          <td style="padding: 8px 0;">${applicationData.phone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e9ecef;">
          <td style="padding: 8px 0; font-weight: 600;">Batch:</td>
          <td style="padding: 8px 0;">${applicationData.batch}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">Graduation Year:</td>
          <td style="padding: 8px 0;">${applicationData.graduation_year}</td>
        </tr>
      </table>
      
      <p style="margin-top: 24px;"><strong>Action Required:</strong> Please review this alumni application from the admin panel.</p>
      
      <a href="https://neyamulfurkan.github.io/admin" class="button">Review in Admin Panel</a>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)');
}

// Template 8: Alumni Approved
function getAlumniApprovedTemplate(name) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
      <h1>Alumni Status Approved! 🎓</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>Your alumni application has been approved! You are now officially recognized as an alumnus of the <strong>GSTU Robotics & Research Club</strong>.</p>
      
      <div class="celebration">🎓 ⭐ 🎉</div>
      
      <p>Thank you for being part of the GRRC family and contributing to our legacy. We're proud of your achievements and hope you'll stay connected with the club community.</p>
      
      <p><strong>Alumni Benefits:</strong></p>
      <ul>
        <li>📧 Receive club updates and newsletters</li>
        <li>🤝 Network with current members and other alumni</li>
        <li>🎤 Opportunities to mentor current members</li>
        <li>📣 Featured in our alumni showcase</li>
      </ul>
      
      <p>Welcome to our growing alumni network!</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>GSTU Robotics & Research Club Team</strong></p>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)');
}

// Template 9: Alumni Rejected
function getAlumniRejectedTemplate(name, reason) {
  const content = `
    <div class="header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
      <h1>Alumni Application Status</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      
      <p>Thank you for your alumni application to the GSTU Robotics & Research Club.</p>
      
      <p>After reviewing your application, we are unable to approve it at this time.</p>
      
      ${reason ? `
        <div class="highlight" style="border-left-color: #e74c3c; background: #fee;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin-top: 8px; margin-bottom: 0;">${reason}</p>
        </div>
      ` : ''}
      
      <p>If you believe this is an error or have questions, please contact us at <a href="mailto:${emailConfig.adminEmail}">${emailConfig.adminEmail}</a></p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>GSTU Robotics & Research Club Team</strong></p>
    </div>
  `;
  return getEmailWrapper(content, 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)');
}

/**
 * Public API Functions
 * ====================
 * These match your existing function names to ensure compatibility
 */

/**
 * Send membership application received confirmation
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {number} applicationId - Application ID
 */
async function sendMembershipApplicationEmail(applicantEmail, applicantName, applicationId) {
  const html = getMembershipApplicationReceivedTemplate(applicantName, applicationId);
  return await sendEmailWithRetry(
    applicantEmail,
    'Thank You for Your Membership Application',
    html
  );
}

/**
 * Send admin notification for new membership application
 * @param {string} adminEmail - Admin email (optional, uses default if not provided)
 * @param {Object} applicationData - Application details
 */
async function sendAdminMembershipNotification(adminEmail, applicationData) {
  const recipientEmail = adminEmail || emailConfig.adminEmail;
  const html = getAdminMembershipNotificationTemplate(applicationData);
  return await sendEmailWithRetry(
    recipientEmail,
    'New Membership Application Received',
    html
  );
}

/**
 * Send membership approval notification
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 */
async function sendMembershipApprovalEmail(applicantEmail, applicantName) {
  const html = getMembershipApprovedTemplate(applicantName);
  return await sendEmailWithRetry(
    applicantEmail,
    'Your Membership Application has been Approved! 🎉',
    html
  );
}

/**
 * Send membership rejection notification
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {string} reason - Rejection reason
 */
async function sendMembershipRejectionEmail(applicantEmail, applicantName, reason) {
  const html = getMembershipRejectedTemplate(applicantName, reason);
  return await sendEmailWithRetry(
    applicantEmail,
    'Membership Application Status Update',
    html
  );
}

/**
 * Send new member announcement to all existing members
 * @param {string[]} memberEmails - Array of member email addresses
 * @param {Object} newMemberData - New member information
 */
async function sendNewMemberAnnouncement(memberEmails, newMemberData) {
  console.log(`✅ Fetched ${memberEmails.length} member emails`);
  
  if (memberEmails.length === 0) {
    console.log('⚠️ No member emails to send announcement to');
    return { success: true, message: 'No recipients' };
  }
  
  const html = getNewMemberAnnouncementTemplate(
    newMemberData.name || newMemberData.full_name,
    newMemberData.department,
    newMemberData.year
  );
  
  // Send to admin as primary recipient, BCC all members for privacy
  // Resend doesn't support BCC directly, so we'll send individually
  const results = await Promise.allSettled(
    memberEmails.map(email => 
      sendEmailWithRetry(
        email,
        'Welcome Our Newest Member! 🎉',
        html
      )
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Sent announcements: ${successful}/${memberEmails.length} successful`);
  
  return {
    success: true,
    sent: successful,
    total: memberEmails.length
  };
}

/**
 * Send alumni application received confirmation
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {number} applicationId - Application ID
 */
async function sendAlumniApplicationEmail(applicantEmail, applicantName, applicationId) {
  const html = getAlumniApplicationReceivedTemplate(applicantName, applicationId);
  return await sendEmailWithRetry(
    applicantEmail,
    'Thank You for Your Alumni Application',
    html
  );
}

/**
 * Send admin notification for new alumni application
 * @param {string} adminEmail - Admin email (optional, uses default if not provided)
 * @param {Object} applicationData - Application details
 */
async function sendAdminAlumniNotification(adminEmail, applicationData) {
  const recipientEmail = adminEmail || emailConfig.adminEmail;
  const html = getAdminAlumniNotificationTemplate(applicationData);
  return await sendEmailWithRetry(
    recipientEmail,
    'New Alumni Application Received',
    html
  );
}

/**
 * Send alumni approval notification
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 */
async function sendAlumniApprovalEmail(applicantEmail, applicantName) {
  const html = getAlumniApprovedTemplate(applicantName);
  return await sendEmailWithRetry(
    applicantEmail,
    'Your Alumni Application has been Approved! 🎉',
    html
  );
}

/**
 * Send alumni rejection notification
 * @param {string} applicantEmail - Applicant's email
 * @param {string} applicantName - Applicant's name
 * @param {string} reason - Rejection reason
 */
async function sendAlumniRejectionEmail(applicantEmail, applicantName, reason) {
  const html = getAlumniRejectedTemplate(applicantName, reason);
  return await sendEmailWithRetry(
    applicantEmail,
    'Alumni Application Status Update',
    html
  );
}

/**
 * Generic send email function (for custom emails)
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (not used in this version)
 * @param {Object} options.data - Template data (not used in this version)
 * @param {string} options.html - Custom HTML (if provided)
 */
async function sendEmail(options) {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const html = options.html || `<p>${options.data?.message || 'No content provided'}</p>`;
  
  return await sendEmailWithRetry(
    recipients,
    options.subject,
    html
  );
}

/**
 * Export all email functions
 * These function names match your existing routes for seamless integration
 */
module.exports = {
  // Core function
  sendEmail,
  
  // Membership-related emails
  sendMembershipApplicationEmail,
  sendAdminMembershipNotification,
  sendMembershipApprovalEmail,
  sendMembershipRejectionEmail,
  sendNewMemberAnnouncement,
  
  // Alumni-related emails
  sendAlumniApplicationEmail,
  sendAdminAlumniNotification,
  sendAlumniApprovalEmail,
  sendAlumniRejectionEmail
};