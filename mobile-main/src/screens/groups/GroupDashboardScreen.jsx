/**
 * Group Dashboard Screen
 *
 * Central hub for a group showing overview and navigation to different sections:
 * - Group Settings
 * - Approvals
 * - Messages
 * - Calendar
 * - Finance
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Text, Avatar, Button, Chip, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} GroupDashboardScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * GroupDashboardScreen component
 *
 * @param {GroupDashboardScreenProps} props
 * @returns {JSX.Element}
 */
export default function GroupDashboardScreen({ navigation, route }) {
  const { groupId } = route.params;
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingFinanceCount, setPendingFinanceCount] = useState(0);
  const [currentUserGroupMemberId, setCurrentUserGroupMemberId] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0);

  useEffect(() => {
    loadGroupInfo();
    loadPendingApprovalsCount();
    loadPendingFinanceCount();
    loadMessageBadgeCounts();
  }, [groupId]);

  /**
   * Refresh on screen focus
   */
  useFocusEffect(
    React.useCallback(() => {
      loadGroupInfo();
      loadPendingApprovalsCount();
      loadPendingFinanceCount();
      loadMessageBadgeCounts();
    }, [groupId])
  );

  /**
   * Load group information
   */
  const loadGroupInfo = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}`);
      setGroupInfo(response.data.group);
      // Store current user's groupMemberId for finance count calculation
      const groupMemberId = response.data.group.currentUserMember?.groupMemberId || null;
      setCurrentUserGroupMemberId(groupMemberId);

      // Now load finance count after we have the groupMemberId
      if (groupMemberId) {
        await loadPendingFinanceCountWithMemberId(groupMemberId);
      }
    } catch (err) {
      console.error('Load group info error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupDashboard] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load pending approvals count
   */
  const loadPendingApprovalsCount = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/approvals`);
      // Count approvals in awaitingYourAction category
      const count = response.data.approvals?.awaitingYourAction?.length || 0;
      setPendingApprovalsCount(count);
    } catch (err) {
      console.error('Load pending approvals count error:', err);
      // Don't show error, just set count to 0
      setPendingApprovalsCount(0);
    }
  };

  /**
   * Load pending finance matters count with a specific groupMemberId
   * Only counts non-settled, non-canceled finance matters where user owes money
   */
  const loadPendingFinanceCountWithMemberId = async (groupMemberId) => {
    try {
      const response = await api.get(`/groups/${groupId}/finance-matters`);
      const financeMatters = response.data.financeMatters || [];

      // Count finance matters where:
      // 1. Not settled
      // 2. Not canceled
      // 3. User owes money (paidAmount < expectedAmount)
      const count = financeMatters.filter(fm => {
        if (fm.isSettled || fm.isCanceled) return false;

        // Find current user's member record in this finance matter
        const userMember = fm.members?.find(m => m.groupMemberId === groupMemberId);

        // If user is not a member of this finance matter, don't count it
        if (!userMember) return false;

        // Check if user owes money
        const paidAmount = parseFloat(userMember.paidAmount) || 0;
        const expectedAmount = parseFloat(userMember.expectedAmount) || 0;

        return paidAmount < expectedAmount;
      }).length;

      setPendingFinanceCount(count);
    } catch (err) {
      console.error('Load pending finance count error:', err);
      // Don't show error, just set count to 0
      setPendingFinanceCount(0);
    }
  };

  /**
   * Load pending finance matters count (wrapper for useFocusEffect)
   */
  const loadPendingFinanceCount = async () => {
    if (currentUserGroupMemberId) {
      await loadPendingFinanceCountWithMemberId(currentUserGroupMemberId);
    }
  };

  /**
   * Load message badge counts (aggregated from all message groups)
   * Sums up unread messages and mentions across all non-muted message groups
   */
  const loadMessageBadgeCounts = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/message-groups`);
      const messageGroups = response.data.messageGroups || [];

      // Aggregate counts across all message groups
      // Note: Backend already filters out muted message groups from counts
      const totalUnreadMessages = messageGroups.reduce((sum, mg) => sum + (mg.unreadCount || 0), 0);
      const totalUnreadMentions = messageGroups.reduce((sum, mg) => sum + (mg.unreadMentionsCount || 0), 0);

      setUnreadMessagesCount(totalUnreadMessages);
      setUnreadMentionsCount(totalUnreadMentions);
    } catch (err) {
      console.error('Load message badge counts error:', err);
      // Don't show error, just set counts to 0
      setUnreadMessagesCount(0);
      setUnreadMentionsCount(0);
    }
  };

  /**
   * Check if finance section is visible for current user's role
   */
  const isFinanceVisible = () => {
    if (!groupInfo || !groupInfo.settings) return false;

    const role = groupInfo.userRole;
    const settings = groupInfo.settings;

    // Admins always have access
    if (role === 'admin') return true;

    // Check role-based permissions
    if (role === 'parent') return settings.financeVisibleToParents;
    if (role === 'caregiver') return settings.financeVisibleToCaregivers;
    if (role === 'child') return settings.financeVisibleToChildren;

    return false;
  };

  /**
   * Navigate to Message Groups List
   */
  const goToMessages = () => {
    navigation.navigate('MessageGroupsList', { groupId });
  };

  /**
   * Navigate to Calendar section
   */
  const goToCalendar = () => {
    navigation.navigate('Calendar', { groupId });
  };

  /**
   * Navigate to Finance section
   */
  const goToFinance = () => {
    navigation.navigate('Finance', { groupId });
  };

  /**
   * Navigate to Group Settings
   */
  const goToSettings = () => {
    navigation.navigate('GroupSettings', { groupId });
  };

  /**
   * Navigate to Approvals
   */
  const goToApprovals = () => {
    navigation.navigate('ApprovalsList', { groupId });
  };

  /**
   * Navigate to Gift Registry
   */
  const goToGiftRegistry = () => {
    // TODO: Implement Gift Registry screen
    console.log('Navigate to Gift Registry');
  };

  /**
   * Navigate to Secret Santa
   */
  const goToSecretSanta = () => {
    // TODO: Implement Secret Santa screen
    console.log('Navigate to Secret Santa');
  };

  /**
   * Navigate to Library
   */
  const goToLibrary = () => {
    // TODO: Implement Library screen
    console.log('Navigate to Library');
  };

  /**
   * Navigate to Wiki
   */
  const goToWiki = () => {
    // TODO: Implement Wiki screen
    console.log('Navigate to Wiki');
  };

  /**
   * Navigate to Secure Documents
   */
  const goToSecureDocuments = () => {
    // TODO: Implement Secure Documents screen
    console.log('Navigate to Secure Documents');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading group...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadGroupInfo} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  if (!groupInfo) {
    return (
      <View style={styles.errorContainer}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Group Header */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Text
            size={64}
            label={groupInfo.icon || groupInfo.name[0]}
            style={[styles.avatar, { backgroundColor: groupInfo.backgroundColor || '#6200ee' }]}
            color={getContrastTextColor(groupInfo.backgroundColor || '#6200ee')}
          />
          <View style={styles.headerInfo}>
            <Title style={styles.groupName}>{groupInfo.name}</Title>
            <Text style={styles.memberCount}>
              {groupInfo.memberCount || 0} member{groupInfo.memberCount !== 1 ? 's' : ''}
            </Text>
            <Chip
              mode="outlined"
              style={styles.roleChip}
              textStyle={styles.roleText}
            >
              {groupInfo.userRole || 'Member'}
            </Chip>
          </View>
          {/* Settings Cog Icon - Only for admins */}
          {groupInfo.userRole === 'admin' && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={goToSettings}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>

      {/* Navigation Cards */}
      <View style={styles.sectionsContainer}>
        <Text style={styles.sectionTitle}>Group Sections</Text>

        {/* Messages Section */}
        <Card style={styles.navCard} onPress={goToMessages}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>💬</Text>
              {(unreadMentionsCount > 0 || unreadMessagesCount > 0) && (
                <View style={styles.badgesContainer}>
                  {unreadMentionsCount > 0 && (
                    <Badge size={20} style={styles.mentionBadge}>
                      {unreadMentionsCount}
                    </Badge>
                  )}
                  {unreadMessagesCount > 0 && (
                    <Badge size={20} style={styles.unreadBadge}>
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </View>
              )}
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Messages</Text>
              <Text style={styles.navCardDescription}>
                {unreadMentionsCount > 0 || unreadMessagesCount > 0
                  ? `${unreadMentionsCount > 0 ? `${unreadMentionsCount} @mention${unreadMentionsCount !== 1 ? 's' : ''}` : ''}${unreadMentionsCount > 0 && unreadMessagesCount > 0 ? ', ' : ''}${unreadMessagesCount > 0 ? `${unreadMessagesCount} unread` : ''}`
                  : 'Chat with group members'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Calendar Section */}
        <Card style={styles.navCard} onPress={goToCalendar}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>📅</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Calendar</Text>
              <Text style={styles.navCardDescription}>
                Shared events and schedules
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Finance Section - Show based on role permissions */}
        {isFinanceVisible() && (
          <Card style={styles.navCard} onPress={goToFinance}>
            <Card.Content style={styles.navCardContent}>
              <View style={styles.navCardIcon}>
                <Text style={styles.navCardEmoji}>💰</Text>
                {pendingFinanceCount > 0 && (
                  <Badge
                    size={20}
                    style={styles.financeBadge}
                  >
                    {pendingFinanceCount}
                  </Badge>
                )}
              </View>
              <View style={styles.navCardInfo}>
                <Text style={styles.navCardTitle}>Finance</Text>
                <Text style={styles.navCardDescription}>
                  {pendingFinanceCount > 0
                    ? `${pendingFinanceCount} unsettled matter${pendingFinanceCount !== 1 ? 's' : ''}`
                    : 'Track expenses and payments'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Approvals Section - Only for admins */}
        {groupInfo.userRole === 'admin' && (
          <Card style={styles.navCard} onPress={goToApprovals}>
            <Card.Content style={styles.navCardContent}>
              <View style={styles.navCardIcon}>
                <Text style={styles.navCardEmoji}>✅</Text>
                {pendingApprovalsCount > 0 && (
                  <Badge
                    size={20}
                    style={styles.approvalBadge}
                  >
                    {pendingApprovalsCount}
                  </Badge>
                )}
              </View>
              <View style={styles.navCardInfo}>
                <Text style={styles.navCardTitle}>Approvals</Text>
                <Text style={styles.navCardDescription}>
                  {pendingApprovalsCount > 0
                    ? `${pendingApprovalsCount} approval${pendingApprovalsCount !== 1 ? 's' : ''} need${pendingApprovalsCount === 1 ? 's' : ''} your action`
                    : 'Pending admin approvals'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Gift Registry Section */}
        <Card style={styles.navCard} onPress={goToGiftRegistry}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>🎁</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Gift Registry</Text>
              <Text style={styles.navCardDescription}>
                Wish lists and gift ideas
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Secret Santa Section */}
        <Card style={styles.navCard} onPress={goToSecretSanta}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>🎅</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Secret Santa</Text>
              <Text style={styles.navCardDescription}>
                Holiday gift exchange
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Library Section */}
        <Card style={styles.navCard} onPress={goToLibrary}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>📚</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Library</Text>
              <Text style={styles.navCardDescription}>
                Shared books and media
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Wiki Section */}
        <Card style={styles.navCard} onPress={goToWiki}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>📖</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Wiki</Text>
              <Text style={styles.navCardDescription}>
                Group knowledge base
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Secure Documents Section */}
        <Card style={styles.navCard} onPress={goToSecureDocuments}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>🔒</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Secure Documents</Text>
              <Text style={styles.navCardDescription}>
                Important files and records
              </Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  headerCard: {
    margin: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  roleText: {
    fontSize: 12,
    color: '#1976d2',
    textTransform: 'capitalize',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  sectionsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  navCard: {
    marginBottom: 12,
    elevation: 1,
  },
  navCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  navCardEmoji: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#d32f2f',
  },
  approvalBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e91e63',
  },
  financeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#d32f2f',
  },
  badgesContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    flexDirection: 'row',
    gap: 4,
  },
  mentionBadge: {
    backgroundColor: '#f9a825',
  },
  unreadBadge: {
    backgroundColor: '#2196f3',
  },
  navCardInfo: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  navCardDescription: {
    fontSize: 13,
    color: '#666',
  },
});
