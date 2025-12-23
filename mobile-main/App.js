/**
 * App Entry Point
 *
 * Main application component that manages authentication state
 * and renders the appropriate navigation structure.
 */

import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { CONFIG } from './src/constants/config';
import api from './src/services/api';
import authEvents from './src/services/authEvents';
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

  useEffect(() => {
    checkAuthStatus();
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
  const handleLoginSuccess = (user) => {
    console.log('Login successful:', user.email);
    // Force navigation reset on login to clear any stale state
    setNavigationKey(prev => prev + 1);
    setIsAuthenticated(true);
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    console.log('[App] Logging out user');

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
