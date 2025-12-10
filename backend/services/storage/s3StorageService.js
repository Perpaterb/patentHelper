/**
 * S3 Storage Service
 *
 * Implements storage interface using AWS S3.
 * Files are stored in S3 bucket organized by category.
 * File metadata is stored in S3 as JSON files alongside the actual files.
 *
 * @module services/storage/s3StorageService
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../../config/database');
const StorageInterface = require('./storageInterface');

/**
 * S3 storage implementation
 * @extends StorageInterface
 */
class S3StorageService extends StorageInterface {
  constructor() {
    super();
    this.bucketName = process.env.S3_BUCKET || 'family-helper-files-prod';
    this.region = process.env.AWS_REGION || 'ap-southeast-2';

    this.s3Client = new S3Client({
      region: this.region,
    });
  }

  /**
   * Upload a file to S3
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
    const fileExtension = this._getExtension(originalName);
    const sanitizedName = `${fileId}${fileExtension}`;

    // Construct S3 key
    const s3Key = `uploads/${category}/${sanitizedName}`;

    try {
      // Upload file to S3
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          'file-id': fileId,
          'original-name': encodeURIComponent(originalName),
          'user-id': userId,
          'group-id': groupId || '',
          'category': category,
        },
      }));

      // Prepare metadata
      const metadata = {
        fileId: fileId,
        fileName: sanitizedName,
        originalName: originalName,
        mimeType: mimeType,
        size: size,
        category: category,
        userId: userId,
        groupId: groupId || null,
        s3Key: s3Key,
        uploadedAt: new Date().toISOString(),
        isHidden: false,
      };

      // Upload metadata as JSON to S3
      const metadataKey = `uploads/${category}/${fileId}.json`;
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: 'application/json',
      }));

      // Update storage usage - tracks against ALL admins if group-related
      const chargedAdminIds = await this._updateStorageUsage(userId, size, groupId, mimeType);

      // Return metadata with URL
      return {
        ...metadata,
        url: `/files/${fileId}`,
        chargedAdminIds: chargedAdminIds,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
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
      // Search for metadata file in each category
      const categories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'personal-gift-registry', 'wiki', 'item-registry', 'personal-item-registry', 'secure-documents', 'audio', 'temp', 'recordings'];

      for (const category of categories) {
        const metadataKey = `uploads/${category}/${fileId}.json`;

        try {
          const response = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: metadataKey,
          }));

          const metadataContent = await response.Body.transformToString();
          const metadata = JSON.parse(metadataContent);

          if (metadata.isHidden) {
            throw new Error('File has been deleted');
          }

          return {
            ...metadata,
            url: `/files/${fileId}`,
          };
        } catch (error) {
          // File not in this category, continue searching
          if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
            continue;
          }
          throw error;
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

      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: metadata.s3Key,
      }));

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Get file error:', error);
      throw error;
    }
  }

  /**
   * Get presigned URL for file
   * @param {string} fileId - File ID
   * @param {number} [expiresIn=3600] - URL expiry time in seconds
   * @returns {Promise<string>} Presigned URL
   */
  async getFileUrl(fileId, expiresIn = 3600) {
    try {
      const metadata = await this.getFileMetadata(fileId);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: metadata.s3Key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Get file URL error:', error);
      throw error;
    }
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

      // Find the metadata key and update it
      const metadataKey = `uploads/${metadata.category}/${fileId}.json`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: 'application/json',
      }));

      // Do NOT delete from S3 - keep for audit purposes
      // Storage usage is NOT decremented to maintain accurate history
      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Hard delete a file from S3 (completely removes file and metadata)
   * Used when admin approval workflow approves file deletion.
   * @param {string} fileId - File ID
   * @returns {Promise<{deleted: boolean, bytesFreed: number}>} Delete result
   */
  async hardDeleteFile(fileId) {
    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(fileId);
      const bytesFreed = metadata.size || 0;

      // Delete the actual file from S3
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: metadata.s3Key,
      }));

      // Delete the metadata file
      const metadataKey = `uploads/${metadata.category}/${fileId}.json`;
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: metadataKey,
      }));

      console.log(`[hardDeleteFile] Deleted S3 file: ${metadata.s3Key}`);
      return { deleted: true, bytesFreed };
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
      // Get storage usage from database (more efficient than scanning S3)
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { storageUsedBytes: true },
      });

      return Number(user?.storageUsedBytes || 0);
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
   * Get file extension from filename
   * @private
   * @param {string} filename - Original filename
   * @returns {string} File extension (with dot)
   */
  _getExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.slice(lastDot).toLowerCase();
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

  // ============================================
  // Raw S3 Operations (for media conversion)
  // ============================================

  /**
   * Upload raw data directly to S3 at a specific key
   * Used for temporary files during media conversion
   * @param {Buffer} buffer - Data to upload
   * @param {string} s3Key - Full S3 key
   * @param {string} contentType - MIME type
   * @returns {Promise<void>}
   */
  async uploadRawToS3(buffer, s3Key, contentType) {
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    }));
    console.log(`[S3] Uploaded raw file: ${s3Key}`);
  }

  /**
   * Download raw data directly from S3 by key
   * Used for temporary files during media conversion
   * @param {string} s3Key - Full S3 key
   * @returns {Promise<Buffer>} File data
   */
  async downloadFromS3(s3Key) {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    }));

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    console.log(`[S3] Downloaded file: ${s3Key}`);
    return Buffer.concat(chunks);
  }

  /**
   * Delete a file directly from S3 by key
   * Used to clean up temporary files after conversion
   * @param {string} s3Key - Full S3 key
   * @returns {Promise<void>}
   */
  async deleteFromS3(s3Key) {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    }));
    console.log(`[S3] Deleted file: ${s3Key}`);
  }
}

module.exports = S3StorageService;
