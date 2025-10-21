/**
 * Email Service Interface
 *
 * All email implementations (MailHog, SES) must implement these methods.
 * This abstraction allows seamless switching between local email testing
 * and AWS SES without changing application code.
 *
 * @module services/email/emailInterface
 */

/**
 * @typedef {Object} EmailOptions
 * @property {string} to - Recipient email address
 * @property {string} subject - Email subject line
 * @property {string} [text] - Plain text email body
 * @property {string} [html] - HTML email body
 * @property {string} [from] - Sender email address (defaults to configured FROM address)
 * @property {Array<string>} [cc] - CC recipients
 * @property {Array<string>} [bcc] - BCC recipients
 * @property {Array<Object>} [attachments] - Email attachments
 */

/**
 * Email Service Interface
 * All implementations must provide these methods
 */
class EmailInterface {
  /**
   * Send an email
   * @param {EmailOptions} options - Email options
   * @returns {Promise<Object>} Send result with messageId
   */
  async sendEmail(options) {
    throw new Error('sendEmail() must be implemented');
  }

  /**
   * Send email using a template
   * @param {string} template - Template name
   * @param {string} to - Recipient email
   * @param {Object} data - Template data
   * @returns {Promise<Object>} Send result with messageId
   */
  async sendTemplate(template, to, data) {
    throw new Error('sendTemplate() must be implemented');
  }

  /**
   * Verify email service connection
   * @returns {Promise<boolean>} Connection status
   */
  async verifyConnection() {
    throw new Error('verifyConnection() must be implemented');
  }
}

module.exports = EmailInterface;
