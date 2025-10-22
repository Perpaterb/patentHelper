/**
 * Groups Controller
 *
 * Handles group operations.
 */

/**
 * Get all groups where user is a member
 * GET /groups
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroups(req, res) {
  try {
    const { prisma } = require('../config/database');
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

module.exports = {
  getGroups,
};
