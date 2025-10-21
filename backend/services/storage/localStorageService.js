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
   * @param {string} options.category - File category (messages, calendar, finance, profiles)
   * @param {string} options.userId - User ID
   * @param {string} options.originalName - Original filename
   * @param {string} options.mimeType - MIME type
   * @param {number} options.size - File size in bytes
   * @param {string} [options.groupId] - Optional group ID
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

      // Update storage usage
      await this._updateStorageUsage(userId, size);

      // Return metadata
      return {
        ...metadata,
        url: `/files/${fileId}`
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
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'temp'];

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
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'temp'];

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
   * Get storage usage for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Storage used in bytes
   */
  async getStorageUsage(userId) {
    try {
      // TODO: Implement proper storage usage tracking with groups and media types
      // Storage is tracked per userId + groupId + mediaType in database schema
      // For now, calculate by scanning metadata files
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'temp'];
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
   * @private
   * @param {string} userId - User ID
   * @param {number} sizeBytes - Size to add in bytes
   */
  async _updateStorageUsage(userId, sizeBytes) {
    // TODO: Implement database storage tracking when groups are implemented
    // Storage is tracked per userId + groupId + mediaType in the database
    // For now, storage usage is calculated on-demand by scanning files
    console.log(`Storage updated for user ${userId}: +${sizeBytes} bytes`);
  }
}

module.exports = LocalStorageService;
