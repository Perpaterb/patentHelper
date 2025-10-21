/**
 * Send Test Email
 *
 * Utility script to test email sending with MailHog.
 * Sends sample emails using all three templates.
 *
 * Usage:
 *   node utils/sendTestEmail.js
 *   node utils/sendTestEmail.js welcome
 *   node utils/sendTestEmail.js trial_reminder
 *   node utils/sendTestEmail.js log_export
 *
 * @module utils/sendTestEmail
 */

require('dotenv').config({ path: '../.env.local' });
const { emailService } = require('../services/email');

const templateType = process.argv[2] || 'all';

async function sendWelcomeEmail() {
  console.log('\n📧 Sending Welcome Email...');
  try {
    const result = await emailService.sendTemplate('welcome', 'test@example.com', {
      userName: 'John Doe',
      loginUrl: 'http://localhost:3000/auth/login',
    });
    console.log('✅ Welcome email sent successfully');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Preview: ${result.previewUrl}`);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
  }
}

async function sendTrialReminderEmail() {
  console.log('\n📧 Sending Trial Reminder Email...');
  try {
    const result = await emailService.sendTemplate('trial_reminder', 'test@example.com', {
      userName: 'John Doe',
      daysLeft: 3,
      subscribeUrl: 'http://parentinghelperapp.com/subscribe',
    });
    console.log('✅ Trial reminder email sent successfully');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Preview: ${result.previewUrl}`);
  } catch (error) {
    console.error('❌ Failed to send trial reminder email:', error.message);
  }
}

async function sendLogExportEmail() {
  console.log('\n📧 Sending Log Export Email...');
  try {
    const result = await emailService.sendTemplate('log_export', 'test@example.com', {
      userName: 'John Doe',
      groupName: 'Smith Family',
      downloadUrl: 'https://example.com/downloads/logs/abc123',
      password: 'SecurePass123',
      expiresIn: '7 days',
    });
    console.log('✅ Log export email sent successfully');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Preview: ${result.previewUrl}`);
  } catch (error) {
    console.error('❌ Failed to send log export email:', error.message);
  }
}

async function sendBasicEmail() {
  console.log('\n📧 Sending Basic Test Email...');
  try {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email from Parenting Helper',
      text: 'This is a plain text test email.',
      html: '<h1>Test Email</h1><p>This is an <strong>HTML</strong> test email.</p>',
    });
    console.log('✅ Basic email sent successfully');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Preview: ${result.previewUrl}`);
  } catch (error) {
    console.error('❌ Failed to send basic email:', error.message);
  }
}

async function main() {
  console.log('');
  console.log('🔐 Email Service Test');
  console.log('=====================');
  console.log(`Testing: ${templateType === 'all' ? 'All Templates' : templateType}`);
  console.log('');

  // Verify connection first
  const connected = await emailService.verifyConnection();
  if (!connected) {
    console.error('\n❌ Cannot connect to email service. Make sure MailHog is running:');
    console.error('   docker-compose up -d');
    process.exit(1);
  }

  // Send emails based on argument
  if (templateType === 'all' || templateType === 'basic') {
    await sendBasicEmail();
  }

  if (templateType === 'all' || templateType === 'welcome') {
    await sendWelcomeEmail();
  }

  if (templateType === 'all' || templateType === 'trial_reminder') {
    await sendTrialReminderEmail();
  }

  if (templateType === 'all' || templateType === 'log_export') {
    await sendLogExportEmail();
  }

  console.log('');
  console.log('✅ All emails sent!');
  console.log('');
  console.log('View emails at: http://localhost:8025');
  console.log('');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
