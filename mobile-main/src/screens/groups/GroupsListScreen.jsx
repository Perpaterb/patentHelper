/**
 * Groups List Screen
 *
 * Displays all groups where the user is a member.
 * Allows navigation to group details and message threads.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Text, FAB, Avatar, Chip, Searchbar } from 'react-native-paper';
import api from '../../services/api';

/**
 * @typedef {Object} GroupsListScreenProps
 * @property {Object} navigation - React Navigation navigation object
 */

/**
 * GroupsListScreen component
 *
 * @param {GroupsListScreenProps} props
 * @returns {JSX.Element}
 */
export default function GroupsListScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [searchQuery, groups]);

  /**
   * Load groups from API
   */
  const loadGroups = async () => {
    try {
      setError(null);
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (err) {
      console.error('Load groups error:', err);
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroups();
  }, []);

  /**
   * Filter groups based on search query
   */
  const filterGroups = () => {
    if (!searchQuery.trim()) {
      setFilteredGroups(groups);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.displayName?.toLowerCase().includes(query)
    );
    setFilteredGroups(filtered);
  };

  /**
   * Navigate to group details
   */
  const handleGroupPress = (group) => {
    navigation.navigate('GroupDetail', { groupId: group.groupId });
  };

  /**
   * Navigate to create group screen
   */
  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  /**
   * Get role badge color
   */
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return '#6200ee';
      case 'parent':
        return '#03dac6';
      case 'child':
        return '#ffc107';
      case 'caregiver':
        return '#ff6f00';
      case 'supervisor':
        return '#757575';
      default:
        return '#666';
    }
  };

  /**
   * Render group item
   */
  const renderGroupItem = ({ item }) => (
    <Card
      style={[
        styles.groupCard,
        { borderLeftColor: item.backgroundColor || '#6200ee' }
      ]}
      onPress={() => handleGroupPress(item)}
    >
      <Card.Content style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Avatar.Text
            size={48}
            label={item.icon || item.name[0]}
            style={{ backgroundColor: item.backgroundColor || '#6200ee' }}
          />
          <View style={styles.groupInfo}>
            <Title style={styles.groupName}>{item.name}</Title>
            <Text style={styles.displayName}>{item.displayName}</Text>
          </View>
        </View>

        <View style={styles.groupFooter}>
          <Chip
            mode="outlined"
            style={{ backgroundColor: getRoleBadgeColor(item.role) }}
            textStyle={{ color: '#fff', fontSize: 12 }}
          >
            {item.role.toUpperCase()}
          </Chip>
          {item.isMuted && (
            <Chip
              mode="outlined"
              style={{ backgroundColor: '#757575', marginLeft: 8 }}
              textStyle={{ color: '#fff', fontSize: 12 }}
              icon="bell-off"
            >
              MUTED
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No groups found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Try a different search term' : 'Create your first group to get started'}
      </Text>
    </View>
  );

  /**
   * Render error state
   */
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{error}</Text>
      <Text style={styles.errorSubtext} onPress={loadGroups}>
        Tap to retry
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading groups...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search groups..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.groupId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        label="Create Group"
        onPress={handleCreateGroup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  groupCard: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
  },
  groupContent: {
    paddingVertical: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  displayName: {
    fontSize: 14,
    color: '#666',
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textDecoration: 'underline',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});
