/**
 * Messages Controller
 *
 * Handles messaging operations within groups.
 */

const { prisma } = require('../config/database');

/**
 * Get messages for a group
 * GET /groups/:groupId/messages
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getMessages(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { limit = 50, before } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Build query filters
    const where = {
      messageGroupId: groupId,
    };

    // Add pagination
    if (before) {
      where.createdAt = {
        lt: new Date(before),
      };
    }

    // Get messages with sender info
    const messages = await prisma.message.findMany({
      where: where,
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
      include: {
        sender: {
          select: {
            userId: true,
            email: true,
            given_name: true,
            family_name: true,
          },
        },
        reactions: {
          select: {
            reactionId: true,
            emoji: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });

    // Reverse to get chronological order
    const messagesChronological = messages.reverse();

    res.status(200).json({
      success: true,
      messages: messagesChronological,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message,
    });
  }
}

/**
 * Send a message to a group
 * POST /groups/:groupId/messages
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { content, mentions } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Message content cannot be empty',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Supervisors cannot send messages (per appplan.md line 91)
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Supervisors cannot send messages',
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        messageGroupId: groupId,
        senderId: userId,
        content: content.trim(),
        mentions: mentions || [],
      },
      include: {
        sender: {
          select: {
            userId: true,
            email: true,
            given_name: true,
            family_name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        userId: userId,
        action: 'send_message',
        details: `Sent message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        contentSnapshot: content,
      },
    });

    res.status(201).json({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
}

module.exports = {
  getMessages,
  sendMessage,
};
