/**
 * Groups Controller
 *
 * Handles group operations.
 */

const { prisma } = require('../config/database');

/**
 * Generate icon letters from name or email
 * @param {string} nameOrEmail - Display name or email
 * @returns {string} Two-letter icon string
 */
function generateIconLetters(nameOrEmail) {
  if (!nameOrEmail) return 'U';

  // If it's an email, use first two letters before @
  if (nameOrEmail.includes('@')) {
    const username = nameOrEmail.split('@')[0];
    return username.substring(0, 2).toUpperCase();
  }

  // If it has spaces, use first letter of first two words
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Otherwise, use first two letters
  return nameOrEmail.substring(0, 2).toUpperCase();
}

/**
 * Get all groups where user is a member
 * GET /groups
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroups(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get all groups where user is a member
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId: userId },
      include: {
        group: {
          select: {
            groupId: true,
            name: true,
            icon: true,
            backgroundColor: true,
            backgroundImageUrl: true,
            createdAt: true,
            isHidden: true,
          },
        },
      },
    });

    // Transform to include role in group object, filter out hidden groups and pending invitations, and sort by pin status
    const groups = groupMemberships
      .filter(membership => !membership.group.isHidden && membership.isRegistered === true) // Filter out hidden/deleted groups and pending invitations
      .map(membership => ({
        groupId: membership.group.groupId,
        name: membership.group.name,
        icon: membership.group.icon,
        backgroundColor: membership.group.backgroundColor,
        backgroundImageUrl: membership.group.backgroundImageUrl,
        createdAt: membership.group.createdAt,
        isHidden: membership.group.isHidden,
        role: membership.role,
        displayName: membership.displayName,
        isMuted: membership.isMuted,
        isPinned: membership.isPinned,
        pinnedOrder: membership.pinnedOrder,
      }))
      .sort((a, b) => {
        // Pinned groups come first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // Among pinned groups, sort by pinnedOrder
        if (a.isPinned && b.isPinned) {
          return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
        }

        // Among unpinned groups, sort by createdAt (most recent first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    res.status(200).json({
      success: true,
      groups: groups,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      error: 'Failed to get groups',
      message: error.message,
    });
  }
}

/**
 * Get single group details with members
 * GET /groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroupById(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

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

    // Get group details with all members (include user profile data)
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
      include: {
        members: {
          select: {
            groupMemberId: true, // IMPORTANT: Include this for member selection in message groups
            userId: true,
            role: true,
            displayName: true,
            isMuted: true,
            joinedAt: true,
            email: true,
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
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found',
      });
    }

    // Merge user profile data with group member data
    // Use latest User profile data if available, fall back to GroupMember data
    const membersWithLatestProfile = group.members.map(member => {
      // If user profile exists and has data, use it
      if (member.user) {
        return {
          groupMemberId: member.groupMemberId, // IMPORTANT: Include for message group member selection
          userId: member.userId,
          role: member.role,
          displayName: member.user.displayName || member.displayName,
          isMuted: member.isMuted,
          joinedAt: member.joinedAt,
          email: member.email,
          iconLetters: member.user.memberIcon || member.iconLetters,
          iconColor: member.user.iconColor || member.iconColor,
        };
      }
      // Otherwise use GroupMember data
      return {
        groupMemberId: member.groupMemberId, // IMPORTANT: Include for message group member selection
        userId: member.userId,
        role: member.role,
        displayName: member.displayName,
        isMuted: member.isMuted,
        joinedAt: member.joinedAt,
        email: member.email,
        iconLetters: member.iconLetters,
        iconColor: member.iconColor,
      };
    });

    res.status(200).json({
      success: true,
      group: {
        ...group,
        members: membersWithLatestProfile,
        userRole: membership.role,
        currentUserId: userId, // Include current user ID so frontend can prevent self-management
        currentUserMember: {
          groupMemberId: membership.groupMemberId,
          role: membership.role,
          displayName: membership.displayName,
        },
      },
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      error: 'Failed to get group',
      message: error.message,
    });
  }
}

/**
 * Create a new group
 * POST /groups
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { name, icon, backgroundColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Group name is required',
      });
    }

    // Check if user has active subscription (required to be admin)
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: { isSubscribed: true },
    });

    if (!user.isSubscribed) {
      return res.status(403).json({
        error: 'Subscription Required',
        message: 'Active subscription required to create groups',
      });
    }

    // Generate display name and icon letters
    const displayName = req.user.given_name || req.user.email;
    const iconLetters = generateIconLetters(displayName);

    // Create group with creator as admin
    const group = await prisma.group.create({
      data: {
        name: name,
        icon: icon || null,
        backgroundColor: backgroundColor || '#6200ee',
        createdByUserId: userId,
        createdByTrialUser: false, // TODO: Implement trial status tracking
        members: {
          create: {
            userId: userId,
            role: 'admin',
            displayName: displayName,
            iconLetters: iconLetters,
            iconColor: '#6200ee', // Default purple color
            email: req.user.email,
            isRegistered: true,
          },
        },
      },
      include: {
        members: {
          select: {
            groupMemberId: true,
            userId: true,
            role: true,
            displayName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: group.groupId,
        action: 'create_group',
        performedBy: group.members[0].groupMemberId, // Use groupMemberId, not userId
        performedByName: displayName,
        performedByEmail: req.user.email,
        actionLocation: 'create_group',
        messageContent: `Created group "${name}"`,
      },
    });

    res.status(201).json({
      success: true,
      group: group,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      error: 'Failed to create group',
      message: error.message,
    });
  }
}

/**
 * Invite a member to a group
 * POST /groups/:groupId/members/invite
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function inviteMember(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { email, role, displayName: providedDisplayName, memberIcon, iconColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and role are required',
      });
    }

    // Validate role
    const validRoles = ['admin', 'parent', 'child', 'caregiver', 'supervisor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid email format',
      });
    }

    // Check if the requesting user is a member of this group
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!requesterMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Check if the requesting user is an admin
    if (requesterMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can invite members',
      });
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found',
      });
    }

    // Check if a user with this email already exists
    let targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Check if user/email is already a member
    if (targetUser) {
      // Check by userId for registered users
      const existingMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: targetUser.userId,
          },
        },
      });

      if (existingMembership) {
        return res.status(400).json({
          error: 'Already Member',
          message: 'User is already a member of this group',
        });
      }
    } else {
      // Check by email for unregistered members
      const existingMembership = await prisma.groupMember.findFirst({
        where: {
          groupId: groupId,
          email: email.toLowerCase(),
          userId: null, // Only check unregistered members
        },
      });

      if (existingMembership) {
        return res.status(400).json({
          error: 'Already Invited',
          message: 'This email has already been invited to the group',
        });
      }
    }

    // Use provided display name and icon, or generate them
    const displayName = providedDisplayName || (targetUser
      ? targetUser.givenName || email
      : email.split('@')[0]);
    const iconLetters = memberIcon || generateIconLetters(displayName);

    // Add member to group
    // If user exists (registered), link to their userId
    // If user doesn't exist (unregistered), create member with null userId
    const newMembership = await prisma.groupMember.create({
      data: {
        groupId: groupId,
        userId: targetUser ? targetUser.userId : null, // null for unregistered members
        role: role,
        displayName: displayName,
        iconLetters: iconLetters,
        iconColor: iconColor || '#6200ee', // Use provided color or default purple
        email: email.toLowerCase(),
        isRegistered: targetUser ? true : false, // true if user exists, false otherwise
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'invite_member',
        performedBy: requesterMembership.groupMemberId,
        performedByName: requesterMembership.displayName,
        performedByEmail: requesterMembership.email,
        actionLocation: 'group_settings',
        messageContent: `Invited ${email} as ${role}`,
      },
    });

    // TODO: Send invitation email to the user

    res.status(201).json({
      success: true,
      message: `Successfully invited ${email} to the group`,
      member: {
        groupMemberId: newMembership.groupMemberId,
        userId: newMembership.userId, // null if unregistered
        role: newMembership.role,
        displayName: newMembership.displayName,
        email: newMembership.email,
        isRegistered: newMembership.isRegistered,
      },
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      error: 'Failed to invite member',
      message: error.message,
    });
  }
}

/**
 * Update group details
 * PUT /groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function updateGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { name, icon, backgroundColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate inputs
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Group name is required',
      });
    }

    // Check if user is an admin of this group
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

    if (membership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can update group details',
      });
    }

    // Update group
    const updatedGroup = await prisma.group.update({
      where: { groupId: groupId },
      data: {
        name: name.trim(),
        icon: icon?.trim() || null,
        backgroundColor: backgroundColor || '#6200ee',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'update_group',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email,
        actionLocation: 'group_settings',
        messageContent: `Updated group details for "${name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      group: updatedGroup,
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      error: 'Failed to update group',
      message: error.message,
    });
  }
}

/**
 * Delete group
 * DELETE /groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is an admin of this group
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

    if (membership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can delete groups',
      });
    }

    // Get the group to save name for audit log
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found',
      });
    }

    // Check if user is the only admin
    const adminCount = await prisma.groupMember.count({
      where: {
        groupId: groupId,
        role: 'admin',
      },
    });

    // For now, if there's only one admin, allow deletion directly
    // TODO: Implement approval workflow for multiple admins
    if (adminCount > 1) {
      return res.status(400).json({
        error: 'Approval Required',
        message: 'Deleting a group with multiple admins requires approval (coming soon)',
      });
    }

    // Soft delete the group (set isHidden = true)
    await prisma.group.update({
      where: { groupId: groupId },
      data: { isHidden: true },
    });

    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'delete_group',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email,
        actionLocation: 'group_settings',
        messageContent: `Deleted group "${group.name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      error: 'Failed to delete group',
      message: error.message,
    });
  }
}

/**
 * Pin a group for the current user
 * PUT /groups/:groupId/pin
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function pinGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

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

    // Get the highest pinnedOrder for this user
    const pinnedGroups = await prisma.groupMember.findMany({
      where: {
        userId: userId,
        isPinned: true,
      },
      select: {
        pinnedOrder: true,
      },
      orderBy: {
        pinnedOrder: 'desc',
      },
      take: 1,
    });

    const nextOrder = pinnedGroups.length > 0 ? (pinnedGroups[0].pinnedOrder || 0) + 1 : 1;

    // Pin the group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isPinned: true,
        pinnedOrder: nextOrder,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group pinned successfully',
    });
  } catch (error) {
    console.error('Pin group error:', error);
    res.status(500).json({
      error: 'Failed to pin group',
      message: error.message,
    });
  }
}

/**
 * Unpin a group for the current user
 * PUT /groups/:groupId/unpin
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function unpinGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

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

    // Unpin the group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isPinned: false,
        pinnedOrder: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group unpinned successfully',
    });
  } catch (error) {
    console.error('Unpin group error:', error);
    res.status(500).json({
      error: 'Failed to unpin group',
      message: error.message,
    });
  }
}

/**
 * Reorder pinned groups for the current user
 * PUT /groups/reorder-pins
 * Body: { groupIds: [groupId1, groupId2, ...] } - ordered list of pinned group IDs
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function reorderPinnedGroups(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'groupIds must be a non-empty array',
      });
    }

    // Update pinnedOrder for each group
    const updatePromises = groupIds.map((groupId, index) =>
      prisma.groupMember.updateMany({
        where: {
          groupId: groupId,
          userId: userId,
          isPinned: true,
        },
        data: {
          pinnedOrder: index + 1,
        },
      })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Pinned groups reordered successfully',
    });
  } catch (error) {
    console.error('Reorder pinned groups error:', error);
    res.status(500).json({
      error: 'Failed to reorder pinned groups',
      message: error.message,
    });
  }
}

/**
 * Change a member's role in a group
 * PUT /groups/:groupId/members/:userId/role
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function changeMemberRole(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const { groupId, userId: targetUserId } = req.params;
    const { role } = req.body;

    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate role
    const validRoles = ['admin', 'parent', 'child', 'caregiver', 'supervisor'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Check if current user is admin of the group
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change member roles',
      });
    }

    // Can't change your own role
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You cannot change your own role',
      });
    }

    // Get target user membership
    const targetMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Member not found in this group',
      });
    }

    // Update role
    const oldRole = targetMembership.role;
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      data: {
        role: role,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        performedBy: currentUserMembership.groupMemberId,
        performedByName: currentUserMembership.displayName,
        performedByEmail: currentUserMembership.email || req.user?.email,
        action: 'change_member_role',
        actionLocation: 'group_settings',
        messageContent: `Changed role of ${targetMembership.user?.displayName || targetMembership.email} from ${oldRole} to ${role}`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Member role changed from ${oldRole} to ${role}`,
    });
  } catch (error) {
    console.error('Change member role error:', error);
    res.status(500).json({
      error: 'Failed to change member role',
      message: error.message,
    });
  }
}

/**
 * Remove a member from a group
 * DELETE /groups/:groupId/members/:userId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function removeMember(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const { groupId, userId: targetUserId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if current user is admin of the group
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can remove members',
      });
    }

    // Can't remove yourself
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You cannot remove yourself from the group. Admins must use delete group instead.',
      });
    }

    // Get target user membership
    const targetMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Member not found in this group',
      });
    }

    if (targetMembership.isHidden) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Member has already been removed',
      });
    }

    // Soft delete the membership
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      data: {
        isHidden: true,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        userId: currentUserId,
        action: 'remove_member',
        details: `Removed member ${targetMembership.user.email} (${targetMembership.role}) from group`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Member removed from group successfully',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      error: 'Failed to remove member',
      message: error.message,
    });
  }
}

/**
 * Leave a group (for non-admin members)
 * POST /groups/:groupId/leave
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function leaveGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get user membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'You are not a member of this group',
      });
    }

    if (membership.isHidden) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You have already left this group',
      });
    }

    // Admins cannot leave - they must delete the group or transfer admin first
    if (membership.role === 'admin') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Admins cannot leave the group. Please delete the group or transfer admin role first.',
      });
    }

    // Soft delete the membership
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isHidden: true,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        userId: userId,
        action: 'leave_group',
        details: `User left the group (role: ${membership.role})`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      message: `You have left ${membership.group.name}`,
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      error: 'Failed to leave group',
      message: error.message,
    });
  }
}

/**
 * Get group settings (role permissions and preferences)
 * GET /groups/:groupId/settings
 */
async function getGroupSettings(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user is a member
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    // Get or create group settings
    let settings = await prisma.groupSettings.findUnique({
      where: { groupId: groupId },
    });

    // If settings don't exist, create them with defaults
    if (!settings) {
      settings = await prisma.groupSettings.create({
        data: {
          groupId: groupId,
        },
      });
    }

    res.status(200).json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    console.error('Get group settings error:', error);
    res.status(500).json({
      error: 'Failed to get group settings',
      message: error.message,
    });
  }
}

/**
 * Update group settings (admin only)
 * PUT /groups/:groupId/settings
 */
async function updateGroupSettings(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const {
      parentsCreateMessageGroups,
      childrenCreateMessageGroups,
      caregiversCreateMessageGroups,
      financeVisibleToParents,
      financeCreatableByParents,
      financeVisibleToCaregivers,
      financeCreatableByCaregivers,
      financeVisibleToChildren,
      financeCreatableByChildren,
    } = req.body;

    // Verify user is an admin
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admins can update group settings',
      });
    }

    // Enforce dependency: finance creatable requires finance visible
    const updatedData = {
      parentsCreateMessageGroups,
      childrenCreateMessageGroups,
      caregiversCreateMessageGroups,
      financeVisibleToParents,
      financeCreatableByParents: financeVisibleToParents ? financeCreatableByParents : false,
      financeVisibleToCaregivers,
      financeCreatableByCaregivers: financeVisibleToCaregivers ? financeCreatableByCaregivers : false,
      financeVisibleToChildren,
      financeCreatableByChildren: financeVisibleToChildren ? financeCreatableByChildren : false,
    };

    // Update or create settings
    const settings = await prisma.groupSettings.upsert({
      where: { groupId: groupId },
      update: updatedData,
      create: {
        groupId: groupId,
        ...updatedData,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || req.user?.email,
        action: 'update_group_settings',
        actionLocation: 'group_settings',
        messageContent: 'Updated group permission settings',
      },
    });

    res.status(200).json({
      success: true,
      settings: settings,
      message: 'Group settings updated successfully',
    });
  } catch (error) {
    console.error('Update group settings error:', error);
    res.status(500).json({
      error: 'Failed to update group settings',
      message: error.message,
    });
  }
}

/**
 * Get admin permissions for a group (shows auto-approval settings)
 * GET /groups/:groupId/admin-permissions
 */
async function getAdminPermissions(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user is an admin
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admins can view admin permissions',
      });
    }

    // Get all admins in the group
    const admins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
      },
      select: {
        groupMemberId: true,
        userId: true,
        displayName: true,
        iconLetters: true,
        iconColor: true,
        email: true,
      },
    });

    // Get all permissions where current user is the granting admin
    const permissions = await prisma.adminPermission.findMany({
      where: {
        groupId: groupId,
        grantingAdminId: membership.groupMemberId,
      },
      include: {
        receivingAdmin: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
          },
        },
      },
    });

    // Filter out current user from other admins list
    const otherAdmins = admins.filter(admin => admin.userId !== userId);

    res.status(200).json({
      success: true,
      currentAdmin: membership,
      otherAdmins: otherAdmins,
      permissions: permissions,
    });
  } catch (error) {
    console.error('Get admin permissions error:', error);
    res.status(500).json({
      error: 'Failed to get admin permissions',
      message: error.message,
    });
  }
}

/**
 * Update admin permissions (auto-approval settings for specific admin)
 * PUT /groups/:groupId/admin-permissions/:targetAdminId
 */
async function updateAdminPermissions(req, res) {
  try {
    const { groupId, targetAdminId } = req.params;
    const userId = req.user.userId;
    const {
      autoApproveHideMessages,
      autoApproveAddPeople,
      autoApproveRemovePeople,
      autoApproveAssignRoles,
      autoApproveChangeRoles,
      autoApproveAssignRelationships,
      autoApproveChangeRelationships,
      autoApproveCalendarEntries,
      autoApproveAssignChildrenToEvents,
      autoApproveAssignCaregiversToEvents,
    } = req.body;

    // Verify current user is an admin
    const grantingAdmin = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!grantingAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admins can update admin permissions',
      });
    }

    // Verify target is an admin
    const receivingAdmin = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        groupMemberId: targetAdminId,
        role: 'admin',
      },
    });

    if (!receivingAdmin) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Target admin not found in this group',
      });
    }

    // Can't set permissions for yourself
    if (grantingAdmin.groupMemberId === targetAdminId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'You cannot set auto-approval permissions for yourself',
      });
    }

    // Update or create permission record
    const permission = await prisma.adminPermission.upsert({
      where: {
        groupId_grantingAdminId_receivingAdminId: {
          groupId: groupId,
          grantingAdminId: grantingAdmin.groupMemberId,
          receivingAdminId: targetAdminId,
        },
      },
      update: {
        autoApproveHideMessages,
        autoApproveAddPeople,
        autoApproveRemovePeople,
        autoApproveAssignRoles,
        autoApproveChangeRoles,
        autoApproveAssignRelationships,
        autoApproveChangeRelationships,
        autoApproveCalendarEntries,
        autoApproveAssignChildrenToEvents,
        autoApproveAssignCaregiversToEvents,
      },
      create: {
        groupId: groupId,
        grantingAdminId: grantingAdmin.groupMemberId,
        receivingAdminId: targetAdminId,
        autoApproveHideMessages,
        autoApproveAddPeople,
        autoApproveRemovePeople,
        autoApproveAssignRoles,
        autoApproveChangeRoles,
        autoApproveAssignRelationships,
        autoApproveChangeRelationships,
        autoApproveCalendarEntries,
        autoApproveAssignChildrenToEvents,
        autoApproveAssignCaregiversToEvents,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        performedBy: grantingAdmin.groupMemberId,
        performedByName: grantingAdmin.displayName,
        performedByEmail: grantingAdmin.email || req.user?.email,
        action: 'update_admin_permissions',
        actionLocation: 'group_settings',
        messageContent: `Updated auto-approval permissions for ${receivingAdmin.displayName}`,
      },
    });

    res.status(200).json({
      success: true,
      permission: permission,
      message: 'Admin permissions updated successfully',
    });
  } catch (error) {
    console.error('Update admin permissions error:', error);
    res.status(500).json({
      error: 'Failed to update admin permissions',
      message: error.message,
    });
  }
}

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  inviteMember,
  pinGroup,
  unpinGroup,
  reorderPinnedGroups,
  changeMemberRole,
  removeMember,
  leaveGroup,
  getGroupSettings,
  updateGroupSettings,
  getAdminPermissions,
  updateAdminPermissions,
};
