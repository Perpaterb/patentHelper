/**
 * File Upload Middleware
 *
 * Multer configuration for handling file uploads.
 * Validates file types, sizes, and prepares files for storage service.
 *
 * @module middleware/upload
 */

const multer = require('multer');
const path = require('path');

/**
 * File size limits by category (in bytes)
 * Note: Per appplan.md, storage is tracked per admin per group
 */
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,    // 10 MB for images
  video: 100 * 1024 * 1024,   // 100 MB for videos
  document: 25 * 1024 * 1024, // 25 MB for documents
  default: 10 * 1024 * 1024   // 10 MB default
};

/**
 * Allowed MIME types by category
 */
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  default: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
};

/**
 * Configure multer to use memory storage
 * Files are stored in memory as Buffer objects, then passed to storage service
 */
const storage = multer.memoryStorage();

/**
 * File filter function to validate file types
 * @param {Object} req - Express request
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
function fileFilter(req, file, cb) {
  const fileCategory = req.body.category || 'default';
  const allowedTypes = ALLOWED_MIME_TYPES[fileCategory] || ALLOWED_MIME_TYPES.default;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types for ${fileCategory}: ${allowedTypes.join(', ')}`), false);
  }
}

/**
 * Multer configuration for single file upload
 */
const uploadSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.default
  }
}).single('file');

/**
 * Multer configuration for multiple file upload (up to 10 files)
 */
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.default,
    files: 10
  }
}).array('files', 10);

/**
 * Custom middleware to handle multer errors
 * @param {Function} uploadMiddleware - Multer middleware
 * @returns {Function} Express middleware
 */
function handleUploadErrors(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large',
            message: `Maximum file size is ${FILE_SIZE_LIMITS.default / (1024 * 1024)} MB`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Too many files',
            message: 'Maximum 10 files allowed per upload'
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          message: err.message
        });
      } else if (err) {
        // Other errors (file filter, etc.)
        return res.status(400).json({
          error: 'Upload validation failed',
          message: err.message
        });
      }
      next();
    });
  };
}

module.exports = {
  uploadSingle: handleUploadErrors(uploadSingle),
  uploadMultiple: handleUploadErrors(uploadMultiple),
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES
};
