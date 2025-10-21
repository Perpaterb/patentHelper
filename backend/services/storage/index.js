/**
 * Storage Service Factory
 *
 * Exports the appropriate storage service based on environment configuration.
 * Defaults to local filesystem storage for development.
 * Will use S3 storage in production (Phase 6).
 *
 * @module services/storage
 */

const LocalStorageService = require('./localStorageService');
// const S3StorageService = require('./s3StorageService'); // Phase 6

/**
 * Get the active storage service based on environment
 * @returns {StorageInterface} Storage service instance
 */
function getStorageService() {
  const storageType = process.env.STORAGE_TYPE || 'local';

  switch (storageType) {
    case 'local':
      return new LocalStorageService();

    // Phase 6: Uncomment when S3 service is implemented
    // case 's3':
    //   return new S3StorageService();

    default:
      console.warn(`Unknown storage type: ${storageType}, defaulting to local`);
      return new LocalStorageService();
  }
}

// Export singleton instance
const storageService = getStorageService();

module.exports = {
  storageService,
  getStorageService
};
