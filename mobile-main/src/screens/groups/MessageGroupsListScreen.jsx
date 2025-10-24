/**
 * Message Groups List Screen
 *
 * Displays all message groups within a group.
 * Users can click on a message group to see messages.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Title, Text, FAB, Avatar, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} MessageGroupsListScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * MessageGroupsListScreen component
 *
 * @param {MessageGroupsListScreenProps} props
 * @returns {JSX.Element}
 */
export default function MessageGroupsListScreen({ navigation, route }) {
  const { groupId } = route.params;
  const [messageGroups, setMessageGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);

  useEffect(() => {
    loadGroupInfo();
  }, [groupId]);

  // Reload message groups when screen comes into focus (e.g., after creating a new message group)
  useFocusEffect(
    React.useCallback(() => {
      loadMessageGroups();
    }, [groupId])
  );

  /**
   * Load group information
   */
  const loadGroupInfo = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroupInfo(response.data.group);
    } catch (err) {
      console.error('Load group info error:', err);
    }
  };

  /**
   * Load message groups from API
   */
  const loadMessageGroups = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/message-groups`);
      setMessageGroups(response.data.messageGroups || []);
    } catch (err) {
      console.error('Load message groups error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[MessageGroupsList] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load message groups');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to messages screen
   */
  const handleMessageGroupPress = (messageGroup) => {
    navigation.navigate('GroupMessages', {
      groupId: groupId,
      messageGroupId: messageGroup.messageGroupId,
      messageGroupName: messageGroup.name,
    });
  };

  /**
   * Navigate to create message group screen
   */
  const handleCreateMessageGroup = () => {
    navigation.navigate('CreateMessageGroup', {
      groupId: groupId,
    });
  };

  /**
   * Format last message time
   */
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return 'No messages yet';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  /**
   * Render message group card
   */
  const renderMessageGroup = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleMessageGroupPress(item)}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.groupInfo}>
              <Title style={styles.groupName}>{item.name}</Title>
              <Text style={styles.memberCount}>
                {item._count?.members || 0} members
              </Text>
            </View>
            <View style={styles.badgeContainer}>
              {item.unreadMentionsCount > 0 && (
                <Chip mode="outlined" style={styles.mentionBadge} textStyle={styles.mentionBadgeText}>
                  @ {item.unreadMentionsCount}
                </Chip>
              )}
              {item.unreadCount > 0 && (
                <Chip mode="outlined" style={styles.unreadCount}>
                  {item.unreadCount}
                </Chip>
              )}
            </View>
          </View>

          <Text style={styles.lastMessage}>
            {formatLastMessageTime(item.lastMessageAt)}
          </Text>

          <View style={styles.membersRow}>
            {item.members?.slice(0, 5).map((member, index) => {
              const bgColor = member.groupMember?.iconColor || '#6200ee';
              return (
                <Avatar.Text
                  key={member.groupMemberId}
                  size={32}
                  label={member.groupMember?.iconLetters || '?'}
                  style={{
                    backgroundColor: bgColor,
                    marginLeft: index > 0 ? -6 : 0,
                  }}
                  color={getContrastTextColor(bgColor)}
                />
              );
            })}
            {item.members?.length > 5 && (
              <Text style={styles.moreMembersText}>
                +{item.members.length - 5}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No message groups yet</Text>
      <Text style={styles.emptySubtext}>
        Create a message group to start communicating with group members
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading message groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={messageGroups}
        renderItem={renderMessageGroup}
        keyExtractor={(item) => item.messageGroupId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        label="New Message Group"
        onPress={handleCreateMessageGroup}
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
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 13,
    color: '#666',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mentionBadge: {
    backgroundColor: '#fff9c4',
    borderColor: '#f9a825',
  },
  mentionBadgeText: {
    color: '#f57f17',
    fontWeight: 'bold',
  },
  unreadCount: {
    backgroundColor: '#2196f3',
    borderColor: '#1976d2',
  },
  lastMessage: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  memberAvatar: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreMembersText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
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
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
});
