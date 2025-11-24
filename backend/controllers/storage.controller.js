/**
 * Storage Controller
 *
 * Handles storage management for admin users.
 * Provides storage usage overview, file listing, and deletion requests.
 *
 * @module controllers/storage
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get storage usage overview
 * GET /storage/usage
 *
 * Returns total storage usage with breakdown by type and by group.
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function getStorageUsage(req, res) {
  try {
    const userId = req.user.userId;

    // Get all groups where user is admin
    const adminGroups = await prisma.groupMember.findMany({
      where: {
        userId: userId,
        role: 'admin',
      },
      include: {
        group: {
          select: {
            groupId: true,
            name: true,
          },
        },
      },
    });

    const groupIds = adminGroups.map(g => g.groupId);

    if (groupIds.length === 0) {
      return res.status(200).json({
        success: true,
        storage: {
          usedBytes: 0,
          totalBytes: 10 * 1024 * 1024 * 1024, // 10GB base
          breakdown: {
            images: 0,
            videos: 0,
            documents: 0,
            logs: 0,
          },
          groups: [],
        },
      });
    }

    // Get all media files from message groups in admin groups
    const mediaFiles = await prisma.messageMedia.findMany({
      where: {
        message: {
          messageGroup: {
            groupId: {
              in: groupIds,
            },
          },
        },
      },
      include: {
        message: {
          include: {
            messageGroup: {
              select: {
                groupId: true,
              },
            },
          },
        },
      },
    });

    // Calculate totals and breakdown
    let totalBytes = BigInt(0);
    let imageBytes = BigInt(0);
    let videoBytes = BigInt(0);
    let documentBytes = BigInt(0);
    let logBytes = BigInt(0);

    const groupUsage = {};

    for (const file of mediaFiles) {
      const bytes = file.fileSizeBytes || BigInt(0);
      totalBytes += bytes;

      const groupId = file.message.messageGroup.groupId;
      if (!groupUsage[groupId]) {
        groupUsage[groupId] = { bytes: BigInt(0), count: 0 };
      }
      groupUsage[groupId].bytes += bytes;
      groupUsage[groupId].count += 1;

      // Categorize by mime type
      const mimeType = file.mimeType || '';
      if (mimeType.startsWith('image/')) {
        imageBytes += bytes;
      } else if (mimeType.startsWith('video/')) {
        videoBytes += bytes;
      } else {
        documentBytes += bytes;
      }
    }

    // TODO: Add audit log size calculation when logs are stored as files

    // Build groups array
    const groups = adminGroups.map(ag => ({
      groupId: ag.groupId,
      name: ag.group.name,
      usedBytes: Number(groupUsage[ag.groupId]?.bytes || 0),
      fileCount: groupUsage[ag.groupId]?.count || 0,
    })).sort((a, b) => b.usedBytes - a.usedBytes); // Sort by size desc

    res.status(200).json({
      success: true,
      storage: {
        usedBytes: Number(totalBytes),
        totalBytes: 10 * 1024 * 1024 * 1024, // 10GB base allocation
        breakdown: {
          images: Number(imageBytes),
          videos: Number(videoBytes),
          documents: Number(documentBytes),
          logs: Number(logBytes),
        },
        groups: groups,
      },
    });
  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({
      error: 'Failed to get storage usage',
      message: error.message,
    });
  }
}

/**
 * Get files for a specific group
 * GET /storage/groups/:groupId/files
 *
 * Returns all files in a group with sorting options.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroupFiles(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;
    const { sortBy = 'size', sortOrder = 'desc' } = req.query;

    // Verify user is admin of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: userId,
        groupId: groupId,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be an admin of this group to view its storage',
      });
    }

    // Get all media files from this group
    const mediaFiles = await prisma.messageMedia.findMany({
      where: {
        message: {
          messageGroup: {
            groupId: groupId,
          },
        },
      },
      include: {
        message: {
          select: {
            messageId: true,
            createdAt: true,
          },
        },
      },
    });

    // Check for pending deletion requests
    const pendingDeletions = await prisma.approval.findMany({
      where: {
        groupId: groupId,
        actionType: 'delete_file',
        status: 'pending',
      },
      select: {
        targetId: true,
      },
    });
    const pendingMediaIds = new Set(pendingDeletions.map(a => a.targetId));

    // Format files
    let files = mediaFiles.map(file => ({
      mediaId: file.mediaId,
      fileName: file.fileName || 'Unnamed file',
      fileSizeBytes: Number(file.fileSizeBytes),
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      url: file.url,
      thumbnailUrl: file.thumbnailUrl,
      pendingDeletion: pendingMediaIds.has(file.mediaId),
      isLog: false,
    }));

    // Sort files
    files.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt) - new Date(b.uploadedAt);
          break;
        case 'size':
        default:
          comparison = a.fileSizeBytes - b.fileSizeBytes;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    res.status(200).json({
      success: true,
      files: files,
    });
  } catch (error) {
    console.error('Get group files error:', error);
    res.status(500).json({
      error: 'Failed to get group files',
      message: error.message,
    });
  }
}

/**
 * Request file deletion
 * POST /storage/files/:mediaId/delete-request
 *
 * Creates an approval request for file deletion.
 * Requires >50% admin approval to execute.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function requestFileDeletion(req, res) {
  try {
    const userId = req.user.userId;
    const { mediaId } = req.params;

    // Get the file and its group
    const media = await prisma.messageMedia.findUnique({
      where: { mediaId: mediaId },
      include: {
        message: {
          include: {
            messageGroup: {
              select: {
                groupId: true,
              },
            },
          },
        },
      },
    });

    if (!media) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The specified file does not exist',
      });
    }

    const groupId = media.message.messageGroup.groupId;

    // Verify user is admin of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: userId,
        groupId: groupId,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be an admin of this group to request file deletion',
      });
    }

    // Check if there's already a pending deletion request
    const existingRequest = await prisma.approval.findFirst({
      where: {
        groupId: groupId,
        actionType: 'delete_file',
        targetId: mediaId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        error: 'Request already exists',
        message: 'There is already a pending deletion request for this file',
      });
    }

    // Get all admins in the group to determine approval threshold
    const admins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
      },
      select: {
        groupMemberId: true,
        userId: true,
      },
    });

    const requiredVotes = Math.floor(admins.length / 2) + 1; // >50%

    // Create approval request
    const approval = await prisma.approval.create({
      data: {
        groupId: groupId,
        actionType: 'delete_file',
        targetId: mediaId,
        requestedBy: membership.groupMemberId,
        status: 'pending',
        requiredVotes: requiredVotes,
        currentVotes: 1, // Requester automatically votes yes
        description: `Delete file: ${media.fileName || 'Unnamed file'}`,
      },
    });

    // Auto-approve if single admin
    if (admins.length === 1) {
      // Single admin - execute deletion immediately
      await executeFileDeletion(mediaId, groupId, approval.approvalId);

      return res.status(200).json({
        success: true,
        message: 'File deleted successfully (single admin auto-approval)',
        approval: {
          approvalId: approval.approvalId,
          status: 'approved',
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'request_file_deletion',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName || 'Unknown',
        performedByEmail: req.user.email,
        actionLocation: 'storage',
        messageContent: `Requested deletion of file: ${media.fileName || 'Unnamed file'}`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Deletion request submitted for admin approval',
      approval: {
        approvalId: approval.approvalId,
        requiredVotes: requiredVotes,
        currentVotes: 1,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Request file deletion error:', error);
    res.status(500).json({
      error: 'Failed to request file deletion',
      message: error.message,
    });
  }
}

/**
 * Execute file deletion after approval
 * Internal function - not exposed as route
 */
async function executeFileDeletion(mediaId, groupId, approvalId) {
  // Update approval status
  await prisma.approval.update({
    where: { approvalId: approvalId },
    data: { status: 'approved' },
  });

  // TODO: Delete from S3 storage

  // Delete from database
  await prisma.messageMedia.delete({
    where: { mediaId: mediaId },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      groupId: groupId,
      action: 'delete_file',
      performedBy: 'system',
      performedByName: 'System (Auto-Approval)',
      performedByEmail: 'system@app',
      actionLocation: 'storage',
      messageContent: `File deleted (ID: ${mediaId})`,
    },
  });
}

module.exports = {
  getStorageUsage,
  getGroupFiles,
  requestFileDeletion,
};
