/**
 * Invites Screen
 *
 * Shows pending group invitations for the current user.
 * Users can accept or decline invitations.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  Chip,
  Avatar,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

/**
 * @typedef {Object} InvitesScreenProps
 * @property {Object} navigation - React Navigation navigation object
 */

/**
 * InvitesScreen component
 *
 * @param {InvitesScreenProps} props
 * @returns {JSX.Element}
 */
export default function InvitesScreen({ navigation }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingInvite, setProcessingInvite] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  /**
   * Refresh on screen focus
   */
  useFocusEffect(
    React.useCallback(() => {
      loadInvitations();
    }, [])
  );

  /**
   * Load pending invitations
   */
  const loadInvitations = async () => {
    try {
      setError(null);
      const response = await api.get('/invitations');
      setInvitations(response.data.invitations || []);
    } catch (err) {
      console.error('Load invitations error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[Invites] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle accepting an invitation
   */
  const handleAccept = async (invitation) => {
    try {
      setProcessingInvite(invitation.groupMemberId);

      await api.post(`/invitations/${invitation.groupMemberId}/accept`);

      Alert.alert(
        'Invitation Accepted',
        `You've joined ${invitation.groupName} as a ${invitation.role}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh invitations list
              loadInvitations();
              // Optionally navigate to the group
              // navigation.navigate('GroupDashboard', { groupId: invitation.groupId });
            },
          },
        ]
      );
    } catch (err) {
      console.error('Accept invitation error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[Invites] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to accept invitation';
      Alert.alert('Error', errorMessage);
    } finally {
      setProcessingInvite(null);
    }
  };

  /**
   * Handle declining an invitation
   */
  const handleDecline = async (invitation) => {
    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to join ${invitation.groupName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingInvite(invitation.groupMemberId);

              await api.post(`/invitations/${invitation.groupMemberId}/decline`);

              // Refresh invitations list
              await loadInvitations();
            } catch (err) {
              console.error('Decline invitation error:', err);

              // Don't show error if it's an auth error - logout happens automatically
              if (err.isAuthError) {
                console.log('[Invites] Auth error detected - user will be logged out');
                return;
              }

              const errorMessage =
                err.response?.data?.message || err.message || 'Failed to decline invitation';
              Alert.alert('Error', errorMessage);
            } finally {
              setProcessingInvite(null);
            }
          },
        },
      ]
    );
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

  return (
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="Invitations"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadInvitations} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      ) : invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Pending Invitations</Text>
          <Text style={styles.emptyText}>
            You don't have any group invitations at the moment.
          </Text>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Back to Groups
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <Text style={styles.headerText}>
          You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
        </Text>

        {invitations.map((invitation) => (
          <Card key={invitation.groupMemberId} style={styles.invitationCard}>
            <Card.Content>
              <View style={styles.invitationHeader}>
                <Avatar.Text
                  size={48}
                  label={invitation.groupIcon || invitation.groupName[0]}
                  style={[
                    styles.groupAvatar,
                    { backgroundColor: invitation.groupBackgroundColor || '#6200ee' },
                  ]}
                  color={getContrastTextColor(invitation.groupBackgroundColor || '#6200ee')}
                />
                <View style={styles.invitationInfo}>
                  <Title style={styles.groupName}>{invitation.groupName}</Title>
                  <Text style={styles.invitedBy}>
                    Invited by {invitation.invitedByName || 'an admin'}
                  </Text>
                </View>
              </View>

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>Role:</Text>
                <Chip
                  mode="flat"
                  style={{ backgroundColor: getRoleBadgeColor(invitation.role) }}
                  textStyle={{ color: '#fff', fontSize: 12 }}
                >
                  {invitation.role.toUpperCase()}
                </Chip>
              </View>

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => handleAccept(invitation)}
                  loading={processingInvite === invitation.groupMemberId}
                  disabled={processingInvite !== null}
                  style={styles.acceptButton}
                >
                  Accept
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleDecline(invitation)}
                  disabled={processingInvite !== null}
                  style={styles.declineButton}
                  textColor="#d32f2f"
                >
                  Decline
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
        </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginTop: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  invitationCard: {
    marginBottom: 16,
    elevation: 2,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupAvatar: {
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invitedBy: {
    fontSize: 13,
    color: '#666',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    marginRight: 8,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
    borderColor: '#d32f2f',
  },
});
