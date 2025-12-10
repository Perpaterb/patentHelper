/**
 * Email Service Factory
 *
 * Exports the appropriate email service based on environment configuration.
 * Defaults to MailHog for development.
 * Will use AWS SES in production (Phase 6).
 *
 * @module services/email
 */

const MailHogEmailService = require('./mailhogEmailService');
const SESEmailService = require('./sesEmailService');

/**
 * Get the active email service based on environment
 * @returns {EmailInterface} Email service instance
 */
function getEmailService() {
  const emailType = process.env.EMAIL_TYPE || 'mailhog';

  switch (emailType) {
    case 'mailhog':
      return new MailHogEmailService();

    case 'ses':
      return new SESEmailService();

    default:
      console.warn(`Unknown email type: ${emailType}, defaulting to MailHog`);
      return new MailHogEmailService();
  }
}

// Export singleton instance
const emailService = getEmailService();

module.exports = {
  emailService,
  getEmailService,
};
