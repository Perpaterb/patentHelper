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
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Text, Avatar, Button, Chip } from 'react-native-paper';
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

  useEffect(() => {
    loadGroupInfo();
  }, [groupId]);

  /**
   * Refresh on screen focus
   */
  useFocusEffect(
    React.useCallback(() => {
      loadGroupInfo();
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
   * Navigate to Message Groups List
   */
  const goToMessages = () => {
    navigation.navigate('MessageGroupsList', { groupId });
  };

  /**
   * Navigate to Calendar section (placeholder for now)
   */
  const goToCalendar = () => {
    navigation.navigate('Calendar');
  };

  /**
   * Navigate to Finance section (placeholder for now)
   */
  const goToFinance = () => {
    navigation.navigate('Finance');
  };

  /**
   * Navigate to Group Settings
   */
  const goToSettings = () => {
    navigation.navigate('GroupSettings', { groupId });
  };

  /**
   * Navigate to Approvals (placeholder for now)
   */
  const goToApprovals = () => {
    // TODO: Implement ApprovalsListScreen
    console.log('Approvals - Coming soon');
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
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Messages</Text>
              <Text style={styles.navCardDescription}>
                Chat with group members
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

        {/* Finance Section */}
        <Card style={styles.navCard} onPress={goToFinance}>
          <Card.Content style={styles.navCardContent}>
            <View style={styles.navCardIcon}>
              <Text style={styles.navCardEmoji}>💰</Text>
            </View>
            <View style={styles.navCardInfo}>
              <Text style={styles.navCardTitle}>Finance</Text>
              <Text style={styles.navCardDescription}>
                Track expenses and payments
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Settings Section - Only for admins */}
        {groupInfo.userRole === 'admin' && (
          <Card style={styles.navCard} onPress={goToSettings}>
            <Card.Content style={styles.navCardContent}>
              <View style={styles.navCardIcon}>
                <Text style={styles.navCardEmoji}>⚙️</Text>
              </View>
              <View style={styles.navCardInfo}>
                <Text style={styles.navCardTitle}>Group Settings</Text>
                <Text style={styles.navCardDescription}>
                  Manage group and members
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
              </View>
              <View style={styles.navCardInfo}>
                <Text style={styles.navCardTitle}>Approvals</Text>
                <Text style={styles.navCardDescription}>
                  Pending admin approvals
                </Text>
              </View>
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
  },
  navCardEmoji: {
    fontSize: 24,
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
