/**
 * API Service
 *
 * Central API configuration and Axios instance for all API calls.
 * Handles authentication tokens, request/response interceptors, and error handling.
 *
 * Features:
 * - Automatic token refresh with request queuing
 * - Prevents race conditions during simultaneous refreshes
 * - Silent error handling - never shows technical errors to users
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import authEvents from './authEvents';

// API Base URL - points to local backend during development
const API_BASE_URL = 'http://localhost:3000';

/**
 * Create Axios instance with base configuration
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Token refresh state management
 * Prevents race conditions when multiple requests fail simultaneously
 */
let isRefreshing = false;
let failedRequestsQueue = [];

/**
 * Request interceptor - Add auth token to all requests
 */
api.interceptors.request.use(
  async (config) => {
    try {
      // Get access token from secure storage
      const accessToken = await SecureStore.getItemAsync('accessToken');

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    } catch (error) {
      console.error('Error adding auth token to request:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Process queued requests after successful token refresh
 * @param {Error|null} error - Error if refresh failed, null if successful
 * @param {string|null} token - New access token if successful
 */
function processQueue(error, token = null) {
  failedRequestsQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedRequestsQueue = [];
}

/**
 * Response interceptor - Handle errors and token refresh
 * Includes request queuing to prevent race conditions
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing the token
        // Queue this request and wait for the refresh to complete
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');

        if (!refreshToken) {
          // No refresh token available - logout immediately
          isRefreshing = false;
          processQueue(new Error('No refresh token available'));

          console.log('[API] No refresh token - triggering logout');
          await SecureStore.deleteItemAsync('accessToken');
          authEvents.emitLogout('no_refresh_token');

          const authError = new Error('Please log in again.');
          authError.isAuthError = true;
          return Promise.reject(authError);
        }

        // Send refresh token in request body (not as cookie)
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refreshToken: refreshToken,
          }
        );

        const { accessToken: newAccessToken } = response.data;

        // Store new access token
        await SecureStore.setItemAsync('accessToken', newAccessToken);

        // Update default header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        // Process all queued requests with the new token
        processQueue(null, newAccessToken);

        isRefreshing = false;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to login again
        processQueue(refreshError);
        isRefreshing = false;

        console.log('[API] Token refresh failed - triggering logout');

        // Clear stored tokens
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');

        // Emit logout event to App.js
        authEvents.emitLogout('token_refresh_failed');

        // Don't show technical error messages to users
        // App.js will handle the logout and show login screen
        const authError = new Error('Session expired');
        authError.isAuthError = true;
        authError.silent = true; // Flag to prevent error display
        return Promise.reject(authError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
