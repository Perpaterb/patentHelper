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
import { Provider as PaperProvider } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { CONFIG } from './src/constants/config';
import authEvents from './src/services/authEvents';
import { CustomAlertProvider, setGlobalAlertHandler, useCustomAlert } from './src/components/CustomAlert';

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
   * Note: For the Full App (mobile-main), users must login every time.
   * We clear any stored tokens on app startup to ensure fresh authentication.
   * (PH Messenger app uses biometric auth after first login)
   */
  const checkAuthStatus = async () => {
    try {
      // Clear any stored tokens - users must login every time for Full App
      await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);

      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing tokens on startup:', error);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <CustomAlertProvider>
        <AlertHandlerInitializer />
        <StatusBar style="light" />
        <AppNavigator
          key={navigationKey}
          isAuthenticated={isAuthenticated}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
        />
      </CustomAlertProvider>
    </PaperProvider>
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
