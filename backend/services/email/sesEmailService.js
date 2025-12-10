/**
 * AWS SES Email Service
 *
 * Implements email interface using AWS Simple Email Service for production.
 * Uses nodemailer with SES transport for sending emails.
 *
 * Requires:
 * - Lambda IAM role with ses:SendEmail and ses:SendRawEmail permissions
 * - SES domain/email verified in the AWS region
 *
 * @module services/email/sesEmailService
 */

const nodemailer = require('nodemailer');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const EmailInterface = require('./emailInterface');
const emailTemplates = require('./templates');

/**
 * AWS SES email service implementation
 * @extends EmailInterface
 */
class SESEmailService extends EmailInterface {
  constructor() {
    super();

    const region = process.env.AWS_REGION || process.env.AWS_S3_REGION || 'ap-southeast-2';

    // Create SES v2 client (nodemailer v7+ requires sesv2)
    this.sesClient = new SESv2Client({ region });

    // Create nodemailer transporter using SES v2 with AWS SDK v3
    // nodemailer v7 requires: { ses: client, aws: { SendEmailCommand } }
    this.transporter = nodemailer.createTransport({
      SES: { ses: this.sesClient, aws: { SendEmailCommand } },
    });

    this.fromAddress = process.env.EMAIL_FROM || 'noreply@familyhelperapp.com';
    this.region = region;
  }

  /**
   * Send an email via AWS SES
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

      console.log(`[SES] Email sent to ${to}: ${subject}`);
      console.log(`[SES] Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        to: to,
        subject: subject,
      };
    } catch (error) {
      console.error('[SES] Email send error:', error);
      throw new Error(`Failed to send email via SES: ${error.message}`);
    }
  }

  /**
   * Send email using a template
   * @param {string} templateName - Template name (welcome, trial_reminder, log_export, group_invitation)
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
      console.error('[SES] Template email send error:', error);
      throw error;
    }
  }

  /**
   * Verify SES connection (Lambda has IAM role, so this is a basic check)
   * @returns {Promise<boolean>} Connection status
   */
  async verifyConnection() {
    try {
      // SES doesn't have a verify method like SMTP
      // We just check that the client is configured
      console.log(`[SES] AWS SES email service configured (region: ${this.region})`);
      console.log(`[SES] From address: ${this.fromAddress}`);
      return true;
    } catch (error) {
      console.error('[SES] SES configuration error:', error.message);
      return false;
    }
  }
}

module.exports = SESEmailService;
