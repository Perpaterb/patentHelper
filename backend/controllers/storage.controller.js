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
            audio: 0,
            documents: 0,
            logs: 0,
            phonecalls: 0,
            videocalls: 0,
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

    // Get log exports for these groups (stored separately in LogExport table)
    const logExports = await prisma.logExport.findMany({
      where: {
        groupId: {
          in: groupIds,
        },
      },
      select: {
        groupId: true,
        fileSizeBytes: true,
      },
    });

    // Calculate totals and breakdown
    let totalBytes = BigInt(0);
    let imageBytes = BigInt(0);
    let videoBytes = BigInt(0);
    let audioBytes = BigInt(0);
    let documentBytes = BigInt(0);
    let logBytes = BigInt(0);
    let phonecallBytes = BigInt(0);
    let videocallBytes = BigInt(0);

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
      } else if (mediaType === 'audio') {
        audioBytes += bytes;
      } else if (mediaType === 'log') {
        logBytes += bytes;
      } else if (mediaType === 'phonecall') {
        phonecallBytes += bytes;
      } else if (mediaType === 'videocall') {
        videocallBytes += bytes;
      } else {
        documentBytes += bytes;
      }
    }

    // Add log export sizes to the calculation
    for (const logExport of logExports) {
      const bytes = logExport.fileSizeBytes || BigInt(0);
      totalBytes += bytes;
      logBytes += bytes;

      const groupId = logExport.groupId;
      if (!groupUsage[groupId]) {
        groupUsage[groupId] = { bytes: BigInt(0), count: 0 };
      }
      groupUsage[groupId].bytes += bytes;
      groupUsage[groupId].count += 1;
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
          audio: Number(audioBytes),
          documents: Number(documentBytes),
          logs: Number(logBytes),
          phonecalls: Number(phonecallBytes),
          videocalls: Number(videocallBytes),
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
      // Note: mediaType is stored as simple 'image', 'video', 'audio', etc.
      let fileType = 'document';
      if (file.mediaType === 'image') {
        fileType = 'image';
      } else if (file.mediaType === 'video') {
        fileType = 'video';
      } else if (file.mediaType === 'audio') {
        fileType = 'audio';
      } else if (file.mediaType === 'phonecall') {
        fileType = 'phonecall';
      } else if (file.mediaType === 'videocall') {
        fileType = 'videocall';
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

    // Get phone call recordings from this group
    const phoneCallRecordings = await prisma.phoneCall.findMany({
      where: {
        groupId: groupId,
        recordingUrl: { not: null },
      },
      include: {
        initiator: {
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
        recordingHider: {
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

    // Get video call recordings from this group
    const videoCallRecordings = await prisma.videoCall.findMany({
      where: {
        groupId: groupId,
        recordingUrl: { not: null },
      },
      include: {
        initiator: {
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
        recordingHider: {
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

    // Format phone call recordings as files
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const phoneCallFiles = phoneCallRecordings.map(call => {
      const initiator = call.initiator;
      const uploaderEmail = initiator?.user?.email || null;
      const uploader = {
        groupMemberId: initiator?.groupMemberId,
        email: uploaderEmail,
        displayName: initiator?.user?.displayName || initiator?.displayName || 'Unknown',
        iconLetters: initiator?.user?.memberIcon || initiator?.iconLetters || '?',
        iconColor: initiator?.user?.iconColor || initiator?.iconColor || '#6200ee',
      };

      // Track unique uploaders for filter options
      if (uploaderEmail && !uploaderMap.has(uploaderEmail)) {
        uploaderMap.set(uploaderEmail, uploader);
      }

      // Get hider/deleter info if recording was hidden
      let deletedBy = null;
      if (call.recordingIsHidden && call.recordingHider) {
        deletedBy = {
          groupMemberId: call.recordingHider.groupMemberId,
          email: call.recordingHider.user?.email || null,
          displayName: call.recordingHider.user?.displayName || call.recordingHider.displayName || 'Admin',
          iconLetters: call.recordingHider.user?.memberIcon || call.recordingHider.iconLetters || '?',
          iconColor: call.recordingHider.user?.iconColor || call.recordingHider.iconColor || '#6200ee',
        };
      }

      // Format duration for filename
      const durationSecs = call.recordingDurationMs ? Math.floor(call.recordingDurationMs / 1000) : 0;
      const durationMins = Math.floor(durationSecs / 60);
      const durationSecsRemain = durationSecs % 60;
      const durationStr = `${durationMins}m${durationSecsRemain}s`;

      return {
        mediaId: `phonecall-${call.callId}`,
        fileName: `Phone Call Recording (${durationStr})`,
        fileSizeBytes: Number(call.recordingSizeBytes || 0),
        mimeType: 'audio/mpeg',
        fileType: 'phonecall',
        uploadedAt: call.endedAt || call.startedAt,
        url: call.recordingUrl ? `${baseUrl}${call.recordingUrl}` : null,
        thumbnailUrl: null,
        pendingDeletion: false, // TODO: Add approval workflow for call recordings
        isLog: false,
        uploader: uploader,
        isDeleted: call.recordingIsHidden,
        deletedAt: call.recordingHiddenAt,
        deletedBy: deletedBy,
        callId: call.callId, // Include call ID for reference
        callDurationMs: call.durationMs,
      };
    });

    // Format video call recordings as files
    const videoCallFiles = videoCallRecordings.map(call => {
      const initiator = call.initiator;
      const uploaderEmail = initiator?.user?.email || null;
      const uploader = {
        groupMemberId: initiator?.groupMemberId,
        email: uploaderEmail,
        displayName: initiator?.user?.displayName || initiator?.displayName || 'Unknown',
        iconLetters: initiator?.user?.memberIcon || initiator?.iconLetters || '?',
        iconColor: initiator?.user?.iconColor || initiator?.iconColor || '#6200ee',
      };

      // Track unique uploaders for filter options
      if (uploaderEmail && !uploaderMap.has(uploaderEmail)) {
        uploaderMap.set(uploaderEmail, uploader);
      }

      // Get hider/deleter info if recording was hidden
      let deletedBy = null;
      if (call.recordingIsHidden && call.recordingHider) {
        deletedBy = {
          groupMemberId: call.recordingHider.groupMemberId,
          email: call.recordingHider.user?.email || null,
          displayName: call.recordingHider.user?.displayName || call.recordingHider.displayName || 'Admin',
          iconLetters: call.recordingHider.user?.memberIcon || call.recordingHider.iconLetters || '?',
          iconColor: call.recordingHider.user?.iconColor || call.recordingHider.iconColor || '#6200ee',
        };
      }

      // Format duration for filename
      const durationSecs = call.recordingDurationMs ? Math.floor(call.recordingDurationMs / 1000) : 0;
      const durationMins = Math.floor(durationSecs / 60);
      const durationSecsRemain = durationSecs % 60;
      const durationStr = `${durationMins}m${durationSecsRemain}s`;

      return {
        mediaId: `videocall-${call.callId}`,
        fileName: `Video Call Recording (${durationStr})`,
        fileSizeBytes: Number(call.recordingSizeBytes || 0),
        mimeType: 'video/mp4',
        fileType: 'videocall',
        uploadedAt: call.endedAt || call.startedAt,
        url: call.recordingUrl ? `${baseUrl}${call.recordingUrl}` : null,
        thumbnailUrl: null,
        pendingDeletion: false, // TODO: Add approval workflow for call recordings
        isLog: false,
        uploader: uploader,
        isDeleted: call.recordingIsHidden,
        deletedAt: call.recordingHiddenAt,
        deletedBy: deletedBy,
        callId: call.callId, // Include call ID for reference
        callDurationMs: call.durationMs,
      };
    });

    // Merge all files together
    let allFiles = [...files, ...phoneCallFiles, ...videoCallFiles];

    // Apply type filter to call recordings if filterType is set
    if (filterType && filterType.trim()) {
      const types = filterType.split(',').map(t => t.trim().toLowerCase());
      allFiles = allFiles.filter(f => types.includes(f.fileType));
    }

    // Apply uploader filter to all files
    if (uploaderEmails.length > 0) {
      allFiles = allFiles.filter(f =>
        f.uploader?.email && uploaderEmails.includes(f.uploader.email.toLowerCase())
      );
    }

    // Apply date filter to call recordings
    if (fromDate || toDate) {
      allFiles = allFiles.filter(f => {
        const uploadDate = new Date(f.uploadedAt);
        if (fromDate && uploadDate < new Date(fromDate)) return false;
        if (toDate) {
          const endDate = new Date(toDate);
          endDate.setDate(endDate.getDate() + 1);
          if (uploadDate >= endDate) return false;
        }
        return true;
      });
    }

    // Re-sort all files together
    allFiles.sort((a, b) => {
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
    const availableTypesSet = new Set(distinctTypes.map(t => t.mediaType).filter(Boolean));

    // Add phonecall and videocall types if there are recordings
    if (phoneCallRecordings.length > 0) {
      availableTypesSet.add('phonecall');
    }
    if (videoCallRecordings.length > 0) {
      availableTypesSet.add('videocall');
    }
    const availableTypes = Array.from(availableTypesSet).sort();

    // Update available uploaders to include call initiators
    const allUploadersFromCalls = [...phoneCallRecordings, ...videoCallRecordings]
      .map(call => call.initiator)
      .filter(i => i?.user?.email);

    for (const initiator of allUploadersFromCalls) {
      const email = initiator.user.email;
      if (!seenUploaderEmails.has(email)) {
        seenUploaderEmails.add(email);
        availableUploaders.push({
          email: email,
          displayName: initiator.user?.displayName || initiator.displayName || 'Unknown',
          iconLetters: initiator.user?.memberIcon || initiator.iconLetters || '?',
          iconColor: initiator.user?.iconColor || initiator.iconColor || '#6200ee',
        });
      }
    }

    // Sort uploaders by email for consistent display
    availableUploaders.sort((a, b) => a.email.localeCompare(b.email));

    res.status(200).json({
      success: true,
      files: allFiles,
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
        isAutoApproved: admins.length === 1, // Mark as auto-approved if single admin
      },
    });

    // Create audit log for the deletion request
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'request_file_deletion',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName || 'Unknown',
        performedByEmail: req.user.email,
        actionLocation: 'storage',
        messageContent: `Requested deletion of file: "${fileName}" (${formatFileSize(Number(media.fileSizeBytes))})`,
        logData: {
          approvalId: approval.approvalId,
          mediaId: mediaId,
          fileName: fileName,
          fileSizeBytes: Number(media.fileSizeBytes),
        },
      },
    });

    // Auto-approve if single admin
    if (admins.length === 1) {
      // Create audit log for auto-approval (single admin)
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'auto_approve_deletion',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName || 'Unknown',
          performedByEmail: req.user.email,
          actionLocation: 'storage',
          messageContent: `Auto-approved file deletion (single admin group): "${fileName}"`,
          logData: {
            approvalId: approval.approvalId,
            mediaId: mediaId,
            fileName: fileName,
            reason: 'single_admin_group',
          },
        },
      });

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
 * Hard deletes file data from storage but keeps database record with isHidden=true
 * so we can show "Deleted by Admin" placeholder with file name in messages.
 */
async function executeFileDeletion(mediaId, groupId, approvalId, requestedBy) {
  const storageService = require('../services/storage');

  // Get file info before deleting
  const media = await prisma.messageMedia.findUnique({
    where: { mediaId: mediaId },
  });

  if (!media) {
    throw new Error('File not found');
  }

  // Extract filename for audit log
  const s3KeyParts = media.s3Key ? media.s3Key.split('/') : [];
  const fileName = s3KeyParts.length > 0 ? s3KeyParts[s3KeyParts.length - 1] : 'Unknown file';
  const fileSizeBytes = Number(media.fileSizeBytes);

  // Get requester info for audit log
  const requester = await prisma.groupMember.findUnique({
    where: { groupMemberId: requestedBy },
    include: {
      user: {
        select: { email: true, displayName: true },
      },
    },
  });

  // Update approval status
  await prisma.approval.update({
    where: { approvalId: approvalId },
    data: { status: 'approved' },
  });

  // Hard delete from file storage (the actual file data)
  try {
    if (media.url) {
      await storageService.hardDeleteFile(media.url);
      console.log(`[executeFileDeletion] Hard deleted file from storage: ${media.url}`);
    }
  } catch (storageError) {
    console.error(`[executeFileDeletion] Storage deletion error (continuing): ${storageError.message}`);
    // Continue even if storage delete fails - we still want to mark as hidden
  }

  // Mark as deleted in database - keep record so we can show "Deleted by Admin" placeholder
  // This allows users to see the file name even after deletion
  await prisma.messageMedia.update({
    where: { mediaId: mediaId },
    data: {
      isHidden: true,
      hiddenAt: new Date(),
      hiddenBy: requestedBy,
    },
  });

  // Decrement storage usage for all admins in the group
  // Storage was charged to all admins when file was uploaded
  const admins = await prisma.groupMember.findMany({
    where: {
      groupId: groupId,
      role: 'admin',
    },
    select: {
      userId: true,
    },
  });

  // Determine media type from the file
  let mediaType = 'document';
  if (media.mediaType === 'image' || media.mediaType?.startsWith('image/')) {
    mediaType = 'image';
  } else if (media.mediaType === 'video' || media.mediaType?.startsWith('video/')) {
    mediaType = 'video';
  } else if (media.mediaType === 'audio' || media.mediaType?.startsWith('audio/')) {
    mediaType = 'audio';
  } else if (media.mediaType === 'phonecall') {
    mediaType = 'phonecall';
  } else if (media.mediaType === 'videocall') {
    mediaType = 'videocall';
  }

  // Decrement storage for each admin
  for (const admin of admins) {
    if (!admin.userId) continue;

    // Decrement storageUsage table
    await prisma.storageUsage.updateMany({
      where: {
        userId: admin.userId,
        groupId: groupId,
        mediaType: mediaType,
      },
      data: {
        fileCount: { decrement: 1 },
        totalBytes: { decrement: BigInt(fileSizeBytes) },
        lastCalculatedAt: new Date(),
      },
    });

    // Decrement user's total storage
    await prisma.user.update({
      where: { userId: admin.userId },
      data: {
        storageUsedBytes: { decrement: BigInt(fileSizeBytes) },
      },
    });
  }

  console.log(`[executeFileDeletion] Decremented storage by ${fileSizeBytes} bytes for ${admins.length} admin(s)`);

  // Create audit log with detailed info
  await prisma.auditLog.create({
    data: {
      groupId: groupId,
      action: 'delete_file',
      performedBy: requestedBy || 'system',
      performedByName: requester?.user?.displayName || requester?.displayName || 'Admin',
      performedByEmail: requester?.user?.email || 'system@app',
      actionLocation: 'storage',
      messageContent: `File deleted: "${fileName}" (${formatFileSize(fileSizeBytes)}). File ID: ${mediaId}. Storage freed for ${admins.length} admin(s).`,
    },
  });

  console.log(`[executeFileDeletion] Deleted file: ${fileName} (${mediaId})`);
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

/**
 * POST /storage/recalculate
 * Recalculate storage usage based on actual non-deleted files
 * This fixes any discrepancies from files deleted before storage tracking was added
 */
async function recalculateStorage(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all groups where user is admin
    const adminGroups = await prisma.groupMember.findMany({
      where: {
        user: { userId: userId },
        role: 'admin',
      },
      select: {
        groupId: true,
        group: {
          select: { name: true },
        },
      },
    });

    if (adminGroups.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No admin groups found',
        recalculated: 0,
      });
    }

    const groupIds = adminGroups.map(ag => ag.groupId);
    let totalRecalculated = 0;

    // For each group, recalculate storage based on actual files
    for (const groupId of groupIds) {
      // Get all non-deleted media files in this group's messages
      const mediaFiles = await prisma.messageMedia.findMany({
        where: {
          isHidden: false, // Only count non-deleted files
          message: {
            messageGroup: {
              groupId: groupId,
            },
          },
        },
        select: {
          mediaType: true,
          fileSizeBytes: true,
        },
      });

      // Get all non-deleted secure documents (GroupDocument) in this group
      const secureDocuments = await prisma.groupDocument.findMany({
        where: {
          groupId: groupId,
          isHidden: false,
        },
        select: {
          fileSizeBytes: true,
        },
      });

      // Calculate totals by media type
      const totals = {
        image: { count: 0, bytes: BigInt(0) },
        video: { count: 0, bytes: BigInt(0) },
        audio: { count: 0, bytes: BigInt(0) },
        document: { count: 0, bytes: BigInt(0) },
        phonecall: { count: 0, bytes: BigInt(0) },
        videocall: { count: 0, bytes: BigInt(0) },
      };

      // Count message media files
      for (const file of mediaFiles) {
        let mediaType = 'document';
        if (file.mediaType === 'image' || file.mediaType?.startsWith('image/')) {
          mediaType = 'image';
        } else if (file.mediaType === 'video' || file.mediaType?.startsWith('video/')) {
          mediaType = 'video';
        } else if (file.mediaType === 'audio' || file.mediaType?.startsWith('audio/')) {
          mediaType = 'audio';
        } else if (file.mediaType === 'phonecall') {
          mediaType = 'phonecall';
        } else if (file.mediaType === 'videocall') {
          mediaType = 'videocall';
        }

        totals[mediaType].count += 1;
        totals[mediaType].bytes += file.fileSizeBytes || BigInt(0);
      }

      // Count secure documents
      for (const doc of secureDocuments) {
        totals.document.count += 1;
        totals.document.bytes += doc.fileSizeBytes || BigInt(0);
      }

      // Get all admins for this group
      const admins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
        },
        select: { userId: true },
      });

      // Update storage_usage for each admin and media type
      for (const admin of admins) {
        if (!admin.userId) continue;

        for (const [mediaType, data] of Object.entries(totals)) {
          // Upsert the storage usage record
          await prisma.storageUsage.upsert({
            where: {
              userId_groupId_mediaType: {
                userId: admin.userId,
                groupId: groupId,
                mediaType: mediaType,
              },
            },
            update: {
              fileCount: data.count,
              totalBytes: data.bytes,
              lastCalculatedAt: new Date(),
            },
            create: {
              userId: admin.userId,
              groupId: groupId,
              mediaType: mediaType,
              fileCount: data.count,
              totalBytes: data.bytes,
            },
          });
        }

        // Recalculate total user storage
        const allUserStorage = await prisma.storageUsage.aggregate({
          where: { userId: admin.userId },
          _sum: { totalBytes: true },
        });

        await prisma.user.update({
          where: { userId: admin.userId },
          data: {
            storageUsedBytes: allUserStorage._sum.totalBytes || BigInt(0),
          },
        });

        totalRecalculated++;
      }
    }

    console.log(`[recalculateStorage] Recalculated storage for ${totalRecalculated} admin(s) across ${groupIds.length} group(s)`);

    res.status(200).json({
      success: true,
      message: `Storage recalculated for ${groupIds.length} group(s)`,
      groupsProcessed: groupIds.length,
    });
  } catch (error) {
    console.error('Recalculate storage error:', error);
    res.status(500).json({
      error: 'Failed to recalculate storage',
      message: error.message,
    });
  }
}

module.exports = {
  getStorageUsage,
  getGroupFiles,
  requestFileDeletion,
  recalculateStorage,
};
