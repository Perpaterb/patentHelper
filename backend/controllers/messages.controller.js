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

    // TODO: Implement message groups
    // For now, return empty messages list
    // In the future, we need to either:
    // 1. Create a default message group for each group, OR
    // 2. Simplify the schema to have messages directly on groups

    res.status(200).json({
      success: true,
      messages: [],
      hasMore: false,
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

    // TODO: Implement message groups
    // For now, sending messages is disabled
    return res.status(501).json({
      error: 'Not Implemented',
      message: 'Messaging feature coming soon. Message groups need to be implemented.',
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
}

/**
 * Get messages for a message group
 * GET /groups/:groupId/message-groups/:messageGroupId/messages
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getMessageGroupMessages(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId } = req.params;
    const { limit = 50, before } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const groupMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!groupMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Check if user is a member of this message group
    const messageGroupMembership = await prisma.messageGroupMember.findFirst({
      where: {
        messageGroupId: messageGroupId,
        groupMemberId: groupMembership.groupMemberId,
      },
    });

    if (!messageGroupMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this message group',
      });
    }

    // Build query options
    const queryOptions = {
      where: {
        messageGroupId: messageGroupId,
        isHidden: false, // Only show non-hidden messages by default
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
      take: parseInt(limit),
      include: {
        sender: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
      },
    };

    // If 'before' timestamp provided, get messages before that time
    if (before) {
      queryOptions.where.createdAt = {
        lt: new Date(before),
      };
    }

    const messages = await prisma.message.findMany(queryOptions);

    // Merge User profile data with GroupMember data (prioritize User profile)
    const messagesWithLatestProfile = messages.map(message => ({
      ...message,
      sender: {
        groupMemberId: message.sender.groupMemberId,
        displayName: message.sender.user?.displayName || message.sender.displayName,
        iconLetters: message.sender.user?.memberIcon || message.sender.iconLetters,
        iconColor: message.sender.user?.iconColor || message.sender.iconColor,
        role: message.sender.role,
      },
    }));

    res.status(200).json({
      success: true,
      messages: messagesWithLatestProfile,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Get message group messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message,
    });
  }
}

/**
 * Send a message to a message group
 * POST /groups/:groupId/message-groups/:messageGroupId/messages
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function sendMessageGroupMessage(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId } = req.params;
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
    const groupMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!groupMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Supervisors cannot send messages (per appplan.md line 91)
    if (groupMembership.role === 'supervisor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Supervisors cannot send messages',
      });
    }

    // Check if user is a member of this message group
    const messageGroupMembership = await prisma.messageGroupMember.findFirst({
      where: {
        messageGroupId: messageGroupId,
        groupMemberId: groupMembership.groupMemberId,
      },
    });

    if (!messageGroupMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this message group',
      });
    }

    // Validate mentions if provided
    let validMentions = [];
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      // Verify all mentioned members are in the message group
      const messageGroupMembers = await prisma.messageGroupMember.findMany({
        where: {
          messageGroupId: messageGroupId,
          groupMemberId: {
            in: mentions,
          },
        },
        select: {
          groupMemberId: true,
        },
      });

      validMentions = messageGroupMembers.map(m => m.groupMemberId);
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        messageGroup: {
          connect: {
            messageGroupId: messageGroupId,
          },
        },
        sender: {
          connect: {
            groupMemberId: groupMembership.groupMemberId,
          },
        },
        content: content.trim(),
        mentions: validMentions,
      },
      include: {
        sender: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
      },
    });

    // Merge User profile data with GroupMember data (prioritize User profile)
    const messageWithLatestProfile = {
      ...message,
      sender: {
        groupMemberId: message.sender.groupMemberId,
        displayName: message.sender.user?.displayName || message.sender.displayName,
        iconLetters: message.sender.user?.memberIcon || message.sender.iconLetters,
        iconColor: message.sender.user?.iconColor || message.sender.iconColor,
        role: message.sender.role,
      },
    };

    // Update lastMessageAt on the message group
    await prisma.messageGroup.update({
      where: {
        messageGroupId: messageGroupId,
      },
      data: {
        lastMessageAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      message: messageWithLatestProfile,
    });
  } catch (error) {
    console.error('Send message group message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
}

/**
 * Mark message group as read
 * PUT /groups/:groupId/message-groups/:messageGroupId/mark-read
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function markMessageGroupAsRead(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const groupMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!groupMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Update lastReadAt for this message group member
    await prisma.messageGroupMember.update({
      where: {
        messageGroupId_groupMemberId: {
          messageGroupId: messageGroupId,
          groupMemberId: groupMembership.groupMemberId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark as read',
      message: error.message,
    });
  }
}

module.exports = {
  getMessages,
  sendMessage,
  getMessageGroupMessages,
  sendMessageGroupMessage,
  markMessageGroupAsRead,
};
