/**
 * Message Group Settings Screen
 *
 * Allows admins to:
 * - Rename message group
 * - Add/remove members
 * - Delete (soft delete) message group
 * - Undelete hidden message groups
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  List,
  Divider,
  Text,
  Avatar,
  IconButton,
  Switch
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} MessageGroupSettingsScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * MessageGroupSettingsScreen component
 *
 * @param {MessageGroupSettingsScreenProps} props
 * @returns {JSX.Element}
 */
export default function MessageGroupSettingsScreen({ navigation, route }) {
  const { groupId, messageGroupId, messageGroupName } = route.params;

  const [name, setName] = useState(messageGroupName || '');
  const [originalName, setOriginalName] = useState(messageGroupName || '');
  const [currentMembers, setCurrentMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMember, setIsMember] = useState(true);
  const [currentUserMemberId, setCurrentUserMemberId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [usersCanDeleteOwnMessages, setUsersCanDeleteOwnMessages] = useState(true);
  const [originalUsersCanDelete, setOriginalUsersCanDelete] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadMessageGroupDetails();
      loadGroupMembers();
    }, [messageGroupId, groupId])
  );

  /**
   * Load message group details
   */
  const loadMessageGroupDetails = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/message-groups/${messageGroupId}`);
      const messageGroup = response.data.messageGroup;

      setName(messageGroup.name);
      setOriginalName(messageGroup.name);
      setIsHidden(messageGroup.isHidden || false);
      setUsersCanDeleteOwnMessages(messageGroup.usersCanDeleteOwnMessages !== undefined ? messageGroup.usersCanDeleteOwnMessages : true);
      setOriginalUsersCanDelete(messageGroup.usersCanDeleteOwnMessages !== undefined ? messageGroup.usersCanDeleteOwnMessages : true);

      // Set user role
      setUserRole(response.data.userRole);

      // Set current members
      const members = messageGroup.members.map(m => ({
        ...m.groupMember,
        groupMemberId: m.groupMemberId
      }));
      setCurrentMembers(members);

      // Check if current user is a member
      const currentGroupMemberId = response.data.currentGroupMemberId;
      setCurrentUserMemberId(currentGroupMemberId);
      const userIsMember = members.some(m => m.groupMemberId === currentGroupMemberId);
      setIsMember(userIsMember);
    } catch (err) {
      console.error('Load message group details error:', err);
      Alert.alert('Error', 'Failed to load message group details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all group members to show available members for adding
   */
  const loadGroupMembers = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setAvailableMembers(response.data.group.members || []);
    } catch (err) {
      console.error('Load group members error:', err);
    }
  };

  /**
   * Save name change
   */
  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Message group name cannot be empty');
      return;
    }

    if (name === originalName) {
      Alert.alert('Info', 'No changes to save');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/groups/${groupId}/message-groups/${messageGroupId}`, {
        name: name.trim()
      });

      setOriginalName(name.trim());
      Alert.alert('Success', 'Message group renamed successfully');
    } catch (err) {
      console.error('Rename error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to rename message group');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save users can delete own messages setting
   */
  const handleToggleUsersCanDelete = async (value) => {
    const previousValue = usersCanDeleteOwnMessages;
    setUsersCanDeleteOwnMessages(value); // Optimistic update

    try {
      await api.put(`/groups/${groupId}/message-groups/${messageGroupId}`, {
        usersCanDeleteOwnMessages: value
      });

      setOriginalUsersCanDelete(value);
    } catch (err) {
      console.error('Update setting error:', err);
      // Revert on error
      setUsersCanDeleteOwnMessages(previousValue);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update setting');
    }
  };

  /**
   * Add member to message group
   */
  const handleAddMember = async (memberId) => {
    try {
      await api.post(`/groups/${groupId}/message-groups/${messageGroupId}/members`, {
        memberIds: [memberId]
      });

      // Reload details to get updated member list
      loadMessageGroupDetails();
      Alert.alert('Success', 'Member added successfully');
    } catch (err) {
      console.error('Add member error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to add member');
    }
  };

  /**
   * Remove member from message group
   */
  const handleRemoveMember = async (memberId) => {
    const isRemovingSelf = memberId === currentUserMemberId;
    const alertTitle = isRemovingSelf ? 'Leave Message Group' : 'Remove Member';
    const alertMessage = isRemovingSelf
      ? 'Are you sure you want to leave this message group?'
      : 'Are you sure you want to remove this member from the message group?';

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isRemovingSelf ? 'Leave' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/groups/${groupId}/message-groups/${messageGroupId}/members/${memberId}`);

              if (isRemovingSelf) {
                // Navigate back to message groups list
                Alert.alert('Success', 'You have left the message group', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                // Reload details to get updated member list
                loadMessageGroupDetails();
                Alert.alert('Success', 'Member removed successfully');
              }
            } catch (err) {
              console.error('Remove member error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  /**
   * Soft delete message group
   */
  const handleDeleteMessageGroup = () => {
    Alert.alert(
      'Delete Message Group',
      'This will hide the message group and make it read-only. Admins can still see and undelete it. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/groups/${groupId}/message-groups/${messageGroupId}`);
              Alert.alert('Success', 'Message group deleted', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete message group');
            }
          }
        }
      ]
    );
  };

  /**
   * Undelete message group
   */
  const handleUndeleteMessageGroup = async () => {
    try {
      await api.post(`/groups/${groupId}/message-groups/${messageGroupId}/undelete`);
      setIsHidden(false);
      Alert.alert('Success', 'Message group restored');
    } catch (err) {
      console.error('Undelete error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to restore message group');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  // Get members that are not in the message group yet
  const membersNotInGroup = availableMembers.filter(
    am => !currentMembers.some(cm => cm.groupMemberId === am.groupMemberId)
  );

  return (
    <ScrollView style={styles.container}>
      {isHidden && (
        <View style={styles.hiddenBanner}>
          <Text style={styles.hiddenText}>
            This message group is hidden and read-only
          </Text>
          <Button mode="contained" onPress={handleUndeleteMessageGroup} style={styles.undeleteButton}>
            Restore Message Group
          </Button>
        </View>
      )}

      {!isMember && (
        <View style={styles.notMemberBanner}>
          <Text style={styles.notMemberText}>
            You are not a member of this message group. You can manage settings but cannot send messages.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Name</Text>
        <TextInput
          label="Message Group Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          disabled={isHidden}
        />
        <Button
          mode="contained"
          onPress={handleSaveName}
          loading={saving}
          disabled={saving || name === originalName || isHidden}
          style={styles.button}
        >
          Save Name
        </Button>
      </View>

      <Divider />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Users can delete their own messages</Text>
            <Text style={styles.settingHelpText}>
              When enabled, non-admin members can hide their own messages
            </Text>
          </View>
          <Switch
            value={usersCanDeleteOwnMessages}
            onValueChange={handleToggleUsersCanDelete}
            disabled={isHidden}
          />
        </View>
      </View>

      <Divider />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Members ({currentMembers.length})</Text>
        {currentMembers.map((member) => {
          const bgColor = member.iconColor || '#6200ee';
          return (
            <List.Item
              key={member.groupMemberId}
              title={member.displayName}
              description={member.role}
              left={() => (
                <Avatar.Text
                  size={40}
                  label={member.iconLetters || '?'}
                  style={{ backgroundColor: bgColor }}
                  color={getContrastTextColor(bgColor)}
                />
              )}
              right={() => (
                !isHidden && (
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => handleRemoveMember(member.groupMemberId)}
                  />
                )
              )}
            />
          );
        })}
      </View>

      <Divider />

      {!isHidden && membersNotInGroup.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Members</Text>
          {membersNotInGroup.map((member) => {
            const bgColor = member.iconColor || '#6200ee';
            return (
              <List.Item
                key={member.groupMemberId}
                title={member.displayName}
                description={member.role}
                left={() => (
                  <Avatar.Text
                    size={40}
                    label={member.iconLetters || '?'}
                    style={{ backgroundColor: bgColor }}
                    color={getContrastTextColor(bgColor)}
                  />
                )}
                right={() => (
                  <IconButton
                    icon="plus"
                    size={20}
                    onPress={() => handleAddMember(member.groupMemberId)}
                  />
                )}
              />
            );
          })}
        </View>
      )}

      {!isHidden && (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <Button
              mode="contained"
              onPress={handleDeleteMessageGroup}
              buttonColor="#d32f2f"
              style={styles.button}
            >
              Delete Message Group
            </Button>
            <Text style={styles.helperText}>
              This will hide the message group and make it read-only. You can restore it later.
            </Text>
          </View>
        </>
      )}
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
  hiddenBanner: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  hiddenText: {
    color: '#856404',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  undeleteButton: {
    backgroundColor: '#28a745',
  },
  notMemberBanner: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2196f3',
  },
  notMemberText: {
    color: '#1565c0',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  settingHelpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
