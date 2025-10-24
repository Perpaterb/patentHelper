/**
 * My Account Screen
 *
 * Allows users to:
 * - View and edit their display name
 * - View and edit their member icon
 * - View subscription status
 * - Navigate to web admin for full account features
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, TouchableOpacity } from 'react-native';
import { Card, Title, Text, TextInput, Button, Avatar, Divider } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
import { STORAGE_KEYS } from '../../config/config';
import ColorPickerModal from '../../components/ColorPickerModal';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} MyAccountScreenProps
 * @property {Object} navigation - React Navigation navigation object
 */

/**
 * MyAccountScreen component
 *
 * @param {MyAccountScreenProps} props
 * @returns {JSX.Element}
 */
export default function MyAccountScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [memberIcon, setMemberIcon] = useState('');
  const [iconColor, setIconColor] = useState('#6200ee');
  const [email, setEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  useEffect(() => {
    loadAccountInfo();
  }, []);

  /**
   * Load account information
   */
  const loadAccountInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user profile from API
      try {
        const profileResponse = await api.get('/users/profile');
        if (profileResponse.data.success) {
          const user = profileResponse.data.user;
          setEmail(user.email || '');
          setDisplayName(user.displayName || user.email || '');
          setMemberIcon(user.memberIcon || '');
          setIconColor(user.iconColor || '#6200ee');

          // Update SecureStore cache
          const userDataString = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            userData.displayName = user.displayName;
            userData.memberIcon = user.memberIcon;
            userData.iconColor = user.iconColor;
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          }
        }
      } catch (err) {
        console.error('Failed to load user profile from API:', err);
        // Fallback to SecureStore cache
        const userDataString = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setEmail(userData.email || '');
          setDisplayName(userData.given_name || userData.displayName || userData.email || '');
          setMemberIcon(userData.memberIcon || '');
          setIconColor(userData.iconColor || '#6200ee');
        }
      }

      // Get subscription status from API
      try {
        const response = await api.get('/subscriptions/current');
        if (response.data.success) {
          setSubscriptionStatus(response.data.subscription);
        }
      } catch (err) {
        console.error('Failed to load subscription status:', err);
        // Set default trial status on error
        setSubscriptionStatus({
          isActive: false,
          plan: 'Free Trial',
          status: 'trial',
          daysRemaining: 20,
        });
      }

    } catch (err) {
      console.error('Load account info error:', err);
      setError('Failed to load account information');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save account changes
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save to backend API
      await api.put('/users/profile', { displayName, memberIcon, iconColor });

      // Update local SecureStore cache
      const userDataString = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        userData.given_name = displayName;
        userData.memberIcon = memberIcon;
        userData.iconColor = iconColor;
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      }

      Alert.alert('Success', 'Your account information has been saved.');
    } catch (err) {
      console.error('Save account error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save account information');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Open web admin page
   */
  const handleOpenWebAdmin = async () => {
    try {
      const webAdminUrl = 'https://parentinghelperapp.com/account'; // TODO: Replace with actual URL
      const supported = await Linking.canOpenURL(webAdminUrl);

      if (supported) {
        await Linking.openURL(webAdminUrl);
      } else {
        Alert.alert('Error', 'Cannot open web admin page');
      }
    } catch (err) {
      console.error('Open web admin error:', err);
      Alert.alert('Error', 'Failed to open web admin page');
    }
  };

  /**
   * Open color picker modal
   */
  const handleOpenColorPicker = () => {
    setColorPickerVisible(true);
  };

  /**
   * Confirm color selection from picker
   */
  const handleColorConfirm = (color) => {
    setIconColor(color);
    setColorPickerVisible(false);
  };

  /**
   * Cancel color selection
   */
  const handleColorCancel = () => {
    setColorPickerVisible(false);
  };

  /**
   * Get subscription status color
   */
  const getSubscriptionColor = () => {
    if (subscriptionStatus?.isActive) {
      // Yellow/orange for canceling, green for active
      if (subscriptionStatus?.cancelAtPeriodEnd) {
        return '#ff9800'; // Orange for canceling
      }
      return '#4caf50'; // Green for active
    }
    return '#ff9800'; // Orange for trial/inactive
  };

  /**
   * Get subscription status text
   */
  const getSubscriptionStatusText = () => {
    if (subscriptionStatus?.isActive) {
      // Check if subscription is scheduled for cancellation
      if (subscriptionStatus?.cancelAtPeriodEnd) {
        return 'Canceling';
      }
      return 'Active';
    }
    if (subscriptionStatus?.daysRemaining > 0) {
      return `Free Trial - ${subscriptionStatus.daysRemaining} days remaining`;
    }
    return 'No Active Subscription';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading account information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Profile Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Profile Information</Title>
          <Divider style={styles.divider} />

          <TouchableOpacity style={styles.avatarContainer} onPress={handleOpenColorPicker}>
            <Avatar.Text
              size={80}
              label={memberIcon || displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || '?'}
              style={[styles.avatar, { backgroundColor: iconColor }]}
              color={getContrastTextColor(iconColor)}
            />
            <Text style={styles.avatarHint}>Tap to change color</Text>
          </TouchableOpacity>

          <TextInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            style={styles.input}
            disabled={saving}
          />

          <TextInput
            label="Member Icon (emoji or letter)"
            value={memberIcon}
            onChangeText={setMemberIcon}
            mode="outlined"
            style={styles.input}
            maxLength={2}
            placeholder="e.g., 👤 or A"
            disabled={saving}
          />

          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailText}>{email}</Text>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        </Card.Content>
      </Card>

      {/* Subscription Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Subscription Status</Title>
          <Divider style={styles.divider} />

          <View style={[styles.statusBadge, { backgroundColor: getSubscriptionColor() }]}>
            <Text style={styles.statusText}>{getSubscriptionStatusText()}</Text>
          </View>

          <Text style={styles.subscriptionNote}>
            For full subscription management, billing history, and storage details, please visit the web admin portal.
          </Text>

          <Button
            mode="contained"
            onPress={handleOpenWebAdmin}
            style={styles.webAdminButton}
            icon="open-in-new"
          >
            Open Web Admin Portal
          </Button>
        </Card.Content>
      </Card>

      {/* Features Note */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Web Admin Features</Title>
          <Divider style={styles.divider} />
          <Text style={styles.featureText}>• Manage subscription and payment methods</Text>
          <Text style={styles.featureText}>• View billing history</Text>
          <Text style={styles.featureText}>• Track storage usage</Text>
          <Text style={styles.featureText}>• Export audit logs</Text>
          <Text style={styles.featureText}>• Advanced account settings</Text>
        </Card.Content>
      </Card>

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={iconColor}
        onConfirm={handleColorConfirm}
        onCancel={handleColorCancel}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#d32f2f',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  divider: {
    marginVertical: 12,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatar: {
    backgroundColor: '#6200ee',
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  emailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginTop: 8,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#6200ee',
  },
  statusBadge: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subscriptionNote: {
    fontSize: 14,
    color: '#666',
    marginVertical: 12,
    lineHeight: 20,
  },
  webAdminButton: {
    marginTop: 8,
    backgroundColor: '#03dac6',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
    lineHeight: 20,
  },
});
