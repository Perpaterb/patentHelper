/**
 * Gift Registry List Screen
 *
 * Displays all gift registries within a group.
 * Users can click on a registry to see items and manage the registry.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Text, FAB, IconButton, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

/**
 * @typedef {Object} GiftRegistryListScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * GiftRegistryListScreen component
 *
 * @param {GiftRegistryListScreenProps} props
 * @returns {JSX.Element}
 */
export default function GiftRegistryListScreen({ navigation, route }) {
  const { groupId } = route.params;
  const [registries, setRegistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentGroupMemberId, setCurrentGroupMemberId] = useState(null);

  useEffect(() => {
    loadGroupInfo();
  }, [groupId]);

  // Reload registries when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRegistries();
    }, [groupId])
  );

  /**
   * Load group information
   */
  const loadGroupInfo = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroupInfo(response.data.group);
      setUserRole(response.data.group?.userRole || null);
      setCurrentGroupMemberId(response.data.group?.currentGroupMemberId || null);
    } catch (err) {
      console.error('Load group info error:', err);
    }
  };

  /**
   * Load gift registries from API
   */
  const loadRegistries = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/gift-registries`);
      setRegistries(response.data.registries || []);
    } catch (err) {
      console.error('Load gift registries error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[GiftRegistryList] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load gift registries');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to registry detail screen
   */
  const handleRegistryPress = (registry) => {
    navigation.navigate('GiftRegistryDetail', {
      groupId: groupId,
      registryId: registry.registryId,
      registryName: registry.name,
    });
  };

  /**
   * Navigate to create registry screen
   */
  const handleCreateRegistry = () => {
    navigation.navigate('AddEditRegistry', {
      groupId: groupId,
      mode: 'create',
    });
  };

  /**
   * Handle delete registry
   */
  const handleDeleteRegistry = async (registryId, registryName) => {
    Alert.alert(
      'Delete Registry',
      `Are you sure you want to delete "${registryName}"? This will also delete all items in the registry.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/groups/${groupId}/gift-registries/${registryId}`);
              loadRegistries(); // Reload list after deletion
            } catch (err) {
              console.error('Delete registry error:', err);

              if (err.isAuthError) {
                console.log('[GiftRegistryList] Auth error detected - user will be logged out');
                return;
              }

              Alert.alert('Error', err.response?.data?.message || 'Failed to delete registry');
            }
          },
        },
      ]
    );
  };

  /**
   * Check if user can edit/delete a registry
   * Only creator or admins can edit/delete
   */
  const canEditRegistry = (registry) => {
    return registry.creatorId === currentGroupMemberId || userRole === 'admin';
  };

  /**
   * Get sharing type label
   */
  const getSharingTypeLabel = (sharingType) => {
    switch (sharingType) {
      case 'public':
        return 'Public';
      case 'passcode':
        return 'Passcode Protected';
      case 'group_only':
        return 'Group Only';
      default:
        return sharingType;
    }
  };

  /**
   * Get sharing type color
   */
  const getSharingTypeColor = (sharingType) => {
    switch (sharingType) {
      case 'public':
        return '#4CAF50'; // Green
      case 'passcode':
        return '#FF9800'; // Orange
      case 'group_only':
        return '#2196F3'; // Blue
      default:
        return '#999';
    }
  };

  /**
   * Render registry card
   */
  const renderRegistry = ({ item }) => {
    const canEdit = canEditRegistry(item);
    const itemCount = item.itemCount || 0;

    return (
      <TouchableOpacity
        onPress={() => handleRegistryPress(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.registryInfo}>
                <View style={styles.titleRow}>
                  <Title style={styles.registryName}>{item.name}</Title>
                  {canEdit && (
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#f44336"
                      onPress={() => handleDeleteRegistry(item.registryId, item.name)}
                      style={styles.deleteButton}
                    />
                  )}
                </View>

                <View style={styles.infoRow}>
                  <Chip
                    icon="gift"
                    style={[styles.chip, { backgroundColor: getSharingTypeColor(item.sharingType) + '20' }]}
                    textStyle={[styles.chipText, { color: getSharingTypeColor(item.sharingType) }]}
                  >
                    {getSharingTypeLabel(item.sharingType)}
                  </Chip>

                  <Text style={styles.itemCount}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                {item.sharingType === 'passcode' && item.passcode && (
                  <Text style={styles.passcode}>Passcode: {item.passcode}</Text>
                )}

                <Text style={styles.createdBy}>
                  Created by {item.creator?.displayName || 'Unknown'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading registries...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {registries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No gift registries yet</Text>
          <Text style={styles.emptySubtext}>
            Create your first gift registry to start sharing wish lists
          </Text>
        </View>
      ) : (
        <FlatList
          data={registries}
          renderItem={renderRegistry}
          keyExtractor={(item) => item.registryId}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleCreateRegistry}
        label="New Registry"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  registryInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  registryName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    margin: 0,
    marginRight: -8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  chip: {
    height: 28,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  passcode: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 4,
  },
  createdBy: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    padding: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});
