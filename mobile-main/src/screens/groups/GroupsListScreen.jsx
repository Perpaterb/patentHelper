/**
 * Groups List Screen
 *
 * Displays all groups where the user is a member.
 * Allows navigation to group details and message threads.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Text, FAB, Avatar, Chip, Searchbar, IconButton, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

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
  const [invitationCount, setInvitationCount] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    loadGroups(true); // Show loading spinner on initial mount
    loadInvitationCount();
  }, []);

  /**
   * Set up header buttons (My Account left, Search + Invitations right)
   */
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={{ position: 'relative', marginRight: 0, marginTop: -3, justifyContent: 'center' }}>
          <IconButton
            icon="account-circle"
            iconColor="#fff"
            size={28}
            onPress={() => navigation.navigate('MyAccount')}
            style={{ margin: 0 }}
          />
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Search Toggle Button */}
          <View style={{ position: 'relative', marginRight: 0, marginTop: -4, justifyContent: 'center' }}>
            <IconButton
              icon="magnify"
              iconColor="#fff"
              size={28}
              onPress={() => {
                setSearchVisible(!searchVisible);
                if (searchVisible) {
                  // Clear search when hiding
                  setSearchQuery('');
                }
              }}
              style={{ margin: 0 }}
            />
          </View>

          {/* Invitations Button */}
          <View style={{ position: 'relative', marginRight: 0, marginTop: -4, justifyContent: 'center' }}>
            <IconButton
              icon="email"
              iconColor="#fff"
              size={28}
              onPress={() => navigation.navigate('Invites')}
              style={{ margin: 0 }}
            />
            {invitationCount > 0 && (
              <Badge
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: '#d32f2f',
                  pointerEvents: 'none',
                }}
                size={16}
              >
                {invitationCount}
              </Badge>
            )}
          </View>
        </View>
      ),
    });
  }, [navigation, invitationCount, searchVisible]);

  useEffect(() => {
    filterGroups();
  }, [searchQuery, groups]);

  /**
   * Refresh groups list when screen comes into focus
   * This ensures newly created groups appear immediately
   */
  useFocusEffect(
    useCallback(() => {
      loadGroups();
      loadInvitationCount();
    }, [])
  );

  /**
   * Load groups from API
   */
  const loadGroups = async (showLoader = false) => {
    try {
      setError(null);
      // Only show loading spinner on initial load, not on focus refresh
      if (showLoader && groups.length === 0) {
        setLoading(true);
      }
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (err) {
      console.error('Load groups error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupsList] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load invitation count from API
   */
  const loadInvitationCount = async () => {
    try {
      const response = await api.get('/invitations/count');
      setInvitationCount(response.data.count || 0);
    } catch (err) {
      console.error('Load invitation count error:', err);
      // Don't show error, just set count to 0
      setInvitationCount(0);
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
      group.name.toLowerCase().includes(query)
    );
    setFilteredGroups(filtered);
  };

  /**
   * Navigate to group dashboard
   */
  const handleGroupPress = (group) => {
    navigation.navigate('GroupDashboard', { groupId: group.groupId });
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
   * Handle pin/unpin group
   */
  const handlePinToggle = async (groupId, isPinned, event) => {
    // Stop event propagation to prevent navigating to group
    event?.stopPropagation?.();

    try {
      if (isPinned) {
        await api.put(`/groups/${groupId}/unpin`);
      } else {
        await api.put(`/groups/${groupId}/pin`);
      }

      // Reload groups to show updated pin status
      loadGroups();
    } catch (err) {
      console.error('Pin toggle error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupsList] Auth error detected - user will be logged out');
        return;
      }
    }
  };

  /**
   * Handle mute/unmute group
   */
  const handleMuteToggle = async (groupId, isMuted, event) => {
    // Stop event propagation to prevent navigating to group
    event?.stopPropagation?.();

    try {
      if (isMuted) {
        await api.put(`/groups/${groupId}/unmute`);
      } else {
        await api.put(`/groups/${groupId}/mute`);
      }

      // Reload groups to show updated mute status
      loadGroups();
    } catch (err) {
      console.error('Mute toggle error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupsList] Auth error detected - user will be logged out');
        return;
      }
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
            color={getContrastTextColor(item.backgroundColor || '#6200ee')}
          />
          <View style={styles.groupInfo}>
            <Title style={styles.groupName}>{item.name}</Title>
          </View>
          <IconButton
            icon="pin"
            size={20}
            iconColor={item.isPinned ? '#6200ee' : '#ccc'}
            onPress={(e) => handlePinToggle(item.groupId, item.isPinned, e)}
            style={styles.pinButton}
          />
        </View>

        <View style={styles.groupFooter}>
          <View style={styles.groupFooterLeft}>
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
            {/* Badge counts */}
            {(item.unreadMentionsCount > 0 || item.unreadMessagesCount > 0 || item.pendingApprovalsCount > 0 || item.pendingFinanceCount > 0) && (
              <View style={styles.badgesRow}>
                {item.unreadMentionsCount > 0 && (
                  <Badge size={20} style={styles.mentionBadge}>
                    {item.unreadMentionsCount}
                  </Badge>
                )}
                {item.unreadMessagesCount > 0 && (
                  <Badge size={20} style={styles.unreadBadge}>
                    {item.unreadMessagesCount}
                  </Badge>
                )}
                {item.pendingApprovalsCount > 0 && (
                  <Badge size={20} style={styles.approvalBadge}>
                    {item.pendingApprovalsCount}
                  </Badge>
                )}
                {item.pendingFinanceCount > 0 && (
                  <Badge size={20} style={styles.financeBadge}>
                    {item.pendingFinanceCount}
                  </Badge>
                )}
              </View>
            )}
          </View>
          <IconButton
            icon={item.isMuted ? 'ear-hearing-off' : 'ear-hearing'}
            size={20}
            iconColor={item.isMuted ? '#ccc' : '#6200ee'}
            onPress={(e) => handleMuteToggle(item.groupId, item.isMuted, e)}
            style={styles.muteButton}
          />
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
      {searchVisible && (
        <Searchbar
          placeholder="Search groups..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      )}

      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.groupId}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: searchVisible ? 0 : 16 }
        ]}
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
  },
  pinButton: {
    margin: 0,
    marginTop: -8,
  },
  groupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  muteButton: {
    margin: 0,
    marginTop: -8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  mentionBadge: {
    backgroundColor: '#f9a825',
  },
  unreadBadge: {
    backgroundColor: '#2196f3',
  },
  approvalBadge: {
    backgroundColor: '#e91e63',
  },
  financeBadge: {
    backgroundColor: '#d32f2f',
  },
  calendarBadge: {
    backgroundColor: '#9c27b0',
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
