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
    // Admins can view messages even if not a member (read-only)
    const messageGroupMembership = await prisma.messageGroupMember.findFirst({
      where: {
        messageGroupId: messageGroupId,
        groupMemberId: groupMembership.groupMemberId,
      },
    });

    if (!messageGroupMembership && groupMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this message group',
      });
    }

    // Build query options
    const queryOptions = {
      where: {
        messageGroupId: messageGroupId,
        // Only hide hidden messages from non-admins
        ...(groupMembership.role !== 'admin' && { isHidden: false }),
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
        readReceipts: {
          select: {
            groupMemberId: true,
            readAt: true,
            groupMember: {
              select: {
                displayName: true,
                iconLetters: true,
                iconColor: true,
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
      readReceipts: message.readReceipts.map(receipt => ({
        groupMemberId: receipt.groupMemberId,
        readAt: receipt.readAt,
        displayName: receipt.groupMember.user?.displayName || receipt.groupMember.displayName,
        iconLetters: receipt.groupMember.user?.memberIcon || receipt.groupMember.iconLetters,
        iconColor: receipt.groupMember.user?.iconColor || receipt.groupMember.iconColor,
      })),
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
    const { groupId, messageGroupId} = req.params;

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

    // Get current lastReadAt to find unread messages
    const messageGroupMember = await prisma.messageGroupMember.findUnique({
      where: {
        messageGroupId_groupMemberId: {
          messageGroupId: messageGroupId,
          groupMemberId: groupMembership.groupMemberId,
        },
      },
    });

    // If user is not a member (admin viewing), just return success without marking as read
    // Non-member admins should never have unread counts anyway
    if (!messageGroupMember) {
      return res.json({
        success: true,
        message: 'No action needed - not a member',
        markedAsRead: 0,
      });
    }

    // Find all unread messages (messages created after lastReadAt that user hasn't read yet)
    const unreadMessages = await prisma.message.findMany({
      where: {
        messageGroupId: messageGroupId,
        isHidden: false,
        senderId: {
          not: groupMembership.groupMemberId, // Don't create read receipts for own messages
        },
        createdAt: {
          gt: messageGroupMember?.lastReadAt || new Date(0),
        },
        // Only get messages that don't already have a read receipt from this user
        readReceipts: {
          none: {
            groupMemberId: groupMembership.groupMemberId,
          },
        },
      },
      select: {
        messageId: true,
        content: true,
        senderId: true,
      },
    });

    const now = new Date();

    // Create read receipts for all unread messages
    if (unreadMessages.length > 0) {
      await prisma.messageReadReceipt.createMany({
        data: unreadMessages.map(msg => ({
          messageId: msg.messageId,
          groupMemberId: groupMembership.groupMemberId,
          readAt: now,
        })),
        skipDuplicates: true, // Skip if read receipt already exists
      });

      // Create audit log for message reads
      const messageIds = unreadMessages.map(m => m.messageId).join(', ');
      const messageContent = unreadMessages.length === 1
        ? `Read message: "${unreadMessages[0].content.substring(0, 50)}${unreadMessages[0].content.length > 50 ? '...' : ''}"`
        : `Read ${unreadMessages.length} messages`;

      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'read_messages',
          performedBy: groupMembership.groupMemberId,
          performedByName: groupMembership.displayName,
          performedByEmail: groupMembership.email || 'N/A',
          actionLocation: 'messages',
          messageContent: `${messageContent}. Message IDs: ${messageIds}`,
        },
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
        lastReadAt: now,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Marked as read',
      messagesRead: unreadMessages.length,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Failed to mark as read',
      message: error.message,
    });
  }
}

/**
 * Hide a message
 * PUT /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/hide
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function hideMessage(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId, messageId } = req.params;

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

    // Get the message
    const message = await prisma.message.findUnique({
      where: {
        messageId: messageId,
      },
      include: {
        messageGroup: true,
      },
    });

    if (!message) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Message not found',
      });
    }

    // Check if message belongs to this message group
    if (message.messageGroupId !== messageGroupId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message does not belong to this message group',
      });
    }

    // Check permissions
    const isAdmin = groupMembership.role === 'admin';
    const isOwnMessage = message.senderId === groupMembership.groupMemberId;
    const canDeleteOwnMessages = message.messageGroup.usersCanDeleteOwnMessages;

    if (!isAdmin && !isOwnMessage) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only hide your own messages',
      });
    }

    if (!isAdmin && isOwnMessage && !canDeleteOwnMessages) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Users cannot delete their own messages in this message group',
      });
    }

    // Hide the message
    await prisma.message.update({
      where: {
        messageId: messageId,
      },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenBy: groupMembership.groupMemberId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'hide_message',
        performedBy: groupMembership.groupMemberId,
        performedByName: groupMembership.displayName,
        performedByEmail: groupMembership.email || 'N/A',
        actionLocation: 'messages',
        messageContent: `Hidden message: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}" (Message ID: ${messageId})`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Message hidden successfully',
    });
  } catch (error) {
    console.error('Hide message error:', error);
    res.status(500).json({
      error: 'Failed to hide message',
      message: error.message,
    });
  }
}

/**
 * Unhide a message (admin only)
 * PUT /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/unhide
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function unhideMessage(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId, messageId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is an admin of this group
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

    if (groupMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can unhide messages',
      });
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: {
        messageId: messageId,
      },
    });

    if (!message) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Message not found',
      });
    }

    // Check if message belongs to this message group
    if (message.messageGroupId !== messageGroupId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message does not belong to this message group',
      });
    }

    // Unhide the message
    await prisma.message.update({
      where: {
        messageId: messageId,
      },
      data: {
        isHidden: false,
        hiddenAt: null,
        hiddenBy: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'unhide_message',
        performedBy: groupMembership.groupMemberId,
        performedByName: groupMembership.displayName,
        performedByEmail: groupMembership.email || 'N/A',
        actionLocation: 'messages',
        messageContent: `Unhidden message: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}" (Message ID: ${messageId})`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Message unhidden successfully',
    });
  } catch (error) {
    console.error('Unhide message error:', error);
    res.status(500).json({
      error: 'Failed to unhide message',
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
  hideMessage,
  unhideMessage,
};
