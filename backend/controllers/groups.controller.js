/**
 * Groups Controller
 *
 * Handles group operations.
 */

const { prisma } = require('../config/database');

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

    // Transform to include role in group object
    const groups = groupMemberships.map(membership => ({
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
    }));

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

    // Get group details with all members
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            displayName: true,
            isMuted: true,
            joinedAt: true,
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

    res.status(200).json({
      success: true,
      group: {
        ...group,
        userRole: membership.role,
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
      select: { subscriptionStatus: true },
    });

    if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
      return res.status(403).json({
        error: 'Subscription Required',
        message: 'Active subscription required to create groups',
      });
    }

    // Create group with creator as admin
    const group = await prisma.group.create({
      data: {
        name: name,
        icon: icon || null,
        backgroundColor: backgroundColor || '#6200ee',
        createdByUserId: userId,
        createdByTrialUser: user.subscriptionStatus === 'trialing',
        members: {
          create: {
            userId: userId,
            role: 'admin',
            displayName: req.user.given_name || req.user.email,
          },
        },
      },
      include: {
        members: {
          select: {
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
        userId: userId,
        action: 'create_group',
        details: `Created group "${name}"`,
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

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
};
