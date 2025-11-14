/**
 * Upload Service
 *
 * Handles file uploads to the backend API.
 * Supports single and multiple file uploads with progress tracking.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3000'; // Update for production

/**
 * Upload a single file
 * @param {Object} file - File object from MediaPicker
 *   { uri, type, name, size, mimeType }
 * @param {string} category - File category (messages, gift-registry, profiles, etc.)
 * @param {string} groupId - Group ID (required for group uploads)
 * @param {Function} onProgress - Progress callback (optional): (progress) => void
 * @returns {Promise<Object>} Upload result with file metadata
 */
export const uploadFile = async (file, category, groupId = null, onProgress = null) => {
  try {
    // Get authentication token from secure storage (same as api.js)
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType,
      name: file.name,
    });
    formData.append('category', category);
    if (groupId) {
      formData.append('groupId', groupId);
    }

    // Upload with progress tracking
    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Upload failed');
    }

    return response.data.file;
  } catch (error) {
    console.error('Upload file error:', error);

    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.message || 'Upload failed');
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error. Please check your connection.');
    } else {
      // Other errors
      throw new Error(error.message || 'Upload failed');
    }
  }
};

/**
 * Upload multiple files
 * @param {Array<Object>} files - Array of file objects from MediaPicker
 * @param {string} category - File category
 * @param {string} groupId - Group ID (required for group uploads)
 * @param {Function} onProgress - Progress callback (optional): (progress) => void
 * @returns {Promise<Array<Object>>} Array of upload results
 */
export const uploadMultipleFiles = async (files, category, groupId = null, onProgress = null) => {
  try {
    // Get authentication token from secure storage (same as api.js)
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Create FormData
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', {
        uri: file.uri,
        type: file.mimeType,
        name: file.name,
      });
    });
    formData.append('category', category);
    if (groupId) {
      formData.append('groupId', groupId);
    }

    // Upload with progress tracking
    const response = await axios.post(`${API_BASE_URL}/files/upload-multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Upload failed');
    }

    return response.data.files;
  } catch (error) {
    console.error('Upload multiple files error:', error);

    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.message || 'Upload failed');
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error. Please check your connection.');
    } else {
      // Other errors
      throw new Error(error.message || 'Upload failed');
    }
  }
};

/**
 * Get file URL for viewing
 * @param {string} fileId - File ID from upload response
 * @returns {string} File URL
 */
export const getFileUrl = (fileId) => {
  return `${API_BASE_URL}/files/${fileId}`;
};
