/**
 * Message Groups Controller
 *
 * Handles message group operations within groups.
 * Message groups are subsets of group members who can communicate together.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all message groups for a group
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getMessageGroups(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of the group
    const userMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!userMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Get all message groups where user is a member
    const messageGroups = await prisma.messageGroup.findMany({
      where: {
        groupId: groupId,
        members: {
          some: {
            groupMemberId: userMembership.groupMemberId,
          },
        },
      },
      include: {
        members: {
          select: {
            groupMemberId: true, // Include for React key and identification
            groupMember: {
              select: {
                displayName: true,
                iconLetters: true,
                iconColor: true,
                isRegistered: true,
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
        _count: {
          select: {
            messages: true,
            members: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    // Calculate unread count for each message group and merge profile data
    const messageGroupsWithUnreadCount = await Promise.all(
      messageGroups.map(async (messageGroup) => {
        // Find current user's membership to get their lastReadAt
        const currentUserMembership = await prisma.messageGroupMember.findUnique({
          where: {
            messageGroupId_groupMemberId: {
              messageGroupId: messageGroup.messageGroupId,
              groupMemberId: userMembership.groupMemberId,
            },
          },
        });

        // Count unread messages (messages created after lastReadAt)
        const unreadCount = await prisma.message.count({
          where: {
            messageGroupId: messageGroup.messageGroupId,
            isHidden: false,
            createdAt: {
              gt: currentUserMembership?.lastReadAt || new Date(0), // If no lastReadAt, all messages are unread
            },
          },
        });

        // Count unread mentions (messages mentioning user created after lastReadAt)
        const unreadMentionsCount = await prisma.message.count({
          where: {
            messageGroupId: messageGroup.messageGroupId,
            isHidden: false,
            mentions: {
              has: userMembership.groupMemberId,
            },
            createdAt: {
              gt: currentUserMembership?.lastReadAt || new Date(0),
            },
          },
        });

        // Merge User profile data with GroupMember data (prioritize User profile)
        return {
          ...messageGroup,
          unreadCount,
          unreadMentionsCount,
          members: messageGroup.members.map(member => ({
            groupMemberId: member.groupMemberId,
            groupMember: {
              displayName: member.groupMember.user?.displayName || member.groupMember.displayName,
              iconLetters: member.groupMember.user?.memberIcon || member.groupMember.iconLetters,
              iconColor: member.groupMember.user?.iconColor || member.groupMember.iconColor,
              isRegistered: member.groupMember.isRegistered,
            },
          })),
        };
      })
    );

    res.json({
      success: true,
      messageGroups: messageGroupsWithUnreadCount,
    });
  } catch (error) {
    console.error('Get message groups error:', error);
    res.status(500).json({
      error: 'Failed to get message groups',
      message: error.message,
    });
  }
}

/**
 * Create a new message group
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createMessageGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { name, memberIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name and memberIds (array) are required',
      });
    }

    if (memberIds.length < 2) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Message group must have at least 2 members',
      });
    }

    // Check if user is a member of the group
    const userMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!userMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Check permissions based on group settings
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
    });

    const canCreateMessageGroup =
      userMembership.role === 'admin' ||
      (userMembership.role === 'parent' && group.parentCanCreateMessageGroup) ||
      (userMembership.role === 'child' && group.childCanCreateMessageGroup) ||
      (userMembership.role === 'caregiver' && group.caregiverCanCreateMessageGroup);

    if (!canCreateMessageGroup) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to create message groups',
      });
    }

    // Verify all member IDs are valid group members
    const validMembers = await prisma.groupMember.findMany({
      where: {
        groupMemberId: {
          in: memberIds,
        },
        groupId: groupId,
      },
    });

    if (validMembers.length !== memberIds.length) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Some member IDs are invalid or not in this group',
      });
    }

    // Ensure creator is included in memberIds
    if (!memberIds.includes(userMembership.groupMemberId)) {
      memberIds.push(userMembership.groupMemberId);
    }

    // Create message group
    const messageGroup = await prisma.messageGroup.create({
      data: {
        groupId: groupId,
        name: name.trim(),
        createdBy: userMembership.groupMemberId,
        members: {
          create: memberIds.map(memberId => ({
            groupMemberId: memberId,
          })),
        },
      },
      include: {
        members: {
          select: {
            groupMemberId: true, // Include for React key and identification
            groupMember: {
              select: {
                displayName: true,
                iconLetters: true,
                iconColor: true,
                isRegistered: true,
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
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'create_message_group',
        performedBy: userMembership.groupMemberId,
        performedByName: userMembership.displayName,
        performedByEmail: userMembership.email,
        actionLocation: 'message_groups',
        messageContent: `Created message group "${name}" with ${memberIds.length} members`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Message group created successfully',
      messageGroup: messageGroup,
    });
  } catch (error) {
    console.error('Create message group error:', error);
    res.status(500).json({
      error: 'Failed to create message group',
      message: error.message,
    });
  }
}

/**
 * Get a specific message group
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getMessageGroupById(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of the group
    const userMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!userMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Get message group
    const messageGroup = await prisma.messageGroup.findUnique({
      where: {
        messageGroupId: messageGroupId,
      },
      include: {
        members: {
          include: {
            groupMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
                inviteStatus: true,
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
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!messageGroup) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Message group not found',
      });
    }

    // Verify message group belongs to the group
    if (messageGroup.groupId !== groupId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Message group does not belong to this group',
      });
    }

    // Verify user is a member of the message group
    const isMember = messageGroup.members.some(
      m => m.groupMemberId === userMembership.groupMemberId
    );

    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this message group',
      });
    }

    // Merge User profile data with GroupMember data (prioritize User profile)
    const messageGroupWithMergedProfiles = {
      ...messageGroup,
      members: messageGroup.members.map(member => ({
        ...member,
        groupMember: {
          groupMemberId: member.groupMember.groupMemberId,
          displayName: member.groupMember.user?.displayName || member.groupMember.displayName,
          iconLetters: member.groupMember.user?.memberIcon || member.groupMember.iconLetters,
          iconColor: member.groupMember.user?.iconColor || member.groupMember.iconColor,
          role: member.groupMember.role,
          inviteStatus: member.groupMember.inviteStatus,
        },
      })),
    };

    res.json({
      success: true,
      messageGroup: messageGroupWithMergedProfiles,
      userRole: userMembership.role, // Include user's role for frontend to check permissions
      currentGroupMemberId: userMembership.groupMemberId, // Include current user's group member ID for message alignment
    });
  } catch (error) {
    console.error('Get message group error:', error);
    res.status(500).json({
      error: 'Failed to get message group',
      message: error.message,
    });
  }
}

/**
 * Update message group name
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function updateMessageGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId } = req.params;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    if (!name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name is required',
      });
    }

    // Check if user is a member of the group
    const userMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!userMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Get message group
    const messageGroup = await prisma.messageGroup.findUnique({
      where: {
        messageGroupId: messageGroupId,
      },
    });

    if (!messageGroup) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Message group not found',
      });
    }

    // Verify message group belongs to the group
    if (messageGroup.groupId !== groupId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Message group does not belong to this group',
      });
    }

    // Only creator or admin can update
    if (messageGroup.createdBy !== userMembership.groupMemberId && userMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the creator or an admin can update the message group',
      });
    }

    // Update message group
    const updatedMessageGroup = await prisma.messageGroup.update({
      where: {
        messageGroupId: messageGroupId,
      },
      data: {
        name: name.trim(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'update_message_group',
        performedBy: userMembership.groupMemberId,
        performedByName: userMembership.displayName,
        performedByEmail: userMembership.email,
        actionLocation: 'message_groups',
        messageContent: `Updated message group name to "${name}"`,
      },
    });

    res.json({
      success: true,
      message: 'Message group updated successfully',
      messageGroup: updatedMessageGroup,
    });
  } catch (error) {
    console.error('Update message group error:', error);
    res.status(500).json({
      error: 'Failed to update message group',
      message: error.message,
    });
  }
}

/**
 * Delete message group
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteMessageGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, messageGroupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of the group
    const userMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!userMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Get message group
    const messageGroup = await prisma.messageGroup.findUnique({
      where: {
        messageGroupId: messageGroupId,
      },
    });

    if (!messageGroup) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Message group not found',
      });
    }

    // Verify message group belongs to the group
    if (messageGroup.groupId !== groupId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Message group does not belong to this group',
      });
    }

    // Only creator or admin can delete
    if (messageGroup.createdBy !== userMembership.groupMemberId && userMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the creator or an admin can delete the message group',
      });
    }

    // Delete message group (cascade will handle members and messages)
    await prisma.messageGroup.delete({
      where: {
        messageGroupId: messageGroupId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'delete_message_group',
        performedBy: userMembership.groupMemberId,
        performedByName: userMembership.displayName,
        performedByEmail: userMembership.email,
        actionLocation: 'message_groups',
        messageContent: `Deleted message group "${messageGroup.name}"`,
      },
    });

    res.json({
      success: true,
      message: 'Message group deleted successfully',
    });
  } catch (error) {
    console.error('Delete message group error:', error);
    res.status(500).json({
      error: 'Failed to delete message group',
      message: error.message,
    });
  }
}

module.exports = {
  getMessageGroups,
  createMessageGroup,
  getMessageGroupById,
  updateMessageGroup,
  deleteMessageGroup,
};
