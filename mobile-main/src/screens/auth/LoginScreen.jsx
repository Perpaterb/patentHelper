/**
 * Login Screen
 *
 * Automatically initiates Kinde OAuth authentication.
 * No landing page - goes straight to Kinde login.
 * Uses Expo Auth Session with PKCE for OAuth flow.
 *
 * Note: Kinde uses passwordless email verification. Users may need to
 * leave the app to check their email for a code. We handle this by
 * not treating "dismiss" as an error - users can tap to continue.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../../constants/config';
import api from '../../services/api';

// Required for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

/**
 * @typedef {Object} LoginScreenProps
 * @property {Function} onLoginSuccess - Callback when login succeeds
 */

/**
 * LoginScreen component - Automatically initiates Kinde OAuth with PKCE
 * No UI shown - immediately redirects to Kinde login
 *
 * @param {LoginScreenProps} props
 * @returns {JSX.Element}
 */
export default function LoginScreen({ onLoginSuccess }) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContinue, setShowContinue] = useState(false);
  const loginAttempted = useRef(false);

  // OAuth discovery configuration
  const discovery = AuthSession.useAutoDiscovery(
    CONFIG.KINDE_DOMAIN ? `https://${CONFIG.KINDE_DOMAIN}` : null
  );

  // OAuth request configuration with PKCE
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.KINDE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline'],
      redirectUri: CONFIG.KINDE_REDIRECT_URI,
      usePKCE: true, // Enable PKCE (no client secret needed)
    },
    discovery
  );

  /**
   * Handle OAuth login flow with PKCE
   * 1. Trigger OAuth flow
   * 2. Exchange auth code for Kinde tokens (using PKCE)
   * 3. Send Kinde token to our backend
   * 4. Get our JWT tokens and store them
   */
  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setShowContinue(false);

      console.log('[LoginScreen] Starting Kinde OAuth flow...');

      // Trigger OAuth flow
      const result = await promptAsync();

      console.log('[LoginScreen] Result type:', result.type);

      if (result.type === 'success') {
        const { code } = result.params;

        console.log('OAuth successful, exchanging code for tokens...');

        // Exchange authorization code for Kinde tokens using PKCE
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: CONFIG.KINDE_CLIENT_ID,
            code,
            redirectUri: CONFIG.KINDE_REDIRECT_URI,
            extraParams: {
              code_verifier: request.codeVerifier, // PKCE verifier
            },
          },
          discovery
        );

        const { accessToken: kindeToken, idToken } = tokenResult;

        console.log('Kinde tokens received');

        if (!kindeToken) {
          throw new Error('No access token received from Kinde');
        }

        // Decode ID token to get user info (simple JWT decode, no verification needed)
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const kindeUser = JSON.parse(jsonPayload);

        console.log('User info decoded from ID token:', kindeUser.email);
        console.log('Exchanging Kinde token with backend...');

        // Exchange Kinde token for our backend JWT tokens
        const response = await api.post('/auth/exchange', {
          kindeToken,
          kindeUser: {
            id: kindeUser.sub,
            email: kindeUser.email,
            given_name: kindeUser.given_name,
            family_name: kindeUser.family_name,
          },
        });

        const { accessToken, user } = response.data;

        console.log('Backend JWT received, storing tokens...');

        // Store tokens securely
        await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        console.log('Login successful!');

        // Notify parent component of successful login
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
      } else if (result.type === 'error') {
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User left the app (e.g., to check email for verification code)
        // Don't show as error - show a friendly "Continue Login" button
        console.log('[LoginScreen] Auth session dismissed - user may have left to check email');
        setIsLoading(false);
        setShowContinue(true);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  // Automatically trigger login when request is ready
  useEffect(() => {
    if (request && !loginAttempted.current && !error && !showContinue) {
      loginAttempted.current = true;
      handleLogin();
    }
  }, [request]);

  // Continue login after user returns from checking email
  const handleContinueLogin = () => {
    loginAttempted.current = false;
    setShowContinue(false);
    setError(null);
    if (request) {
      handleLogin();
    }
  };

  // Allow retry on tap if there's an error
  const handleRetry = () => {
    loginAttempted.current = false;
    setError(null);
    setShowContinue(false);
    if (request) {
      handleLogin();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={handleRetry}>
              Tap to try again
            </Text>
          </>
        ) : showContinue ? (
          <>
            <Text style={styles.titleText}>Check Your Email</Text>
            <Text style={styles.instructionText}>
              If you entered your email, check your inbox for a verification code.
              Once you have it, tap the button below to continue.
            </Text>
            <Button
              mode="contained"
              onPress={handleContinueLogin}
              style={styles.continueButton}
              buttonColor="#6200ee"
            >
              Continue Login
            </Button>
            <Text style={styles.restartText} onPress={handleRetry}>
              Start over
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Redirecting to login...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  continueButton: {
    marginBottom: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  restartText: {
    color: '#999',
    fontSize: 14,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryText: {
    color: '#6200ee',
    fontSize: 16,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
