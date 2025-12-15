/**
 * Push Notification Service (Mobile)
 *
 * Handles push notification registration and permission management
 * using Expo's push notification system.
 *
 * Features:
 * - Request notification permissions
 * - Get Expo push token
 * - Register token with backend
 * - Handle notification responses
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and get Expo push token
 *
 * @returns {Promise<string|null>} Expo push token or null if failed
 */
async function registerForPushNotifications() {
  // Must be on a physical device
  if (!Device.isDevice) {
    console.log('[PushNotification] Must use physical device for push notifications');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotification] Permission not granted');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const expoPushToken = tokenData.data;
    console.log('[PushNotification] Got Expo push token:', expoPushToken);

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6200ee',
      });
    }

    return expoPushToken;
  } catch (error) {
    console.error('[PushNotification] Error getting push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 *
 * @param {string} expoPushToken - The Expo push token
 * @returns {Promise<boolean>} True if registration successful
 */
async function registerTokenWithBackend(expoPushToken) {
  if (!expoPushToken) {
    return false;
  }

  try {
    const platform = Platform.OS; // 'ios' or 'android'
    const deviceName = Device.modelName || `${Device.brand} ${Device.modelId}`;

    const response = await api.post('/notifications/register-token', {
      expoPushToken,
      platform,
      deviceName,
    });

    if (response.data.success) {
      console.log('[PushNotification] Token registered with backend');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PushNotification] Failed to register token with backend:', error.message);
    return false;
  }
}

/**
 * Unregister push token from backend (call on logout)
 *
 * @param {string} expoPushToken - The Expo push token to unregister
 * @returns {Promise<boolean>} True if unregistration successful
 */
async function unregisterToken(expoPushToken) {
  if (!expoPushToken) {
    return false;
  }

  try {
    const response = await api.post('/notifications/unregister-token', {
      expoPushToken,
    });

    if (response.data.success) {
      console.log('[PushNotification] Token unregistered from backend');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PushNotification] Failed to unregister token:', error.message);
    return false;
  }
}

/**
 * Initialize push notifications
 * Call this after successful login
 *
 * @returns {Promise<string|null>} The registered push token or null
 */
async function initializePushNotifications() {
  // Get push token
  const expoPushToken = await registerForPushNotifications();

  if (expoPushToken) {
    // Register with backend
    await registerTokenWithBackend(expoPushToken);
  }

  return expoPushToken;
}

/**
 * Add listener for received notifications (when app is in foreground)
 *
 * @param {Function} callback - Function to call when notification received
 * @returns {Function} Cleanup function to remove listener
 */
function addNotificationReceivedListener(callback) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Add listener for notification responses (when user taps notification)
 *
 * @param {Function} callback - Function to call when user interacts with notification
 * @returns {Function} Cleanup function to remove listener
 */
function addNotificationResponseListener(callback) {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Get the current push token (if already registered)
 *
 * @returns {Promise<string|null>} Current push token or null
 */
async function getCurrentPushToken() {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    return tokenData.data;
  } catch (error) {
    console.error('[PushNotification] Error getting current token:', error);
    return null;
  }
}

/**
 * Send a test notification to verify setup
 *
 * @returns {Promise<Object>} Result from backend
 */
async function sendTestNotification() {
  try {
    const response = await api.post('/notifications/test');
    return response.data;
  } catch (error) {
    console.error('[PushNotification] Test notification failed:', error.message);
    throw error;
  }
}

export default {
  registerForPushNotifications,
  registerTokenWithBackend,
  unregisterToken,
  initializePushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getCurrentPushToken,
  sendTestNotification,
};
