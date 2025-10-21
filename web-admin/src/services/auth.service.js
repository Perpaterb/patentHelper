/**
 * Authentication Service
 *
 * Handles user authentication operations with the backend API.
 */

import api from './api';

const authService = {
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  /**
   * Verify access token
   * @returns {Promise<Object>} Token verification result
   */
  async verifyToken() {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  /**
   * Refresh access token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    const response = await api.post('/auth/refresh');
    const { accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('accessToken');
    }
  },

  /**
   * Store access token in localStorage
   * @param {string} token - Access token
   */
  storeAccessToken(token) {
    localStorage.setItem('accessToken', token);
  },

  /**
   * Get access token from localStorage
   * @returns {string|null} Access token or null
   */
  getAccessToken() {
    return localStorage.getItem('accessToken');
  },

  /**
   * Check if user is authenticated (has valid access token)
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!this.getAccessToken();
  },
};

export default authService;
