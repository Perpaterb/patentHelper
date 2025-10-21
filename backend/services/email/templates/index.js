/**
 * Email Templates
 *
 * Template functions that generate email subject, text, and HTML content.
 * Each template is a function that takes data and returns {subject, text, html}.
 *
 * @module services/email/templates
 */

/**
 * Welcome email template
 * Sent when a new user registers
 *
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name or email
 * @param {string} data.loginUrl - URL to login to the app
 * @returns {Object} Email content {subject, text, html}
 */
function welcome(data) {
  const { userName, loginUrl } = data;

  const subject = 'Welcome to Parenting Helper!';

  const text = `
Hi ${userName},

Welcome to Parenting Helper! We're excited to have you on board.

Parenting Helper makes co-parenting easier with:
- Secure messaging between parents, children, and caregivers
- Shared calendar for scheduling and responsibilities
- Financial tracking for child-related expenses
- Complete audit logs for transparency

Your account has been created successfully. You can now:
1. Log in at: ${loginUrl}
2. Create or join a family group
3. Start coordinating with your co-parents

You're on a 20-day free trial. During this time, you can explore all features with:
- One admin per group
- 10GB of storage for logs, images, and videos

After the trial, subscribe for $8 AUD/month to continue as an admin.

Need help? Reply to this email or visit our support page.

Best regards,
The Parenting Helper Team
`.trim();

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #2c3e50;">Welcome to Parenting Helper!</h1>

  <p>Hi ${userName},</p>

  <p>We're excited to have you on board! Parenting Helper makes co-parenting easier with:</p>

  <ul>
    <li>Secure messaging between parents, children, and caregivers</li>
    <li>Shared calendar for scheduling and responsibilities</li>
    <li>Financial tracking for child-related expenses</li>
    <li>Complete audit logs for transparency</li>
  </ul>

  <h2 style="color: #2c3e50;">Get Started</h2>

  <p>Your account has been created successfully. Here's what to do next:</p>

  <ol>
    <li>Log in to your account</li>
    <li>Create or join a family group</li>
    <li>Start coordinating with your co-parents</li>
  </ol>

  <a href="${loginUrl}" style="display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
    Log In Now
  </a>

  <h2 style="color: #2c3e50;">Your Free Trial</h2>

  <p>You're on a <strong>20-day free trial</strong> with:</p>
  <ul>
    <li>One admin per group</li>
    <li>10GB of storage for logs, images, and videos</li>
  </ul>

  <p>After the trial, subscribe for <strong>$8 AUD/month</strong> to continue as an admin.</p>

  <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">

  <p style="color: #7f8c8d; font-size: 14px;">
    Need help? Reply to this email or visit our support page.
  </p>

  <p style="color: #7f8c8d; font-size: 14px;">
    Best regards,<br>
    The Parenting Helper Team
  </p>
</div>
`.trim();

  return { subject, text, html };
}

/**
 * Trial reminder email template
 * Sent when trial is expiring
 *
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name or email
 * @param {number} data.daysLeft - Days remaining in trial
 * @param {string} data.subscribeUrl - URL to subscribe
 * @returns {Object} Email content {subject, text, html}
 */
function trial_reminder(data) {
  const { userName, daysLeft, subscribeUrl } = data;

  const subject = `Your Parenting Helper trial expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;

  const text = `
Hi ${userName},

Your 20-day free trial of Parenting Helper will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.

To continue using Parenting Helper as a group admin, please subscribe before your trial ends.

Subscription Details:
- Price: $8 AUD/month
- Includes: 10GB storage (logs, images, videos)
- Additional storage: $1 AUD per 2GB/month
- Cancel anytime

Subscribe now: ${subscribeUrl}

What happens if you don't subscribe:
- Your group will be archived (read-only)
- All data will be preserved
- You can reactivate by subscribing later

Questions? Reply to this email and we'll help.

Best regards,
The Parenting Helper Team
`.trim();

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #e74c3c;">Trial Expiring Soon</h1>

  <p>Hi ${userName},</p>

  <p>Your 20-day free trial will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>

  <p>To continue using Parenting Helper as a group admin, please subscribe before your trial ends.</p>

  <div style="background: #ecf0f1; padding: 20px; border-radius: 4px; margin: 20px 0;">
    <h2 style="color: #2c3e50; margin-top: 0;">Subscription Details</h2>
    <ul style="margin: 0;">
      <li>Price: <strong>$8 AUD/month</strong></li>
      <li>Includes: 10GB storage (logs, images, videos)</li>
      <li>Additional storage: $1 AUD per 2GB/month</li>
      <li>Cancel anytime</li>
    </ul>
  </div>

  <a href="${subscribeUrl}" style="display: inline-block; background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
    Subscribe Now
  </a>

  <h3 style="color: #2c3e50;">What happens if you don't subscribe:</h3>
  <ul>
    <li>Your group will be archived (read-only)</li>
    <li>All data will be preserved</li>
    <li>You can reactivate by subscribing later</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">

  <p style="color: #7f8c8d; font-size: 14px;">
    Questions? Reply to this email and we'll help.
  </p>

  <p style="color: #7f8c8d; font-size: 14px;">
    Best regards,<br>
    The Parenting Helper Team
  </p>
</div>
`.trim();

  return { subject, text, html };
}

/**
 * Log export email template
 * Sent when audit log export is ready
 *
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name or email
 * @param {string} data.groupName - Name of the group
 * @param {string} data.downloadUrl - URL to download logs (password protected)
 * @param {string} data.password - Password for the export file
 * @param {string} data.expiresIn - How long the link is valid (e.g., "7 days")
 * @returns {Object} Email content {subject, text, html}
 */
function log_export(data) {
  const { userName, groupName, downloadUrl, password, expiresIn } = data;

  const subject = `Your ${groupName} audit log export is ready`;

  const text = `
Hi ${userName},

Your audit log export for "${groupName}" is ready to download.

Download Link: ${downloadUrl}
Password: ${password}

This link expires in ${expiresIn}.

The export includes:
- All group messages (including hidden messages)
- Calendar events and responsibilities
- Financial matters and payments
- Media attachments (images, videos)
- Complete audit trail with timestamps

Important:
- The download is password-protected for security
- Hidden messages are visible (you requested full logs)
- Media links are temporary signed URLs
- Save the export if you need long-term records

Questions? Reply to this email.

Best regards,
The Parenting Helper Team
`.trim();

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #27ae60;">Log Export Ready</h1>

  <p>Hi ${userName},</p>

  <p>Your audit log export for <strong>"${groupName}"</strong> is ready to download.</p>

  <div style="background: #ecf0f1; padding: 20px; border-radius: 4px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Download Link:</strong></p>
    <a href="${downloadUrl}" style="color: #3498db; word-break: break-all;">${downloadUrl}</a>

    <p style="margin: 20px 0 10px 0;"><strong>Password:</strong></p>
    <code style="background: white; padding: 8px 12px; border-radius: 3px; display: inline-block; font-size: 16px; letter-spacing: 1px;">
      ${password}
    </code>

    <p style="margin: 20px 0 0 0; color: #e74c3c; font-size: 14px;">
      ⏰ This link expires in ${expiresIn}
    </p>
  </div>

  <h2 style="color: #2c3e50;">What's Included:</h2>
  <ul>
    <li>All group messages (including hidden messages)</li>
    <li>Calendar events and responsibilities</li>
    <li>Financial matters and payments</li>
    <li>Media attachments (images, videos)</li>
    <li>Complete audit trail with timestamps</li>
  </ul>

  <div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0;">
    <h3 style="color: #f39c12; margin-top: 0;">Important:</h3>
    <ul style="margin: 0;">
      <li>The download is password-protected for security</li>
      <li>Hidden messages are visible (you requested full logs)</li>
      <li>Media links are temporary signed URLs</li>
      <li>Save the export if you need long-term records</li>
    </ul>
  </div>

  <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">

  <p style="color: #7f8c8d; font-size: 14px;">
    Questions? Reply to this email.
  </p>

  <p style="color: #7f8c8d; font-size: 14px;">
    Best regards,<br>
    The Parenting Helper Team
  </p>
</div>
`.trim();

  return { subject, text, html };
}

module.exports = {
  welcome,
  trial_reminder,
  log_export,
};
