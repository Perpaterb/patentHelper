/**
 * App Entry Point
 *
 * Main application component that manages authentication state
 * and renders the appropriate navigation structure.
 */

import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { CONFIG } from './src/constants/config';
import api from './src/services/api';
import authEvents from './src/services/authEvents';
import pushNotificationService from './src/services/pushNotification.service';
import { CustomAlertProvider, setGlobalAlertHandler, useCustomAlert } from './src/components/CustomAlert';
import ForceUpdateModal from './src/components/ForceUpdateModal';
import { useVersionCheck } from './src/hooks/useVersionCheck';
import { IncomingCallProvider } from './src/contexts/IncomingCallContext';

/**
 * Component to initialize the global alert handler
 */
function AlertHandlerInitializer() {
  const { showAlert } = useCustomAlert();

  useEffect(() => {
    setGlobalAlertHandler(showAlert);
  }, [showAlert]);

  return null;
}

/**
 * Component to handle version checking and force update modal
 */
function VersionCheckHandler({ children }) {
  const { needsUpdate, isChecking, versionInfo } = useVersionCheck('mobile-main');

  // Show loading while checking version
  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <>
      {children}
      <ForceUpdateModal
        visible={needsUpdate}
        currentVersion={versionInfo.currentVersion}
        minVersion={versionInfo.minVersion}
        updateUrl={versionInfo.updateUrl}
      />
    </>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationKey, setNavigationKey] = useState(0);
  const pushTokenRef = useRef(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Set up push notification listeners
   */
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const notificationReceivedCleanup = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('[App] Notification received:', notification.request.content.title);
      }
    );

    // Listen for user tapping on notifications
    const notificationResponseCleanup = pushNotificationService.addNotificationResponseListener(
      (response) => {
        console.log('[App] Notification tapped:', response.notification.request.content.data);
        // TODO: Navigate to relevant screen based on notification data
      }
    );

    return () => {
      notificationReceivedCleanup();
      notificationResponseCleanup();
    };
  }, []);

  /**
   * Listen for logout events from API service
   */
  useEffect(() => {
    const unsubscribe = authEvents.onLogout((reason) => {
      console.log(`[App] Logout event received: ${reason}`);
      handleLogout();
    });

    return unsubscribe;
  }, []);

  /**
   * Update app icon badge when app comes to foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        // App came to foreground - update badge count
        pushNotificationService.updateAppBadge().then((count) => {
          console.log('[App] Badge count updated on foreground:', count);
        }).catch((error) => {
          console.error('[App] Failed to update badge on foreground:', error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  /**
   * Check if user is already authenticated
   *
   * Validates existing tokens by making an API call.
   * If valid, user goes straight to the app (no login needed).
   * If invalid, clears tokens and shows login screen.
   */
  const checkAuthStatus = async () => {
    try {
      // Check if we have a stored token
      const token = await SecureStore.getItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

      if (token) {
        console.log('[App] Found existing token, validating...');

        try {
          // Try to validate the token by making an API call
          await api.get('/auth/me');
          console.log('[App] Token is valid, user is authenticated');
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } catch (apiError) {
          // Token is invalid (401) or other error - need to login
          console.log('[App] Token validation failed, clearing and requiring login');
          await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
          await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        }
      }

      // No valid token - need to login
      setIsAuthenticated(false);
    } catch (error) {
      console.error('[App] Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle successful login
   */
  const handleLoginSuccess = async (user) => {
    console.log('Login successful:', user.email);
    // Force navigation reset on login to clear any stale state
    setNavigationKey(prev => prev + 1);
    setIsAuthenticated(true);

    // Initialize push notifications after login
    try {
      const pushToken = await pushNotificationService.initializePushNotifications();
      pushTokenRef.current = pushToken;
      if (pushToken) {
        console.log('[App] Push notifications initialized');
      }

      // Update app icon badge after login
      const badgeCount = await pushNotificationService.updateAppBadge();
      console.log('[App] Initial badge count:', badgeCount);
    } catch (error) {
      console.error('[App] Failed to initialize push notifications:', error);
      // Don't block login on push notification failure
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    console.log('[App] Logging out user');

    // Clear app icon badge
    try {
      await pushNotificationService.clearBadge();
    } catch (error) {
      console.error('[App] Error clearing badge:', error);
    }

    // Unregister push token before logout
    if (pushTokenRef.current) {
      try {
        await pushNotificationService.unregisterToken(pushTokenRef.current);
        pushTokenRef.current = null;
      } catch (error) {
        console.error('[App] Error unregistering push token:', error);
      }
    }

    // Clear stored tokens
    try {
      await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('[App] Error clearing tokens:', error);
    }

    // Force navigation reset by changing key
    setNavigationKey(prev => prev + 1);
    setIsAuthenticated(false);
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3LightTheme}>
        <CustomAlertProvider>
          <AlertHandlerInitializer />
          <IncomingCallProvider isAuthenticated={isAuthenticated}>
            <VersionCheckHandler>
              <StatusBar style="light" />
              <AppNavigator
                key={navigationKey}
                isAuthenticated={isAuthenticated}
                onLoginSuccess={handleLoginSuccess}
                onLogout={handleLogout}
              />
            </VersionCheckHandler>
          </IncomingCallProvider>
        </CustomAlertProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
