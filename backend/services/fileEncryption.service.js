/**
 * File Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for binary files (recordings).
 * Uses a single master key stored in environment variables.
 *
 * @module services/fileEncryption
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Magic bytes to identify encrypted files
const ENCRYPTED_HEADER = Buffer.from('FHENC01'); // Family Helper Encrypted v01

/**
 * Get encryption key from environment variable
 * @returns {Buffer} 32-byte encryption key
 * @throws {Error} If FILE_ENCRYPTION_KEY not set or invalid
 */
function getEncryptionKey() {
  // Use FILE_ENCRYPTION_KEY or fall back to MESSAGE_ENCRYPTION_KEY for simplicity
  const key = process.env.FILE_ENCRYPTION_KEY || process.env.MESSAGE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('FILE_ENCRYPTION_KEY or MESSAGE_ENCRYPTION_KEY environment variable not set');
  }

  // Key should be a 64-character hex string (32 bytes)
  if (key.length !== 64) {
    throw new Error('Encryption key must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a file buffer using AES-256-GCM
 *
 * Format: HEADER (7 bytes) + IV (16 bytes) + AUTH_TAG (16 bytes) + CIPHERTEXT
 *
 * @param {Buffer} fileBuffer - The file data to encrypt
 * @returns {Buffer} Encrypted file buffer with header, IV, auth tag, and ciphertext
 * @throws {Error} If encryption fails
 */
function encryptFile(fileBuffer) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('File buffer must be a non-empty Buffer');
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the file
    const ciphertext = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);

    // Get authentication tag (ensures integrity)
    const authTag = cipher.getAuthTag();

    // Return format: HEADER + IV + AUTH_TAG + CIPHERTEXT
    return Buffer.concat([ENCRYPTED_HEADER, iv, authTag, ciphertext]);
  } catch (error) {
    // Re-throw specific errors (key validation)
    if (error.message.includes('ENCRYPTION_KEY')) {
      throw error;
    }
    console.error('[FileEncryption] Encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypt a file buffer using AES-256-GCM
 *
 * @param {Buffer} encryptedBuffer - Encrypted file buffer (HEADER + IV + AUTH_TAG + CIPHERTEXT)
 * @returns {Buffer} Decrypted file buffer
 * @throws {Error} If decryption fails or file is tampered with
 */
function decryptFile(encryptedBuffer) {
  if (!encryptedBuffer || !Buffer.isBuffer(encryptedBuffer)) {
    throw new Error('Encrypted buffer must be a non-empty Buffer');
  }

  // Check if this is an encrypted file
  if (!isEncrypted(encryptedBuffer)) {
    // Return as-is if not encrypted (for backwards compatibility with existing files)
    console.log('[FileEncryption] File is not encrypted, returning as-is');
    return encryptedBuffer;
  }

  try {
    const key = getEncryptionKey();

    // Parse the encrypted buffer
    const headerLength = ENCRYPTED_HEADER.length;
    const iv = encryptedBuffer.slice(headerLength, headerLength + IV_LENGTH);
    const authTag = encryptedBuffer.slice(headerLength + IV_LENGTH, headerLength + IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedBuffer.slice(headerLength + IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the ciphertext
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext;
  } catch (error) {
    console.error('[FileEncryption] Decryption error:', error);
    throw new Error('Failed to decrypt file - data may be corrupted or tampered with');
  }
}

/**
 * Check if a buffer is an encrypted file (has our header)
 *
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} True if buffer starts with our encrypted file header
 */
function isEncrypted(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < ENCRYPTED_HEADER.length) {
    return false;
  }

  return buffer.slice(0, ENCRYPTED_HEADER.length).equals(ENCRYPTED_HEADER);
}

/**
 * Check if file encryption is available (key is configured)
 * @returns {boolean} True if encryption key is configured
 */
function isAvailable() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  encryptFile,
  decryptFile,
  isEncrypted,
  isAvailable,
};
