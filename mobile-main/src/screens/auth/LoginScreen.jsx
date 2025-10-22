/**
 * Login Screen
 *
 * Entry point for user authentication via Kinde OAuth.
 * Uses Expo Auth Session for OAuth flow.
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
 * LoginScreen component - Kinde OAuth authentication
 *
 * @param {LoginScreenProps} props
 * @returns {JSX.Element}
 */
export default function LoginScreen({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for Kinde configuration and log for debugging
  React.useEffect(() => {
    console.log('=== LOGIN SCREEN DEBUG ===');
    console.log('KINDE_DOMAIN:', CONFIG.KINDE_DOMAIN);
    console.log('KINDE_CLIENT_ID:', CONFIG.KINDE_CLIENT_ID);
    console.log('KINDE_REDIRECT_URI:', CONFIG.KINDE_REDIRECT_URI);

    if (!CONFIG.KINDE_DOMAIN || !CONFIG.KINDE_CLIENT_ID || !CONFIG.KINDE_REDIRECT_URI) {
      console.log('ERROR: Kinde configuration missing!');
      setError('Kinde configuration missing. Please check your .env file.');
    } else {
      console.log('Kinde configuration looks good!');
    }
  }, []);

  // OAuth discovery configuration
  const discovery = AuthSession.useAutoDiscovery(
    CONFIG.KINDE_DOMAIN ? `https://${CONFIG.KINDE_DOMAIN}` : null
  );

  // OAuth request configuration
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.KINDE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline'],
      redirectUri: CONFIG.KINDE_REDIRECT_URI,
    },
    discovery
  );

  // Log OAuth request status
  React.useEffect(() => {
    console.log('OAuth request status:', request ? 'READY' : 'NOT READY');
    console.log('Discovery status:', discovery ? 'LOADED' : 'NOT LOADED');
  }, [request, discovery]);

  /**
   * Handle OAuth login flow
   */
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Trigger OAuth flow
      const result = await promptAsync();

      if (result.type === 'success') {
        const { code } = result.params;

        // Exchange authorization code for tokens via backend
        const response = await api.post('/auth/callback', {
          code,
          redirectUri: CONFIG.KINDE_REDIRECT_URI,
        });

        const { accessToken, refreshToken, user } = response.data;

        // Store tokens securely
        await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        // Notify parent component of successful login
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
      } else if (result.type === 'error') {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
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

        <Title style={styles.title}>Parenting Helper</Title>

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
