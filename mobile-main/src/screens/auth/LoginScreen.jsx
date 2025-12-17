/**
 * Login Screen
 *
 * Entry point for user authentication via Kinde OAuth.
 * Uses Expo Auth Session with PKCE for OAuth flow.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Title, Text, ActivityIndicator } from 'react-native-paper';
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
 * LoginScreen component - Kinde OAuth authentication with PKCE
 *
 * @param {LoginScreenProps} props
 * @returns {JSX.Element}
 */
export default function LoginScreen({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug: Log config values on mount
  React.useEffect(() => {
    console.log('[LoginScreen] ===== CONFIG DEBUG =====');
    console.log('[LoginScreen] KINDE_DOMAIN:', CONFIG.KINDE_DOMAIN);
    console.log('[LoginScreen] KINDE_CLIENT_ID:', CONFIG.KINDE_CLIENT_ID);
    console.log('[LoginScreen] KINDE_REDIRECT_URI:', CONFIG.KINDE_REDIRECT_URI);
    console.log('[LoginScreen] Discovery URL:', CONFIG.KINDE_DOMAIN ? `https://${CONFIG.KINDE_DOMAIN}` : null);
    console.log('[LoginScreen] ============================');
  }, []);

  // OAuth discovery configuration
  const discovery = AuthSession.useAutoDiscovery(
    CONFIG.KINDE_DOMAIN ? `https://${CONFIG.KINDE_DOMAIN}` : null
  );

  // Debug: Log when discovery changes
  React.useEffect(() => {
    console.log('[LoginScreen] Discovery loaded:', !!discovery);
    if (discovery) {
      console.log('[LoginScreen] Auth endpoint:', discovery.authorizationEndpoint);
    }
  }, [discovery]);

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

  // Debug: Log when request is ready
  React.useEffect(() => {
    console.log('[LoginScreen] Request ready:', !!request);
    if (request) {
      console.log('[LoginScreen] Request redirectUri:', request.redirectUri);
    }
  }, [request]);

  /**
   * Handle OAuth login flow with PKCE
   * 1. Trigger OAuth flow
   * 2. Exchange auth code for Kinde tokens (using PKCE)
   * 3. Send Kinde token to our backend
   * 4. Get our JWT tokens and store them
   */
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[LoginScreen] Starting Kinde OAuth flow...');
      console.log('[LoginScreen] Calling promptAsync...');

      // Trigger OAuth flow
      const result = await promptAsync();

      console.log('[LoginScreen] promptAsync returned!');
      console.log('[LoginScreen] Result type:', result.type);
      console.log('[LoginScreen] Result:', JSON.stringify(result, null, 2));

      if (result.type === 'success') {
        const { code } = result.params;

        console.log('OAuth successful, exchanging code for tokens...');

        // Exchange authorization code for Kinde tokens using PKCE
        // This happens on the mobile device, no client secret needed
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
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Title style={styles.title}>Family Helper</Title>

        <Text style={styles.subtitle}>
          Welcome! Sign in to access your co-parenting tools.
        </Text>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Login Button */}
        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={!request || loading}
          style={styles.loginButton}
          contentStyle={styles.loginButtonContent}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        {loading && (
          <ActivityIndicator size="large" style={styles.loader} />
        )}

        {/* Free Trial Info */}
        <Text style={styles.trialText}>
          Start your 20-day free trial today!
        </Text>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  loginButton: {
    width: '100%',
    marginTop: 16,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  trialText: {
    marginTop: 24,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
