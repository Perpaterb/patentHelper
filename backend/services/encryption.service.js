/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data (messages).
 * Uses a single master key stored in environment variables.
 *
 * @module services/encryption
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * @returns {Buffer} 32-byte encryption key
 * @throws {Error} If MESSAGE_ENCRYPTION_KEY not set or invalid
 */
function getEncryptionKey() {
  const key = process.env.MESSAGE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('MESSAGE_ENCRYPTION_KEY environment variable not set');
  }

  // Key should be a 64-character hex string (32 bytes)
  if (key.length !== 64) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a message using AES-256-GCM
 *
 * @param {string} plaintext - The message to encrypt
 * @returns {string} Base64-encoded encrypted message format: iv:authTag:ciphertext
 * @throws {Error} If encryption fails
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag (ensures integrity)
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  } catch (error) {
    // Re-throw specific errors (key validation)
    if (error.message.includes('MESSAGE_ENCRYPTION_KEY')) {
      throw error;
    }
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message using AES-256-GCM
 *
 * @param {string} encryptedMessage - Base64-encoded encrypted message (iv:authTag:ciphertext)
 * @returns {string} Decrypted plaintext message
 * @throws {Error} If decryption fails or message is tampered with
 */
function decrypt(encryptedMessage) {
  if (!encryptedMessage || typeof encryptedMessage !== 'string') {
    throw new Error('Encrypted message must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();

    // Parse the encrypted message format: iv:authTag:ciphertext
    const parts = encryptedMessage.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted message format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the ciphertext
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message - data may be corrupted or tampered with');
  }
}

/**
 * Check if a string appears to be encrypted (format check only)
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if text matches encrypted message format
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Check if it matches the format: base64:base64:base64
  const parts = text.split(':');
  return parts.length === 3 && parts.every(part => /^[A-Za-z0-9+/=]+$/.test(part));
}

/**
 * Generate a new random encryption key (for initial setup)
 * Run this once and store the output in MESSAGE_ENCRYPTION_KEY
 *
 * @returns {string} 64-character hex string (32 bytes)
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  generateKey,
};
