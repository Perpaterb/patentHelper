/**
 * Storage Service Factory
 *
 * Exports the appropriate storage service based on environment configuration.
 * Uses local filesystem storage for development (NODE_ENV=development).
 * Uses S3 storage in production (NODE_ENV=production or running in Lambda).
 *
 * @module services/storage
 */

const LocalStorageService = require('./localStorageService');
const S3StorageService = require('./s3StorageService');

/**
 * Get the active storage service based on environment
 * @returns {StorageInterface} Storage service instance
 */
function getStorageService() {
  // Auto-detect Lambda environment or use explicit STORAGE_TYPE
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const isProduction = process.env.NODE_ENV === 'production';
  const storageType = process.env.STORAGE_TYPE || (isLambda || isProduction ? 's3' : 'local');

  console.log(`[Storage] Environment: isLambda=${isLambda}, isProduction=${isProduction}, storageType=${storageType}`);

  switch (storageType) {
    case 'local':
      console.log('[Storage] Using LocalStorageService');
      return new LocalStorageService();

    case 's3':
      console.log('[Storage] Using S3StorageService');
      return new S3StorageService();

    default:
      console.warn(`[Storage] Unknown storage type: ${storageType}, defaulting to local`);
      return new LocalStorageService();
  }
}

// Export singleton instance
const storageService = getStorageService();

module.exports = {
  storageService,
  getStorageService
};
