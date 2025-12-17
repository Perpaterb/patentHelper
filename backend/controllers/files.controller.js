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
const {
  needsConversion,
  convertToPng,
  getConvertedFilename,
  detectImageFormat,
  PASSTHROUGH_TYPES,
  ALL_IMAGE_TYPES,
} = require('../services/imageConversion.service');
const audioConverter = require('../services/audioConverter');
const mediaProcessor = require('../services/mediaProcessor.service');
const fileEncryption = require('../services/fileEncryption.service');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Check if running in production (Lambda environment or NODE_ENV=production)
// BUT: If USE_LOCAL_RECORDER=true (Lightsail deployment), use local ffmpeg even in production
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const useLocalProcessing = process.env.USE_LOCAL_RECORDER === 'true';
const isProduction = isLambda && !useLocalProcessing;

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
    const validCategories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'personal-gift-registry', 'wiki', 'item-registry', 'personal-item-registry', 'secure-documents', 'audio'];
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
      'profiles': 5 * 1024 * 1024,         // 5MB for profile icons
      'messages': 200 * 1024 * 1024,       // 200MB for messages (videos)
      'calendar': 200 * 1024 * 1024,       // 200MB for calendar (videos)
      'finance': 100 * 1024 * 1024,        // 100MB for documents
      'gift-registry': 100 * 1024 * 1024,  // 100MB for images (no strict limit)
      'wiki': 100 * 1024 * 1024,           // 100MB for documents
      'item-registry': 100 * 1024 * 1024,  // 100MB for images (no strict limit)
      'secure-documents': 100 * 1024 * 1024, // 100MB for secure documents
      'audio': 100 * 1024 * 1024,          // 100MB for audio recordings (10 min high quality)
    };

    const maxSize = maxSizes[category] || 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `File size exceeds ${(maxSize / (1024 * 1024)).toFixed(0)}MB limit for ${category}`
      });
    }

    // Convert non-standard image formats (HEIC, WebP, etc.) to PNG for universal compatibility
    let fileBuffer = req.file.buffer;
    let fileMimeType = req.file.mimetype;
    let fileName = req.file.originalname;
    let fileSize = req.file.size;
    let wasConverted = false;

    // If mimeType is not recognized as an image, try to detect from file content
    // This handles cases where the client sends wrong mimeType (e.g., text/plain for HEIC)
    if (!ALL_IMAGE_TYPES.includes(fileMimeType.toLowerCase())) {
      console.log(`Unrecognized mimeType "${fileMimeType}", attempting to detect from file content...`);
      try {
        const detected = await detectImageFormat(req.file.buffer);
        if (detected.isImage) {
          console.log(`Detected image format: ${detected.format} (${detected.mimeType})`);
          fileMimeType = detected.mimeType;
        }
      } catch (detectionError) {
        console.log('Image detection failed, keeping original mimeType:', detectionError.message);
      }
    }

    if (needsConversion(fileMimeType)) {
      try {
        const originalMimeType = fileMimeType; // Save before conversion
        const converted = await convertToPng(req.file.buffer, fileMimeType);
        fileBuffer = converted.buffer;
        fileMimeType = converted.mimeType;
        fileName = getConvertedFilename(req.file.originalname, originalMimeType);
        fileSize = converted.buffer.length;
        wasConverted = true;
        console.log(`Converted ${req.file.originalname} from ${originalMimeType} to ${fileMimeType} (${(fileSize / 1024).toFixed(1)}KB)`);
      } catch (conversionError) {
        console.error('Image conversion failed:', conversionError);
        return res.status(400).json({
          error: 'Image conversion failed',
          message: `Could not convert ${req.file.mimetype} to PNG: ${conversionError.message}`
        });
      }
    }

    // Convert incompatible audio formats (webm, ogg) to MP3 for universal playback
    if (audioConverter.needsConversion(fileMimeType)) {
      const originalMimeType = fileMimeType;

      if (isProduction) {
        // PRODUCTION: Use Lambda-based media processor via S3
        try {
          // Generate S3 keys for original and converted files
          const tempFileId = uuidv4();
          const originalExt = req.file.originalname.split('.').pop() || 'webm';
          const inputS3Key = `temp-audio/${tempFileId}.${originalExt}`;
          const outputS3Key = `temp-audio/${tempFileId}.mp3`;

          // Upload original audio to S3 (temporary location)
          await storageService.uploadRawToS3(req.file.buffer, inputS3Key, fileMimeType);

          // Invoke Lambda to convert audio
          console.log(`[Production] Invoking Lambda for audio conversion: ${inputS3Key} -> ${outputS3Key}`);
          const result = await mediaProcessor.convertAudio({
            inputS3Key,
            outputS3Key,
            deleteOriginal: true,
          });

          // Download converted file from S3
          fileBuffer = await storageService.downloadFromS3(outputS3Key);
          fileMimeType = 'audio/mpeg';
          fileName = req.file.originalname.replace(/\.[^.]+$/, '.mp3');
          fileSize = fileBuffer.length;
          wasConverted = true;

          // Clean up temporary converted file from S3
          await storageService.deleteFromS3(outputS3Key).catch(() => {});

          console.log(`[Production] Converted audio ${req.file.originalname} from ${originalMimeType} to ${fileMimeType} (${(fileSize / 1024).toFixed(1)}KB)`);
        } catch (conversionError) {
          console.error('Audio conversion failed (production):', conversionError);
          return res.status(400).json({
            error: 'Audio conversion failed',
            message: `Could not convert ${req.file.mimetype} to MP3: ${conversionError.message}`
          });
        }
      } else {
        // LOCAL DEV: Use local ffmpeg or Docker container
        let tempInputPath = null;
        try {
          const tempDir = os.tmpdir();

          // Write buffer to temp file for ffmpeg processing
          const tempInputName = `audio_input_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          tempInputPath = path.join(tempDir, tempInputName);
          await fs.writeFile(tempInputPath, req.file.buffer);

          // Convert to MP3
          const converted = await audioConverter.convertToMp3(tempInputPath, tempDir);

          // Read converted file
          fileBuffer = await fs.readFile(converted.path);
          fileMimeType = converted.mimeType;
          fileName = req.file.originalname.replace(/\.[^.]+$/, '.mp3');
          fileSize = fileBuffer.length;
          wasConverted = true;

          // Clean up converted file
          await fs.unlink(converted.path).catch(() => {});

          console.log(`Converted audio ${req.file.originalname} from ${originalMimeType} to ${fileMimeType} (${(fileSize / 1024).toFixed(1)}KB)`);
        } catch (conversionError) {
          console.error('Audio conversion failed:', conversionError);
          return res.status(400).json({
            error: 'Audio conversion failed',
            message: `Could not convert ${req.file.mimetype} to MP3: ${conversionError.message}`
          });
        } finally {
          // Clean up temp input file
          if (tempInputPath) {
            await fs.unlink(tempInputPath).catch(() => {});
          }
        }
      }
    }

    // Prepare upload options
    const uploadOptions = {
      category: category,
      userId: userId,
      originalName: fileName,
      mimeType: fileMimeType,
      size: fileSize,
      groupId: groupId || null
    };

    // Upload file using storage service (tracks storage against all admins)
    const fileMetadata = await storageService.uploadFile(fileBuffer, uploadOptions);

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
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const conversionNote = wasConverted ? ` (converted from ${req.file.mimetype})` : '';

      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'upload_file',
          performedBy: membership.groupMemberId,
          performedByName: membership.user?.displayName || membership.displayName,
          performedByEmail: membership.user?.email || 'N/A',
          actionLocation: category,
          messageContent: `Uploaded ${fileName} (${fileSizeMB}MB)${conversionNote} - Charged to admins: ${adminNames}`,
          logData: {
            fileId: fileMetadata.fileId,
            fileName: fileName,
            originalFileName: req.file.originalname,
            fileSize: fileSize,
            mimeType: fileMimeType,
            originalMimeType: req.file.mimetype,
            wasConverted: wasConverted,
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
    const validCategories = ['messages', 'calendar', 'finance', 'profiles', 'gift-registry', 'personal-gift-registry', 'wiki', 'item-registry', 'personal-item-registry', 'secure-documents', 'audio'];
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
      'profiles': 5 * 1024 * 1024,         // 5MB for profile icons
      'messages': 200 * 1024 * 1024,       // 200MB for messages (videos)
      'calendar': 200 * 1024 * 1024,       // 200MB for calendar (videos)
      'finance': 100 * 1024 * 1024,        // 100MB for documents
      'gift-registry': 100 * 1024 * 1024,  // 100MB for images (no strict limit)
      'wiki': 100 * 1024 * 1024,           // 100MB for documents
      'item-registry': 100 * 1024 * 1024,  // 100MB for images (no strict limit)
      'secure-documents': 100 * 1024 * 1024, // 100MB for secure documents
      'audio': 100 * 1024 * 1024,          // 100MB for audio recordings (10 min high quality)
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

    // Convert and upload all files
    const uploadedFiles = [];
    let conversionCount = 0;

    for (const file of req.files) {
      // Convert non-standard image formats to PNG
      let fileBuffer = file.buffer;
      let fileMimeType = file.mimetype;
      let fileName = file.originalname;
      let fileSize = file.size;

      // If mimeType is not recognized as an image, try to detect from file content
      if (!ALL_IMAGE_TYPES.includes(fileMimeType.toLowerCase())) {
        console.log(`Unrecognized mimeType "${fileMimeType}" for ${file.originalname}, attempting detection...`);
        try {
          const detected = await detectImageFormat(file.buffer);
          if (detected.isImage) {
            console.log(`Detected image format: ${detected.format} (${detected.mimeType})`);
            fileMimeType = detected.mimeType;
          }
        } catch (detectionError) {
          console.log('Image detection failed, keeping original mimeType:', detectionError.message);
        }
      }

      if (needsConversion(fileMimeType)) {
        try {
          const originalMimeType = fileMimeType; // Save before conversion
          const converted = await convertToPng(file.buffer, fileMimeType);
          fileBuffer = converted.buffer;
          fileMimeType = converted.mimeType;
          fileName = getConvertedFilename(file.originalname, originalMimeType);
          fileSize = converted.buffer.length;
          conversionCount++;
          console.log(`Converted ${file.originalname} from ${originalMimeType} to ${fileMimeType} (${(fileSize / 1024).toFixed(1)}KB)`);
        } catch (conversionError) {
          console.error('Image conversion failed:', conversionError);
          return res.status(400).json({
            error: 'Image conversion failed',
            message: `Could not convert ${file.originalname} (${file.mimetype}) to PNG: ${conversionError.message}`
          });
        }
      }

      const uploadOptions = {
        category: category,
        userId: userId,
        originalName: fileName,
        mimeType: fileMimeType,
        size: fileSize,
        groupId: groupId || null
      };

      const fileMetadata = await storageService.uploadFile(fileBuffer, uploadOptions);
      uploadedFiles.push(fileMetadata);
    }

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
      const conversionNote = conversionCount > 0 ? ` (${conversionCount} converted to PNG)` : '';

      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'upload_files',
          performedBy: membership.groupMemberId,
          performedByName: membership.user?.displayName || membership.displayName,
          performedByEmail: membership.user?.email || 'N/A',
          actionLocation: category,
          messageContent: `Uploaded ${uploadedFiles.length} files (${totalSizeMB}MB total)${conversionNote} - Charged to admins: ${adminNames}`,
          logData: {
            fileIds: uploadedFiles.map(f => f.fileId),
            fileNames: uploadedFiles.map(f => f.originalName),
            totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
            category: category,
            groupId: groupId,
            chargedToAdmins: chargedAdminIds,
            convertedCount: conversionCount,
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

    // Check if we're in Lambda/S3 mode
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    // For encrypted files, we MUST download and decrypt (can't use presigned URLs)
    // For non-encrypted files in Lambda, use presigned URL redirect for better performance
    let fileBuffer = await storageService.getFile(fileId);
    let needsDecryption = fileEncryption.isEncrypted(fileBuffer);

    if (isLambda && storageService.getFileUrl && !needsDecryption) {
      // Redirect to presigned S3 URL (works better for binary files through API Gateway)
      const presignedUrl = await storageService.getFileUrl(fileId, 3600); // 1 hour expiry
      return res.redirect(302, presignedUrl);
    }

    // Decrypt if the file is encrypted (recordings use application-level encryption)
    if (needsDecryption) {
      console.log(`[Files] Decrypting file ${fileId}...`);
      fileBuffer = fileEncryption.decryptFile(fileBuffer);
      console.log(`[Files] Decrypted. Size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    }

    const fileSize = fileBuffer.length;

    // Check for range request (needed for audio/video seeking and duration detection)
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Set headers for partial content
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', metadata.mimeType);

      // Send the requested chunk
      res.send(fileBuffer.slice(start, end + 1));
    } else {
      // No range request - send entire file
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Disposition', `inline; filename="${metadata.fileName}"`);
      res.setHeader('Accept-Ranges', 'bytes');

      // Send file
      res.send(fileBuffer);
    }

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
