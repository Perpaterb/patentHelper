/**
 * Local Filesystem Storage Service
 *
 * Implements storage interface using local filesystem.
 * Files are stored in uploads/ directory organized by category.
 * File metadata is stored in database.
 *
 * This will be replaced with S3 storage in Phase 6.
 *
 * @module services/storage/localStorageService
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../../config/database');
const StorageInterface = require('./storageInterface');

/**
 * Local filesystem storage implementation
 * @extends StorageInterface
 */
class LocalStorageService extends StorageInterface {
  constructor() {
    super();
    this.baseUploadPath = path.join(__dirname, '../../uploads');
  }

  /**
   * Upload a file to local filesystem
   * @param {Buffer} fileBuffer - File data buffer
   * @param {Object} options - Upload options
   * @param {string} options.category - File category (messages, calendar, finance, profiles, gift-registry, wiki, item-registry)
   * @param {string} options.userId - User ID
   * @param {string} options.originalName - Original filename
   * @param {string} options.mimeType - MIME type
   * @param {number} options.size - File size in bytes
   * @param {string} [options.groupId] - Optional group ID (required for group-related uploads)
   * @returns {Promise<Object>} File metadata
   */
  async uploadFile(fileBuffer, options) {
    const { category, userId, originalName, mimeType, size, groupId } = options;

    // Generate unique file ID and sanitized filename
    const fileId = uuidv4();
    const fileExtension = path.extname(originalName);
    const sanitizedName = `${fileId}${fileExtension}`;

    // Construct storage path
    const categoryPath = path.join(this.baseUploadPath, category);
    const filePath = path.join(categoryPath, sanitizedName);

    try {
      // Ensure category directory exists
      await fs.mkdir(categoryPath, { recursive: true });

      // Write file to disk
      await fs.writeFile(filePath, fileBuffer);

      // Note: File metadata will be stored in database when attached to messages/events/etc.
      // For now, we just track the file on disk and in a simple JSON metadata file
      const metadataPath = path.join(categoryPath, `${fileId}.json`);
      const metadata = {
        fileId: fileId,
        fileName: sanitizedName,
        originalName: originalName,
        mimeType: mimeType,
        size: size,
        category: category,
        userId: userId,
        groupId: groupId || null,
        storagePath: filePath,
        uploadedAt: new Date().toISOString(),
        isHidden: false
      };

      // Write metadata file
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Update storage usage - tracks against ALL admins if group-related
      const chargedAdminIds = await this._updateStorageUsage(userId, size, groupId, mimeType);

      // Return metadata with charged admin IDs for audit logging
      return {
        ...metadata,
        url: `/files/${fileId}`,
        chargedAdminIds: chargedAdminIds
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Get file metadata by ID
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileId) {
    try {
      // Find metadata file by searching all category directories
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry', 'secure-documents', 'temp'];

      for (const category of categories) {
        const metadataPath = path.join(this.baseUploadPath, category, `${fileId}.json`);

        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadata = JSON.parse(metadataContent);

          if (metadata.isHidden) {
            throw new Error('File has been deleted');
          }

          return {
            ...metadata,
            url: `/files/${fileId}`
          };
        } catch (error) {
          // File not in this category, continue searching
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      throw new Error('File not found');
    } catch (error) {
      console.error('Get file metadata error:', error);
      throw error;
    }
  }

  /**
   * Get file data as buffer
   * @param {string} fileId - File ID
   * @returns {Promise<Buffer>} File data
   */
  async getFile(fileId) {
    try {
      const metadata = await this.getFileMetadata(fileId);
      const fileBuffer = await fs.readFile(metadata.storagePath);
      return fileBuffer;
    } catch (error) {
      console.error('Get file error:', error);
      throw error;
    }
  }

  /**
   * Get file URL (local path)
   * @param {string} fileId - File ID
   * @param {number} [expiresIn] - Not used for local storage
   * @returns {Promise<string>} File URL
   */
  async getFileUrl(fileId, expiresIn = 3600) {
    const metadata = await this.getFileMetadata(fileId);
    return metadata.url;
  }

  /**
   * Delete a file (soft delete)
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId) {
    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(fileId);

      // Update metadata to mark as hidden
      metadata.isHidden = true;

      // Find and update the metadata file
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry', 'temp'];

      for (const category of categories) {
        const metadataPath = path.join(this.baseUploadPath, category, `${fileId}.json`);

        try {
          await fs.access(metadataPath);
          // Soft delete - set is_hidden flag
          // Note: Per requirements, files are never hard deleted (appplan.md line 17)
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

          // Do NOT delete from filesystem - keep for audit purposes
          // Storage usage is NOT decremented to maintain accurate history
          return true;
        } catch (error) {
          // File not in this category, continue searching
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      throw new Error('File not found');
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Hard delete a file from storage (completely removes file and metadata)
   * Used when admin approval workflow approves file deletion.
   * @param {string} fileId - File ID
   * @returns {Promise<{deleted: boolean, bytesFreed: number}>} Delete result
   */
  async hardDeleteFile(fileId) {
    try {
      // Get file metadata to find file path and size
      const metadata = await this.getFileMetadata(fileId);
      const bytesFreed = metadata.size || 0;

      // Find the file in categories
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry', 'temp'];

      for (const category of categories) {
        const metadataPath = path.join(this.baseUploadPath, category, `${fileId}.json`);

        try {
          await fs.access(metadataPath);

          // Found the file - delete both the actual file and metadata
          const filePath = path.join(this.baseUploadPath, category, metadata.filename || `${fileId}_file`);

          // Delete the actual file
          try {
            await fs.unlink(filePath);
            console.log(`[hardDeleteFile] Deleted file: ${filePath}`);
          } catch (unlinkError) {
            // File might not exist at expected path, try alternative patterns
            if (unlinkError.code === 'ENOENT') {
              // Try finding file by fileId pattern in the directory
              const dirPath = path.join(this.baseUploadPath, category);
              const files = await fs.readdir(dirPath);
              for (const file of files) {
                if (file.startsWith(fileId) && !file.endsWith('.json')) {
                  await fs.unlink(path.join(dirPath, file));
                  console.log(`[hardDeleteFile] Deleted file by pattern: ${file}`);
                  break;
                }
              }
            } else {
              throw unlinkError;
            }
          }

          // Delete metadata file
          await fs.unlink(metadataPath);
          console.log(`[hardDeleteFile] Deleted metadata: ${metadataPath}`);

          return { deleted: true, bytesFreed };
        } catch (error) {
          // File not in this category, continue searching
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      throw new Error('File not found for hard deletion');
    } catch (error) {
      console.error('Hard delete file error:', error);
      throw error;
    }
  }

  /**
   * Get storage usage for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Storage used in bytes
   */
  async getStorageUsage(userId) {
    try {
      // TODO: Implement proper storage usage tracking with groups and media types
      // Storage is tracked per userId + groupId + mediaType in database schema
      // For now, calculate by scanning metadata files
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'wiki', 'item-registry', 'temp'];
      let totalBytes = 0;

      for (const category of categories) {
        const categoryPath = path.join(this.baseUploadPath, category);

        try {
          const files = await fs.readdir(categoryPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const metadataPath = path.join(categoryPath, file);
              const metadataContent = await fs.readFile(metadataPath, 'utf-8');
              const metadata = JSON.parse(metadataContent);

              // Only count files for this user that are not hidden
              if (metadata.userId === userId && !metadata.isHidden) {
                totalBytes += metadata.size;
              }
            }
          }
        } catch (error) {
          // Category directory doesn't exist yet, skip
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      return totalBytes;
    } catch (error) {
      console.error('Get storage usage error:', error);
      throw error;
    }
  }

  /**
   * Update storage usage for a user
   * CRITICAL: For group-related uploads, this updates storage for ALL admins in the group
   * @private
   * @param {string} userId - User ID of uploader
   * @param {number} sizeBytes - Size to add in bytes
   * @param {string} [groupId] - Optional group ID (required for group-related uploads)
   * @param {string} [mimeType] - Optional MIME type for media type categorization
   * @returns {Promise<Array<string>>} Array of admin user IDs charged for this upload
   */
  async _updateStorageUsage(userId, sizeBytes, groupId = null, mimeType = null) {
    try {
      const chargedAdminIds = [];

      // Determine media type from MIME type
      const mediaType = this._getMediaType(mimeType);

      if (groupId) {
        // For group-related uploads, charge ALL admins in the group
        const admins = await prisma.groupMember.findMany({
          where: {
            groupId: groupId,
            role: 'admin',
          },
          include: {
            user: true,
          },
        });

        // Update storage_usage for each admin
        for (const admin of admins) {
          if (!admin.userId) {
            // Skip placeholder members (unregistered admins shouldn't exist, but skip if they do)
            continue;
          }

          // Upsert storage_usage record
          await prisma.storageUsage.upsert({
            where: {
              userId_groupId_mediaType: {
                userId: admin.userId,
                groupId: groupId,
                mediaType: mediaType,
              },
            },
            update: {
              fileCount: { increment: 1 },
              totalBytes: { increment: BigInt(sizeBytes) },
              lastCalculatedAt: new Date(),
            },
            create: {
              userId: admin.userId,
              groupId: groupId,
              mediaType: mediaType,
              fileCount: 1,
              totalBytes: BigInt(sizeBytes),
            },
          });

          // Update user's total storage usage
          await prisma.user.update({
            where: { userId: admin.userId },
            data: {
              storageUsedBytes: { increment: BigInt(sizeBytes) },
            },
          });

          chargedAdminIds.push(admin.userId);
        }

        console.log(
          `Storage updated for group ${groupId}: +${sizeBytes} bytes charged to ${chargedAdminIds.length} admin(s)`
        );
      } else {
        // For non-group uploads (e.g., profile photos), charge only the uploader
        await prisma.user.update({
          where: { userId: userId },
          data: {
            storageUsedBytes: { increment: BigInt(sizeBytes) },
          },
        });

        chargedAdminIds.push(userId);
        console.log(`Storage updated for user ${userId}: +${sizeBytes} bytes`);
      }

      return chargedAdminIds;
    } catch (error) {
      console.error('Update storage usage error:', error);
      throw new Error(`Failed to update storage usage: ${error.message}`);
    }
  }

  /**
   * Determine media type from MIME type
   * @private
   * @param {string} mimeType - MIME type
   * @returns {string} Media type (image, video, audio, document, log, phonecall, videocall)
   */
  _getMediaType(mimeType) {
    if (!mimeType) return 'document';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('application/pdf') || mimeType.includes('document')) return 'document';

    return 'document';
  }
}

module.exports = LocalStorageService;
