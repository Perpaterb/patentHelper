/**
 * Home Screen
 *
 * Main screen after login. Displays user info and provides access to app features.
 * Links to web app for subscription management (mobile apps don't handle payments).
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import { Card, Title, Text, Button, Avatar, Divider } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../../constants/config';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} HomeScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Function} onLogout - Callback when user logs out
 */

/**
 * HomeScreen component - Main app dashboard
 *
 * @param {HomeScreenProps} props
 * @returns {JSX.Element}
 */
export default function HomeScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadSubscriptionStatus();
  }, []);

  /**
   * Load user data from secure storage
   */
  const loadUserData = async () => {
    try {
      const userData = await SecureStore.getItemAsync(CONFIG.STORAGE_KEYS.USER_DATA);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  /**
   * Load subscription status from backend
   */
  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/status');
      setSubscription(response.data.subscription);
    } catch (error) {
      console.error('Error loading subscription status:', error);
      // Non-blocking error - user can still use app
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open web app for subscription management
   */
  const handleManageSubscription = async () => {
    const url = `${CONFIG.WEB_APP_URL}/subscription`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      CustomAlert.alert(
        'Cannot Open Browser',
        'Please visit parentinghelperapp.com on your browser to manage your subscription.'
      );
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    CustomAlert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear secure storage
              await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
              await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
              await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.USER_DATA);

              // Notify parent component
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Get subscription status display text
   */
  const getSubscriptionStatus = () => {
    if (loading) return 'Loading...';
    if (!subscription) return 'No active subscription';

    if (subscription.status === 'active') {
      return 'Active Subscription';
    } else if (subscription.status === 'trialing') {
      const daysLeft = subscription.trialDaysRemaining || 0;
      return `Free Trial (${daysLeft} days left)`;
    } else if (subscription.status === 'canceled') {
      return 'Subscription Canceled';
    }

    return 'Unknown Status';
  };

  /**
   * Check if user needs to subscribe
   */
  const needsSubscription = () => {
    return !subscription ||
           subscription.status === 'canceled' ||
           subscription.status === 'past_due';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Profile Card */}
        <Card style={styles.card}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={64}
              label={user?.given_name?.[0] || user?.email?.[0] || 'U'}
              style={styles.avatar}
              color={getContrastTextColor('#6200ee')}
            />
            <Title style={styles.userName}>
              {user?.given_name} {user?.family_name}
            </Title>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </Card.Content>
        </Card>

        {/* Subscription Status Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Subscription</Title>
            <Text style={styles.subscriptionStatus}>
              {getSubscriptionStatus()}
            </Text>

            {needsSubscription() && (
              <Text style={styles.warningText}>
                Subscribe to unlock all features
              </Text>
            )}

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={handleManageSubscription}
              style={styles.button}
              icon="open-in-new"
            >
              Manage Subscription on Web
            </Button>

            <Text style={styles.helperText}>
              Opens parentinghelperapp.com in your browser
            </Text>
          </Card.Content>
        </Card>

        {/* App Features Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>App Features</Title>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Groups')}
              style={styles.featureButton}
              icon="account-group"
              disabled={needsSubscription()}
            >
              Message Groups
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Calendar')}
              style={styles.featureButton}
              icon="calendar"
              disabled={needsSubscription()}
            >
              Shared Calendar
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Finance')}
              style={styles.featureButton}
              icon="currency-usd"
              disabled={needsSubscription()}
            >
              Finance Tracker
            </Button>
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="text"
              onPress={handleLogout}
              style={styles.logoutButton}
              textColor="#d32f2f"
            >
              Logout
            </Button>
          </Card.Content>
        </Card>

        {/* Free Trial Notice */}
        {subscription?.status === 'trialing' && (
          <Card style={[styles.card, styles.trialCard]}>
            <Card.Content>
              <Text style={styles.trialNotice}>
                🎉 You're on a free trial! Subscribe before it ends to keep access to all features.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    marginBottom: 12,
    backgroundColor: '#6200ee',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subscriptionStatus: {
    fontSize: 16,
    marginBottom: 8,
  },
  warningText: {
    color: '#f57c00',
    fontSize: 14,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    marginBottom: 8,
  },
  featureButton: {
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  logoutButton: {
    marginTop: 8,
  },
  trialCard: {
    backgroundColor: '#fff3e0',
  },
  trialNotice: {
    fontSize: 14,
    color: '#e65100',
    textAlign: 'center',
  },
});
