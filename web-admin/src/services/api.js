/**
 * API Service
 *
 * Axios instance configured for the Family Helper API.
 * Handles authentication tokens, error handling, and request/response interceptors.
 *
 * Phase 2: Uses Kinde tokens directly (no custom JWT)
 */

import axios from 'axios';
import config from '../config/env';

// Kinde configuration for token refresh
const KINDE_DOMAIN = config.kinde.domain.replace('https://', '');
const KINDE_CLIENT_ID = config.kinde.clientId;

/**
 * Create axios instance with base configuration
 */
const api = axios.create({
  baseURL: config.api.url,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (for refresh token)
});

/**
 * Request Interceptor
 * Add access token to all requests
 */
api.interceptors.request.use(
  (config) => {
    // Get access token from localStorage
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle errors and token refresh
 */
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${response.status} ${response.config.url}`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh using Kinde's token endpoint (Phase 2)
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token - clear and let auth state handle it
          localStorage.removeItem('accessToken');
          console.warn('[API] No refresh token - user will be redirected by auth state change');
          return Promise.reject(new Error('No refresh token'));
        }

        const response = await axios.post(
          `https://${KINDE_DOMAIN}/oauth2/token`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: KINDE_CLIENT_ID,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        const { access_token: accessToken, refresh_token: newRefreshToken } = response.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens
        // DO NOT redirect here! Let Kinde's isAuthenticated state handle navigation.
        // Redirecting here causes infinite loops when combined with React Navigation.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        console.warn('[API] Kinde token refresh failed - user will be redirected by auth state change');
        return Promise.reject(refreshError);
      }
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Response error:', error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
