/**
 * App Configuration Constants
 *
 * Central location for all app-wide configuration values.
 */

export const CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  API_TIMEOUT: 15000,

  // Web App URL (for subscription management and share links)
  // Default to production URL - only localhost in dev with explicit .env override
  WEB_APP_URL: process.env.EXPO_PUBLIC_WEB_APP_URL || process.env.EXPO_PUBLIC_WEB_URL || 'https://familyhelperapp.com',

  // Kinde Configuration (from .env)
  KINDE_DOMAIN: process.env.EXPO_PUBLIC_KINDE_DOMAIN || '',
  KINDE_CLIENT_ID: process.env.EXPO_PUBLIC_KINDE_CLIENT_ID || '',
  KINDE_REDIRECT_URI: process.env.EXPO_PUBLIC_KINDE_REDIRECT_URI || '',
  KINDE_LOGOUT_REDIRECT_URI: process.env.EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI || '',

  // App Configuration
  APP_NAME: 'Parenting Helper',
  APP_VERSION: '1.0.0',

  // Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData',
  },
};

export default CONFIG;
