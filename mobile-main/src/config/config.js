/**
 * App Configuration
 *
 * Centralized configuration for the Family Helper mobile app.
 * Environment-specific values are loaded from environment variables.
 */

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  SELECTED_GROUP: 'selected_group',
};

// Kinde Configuration
export const KINDE_CONFIG = {
  DOMAIN: process.env.EXPO_PUBLIC_KINDE_DOMAIN || 'https://your-domain.kinde.com',
  CLIENT_ID: process.env.EXPO_PUBLIC_KINDE_CLIENT_ID || 'your-client-id',
  REDIRECT_URI: process.env.EXPO_PUBLIC_KINDE_REDIRECT_URI || 'exp://localhost:8081',
  LOGOUT_REDIRECT_URI: process.env.EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI || 'exp://localhost:8081',
};

// App Configuration
export const APP_CONFIG = {
  // Free trial duration in days
  TRIAL_DAYS: 20,

  // Storage limits
  DEFAULT_STORAGE_GB: 10,

  // Subscription web URL (for linking to web-admin)
  WEB_SUBSCRIPTION_URL: process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3001/subscription',
  WEB_MY_ACCOUNT_URL: process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3001/my-account',

  // App version
  VERSION: '1.0.0',
};

// Feature Flags
export const FEATURES = {
  ENABLE_BIOMETRIC_AUTH: true,
  ENABLE_PUSH_NOTIFICATIONS: false, // TODO: Enable when implemented
  ENABLE_OFFLINE_MODE: false, // TODO: Enable when implemented
};
