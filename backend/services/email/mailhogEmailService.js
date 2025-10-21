/**
 * MailHog Email Service
 *
 * Implements email interface using MailHog for local development.
 * All emails are sent to MailHog SMTP server for preview at http://localhost:8025
 *
 * This will be replaced with SES in Phase 6.
 *
 * @module services/email/mailhogEmailService
 */

const nodemailer = require('nodemailer');
const EmailInterface = require('./emailInterface');
const emailTemplates = require('./templates');

/**
 * MailHog email service implementation
 * @extends EmailInterface
 */
class MailHogEmailService extends EmailInterface {
  constructor() {
    super();

    // Create nodemailer transporter for MailHog
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 1025,
      secure: false, // MailHog doesn't use TLS
      ignoreTLS: true,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });

    this.fromAddress = process.env.EMAIL_FROM || 'noreply@parentinghelperapp.com';
  }

  /**
   * Send an email via MailHog
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} [options.text] - Plain text body
   * @param {string} [options.html] - HTML body
   * @param {string} [options.from] - Sender address
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    const { to, subject, text, html, from, cc, bcc, attachments } = options;

    try {
      const mailOptions = {
        from: from || this.fromAddress,
        to: to,
        subject: subject,
        text: text,
        html: html,
        cc: cc,
        bcc: bcc,
        attachments: attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Email sent to ${to}: ${subject}`);
      console.log(`   Preview URL: http://localhost:8025`);
      console.log(`   Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        to: to,
        subject: subject,
        previewUrl: 'http://localhost:8025',
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email using a template
   * @param {string} templateName - Template name (welcome, trial_reminder, log_export)
   * @param {string} to - Recipient email
   * @param {Object} data - Template data
   * @returns {Promise<Object>} Send result
   */
  async sendTemplate(templateName, to, data) {
    try {
      // Get template
      const template = emailTemplates[templateName];

      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // Render template with data
      const { subject, text, html } = template(data);

      // Send email
      return await this.sendEmail({
        to: to,
        subject: subject,
        text: text,
        html: html,
      });
    } catch (error) {
      console.error('Template email send error:', error);
      throw error;
    }
  }

  /**
   * Verify MailHog connection
   * @returns {Promise<boolean>} Connection status
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ MailHog email service connected');
      return true;
    } catch (error) {
      console.error('❌ MailHog connection failed:', error.message);
      console.error('   Make sure MailHog is running: docker-compose up -d');
      return false;
    }
  }
}

module.exports = MailHogEmailService;
