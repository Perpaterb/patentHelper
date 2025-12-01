/**
 * Files Controller
 *
 * Handles file upload, retrieval, and deletion operations.
 * Uses storage service abstraction to work with local filesystem or S3.
 *
 * @module controllers/files
 */

const { storageService } = require('../services/storage');
const { prisma } = require('../config/database');

/**
 * Upload a single file
 * POST /files/upload
 *
 * Requires authentication. File storage is charged to ALL admins of the group.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function uploadFile(req, res) {
  try {
    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    // Extract metadata from request
    const { category = 'messages', groupId } = req.body;

    // Get userId from authenticated session
    const userId = req.user.userId;

    // Validate category
    const validCategories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // For group-related uploads, verify user is a member of the group
    if (groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: userId,
          groupId: groupId,
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this group'
        });
      }

      // Check if group has any paying admins (not on trial)
      const payingAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
          user: {
            is: {
              isSubscribed: true,
            },
          },
        },
      });

      const hasPayingAdmin = payingAdmins.length > 0;

      // If no paying admins, limit file size to 10MB
      if (!hasPayingAdmin && req.file.size > 10 * 1024 * 1024) {
        return res.status(403).json({
          error: 'File size limit exceeded',
          message: 'This group requires a paying admin to upload files larger than 10MB. Please ask an admin to subscribe.'
        });
      }
    }

    // Get current user to check trial status and storage limits
    const currentUser = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        isSubscribed: true,
        storageUsedBytes: true,
      },
    });

    // Trial users (not subscribed) are limited to 10GB total storage
    const TRIAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB
    if (!currentUser?.isSubscribed) {
      const currentUsage = Number(currentUser?.storageUsedBytes || 0);
      const newTotal = currentUsage + req.file.size;

      if (newTotal > TRIAL_STORAGE_LIMIT) {
        const remainingBytes = Math.max(0, TRIAL_STORAGE_LIMIT - currentUsage);
        return res.status(403).json({
          error: 'Storage limit exceeded',
          message: `Trial users are limited to 10GB of storage. You have ${formatBytes(remainingBytes)} remaining. Please subscribe to upload more files.`
        });
      }
    }

    // Validate file size limits
    const maxSizes = {
      'profiles': 5 * 1024 * 1024,      // 5MB for profile icons
      'messages': 100 * 1024 * 1024,    // 100MB for messages (videos)
      'calendar': 100 * 1024 * 1024,
      'finance': 25 * 1024 * 1024,      // 25MB for documents
      'gift-registry': 10 * 1024 * 1024, // 10MB for images
      'wiki': 25 * 1024 * 1024,
      'item-registry': 10 * 1024 * 1024,
    };

    const maxSize = maxSizes[category] || 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `File size exceeds ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit for ${category}`
      });
    }

    // Prepare upload options
    const uploadOptions = {
      category: category,
      userId: userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      groupId: groupId || null
    };

    // Upload file using storage service (tracks storage against all admins)
    const fileMetadata = await storageService.uploadFile(req.file.buffer, uploadOptions);

    // Create audit log if group-related upload
    if (groupId && fileMetadata.chargedAdminIds && fileMetadata.chargedAdminIds.length > 0) {
      const membership = await prisma.groupMember.findFirst({
        where: { userId: userId, groupId: groupId },
        include: { user: true }
      });

      // Get admin names for audit log
      const admins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
          userId: { in: fileMetadata.chargedAdminIds }
        },
        include: { user: true }
      });

      const adminNames = admins.map(a => a.user?.displayName || a.displayName).join(', ');
      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'upload_file',
          performedBy: membership.groupMemberId,
          performedByName: membership.user?.displayName || membership.displayName,
          performedByEmail: membership.user?.email || 'N/A',
          actionLocation: category,
          messageContent: `Uploaded ${req.file.originalname} (${fileSizeMB}MB) - Charged to admins: ${adminNames}`,
          logData: {
            fileId: fileMetadata.fileId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            category: category,
            groupId: groupId,
            chargedToAdmins: fileMetadata.chargedAdminIds,
          }
        }
      });
    }

    // Return success response (exclude chargedAdminIds from client response)
    const { chargedAdminIds, ...clientMetadata } = fileMetadata;
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: clientMetadata
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}

/**
 * Upload multiple files
 * POST /files/upload-multiple
 *
 * Requires authentication. File storage is charged to ALL admins of the group.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function uploadMultipleFiles(req, res) {
  try {
    // Validate files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please provide at least one file to upload'
      });
    }

    // Extract metadata from request
    const { category = 'messages', groupId } = req.body;
    const userId = req.user.userId;

    // Validate category
    const validCategories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // For group-related uploads, verify user is a member of the group
    let hasPayingAdmin = true; // Default to true for non-group uploads
    if (groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: userId,
          groupId: groupId,
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this group'
        });
      }

      // Check if group has any paying admins (not on trial)
      const payingAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
          user: {
            is: {
              isSubscribed: true,
            },
          },
        },
      });

      hasPayingAdmin = payingAdmins.length > 0;
    }

    // Get current user to check trial status and storage limits
    const currentUser = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        isSubscribed: true,
        storageUsedBytes: true,
      },
    });

    // Calculate total upload size
    const totalUploadSize = req.files.reduce((sum, file) => sum + file.size, 0);

    // Trial users (not subscribed) are limited to 10GB total storage
    const TRIAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB
    if (!currentUser?.isSubscribed) {
      const currentUsage = Number(currentUser?.storageUsedBytes || 0);
      const newTotal = currentUsage + totalUploadSize;

      if (newTotal > TRIAL_STORAGE_LIMIT) {
        const remainingBytes = Math.max(0, TRIAL_STORAGE_LIMIT - currentUsage);
        return res.status(403).json({
          error: 'Storage limit exceeded',
          message: `Trial users are limited to 10GB of storage. You have ${formatBytes(remainingBytes)} remaining. Please subscribe to upload more files.`
        });
      }
    }

    // Validate file size limits
    const maxSizes = {
      'profiles': 5 * 1024 * 1024,
      'messages': 100 * 1024 * 1024,
      'calendar': 100 * 1024 * 1024,
      'finance': 25 * 1024 * 1024,
      'gift-registry': 10 * 1024 * 1024,
      'wiki': 25 * 1024 * 1024,
      'item-registry': 10 * 1024 * 1024,
    };

    const maxSize = maxSizes[category] || 10 * 1024 * 1024;

    // Validate all file sizes before uploading
    for (const file of req.files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `File "${file.originalname}" exceeds ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit for ${category}`
        });
      }

      // If no paying admins, limit file size to 10MB
      if (!hasPayingAdmin && file.size > 10 * 1024 * 1024) {
        return res.status(403).json({
          error: 'File size limit exceeded',
          message: `File "${file.originalname}" exceeds 10MB limit. This group requires a paying admin to upload files larger than 10MB. Please ask an admin to subscribe.`
        });
      }
    }

    // Upload all files
    const uploadPromises = req.files.map(file => {
      const uploadOptions = {
        category: category,
        userId: userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        groupId: groupId || null
      };
      return storageService.uploadFile(file.buffer, uploadOptions);
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    // Create audit log if group-related upload
    if (groupId && uploadedFiles.length > 0) {
      const membership = await prisma.groupMember.findFirst({
        where: { userId: userId, groupId: groupId },
        include: { user: true }
      });

      const chargedAdminIds = uploadedFiles[0].chargedAdminIds || [];
      const admins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
          userId: { in: chargedAdminIds }
        },
        include: { user: true }
      });

      const adminNames = admins.map(a => a.user?.displayName || a.displayName).join(', ');
      const totalSizeMB = (uploadedFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2);
      const fileNames = uploadedFiles.map(f => f.originalName).join(', ');

      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'upload_files',
          performedBy: membership.groupMemberId,
          performedByName: membership.user?.displayName || membership.displayName,
          performedByEmail: membership.user?.email || 'N/A',
          actionLocation: category,
          messageContent: `Uploaded ${uploadedFiles.length} files (${totalSizeMB}MB total) - Charged to admins: ${adminNames}`,
          logData: {
            fileIds: uploadedFiles.map(f => f.fileId),
            fileNames: uploadedFiles.map(f => f.originalName),
            totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
            category: category,
            groupId: groupId,
            chargedToAdmins: chargedAdminIds,
          }
        }
      });
    }

    // Return success response (exclude chargedAdminIds from client response)
    const clientFiles = uploadedFiles.map(({ chargedAdminIds, ...file }) => file);
    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: clientFiles
    });

  } catch (error) {
    console.error('Upload multiple files error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}

/**
 * Get file by ID
 * GET /files/:fileId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getFile(req, res) {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const metadata = await storageService.getFileMetadata(fileId);

    // Get file data
    const fileBuffer = await storageService.getFile(fileId);

    // Set response headers
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Length', metadata.size);
    res.setHeader('Content-Disposition', `inline; filename="${metadata.fileName}"`);

    // Send file
    res.send(fileBuffer);

  } catch (error) {
    console.error('Get file error:', error);

    if (error.message === 'File not found' || error.message === 'File has been deleted') {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve file',
      message: error.message
    });
  }
}

/**
 * Get file metadata
 * GET /files/:fileId/metadata
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getFileMetadata(req, res) {
  try {
    const { fileId } = req.params;
    const metadata = await storageService.getFileMetadata(fileId);

    res.status(200).json({
      success: true,
      metadata: metadata
    });

  } catch (error) {
    console.error('Get file metadata error:', error);

    if (error.message === 'File not found' || error.message === 'File has been deleted') {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve file metadata',
      message: error.message
    });
  }
}

/**
 * Delete file (soft delete)
 * DELETE /files/:fileId
 *
 * Note: Per requirements (appplan.md line 17), files are never hard deleted.
 * They are soft deleted with is_hidden flag.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteFile(req, res) {
  try {
    const { fileId } = req.params;

    // TODO: Verify user has permission to delete this file (Phase 1, Week 2)
    // Only admins or file owner should be able to delete

    await storageService.deleteFile(fileId);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully (soft delete)'
    });

  } catch (error) {
    console.error('Delete file error:', error);

    if (error.message === 'File not found') {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
}

/**
 * Get storage usage for a user
 * GET /files/storage-usage/:userId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getStorageUsage(req, res) {
  try {
    const { userId } = req.params;

    // TODO: Verify user has permission to view this usage (Phase 1, Week 2)
    // Users should only see their own usage, admins can see all

    const usageBytes = await storageService.getStorageUsage(userId);
    const usageMB = (usageBytes / (1024 * 1024)).toFixed(2);

    res.status(200).json({
      success: true,
      userId: userId,
      usage: {
        bytes: usageBytes,
        megabytes: parseFloat(usageMB)
      }
    });

  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({
      error: 'Failed to retrieve storage usage',
      message: error.message
    });
  }
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  getFile,
  getFileMetadata,
  deleteFile,
  getStorageUsage
};
