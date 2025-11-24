/**
 * Feedback Controller
 *
 * Handles user feedback and support requests.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // Get user details
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // For MVP, we'll log the feedback and simulate sending email
    // In production, this would use AWS SES or similar service
    console.log('=== FEEDBACK RECEIVED ===');
    console.log('From:', user.displayName, `<${user.email}>`);
    console.log('Message:', message.trim());
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================');

    // TODO: In production, send email via AWS SES
    // await sendEmail({
    //   to: 'support@parentinghelperapp.com',
    //   subject: `Feedback from ${user.displayName}`,
    //   body: `
    //     User: ${user.displayName}
    //     Email: ${user.email}
    //
    //     Message:
    //     ${message.trim()}
    //   `,
    // });

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
