/**
 * Auto-Approve Permissions Controller
 *
 * Handles auto-approve permission management for admins within groups.
 * Allows admins to pre-approve specific actions from other admins.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get auto-approve permissions for current admin
 * Returns permissions grouped by grantee (other admins in the group)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getAutoApprovePermissions(req, res) {
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

    if (userMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can manage auto-approve permissions',
      });
    }

    // Get all admins in the group (excluding current user)
    const admins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
        groupMemberId: {
          not: userMembership.groupMemberId,
        },
      },
      select: {
        groupMemberId: true,
        displayName: true,
        iconLetters: true,
        iconColor: true,
        user: {
          select: {
            displayName: true,
            memberIcon: true,
            iconColor: true,
            profilePhotoFileId: true,
          },
        },
      },
    });

    // Get existing permissions granted by current admin
    const permissions = await prisma.autoApprovePermission.findMany({
      where: {
        groupId: groupId,
        grantorId: userMembership.groupMemberId,
      },
    });

    // Create a map of granteeId -> permissions
    const permissionsMap = {};
    permissions.forEach(perm => {
      permissionsMap[perm.granteeId] = {
        permissionId: perm.permissionId,
        canHideMessages: perm.canHideMessages,
        canAddMembers: perm.canAddMembers,
        canRemoveMembers: perm.canRemoveMembers,
        canAssignRoles: perm.canAssignRoles,
        canChangeRoles: perm.canChangeRoles,
        canAssignRelationships: perm.canAssignRelationships,
        canChangeRelationships: perm.canChangeRelationships,
        canCreateCalendarEvents: perm.canCreateCalendarEvents,
        canAssignChildrenToEvents: perm.canAssignChildrenToEvents,
        canAssignCaregiversToEvents: perm.canAssignCaregiversToEvents,
      };
    });

    // Merge admin info with permissions
    const adminsWithPermissions = admins.map(admin => {
      // Merge User profile data with GroupMember data (User profile takes priority)
      const displayName = admin.user?.displayName || admin.displayName;
      const iconLetters = admin.user?.memberIcon || admin.iconLetters;
      const iconColor = admin.user?.iconColor || admin.iconColor;
      const profilePhotoUrl = admin.user?.profilePhotoFileId
        ? `${process.env.API_BASE_URL || 'http://localhost:3000'}/files/${admin.user.profilePhotoFileId}`
        : null;

      return {
        groupMemberId: admin.groupMemberId,
        displayName,
        iconLetters,
        iconColor,
        profilePhotoUrl,
        permissions: permissionsMap[admin.groupMemberId] || {
          permissionId: null,
          canHideMessages: false,
          canAddMembers: false,
          canRemoveMembers: false,
          canAssignRoles: false,
          canChangeRoles: false,
          canAssignRelationships: false,
          canChangeRelationships: false,
          canCreateCalendarEvents: false,
          canAssignChildrenToEvents: false,
          canAssignCaregiversToEvents: false,
        },
      };
    });

    return res.json({
      success: true,
      admins: adminsWithPermissions,
    });
  } catch (error) {
    console.error('Get auto-approve permissions error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load auto-approve permissions',
    });
  }
}

/**
 * Update auto-approve permissions for a specific admin
 * Creates or updates the permission record for grantee
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function updateAutoApprovePermissions(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, granteeId } = req.params;
    const {
      canHideMessages,
      canAddMembers,
      canRemoveMembers,
      canAssignRoles,
      canChangeRoles,
      canAssignRelationships,
      canChangeRelationships,
      canCreateCalendarEvents,
      canAssignChildrenToEvents,
      canAssignCaregiversToEvents,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is an admin of this group
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

    if (userMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can manage auto-approve permissions',
      });
    }

    // Verify grantee exists and is an admin in the group
    const grantee = await prisma.groupMember.findUnique({
      where: {
        groupMemberId: granteeId,
      },
    });

    if (!grantee || grantee.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Grantee admin not found in this group',
      });
    }

    if (grantee.role !== 'admin') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Permissions can only be granted to admins',
      });
    }

    // Prevent self-granting
    if (grantee.groupMemberId === userMembership.groupMemberId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot grant permissions to yourself',
      });
    }

    // Upsert (create or update) the permission record
    const permission = await prisma.autoApprovePermission.upsert({
      where: {
        groupId_grantorId_granteeId: {
          groupId: groupId,
          grantorId: userMembership.groupMemberId,
          granteeId: granteeId,
        },
      },
      update: {
        canHideMessages: canHideMessages ?? false,
        canAddMembers: canAddMembers ?? false,
        canRemoveMembers: canRemoveMembers ?? false,
        canAssignRoles: canAssignRoles ?? false,
        canChangeRoles: canChangeRoles ?? false,
        canAssignRelationships: canAssignRelationships ?? false,
        canChangeRelationships: canChangeRelationships ?? false,
        canCreateCalendarEvents: canCreateCalendarEvents ?? false,
        canAssignChildrenToEvents: canAssignChildrenToEvents ?? false,
        canAssignCaregiversToEvents: canAssignCaregiversToEvents ?? false,
      },
      create: {
        groupId: groupId,
        grantorId: userMembership.groupMemberId,
        granteeId: granteeId,
        canHideMessages: canHideMessages ?? false,
        canAddMembers: canAddMembers ?? false,
        canRemoveMembers: canRemoveMembers ?? false,
        canAssignRoles: canAssignRoles ?? false,
        canChangeRoles: canChangeRoles ?? false,
        canAssignRelationships: canAssignRelationships ?? false,
        canChangeRelationships: canChangeRelationships ?? false,
        canCreateCalendarEvents: canCreateCalendarEvents ?? false,
        canAssignChildrenToEvents: canAssignChildrenToEvents ?? false,
        canAssignCaregiversToEvents: canAssignCaregiversToEvents ?? false,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'update_auto_approve_permissions',
        performedBy: userMembership.groupMemberId,
        performedByName: userMembership.displayName,
        performedByEmail: userMembership.user?.email || 'N/A',
        actionLocation: 'group_settings',
        messageContent: `Updated auto-approve permissions for ${grantee.displayName}. Permissions: ${JSON.stringify({
          canHideMessages,
          canAddMembers,
          canRemoveMembers,
          canAssignRoles,
          canChangeRoles,
          canAssignRelationships,
          canChangeRelationships,
          canCreateCalendarEvents,
          canAssignChildrenToEvents,
          canAssignCaregiversToEvents,
        })}`,
      },
    });

    return res.json({
      success: true,
      permission: {
        permissionId: permission.permissionId,
        canHideMessages: permission.canHideMessages,
        canAddMembers: permission.canAddMembers,
        canRemoveMembers: permission.canRemoveMembers,
        canAssignRoles: permission.canAssignRoles,
        canChangeRoles: permission.canChangeRoles,
        canAssignRelationships: permission.canAssignRelationships,
        canChangeRelationships: permission.canChangeRelationships,
        canCreateCalendarEvents: permission.canCreateCalendarEvents,
        canAssignChildrenToEvents: permission.canAssignChildrenToEvents,
        canAssignCaregiversToEvents: permission.canAssignCaregiversToEvents,
      },
    });
  } catch (error) {
    console.error('Update auto-approve permissions error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update auto-approve permissions',
    });
  }
}

module.exports = {
  getAutoApprovePermissions,
  updateAutoApprovePermissions,
};
