/**
 * Login Screen
 *
 * Uses system browser for OAuth to prevent browser closing when user
 * switches to email app to get verification code.
 *
 * Auto-retries on token/auth errors to provide seamless UX.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { CONFIG } from '../../constants/config';
import api from '../../services/api';

// Store PKCE values globally so they persist across app backgrounding
let globalCodeVerifier = null;
let globalState = null;

// Maximum auto-retry attempts before showing error (user sees loading during retries)
const MAX_AUTO_RETRIES = 4;

/**
 * Check if an error is a token/auth error that should trigger auto-retry
 */
function isTokenError(errorMessage) {
  if (!errorMessage) return false;
  const tokenErrors = [
    'authorization grant',
    'invalid',
    'expired',
    'revoked',
    'refresh token',
    'authorization code',
    'code_verifier',
    'PKCE',
    'state mismatch',
  ];
  const lowerMessage = errorMessage.toLowerCase();
  return tokenErrors.some(err => lowerMessage.includes(err.toLowerCase()));
}

/**
 * Generate a random string for PKCE
 */
function generateRandomString(length = 64) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Generate code challenge from verifier (S256)
 */
async function generateCodeChallenge(verifier) {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  // Convert to URL-safe base64
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function LoginScreen({ onLoginSuccess }) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForCallback, setWaitingForCallback] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const hasStartedAuth = useRef(false);
  const autoRetryCount = useRef(0);

  // OAuth discovery
  const discovery = AuthSession.useAutoDiscovery(
    CONFIG.KINDE_DOMAIN ? `https://${CONFIG.KINDE_DOMAIN}` : null
  );

  /**
   * Handle the OAuth callback deep link
   */
  const handleDeepLink = async (event) => {
    const url = event.url || event;
    console.log('[LoginScreen] Deep link received:', url);

    if (!url.includes('callback') && !url.includes('code=')) {
      return;
    }

    try {
      setIsLoading(true);
      setWaitingForCallback(false);
      setStatusMessage('Completing login...');

      // Parse the callback URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const errorParam = urlObj.searchParams.get('error');

      if (errorParam) {
        throw new Error(urlObj.searchParams.get('error_description') || errorParam);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Verify state matches
      if (state !== globalState) {
        console.warn('[LoginScreen] State mismatch - PKCE values may be stale');
        // This is a common cause of token errors - throw to trigger retry
        throw new Error('State mismatch - session expired');
      }

      console.log('[LoginScreen] Got auth code, exchanging for tokens...');
      setStatusMessage('Verifying credentials...');

      // Exchange code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: CONFIG.KINDE_CLIENT_ID,
          code,
          redirectUri: CONFIG.KINDE_REDIRECT_URI,
          extraParams: {
            code_verifier: globalCodeVerifier,
          },
        },
        discovery
      );

      const { accessToken: kindeAccessToken, idToken, refreshToken: kindeRefreshToken } = tokenResult;

      if (!kindeAccessToken) {
        throw new Error('No access token received from Kinde');
      }

      // Decode ID token to get user info
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const kindeUser = JSON.parse(jsonPayload);

      console.log('[LoginScreen] User:', kindeUser.email);
      setStatusMessage('Signing in...');

      // Phase 2: Use Kinde token directly (no /auth/exchange)
      // Store Kinde access token - API will validate via JWKS
      await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, kindeAccessToken);

      // Store Kinde refresh token for token refresh
      if (kindeRefreshToken) {
        await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, kindeRefreshToken);
      }

      // Build user object from Kinde ID token
      const user = {
        kindeId: kindeUser.sub,
        email: kindeUser.email,
        given_name: kindeUser.given_name,
        family_name: kindeUser.family_name,
      };

      await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      console.log('[LoginScreen] Login successful!');

      // Reset retry counter on success
      autoRetryCount.current = 0;

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      console.error('[LoginScreen] Callback error:', err);

      const errorMessage = err.message || 'Login failed';

      // Check if this is a token/auth error that should auto-retry
      if (isTokenError(errorMessage) && autoRetryCount.current < MAX_AUTO_RETRIES) {
        autoRetryCount.current += 1;
        console.log(`[LoginScreen] Token error detected, auto-retrying (${autoRetryCount.current}/${MAX_AUTO_RETRIES})...`);

        // Clear stale PKCE values and restart login
        globalCodeVerifier = null;
        globalState = null;
        hasStartedAuth.current = false;

        setIsLoading(true);
        setWaitingForCallback(false);
        setStatusMessage('Refreshing session...');

        // Small delay before retry to let things settle
        setTimeout(() => {
          startLogin();
        }, 500);
        return;
      }

      // If max retries reached or non-token error, show support-friendly error
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const errorCode = `AUTH-${Date.now().toString(36).toUpperCase()}`;
      setError(`Unable to complete login after multiple attempts.\n\nIf this continues, please contact support with:\nError Code: ${errorCode}\nTime: ${timestamp}`);
      setIsLoading(false);
      setStatusMessage('');

      // Log detailed error for debugging
      console.error(`[LoginScreen] Login failed after ${MAX_AUTO_RETRIES} retries. Code: ${errorCode}, Original error: ${errorMessage}`);
    }
  };

  // Listen for deep links
  useEffect(() => {
    // Handle deep link if app was opened with one
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('callback')) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription?.remove();
    };
  }, [discovery]);

  /**
   * Start OAuth flow using system browser
   */
  const startLogin = async () => {
    if (!discovery?.authorizationEndpoint) {
      // Don't show error, just wait for discovery
      console.log('[LoginScreen] Waiting for OAuth discovery...');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setStatusMessage('Preparing login...');

      // Generate fresh PKCE values
      globalCodeVerifier = generateRandomString(64);
      globalState = generateRandomString(32);
      const codeChallenge = await generateCodeChallenge(globalCodeVerifier);

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: CONFIG.KINDE_CLIENT_ID,
        redirect_uri: CONFIG.KINDE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid profile email offline',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: globalState,
      });

      const authUrl = `${discovery.authorizationEndpoint}?${params.toString()}`;

      console.log('[LoginScreen] Opening system browser for auth...');

      setWaitingForCallback(true);
      setIsLoading(false);
      setStatusMessage('');

      // Open in system browser (not Custom Tabs) - stays open when app backgrounded
      await Linking.openURL(authUrl);

    } catch (err) {
      console.error('[LoginScreen] Login error:', err);

      // Auto-retry on startup errors too
      if (autoRetryCount.current < MAX_AUTO_RETRIES) {
        autoRetryCount.current += 1;
        console.log(`[LoginScreen] Startup error, auto-retrying (${autoRetryCount.current}/${MAX_AUTO_RETRIES})...`);
        setTimeout(() => {
          startLogin();
        }, 1000);
        return;
      }

      // Show support-friendly error after max retries
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const errorCode = `START-${Date.now().toString(36).toUpperCase()}`;
      setError(`Unable to start login after multiple attempts.\n\nIf this continues, please contact support with:\nError Code: ${errorCode}\nTime: ${timestamp}`);
      setIsLoading(false);
      setWaitingForCallback(false);
      setStatusMessage('');

      console.error(`[LoginScreen] Startup failed after ${MAX_AUTO_RETRIES} retries. Code: ${errorCode}, Original error: ${err.message}`);
    }
  };

  // Auto-start login on mount
  useEffect(() => {
    if (discovery && !hasStartedAuth.current && !waitingForCallback && !error) {
      hasStartedAuth.current = true;
      startLogin();
    }
  }, [discovery]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="contained"
              onPress={() => {
                hasStartedAuth.current = false;
                autoRetryCount.current = 0;
                setError(null);
                startLogin();
              }}
              style={styles.button}
              buttonColor="#6200ee"
            >
              Try Again
            </Button>
          </>
        ) : waitingForCallback ? (
          <>
            <Text style={styles.titleText}>Complete Login in Browser</Text>
            <Text style={styles.instructionText}>
              1. Enter your email in the browser{'\n'}
              2. Check your email for the code{'\n'}
              3. Enter the code in the browser{'\n'}
              4. You'll be redirected back here
            </Text>
            <Button
              mode="outlined"
              onPress={startLogin}
              style={styles.button}
            >
              Reopen Browser
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>
              {statusMessage || (discovery ? 'Processing...' : 'Connecting...')}
            </Text>
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
    lineHeight: 28,
    paddingHorizontal: 16,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
});
