/**
 * Storage Service Interface
 *
 * All storage implementations (local, S3) must implement these methods.
 * This abstraction allows seamless switching between local filesystem
 * and AWS S3 without changing application code.
 *
 * @module services/storage/storageInterface
 */

/**
 * @typedef {Object} UploadOptions
 * @property {string} category - File category (messages, calendar, finance, profiles)
 * @property {string} userId - ID of user uploading the file
 * @property {string} [groupId] - Optional group ID for group-related files
 * @property {string} [originalName] - Original filename
 */

/**
 * @typedef {Object} FileMetadata
 * @property {string} fileId - Unique file identifier
 * @property {string} fileName - Sanitized filename
 * @property {string} originalName - Original filename
 * @property {string} mimeType - MIME type of the file
 * @property {number} size - File size in bytes
 * @property {string} category - File category
 * @property {string} userId - User who uploaded the file
 * @property {string} [groupId] - Group ID if applicable
 * @property {string} storagePath - Full storage path/key
 * @property {string} url - URL to access the file
 * @property {Date} uploadedAt - Upload timestamp
 */

/**
 * Storage Service Interface
 * All implementations must provide these methods
 */
class StorageInterface {
  /**
   * Upload a file to storage
   * @param {Buffer|Stream} fileBuffer - File data
   * @param {UploadOptions} options - Upload options
   * @returns {Promise<FileMetadata>} File metadata
   */
  async uploadFile(fileBuffer, options) {
    throw new Error('uploadFile() must be implemented');
  }

  /**
   * Get file metadata by ID
   * @param {string} fileId - File ID
   * @returns {Promise<FileMetadata>} File metadata
   */
  async getFileMetadata(fileId) {
    throw new Error('getFileMetadata() must be implemented');
  }

  /**
   * Get file data (stream or buffer)
   * @param {string} fileId - File ID
   * @returns {Promise<Buffer|Stream>} File data
   */
  async getFile(fileId) {
    throw new Error('getFile() must be implemented');
  }

  /**
   * Get public URL for file access
   * @param {string} fileId - File ID
   * @param {number} [expiresIn] - URL expiration in seconds (for signed URLs)
   * @returns {Promise<string>} File URL
   */
  async getFileUrl(fileId, expiresIn = 3600) {
    throw new Error('getFileUrl() must be implemented');
  }

  /**
   * Delete a file (soft delete - sets is_hidden flag)
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId) {
    throw new Error('deleteFile() must be implemented');
  }

  /**
   * Get storage usage for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Storage used in bytes
   */
  async getStorageUsage(userId) {
    throw new Error('getStorageUsage() must be implemented');
  }
}

module.exports = StorageInterface;
