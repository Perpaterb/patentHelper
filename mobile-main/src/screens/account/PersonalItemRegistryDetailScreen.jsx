/**
 * Personal Item Registry Detail Screen
 *
 * Displays a single personal item registry with all its items.
 * Users can view sharing information and manage items.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Text, Button, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

/**
 * @typedef {Object} PersonalItemRegistryDetailScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * PersonalItemRegistryDetailScreen component
 *
 * @param {PersonalItemRegistryDetailScreenProps} props
 * @returns {JSX.Element}
 */
export default function PersonalItemRegistryDetailScreen({ navigation, route }) {
  const { registryId, registryName, sharingType, onUpdate } = route.params;
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set screen title
  useEffect(() => {
    navigation.setOptions({
      title: registryName || 'Item Registry',
    });
  }, [navigation, registryName]);

  // Reload registry when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRegistry();
    }, [registryId])
  );

  /**
   * Load item registry from API
   */
  const loadRegistry = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/users/personal-registries/item-registries/${registryId}`);
      setRegistry(response.data.registry);
    } catch (err) {
      console.error('Load registry error:', err);

      if (err.isAuthError) {
        console.log('[PersonalItemRegistryDetail] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get sharing type display text
   */
  const getSharingTypeText = (type) => {
    if (type === 'external_link') {
      return 'Public Link';
    }
    if (type === 'external_link_passcode') {
      return 'Link with Passcode';
    }
    return type;
  };

  /**
   * Get sharing type color
   */
  const getSharingTypeColor = (type) => {
    if (type === 'external_link') {
      return '#4caf50'; // Green for public
    }
    if (type === 'external_link_passcode') {
      return '#ff9800'; // Orange for passcode protected
    }
    return '#666';
  };

  /**
   * Handle reset passcode
   */
  const handleResetPasscode = async () => {
    Alert.alert(
      'Reset Passcode',
      'This will generate a new 6-digit passcode for this registry. The old passcode will no longer work.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post(`/users/personal-registries/item-registries/${registryId}/reset-passcode`);
              Alert.alert(
                'Passcode Reset',
                `New passcode: ${response.data.passcode}\n\nPlease save this passcode and share it with people who need access to this registry.`,
                [{ text: 'OK', onPress: loadRegistry }]
              );
            } catch (err) {
              console.error('Reset passcode error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to reset passcode');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading registry...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadRegistry} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  if (!registry) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Registry not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Registry Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>{registry.name}</Title>
            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sharing:</Text>
              <Chip
                style={[styles.sharingChip, { backgroundColor: getSharingTypeColor(registry.sharingType) }]}
                textStyle={styles.sharingText}
              >
                {getSharingTypeText(registry.sharingType)}
              </Chip>
            </View>

            {registry.sharingType === 'external_link_passcode' && registry.passcode && (
              <View style={styles.passcodeContainer}>
                <Text style={styles.passcodeLabel}>Passcode:</Text>
                <Text style={styles.passcodeValue}>{registry.passcode}</Text>
                <Button
                  mode="outlined"
                  onPress={handleResetPasscode}
                  icon="refresh"
                  style={styles.resetButton}
                  compact
                >
                  Reset Passcode
                </Button>
              </View>
            )}

            {registry.webToken && (
              <View style={styles.linkContainer}>
                <Text style={styles.linkLabel}>Share Link:</Text>
                <Text style={styles.linkValue} selectable>
                  {`https://parentinghelperapp.com/registry/${registry.webToken}`}
                </Text>
                <Text style={styles.linkHint}>
                  Anyone with this link {registry.sharingType === 'external_link_passcode' ? 'and passcode ' : ''}
                  can view this registry
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Items:</Text>
              <Text style={styles.infoValue}>{registry.items?.length || 0}</Text>
            </View>

            {registry.linkedToGroups && registry.linkedToGroups.length > 0 && (
              <View style={styles.linkedGroupsContainer}>
                <Text style={styles.linkedGroupsLabel}>Linked to Groups:</Text>
                {registry.linkedToGroups.map((group, index) => (
                  <Chip key={index} style={styles.groupChip}>
                    {group.groupName}
                  </Chip>
                ))}
              </View>
            )}

            <Text style={styles.createdDate}>
              Created: {new Date(registry.createdAt).toLocaleDateString()}
            </Text>
          </Card.Content>
        </Card>

        {/* Items Section - Placeholder */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Registry Items</Title>
            <Divider style={styles.divider} />

            {(!registry.items || registry.items.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No items in this registry yet.</Text>
                <Text style={styles.emptyHint}>
                  Item management will be available in a future update.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                <Text style={styles.itemsPlaceholder}>
                  This registry has {registry.items.length} item(s). Full item management will be available in a future update.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  sharingChip: {
    height: 28,
  },
  sharingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  passcodeContainer: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  passcodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  passcodeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 4,
    marginBottom: 8,
  },
  resetButton: {
    marginTop: 8,
  },
  linkContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  linkValue: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  linkHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  linkedGroupsContainer: {
    marginBottom: 12,
  },
  linkedGroupsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  groupChip: {
    marginBottom: 4,
    marginRight: 4,
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  itemsList: {
    padding: 12,
  },
  itemsPlaceholder: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
