/**
 * API Service
 *
 * Central API configuration and Axios instance for all API calls.
 * Handles authentication tokens, request/response interceptors, and error handling.
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
 * Response interceptor - Handle errors and token refresh
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');

        if (refreshToken) {
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

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - user needs to login again
        console.log('[API] Token refresh failed - triggering logout');

        // Clear stored tokens
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');

        // Emit logout event to App.js
        authEvents.emitLogout('token_refresh_failed');

        // Create user-friendly error
        const authError = new Error('Your session has expired. Please log in again.');
        authError.isAuthError = true;
        return Promise.reject(authError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
