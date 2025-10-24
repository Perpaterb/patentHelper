/**
 * Group Settings Screen
 *
 * Allows admins to manage group settings and members.
 * Regular members can view group info and members list.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Title,
  Text,
  Avatar,
  List,
  Button,
  Chip,
  IconButton,
  Divider,
  Switch,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} GroupSettingsScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * GroupSettingsScreen component
 *
 * @param {GroupSettingsScreenProps} props
 * @returns {JSX.Element}
 */
export default function GroupSettingsScreen({ navigation, route }) {
  const { groupId } = route.params;
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Group settings state
  const [groupSettings, setGroupSettings] = useState(null);
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadGroupDetails();
    // Load settings if user is admin (will be checked in loadGroupSettings)
    loadGroupSettings();
    loadAdminPermissions();
  }, [groupId]);

  /**
   * Refresh on screen focus
   */
  useFocusEffect(
    React.useCallback(() => {
      loadGroupDetails();
    }, [groupId])
  );

  /**
   * Load group details and members
   */
  const loadGroupDetails = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}`);
      const group = response.data.group;

      setGroupInfo({
        groupId: group.groupId,
        name: group.name,
        icon: group.icon,
        backgroundColor: group.backgroundColor,
        createdAt: group.createdAt,
      });
      setMembers(group.members || []);
      setUserRole(group.userRole);
      setCurrentUserId(group.currentUserId);
    } catch (err) {
      console.error('Load group details error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupSettings] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load group settings (permissions)
   */
  const loadGroupSettings = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/settings`);
      if (response.data.success) {
        setGroupSettings(response.data.settings);
      }
    } catch (err) {
      console.error('Load group settings error:', err);
      // Non-blocking error - settings section will just not appear for non-admins
    }
  };

  /**
   * Load admin permissions (for auto-approval settings)
   */
  const loadAdminPermissions = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/admin-permissions`);
      if (response.data.success) {
        setAdminPermissions(response.data.admins || []);
      }
    } catch (err) {
      console.error('Load admin permissions error:', err);
      // Non-blocking error - admin permissions section will just not appear for non-admins
    }
  };

  /**
   * Handle settings toggle
   */
  const handleToggleSetting = (key, value) => {
    setGroupSettings(prev => ({
      ...prev,
      [key]: value,
    }));

    // Enforce dependency: If finance visible is turned off, turn off finance creatable
    if (key === 'financeVisibleToParents' && !value) {
      setGroupSettings(prev => ({ ...prev, financeCreatableByParents: false }));
    }
    if (key === 'financeVisibleToCaregivers' && !value) {
      setGroupSettings(prev => ({ ...prev, financeCreatableByCaregivers: false }));
    }
    if (key === 'financeVisibleToChildren' && !value) {
      setGroupSettings(prev => ({ ...prev, financeCreatableByChildren: false }));
    }
  };

  /**
   * Handle admin permission toggle
   */
  const handleToggleAdminPermission = async (targetAdminId, permissionKey, value) => {
    try {
      await api.put(`/groups/${groupId}/admin-permissions/${targetAdminId}`, {
        [permissionKey]: value,
      });

      // Update local state
      setAdminPermissions(prev =>
        prev.map(admin =>
          admin.userId === targetAdminId
            ? { ...admin, [permissionKey]: value }
            : admin
        )
      );
    } catch (err) {
      console.error('Update admin permission error:', err);

      if (err.isAuthError) {
        console.log('[GroupSettings] Auth error detected - user will be logged out');
        return;
      }

      Alert.alert('Error', err.response?.data?.message || 'Failed to update permission');
    }
  };

  /**
   * Save group settings
   */
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);

      await api.put(`/groups/${groupId}/settings`, groupSettings);

      Alert.alert('Success', 'Group settings saved successfully');
    } catch (err) {
      console.error('Save group settings error:', err);

      if (err.isAuthError) {
        console.log('[GroupSettings] Auth error detected - user will be logged out');
        return;
      }

      Alert.alert('Error', err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  /**
   * Navigate to edit group screen
   */
  const handleEditGroup = () => {
    navigation.navigate('EditGroup', {
      groupId: groupInfo.groupId,
      groupName: groupInfo.name,
      groupIcon: groupInfo.icon,
      groupColor: groupInfo.backgroundColor,
    });
  };

  /**
   * Navigate to invite member screen
   */
  const handleInviteMember = () => {
    navigation.navigate('InviteMember', { groupId });
  };

  /**
   * Handle member press (show options for admin)
   */
  const handleMemberPress = (member) => {
    if (userRole !== 'admin') {
      return; // Regular members can't manage other members
    }

    // Prevent admins from managing their own role
    if (member.userId === currentUserId) {
      return; // Can't change your own role
    }

    // Show member options (change role, remove)
    Alert.alert(
      member.displayName,
      'Member management options',
      [
        {
          text: 'Change Role',
          onPress: () => handleChangeRole(member),
        },
        {
          text: 'Remove from Group',
          onPress: () => handleRemoveMember(member),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  /**
   * Handle change member role
   */
  const handleChangeRole = (member) => {
    const roles = [
      { label: 'Admin', value: 'admin' },
      { label: 'Parent', value: 'parent' },
      { label: 'Child', value: 'child' },
      { label: 'Caregiver', value: 'caregiver' },
      { label: 'Supervisor', value: 'supervisor' },
    ];

    // Create alert with role options
    const buttons = roles.map(role => ({
      text: role.label,
      onPress: () => confirmChangeRole(member, role.value),
    }));
    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Change Role',
      `Select new role for ${member.displayName || member.email}`,
      buttons
    );
  };

  /**
   * Confirm and execute role change
   */
  const confirmChangeRole = async (member, newRole) => {
    try {
      await api.put(`/groups/${groupId}/members/${member.userId}/role`, {
        role: newRole,
      });

      Alert.alert('Success', `Role changed to ${newRole}`);
      loadGroupDetails(); // Reload to show updated role
    } catch (err) {
      console.error('Change role error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupSettings] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to change role';
      Alert.alert('Error', errorMessage);
    }
  };

  /**
   * Handle remove member
   */
  const handleRemoveMember = (member) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.displayName || member.email} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => confirmRemoveMember(member),
        },
      ]
    );
  };

  /**
   * Confirm and execute member removal
   */
  const confirmRemoveMember = async (member) => {
    try {
      await api.delete(`/groups/${groupId}/members/${member.userId}`);

      Alert.alert('Success', 'Member removed from group');
      loadGroupDetails(); // Reload to show updated member list
    } catch (err) {
      console.error('Remove member error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupSettings] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to remove member';
      Alert.alert('Error', errorMessage);
    }
  };

  /**
   * Handle leave group
   */
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${groupInfo?.name}"? You will need to be re-invited to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: confirmLeaveGroup,
        },
      ]
    );
  };

  /**
   * Confirm and execute leave group
   */
  const confirmLeaveGroup = async () => {
    try {
      await api.post(`/groups/${groupId}/leave`);

      Alert.alert(
        'Success',
        'You have left the group',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Groups'),
          },
        ]
      );
    } catch (err) {
      console.error('Leave group error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[GroupSettings] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to leave group';
      Alert.alert('Error', errorMessage);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading group settings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadGroupDetails} style={styles.retryButton}>
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
      {/* Group Info Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.groupHeader}>
            <Avatar.Text
              size={64}
              label={groupInfo.icon || groupInfo.name[0]}
              style={[styles.avatar, { backgroundColor: groupInfo.backgroundColor || '#6200ee' }]}
              color={getContrastTextColor(groupInfo.backgroundColor || '#6200ee')}
            />
            <View style={styles.groupHeaderInfo}>
              <Title style={styles.groupName}>{groupInfo.name}</Title>
              <Text style={styles.memberCount}>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {userRole === 'admin' && (
            <Button
              mode="outlined"
              icon="pencil"
              onPress={handleEditGroup}
              style={styles.editButton}
            >
              Edit Group Details
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Members Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Members</Title>
            {userRole === 'admin' && (
              <IconButton
                icon="account-plus"
                mode="contained"
                iconColor="#fff"
                containerColor="#6200ee"
                size={20}
                onPress={handleInviteMember}
              />
            )}
          </View>

          {userRole === 'admin' && (
            <Text style={styles.memberNote}>
              It is recommended that all people that supervise a child are added as a member of the group regardless of if they use this app or not. Schools and institutions that look after a child don't need to be added.
            </Text>
          )}

          <Divider style={styles.divider} />

          {members.map((member, index) => (
            <List.Item
              key={member.userId}
              title={member.email || 'No email'}
              description={member.displayName}
              onPress={() => handleMemberPress(member)}
              left={(props) => (
                <Avatar.Text
                  {...props}
                  size={40}
                  label={member.iconLetters || member.displayName?.[0] || 'U'}
                  style={{ backgroundColor: member.iconColor || '#6200ee' }}
                  color={getContrastTextColor(member.iconColor || '#6200ee')}
                />
              )}
              right={() => (
                <Chip
                  mode="flat"
                  style={{ backgroundColor: getRoleBadgeColor(member.role) }}
                  textStyle={{ color: '#fff', fontSize: 12 }}
                >
                  {member.role.toUpperCase()}
                </Chip>
              )}
              style={[
                styles.memberItem,
                index < members.length - 1 && styles.memberItemBorder,
              ]}
            />
          ))}
        </Card.Content>
      </Card>

      {/* Group Permissions Section (Admin Only) */}
      {userRole === 'admin' && groupSettings && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Group Permissions</Title>
            <Divider style={styles.divider} />

            {/* Message Groups Permissions */}
            <Text style={styles.subsectionTitle}>Message Groups</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Parents can create message groups</Text>
              <Switch
                value={groupSettings.parentsCreateMessageGroups ?? true}
                onValueChange={(value) => handleToggleSetting('parentsCreateMessageGroups', value)}
                disabled={savingSettings}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Children can create message groups</Text>
              <Switch
                value={groupSettings.childrenCreateMessageGroups ?? false}
                onValueChange={(value) => handleToggleSetting('childrenCreateMessageGroups', value)}
                disabled={savingSettings}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Caregivers can create message groups</Text>
              <Switch
                value={groupSettings.caregiversCreateMessageGroups ?? false}
                onValueChange={(value) => handleToggleSetting('caregiversCreateMessageGroups', value)}
                disabled={savingSettings}
              />
            </View>

            <Divider style={styles.sectionDivider} />

            {/* Finance Permissions */}
            <Text style={styles.subsectionTitle}>Finance</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Finance visible to parents</Text>
              <Switch
                value={groupSettings.financeVisibleToParents ?? true}
                onValueChange={(value) => handleToggleSetting('financeVisibleToParents', value)}
                disabled={savingSettings}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={[
                styles.settingLabel,
                !groupSettings.financeVisibleToParents && styles.settingLabelDisabled
              ]}>
                Finance can be created by parents
              </Text>
              <Switch
                value={groupSettings.financeCreatableByParents ?? false}
                onValueChange={(value) => handleToggleSetting('financeCreatableByParents', value)}
                disabled={savingSettings || !groupSettings.financeVisibleToParents}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Finance visible to caregivers</Text>
              <Switch
                value={groupSettings.financeVisibleToCaregivers ?? false}
                onValueChange={(value) => handleToggleSetting('financeVisibleToCaregivers', value)}
                disabled={savingSettings}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={[
                styles.settingLabel,
                !groupSettings.financeVisibleToCaregivers && styles.settingLabelDisabled
              ]}>
                Finance can be created by caregivers
              </Text>
              <Switch
                value={groupSettings.financeCreatableByCaregivers ?? false}
                onValueChange={(value) => handleToggleSetting('financeCreatableByCaregivers', value)}
                disabled={savingSettings || !groupSettings.financeVisibleToCaregivers}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Finance visible to children</Text>
              <Switch
                value={groupSettings.financeVisibleToChildren ?? false}
                onValueChange={(value) => handleToggleSetting('financeVisibleToChildren', value)}
                disabled={savingSettings}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={[
                styles.settingLabel,
                !groupSettings.financeVisibleToChildren && styles.settingLabelDisabled
              ]}>
                Finance can be created by children
              </Text>
              <Switch
                value={groupSettings.financeCreatableByChildren ?? false}
                onValueChange={(value) => handleToggleSetting('financeCreatableByChildren', value)}
                disabled={savingSettings || !groupSettings.financeVisibleToChildren}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleSaveSettings}
              loading={savingSettings}
              disabled={savingSettings}
              style={styles.saveButton}
            >
              Save Permissions
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Admin Auto-Approval Permissions (Admin Only) */}
      {userRole === 'admin' && adminPermissions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Admin Auto-Approval Permissions</Title>
            <Text style={styles.helperText}>
              Allow other admins to perform actions without your approval
            </Text>
            <Divider style={styles.divider} />

            {adminPermissions.map((admin) => (
              <View key={admin.userId} style={styles.adminPermissionSection}>
                <View style={styles.adminHeader}>
                  <Avatar.Text
                    size={32}
                    label={admin.displayName?.[0] || admin.email?.[0] || 'A'}
                    style={{ backgroundColor: admin.iconColor || '#6200ee', marginRight: 8 }}
                    color={getContrastTextColor(admin.iconColor || '#6200ee')}
                  />
                  <Text style={styles.adminName}>{admin.displayName || admin.email}</Text>
                </View>

                <View style={styles.permissionsList}>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Hide messages</Text>
                    <Switch
                      value={admin.canHideMessagesWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canHideMessagesWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Add people</Text>
                    <Switch
                      value={admin.canAddPeopleWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canAddPeopleWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Remove people</Text>
                    <Switch
                      value={admin.canRemovePeopleWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canRemovePeopleWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Assign roles (new users)</Text>
                    <Switch
                      value={admin.canAssignRoleWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canAssignRoleWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Change roles (non-admins)</Text>
                    <Switch
                      value={admin.canChangeRoleWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canChangeRoleWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Assign relationships</Text>
                    <Switch
                      value={admin.canAssignRelationshipWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canAssignRelationshipWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Change relationships (non-admins)</Text>
                    <Switch
                      value={admin.canChangeRelationshipWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canChangeRelationshipWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Create calendar entries</Text>
                    <Switch
                      value={admin.canMakeCalendarEntriesWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canMakeCalendarEntriesWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Assign children to calendar</Text>
                    <Switch
                      value={admin.canAssignChildrenToCalendarWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canAssignChildrenToCalendarWithoutApproval', value)
                      }
                    />
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.permissionLabel}>Assign caregivers to calendar</Text>
                    <Switch
                      value={admin.canAssignCaregiversToCalendarWithoutApproval ?? false}
                      onValueChange={(value) =>
                        handleToggleAdminPermission(admin.userId, 'canAssignCaregiversToCalendarWithoutApproval', value)
                      }
                    />
                  </View>
                </View>

                {adminPermissions.indexOf(admin) < adminPermissions.length - 1 && (
                  <Divider style={styles.sectionDivider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Leave Group Button (for non-admins) */}
      {userRole !== 'admin' && (
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="outlined"
              icon="exit-to-app"
              textColor="#d32f2f"
              onPress={handleLeaveGroup}
            >
              Leave Group
            </Button>
          </Card.Content>
        </Card>
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
  card: {
    margin: 16,
    marginBottom: 0,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
  },
  groupHeaderInfo: {
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
  },
  editButton: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberNote: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  divider: {
    marginBottom: 8,
  },
  memberItem: {
    paddingVertical: 8,
  },
  memberItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  settingLabelDisabled: {
    color: '#999',
  },
  sectionDivider: {
    marginVertical: 16,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#6200ee',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  adminPermissionSection: {
    marginBottom: 8,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  adminName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  permissionsList: {
    marginLeft: 8,
  },
  permissionLabel: {
    fontSize: 13,
    color: '#555',
    flex: 1,
    marginRight: 12,
  },
});
