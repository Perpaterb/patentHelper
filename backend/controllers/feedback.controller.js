/**
 * Feedback Controller
 *
 * Handles user feedback and support requests.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { emailService } = require('../services/email');

// Support email - in dev goes to MailHog, in prod to this address
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'zcarss@gmail.com';

/**
 * Send feedback email
 * POST /feedback
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback message is required',
      });
    }

    // Get user details with subscription info and group counts
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        displayName: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        groupMembers: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate group counts
    const groupCount = user.groupMembers.length;
    const adminGroupCount = user.groupMembers.filter(gm => gm.role === 'admin').length;

    // Format trial end date if applicable
    const trialEndsAt = user.trialEndsAt
      ? new Date(user.trialEndsAt).toLocaleDateString('en-AU', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    // Format submission timestamp
    const submittedAt = new Date().toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney',
    });

    // Log for debugging
    console.log('=== SUPPORT TICKET RECEIVED ===');
    console.log('From:', user.displayName, `<${user.email}>`);
    console.log('Subscription:', user.subscriptionStatus);
    console.log('Message:', message.trim());
    console.log('Sending to:', SUPPORT_EMAIL);
    console.log('===============================');

    // Send email via email service (MailHog in dev, SES in prod)
    await emailService.sendTemplate('support_ticket', SUPPORT_EMAIL, {
      userName: user.displayName || 'Unknown User',
      userEmail: user.email,
      userId: user.userId,
      message: message.trim(),
      subscriptionStatus: user.subscriptionStatus || 'unknown',
      trialEndsAt: trialEndsAt,
      groupCount: groupCount,
      adminGroupCount: adminGroupCount,
      submittedAt: submittedAt,
    });

    res.json({
      success: true,
      message: 'Feedback sent successfully',
    });
  } catch (error) {
    console.error('Send feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send feedback',
    });
  }
};

module.exports = {
  sendFeedback,
};
