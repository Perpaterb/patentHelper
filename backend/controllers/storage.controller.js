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

    // Get storage usage from storageUsage table for this user
    const storageRecords = await prisma.storageUsage.findMany({
      where: {
        userId: userId,
        groupId: {
          in: groupIds,
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

    for (const record of storageRecords) {
      const bytes = record.totalBytes || BigInt(0);
      totalBytes += bytes;

      const groupId = record.groupId;
      if (!groupUsage[groupId]) {
        groupUsage[groupId] = { bytes: BigInt(0), count: 0 };
      }
      groupUsage[groupId].bytes += bytes;
      groupUsage[groupId].count += record.fileCount;

      // Categorize by media type
      const mediaType = record.mediaType;
      if (mediaType === 'image') {
        imageBytes += bytes;
      } else if (mediaType === 'video') {
        videoBytes += bytes;
      } else if (mediaType === 'log') {
        logBytes += bytes;
      } else {
        documentBytes += bytes;
      }
    }

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
 * Returns all files in a group with sorting and filtering options.
 * Includes uploader information for each file.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroupFiles(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;
    const {
      sortBy = 'size',
      sortOrder = 'desc',
      filterType,     // comma-separated: 'image,video' or 'image' or 'video'
      filterUploader, // comma-separated email addresses
      fromDate,       // YYYY-MM-DD format
      toDate,         // YYYY-MM-DD format
    } = req.query;

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

    // Build where clause for filtering
    // Include hidden files so admins can see "Deleted by admin" notice
    const mediaWhereClause = {
      message: {
        messageGroup: {
          groupId: groupId,
        },
      },
    };

    // Filter by type (image/video)
    // Note: mediaType is stored as simple 'image' or 'video', not full MIME type
    if (filterType && filterType.trim()) {
      const types = filterType.split(',').map(t => t.trim().toLowerCase());
      if (types.length > 0) {
        mediaWhereClause.mediaType = types.length === 1 ? types[0] : { in: types };
      }
    }

    // Filter by uploader email(s) - supports comma-separated list
    // We'll filter after fetching since we need to join with user email
    const uploaderEmails = filterUploader
      ? filterUploader.split(',').map(u => u.trim().toLowerCase()).filter(u => u)
      : [];

    // Filter by date range
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) {
        dateFilter.gte = new Date(fromDate);
      }
      if (toDate) {
        // Add one day to include the entire toDate
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.lt = endDate;
      }
      mediaWhereClause.uploadedAt = dateFilter;
    }

    // Get all media files from this group with uploader and hider info
    const mediaFiles = await prisma.messageMedia.findMany({
      where: mediaWhereClause,
      include: {
        message: {
          select: {
            messageId: true,
            createdAt: true,
            senderId: true,
            sender: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    email: true,
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        },
        hider: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            user: {
              select: {
                email: true,
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
      },
    });

    // Check for pending deletion requests
    const pendingDeletions = await prisma.approval.findMany({
      where: {
        groupId: groupId,
        approvalType: 'delete_file',
        status: 'pending',
      },
      select: {
        relatedEntityId: true,
      },
    });
    const pendingMediaIds = new Set(pendingDeletions.map(a => a.relatedEntityId));

    // Check for deleted files (isHidden in message or approval status = approved for delete_file)
    const deletedApprovals = await prisma.approval.findMany({
      where: {
        groupId: groupId,
        approvalType: 'delete_file',
        status: 'approved',
      },
      select: {
        relatedEntityId: true,
        approvalData: true,
      },
    });
    const deletedMediaInfo = new Map(deletedApprovals.map(a => [a.relatedEntityId, a.approvalData]));

    // Get unique uploaders for filter options
    const uploaderMap = new Map();

    // Format files
    let files = mediaFiles.map(file => {
      // Extract filename from s3Key (e.g., "uploads/messages/uuid/filename.jpg")
      const s3KeyParts = file.s3Key ? file.s3Key.split('/') : [];
      const fileName = s3KeyParts.length > 0 ? s3KeyParts[s3KeyParts.length - 1] : 'Unnamed file';

      // Get uploader info (prefer user profile over group member profile)
      const sender = file.message.sender;
      const uploaderEmail = sender?.user?.email || null;
      const uploader = {
        groupMemberId: sender?.groupMemberId,
        email: uploaderEmail,
        displayName: sender?.user?.displayName || sender?.displayName || 'Unknown',
        iconLetters: sender?.user?.memberIcon || sender?.iconLetters || '?',
        iconColor: sender?.user?.iconColor || sender?.iconColor || '#6200ee',
      };

      // Track unique uploaders for filter options
      if (uploaderEmail && !uploaderMap.has(uploaderEmail)) {
        uploaderMap.set(uploaderEmail, {
          email: uploaderEmail,
          displayName: uploader.displayName,
          iconLetters: uploader.iconLetters,
          iconColor: uploader.iconColor,
        });
      }

      // Get hider/deleter info if file was soft-deleted
      let deletedBy = null;
      if (file.isHidden && file.hider) {
        deletedBy = {
          groupMemberId: file.hider.groupMemberId,
          email: file.hider.user?.email || null,
          displayName: file.hider.user?.displayName || file.hider.displayName || 'Unknown',
          iconLetters: file.hider.user?.memberIcon || file.hider.iconLetters || '?',
          iconColor: file.hider.user?.iconColor || file.hider.iconColor || '#6200ee',
        };
      }

      // Determine file type category
      // Note: mediaType is stored as simple 'image' or 'video', not full MIME type
      let fileType = 'document';
      if (file.mediaType === 'image') {
        fileType = 'image';
      } else if (file.mediaType === 'video') {
        fileType = 'video';
      }

      // Build full URL from fileId (file.url contains fileId, not actual URL)
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const fullUrl = file.url ? `${baseUrl}/files/${file.url}` : null;
      const fullThumbnailUrl = file.thumbnailUrl ? `${baseUrl}/files/${file.thumbnailUrl}` : null;

      return {
        mediaId: file.mediaId,
        fileName: fileName,
        fileSizeBytes: Number(file.fileSizeBytes),
        mimeType: file.mediaType,
        fileType: fileType,
        uploadedAt: file.uploadedAt,
        url: fullUrl,
        thumbnailUrl: fullThumbnailUrl,
        pendingDeletion: pendingMediaIds.has(file.mediaId),
        isLog: false,
        uploader: uploader,
        // Soft delete info
        isDeleted: file.isHidden,
        deletedAt: file.hiddenAt,
        deletedBy: deletedBy,
      };
    });

    // Filter by uploader emails (post-query filter)
    if (uploaderEmails.length > 0) {
      files = files.filter(f =>
        f.uploader?.email && uploaderEmails.includes(f.uploader.email.toLowerCase())
      );
    }

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

    // Get all unique uploaders from the group (for filter dropdown)
    // Include all members who have uploaded files, not just from current results
    const allUploaders = await prisma.messageMedia.findMany({
      where: {
        message: {
          messageGroup: {
            groupId: groupId,
          },
        },
      },
      select: {
        message: {
          select: {
            sender: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    email: true,
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
      distinct: ['messageId'],
    });

    const availableUploaders = [];
    const seenUploaderEmails = new Set();
    for (const media of allUploaders) {
      const sender = media.message.sender;
      const email = sender?.user?.email;
      if (sender && email && !seenUploaderEmails.has(email)) {
        seenUploaderEmails.add(email);
        availableUploaders.push({
          email: email,
          displayName: sender.user?.displayName || sender.displayName || 'Unknown',
          iconLetters: sender.user?.memberIcon || sender.iconLetters || '?',
          iconColor: sender.user?.iconColor || sender.iconColor || '#6200ee',
        });
      }
    }

    // Sort uploaders by email for consistent display
    availableUploaders.sort((a, b) => a.email.localeCompare(b.email));

    // Get distinct file types from the database for this group
    const distinctTypes = await prisma.messageMedia.findMany({
      where: {
        message: {
          messageGroup: {
            groupId: groupId,
          },
        },
      },
      select: {
        mediaType: true,
      },
      distinct: ['mediaType'],
    });
    const availableTypes = distinctTypes.map(t => t.mediaType).filter(Boolean).sort();

    res.status(200).json({
      success: true,
      files: files,
      availableUploaders: availableUploaders,
      availableTypes: availableTypes,
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
        approvalType: 'delete_file',
        relatedEntityId: mediaId,
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

    // Extract filename from s3Key
    const s3KeyParts = media.s3Key ? media.s3Key.split('/') : [];
    const fileName = s3KeyParts.length > 0 ? s3KeyParts[s3KeyParts.length - 1] : 'Unnamed file';

    // Create approval request
    const approval = await prisma.approval.create({
      data: {
        groupId: groupId,
        approvalType: 'delete_file',
        relatedEntityType: 'message_media',
        relatedEntityId: mediaId,
        requestedBy: membership.groupMemberId,
        status: 'pending',
        approvalData: {
          fileName: fileName,
          fileSizeBytes: Number(media.fileSizeBytes),
        },
      },
    });

    // Create auto-approval vote for the requester
    await prisma.approvalVote.create({
      data: {
        approvalId: approval.approvalId,
        adminId: membership.groupMemberId,
        vote: 'approve',
        isAutoApproved: false,
      },
    });

    // Auto-approve if single admin
    if (admins.length === 1) {
      // Single admin - execute deletion immediately
      await executeFileDeletion(mediaId, groupId, approval.approvalId, membership.groupMemberId);

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
        messageContent: `Requested deletion of file: ${fileName}`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Deletion request submitted for admin approval',
      approval: {
        approvalId: approval.approvalId,
        status: 'pending',
        totalAdmins: admins.length,
        votesReceived: 1,
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
 *
 * Uses soft delete to preserve file metadata for "Deleted by admin" display
 */
async function executeFileDeletion(mediaId, groupId, approvalId, requestedBy) {
  // Update approval status
  await prisma.approval.update({
    where: { approvalId: approvalId },
    data: { status: 'approved' },
  });

  // Soft delete - mark as hidden instead of deleting
  await prisma.messageMedia.update({
    where: { mediaId: mediaId },
    data: {
      isHidden: true,
      hiddenAt: new Date(),
      hiddenBy: requestedBy,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      groupId: groupId,
      action: 'delete_file',
      performedBy: requestedBy || 'system',
      performedByName: 'System (Single-Admin Auto-Approval)',
      performedByEmail: 'system@app',
      actionLocation: 'storage',
      messageContent: `File soft-deleted (ID: ${mediaId}). File remains hidden in database for compliance.`,
    },
  });
}

module.exports = {
  getStorageUsage,
  getGroupFiles,
  requestFileDeletion,
};
