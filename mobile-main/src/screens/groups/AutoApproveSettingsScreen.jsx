/**
 * Auto-Approve Settings Screen
 *
 * Allows admins to pre-approve specific actions from other admins.
 * If >50% of other admins have pre-approved an action, it executes immediately without requiring approval.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Card, Title, Text, Switch, Avatar, Divider, ActivityIndicator } from 'react-native-paper';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} AutoApproveSettingsScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * AutoApproveSettingsScreen component
 *
 * @param {AutoApproveSettingsScreenProps} props
 * @returns {JSX.Element}
 */
export default function AutoApproveSettingsScreen({ navigation, route }) {
  const { groupId } = route.params;
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    loadAutoApprovePermissions();
  }, [groupId]);

  /**
   * Load auto-approve permissions for all other admins
   */
  const loadAutoApprovePermissions = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/admin-permissions`);
      setAdmins(response.data.admins || []);
    } catch (err) {
      console.error('Load auto-approve permissions error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AutoApproveSettings] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load auto-approve permissions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle a specific permission for an admin
   */
  const togglePermission = async (admin, permissionKey) => {
    const updatedPermissions = {
      ...admin.permissions,
      [permissionKey]: !admin.permissions[permissionKey],
    };

    // Optimistic update
    setAdmins(prevAdmins =>
      prevAdmins.map(a =>
        a.groupMemberId === admin.groupMemberId
          ? { ...a, permissions: updatedPermissions }
          : a
      )
    );

    // Set saving state for this admin
    setSaving(prev => ({ ...prev, [admin.groupMemberId]: true }));

    try {
      await api.put(
        `/groups/${groupId}/admin-permissions/${admin.groupMemberId}`,
        updatedPermissions
      );
    } catch (err) {
      console.error('Update auto-approve permission error:', err);

      // Revert optimistic update on error
      setAdmins(prevAdmins =>
        prevAdmins.map(a =>
          a.groupMemberId === admin.groupMemberId
            ? { ...a, permissions: admin.permissions }
            : a
        )
      );

      // Don't show error if it's an auth error
      if (!err.isAuthError) {
        setError(err.response?.data?.message || 'Failed to update permission');
      }
    } finally {
      setSaving(prev => ({ ...prev, [admin.groupMemberId]: false }));
    }
  };

  /**
   * Render permission toggle row
   */
  const renderPermissionToggle = (admin, permissionKey, label) => {
    const isEnabled = admin.permissions[permissionKey] || false;
    const isSaving = saving[admin.groupMemberId] || false;

    return (
      <View style={styles.permissionRow} key={permissionKey}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <Switch
          value={isEnabled}
          onValueChange={() => togglePermission(admin, permissionKey)}
          disabled={isSaving}
        />
      </View>
    );
  };

  /**
   * Render admin card with all permissions
   */
  const renderAdmin = ({ item: admin }) => {
    const bgColor = admin.iconColor || '#6200ee';

    return (
      <Card style={styles.card} key={admin.groupMemberId}>
        <Card.Content>
          <View style={styles.adminHeader}>
            <Avatar.Text
              size={48}
              label={admin.iconLetters || '?'}
              style={{ backgroundColor: bgColor }}
              color={getContrastTextColor(bgColor)}
            />
            <View style={styles.adminInfo}>
              <Title style={styles.adminName}>{admin.displayName}</Title>
              <Text style={styles.helpText}>
                Toggle permissions to auto-approve actions from this admin
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Message Group Management</Text>
          {renderPermissionToggle(admin, 'canHideMessages', 'Hide Messages')}
          {renderPermissionToggle(admin, 'canChangeMessageDeletionSetting', 'Change Message Deletion Setting')}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Member Management</Text>
          {renderPermissionToggle(admin, 'canAddMembers', 'Add Members')}
          {renderPermissionToggle(admin, 'canRemoveMembers', 'Remove Members')}
          {renderPermissionToggle(admin, 'canChangeRoles', 'Change Roles')}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Relationship Management</Text>
          {renderPermissionToggle(admin, 'canAssignRelationships', 'Assign Relationships')}
          {renderPermissionToggle(admin, 'canChangeRelationships', 'Change Relationships')}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Calendar Management</Text>
          {renderPermissionToggle(admin, 'canCreateCalendarEvents', 'Create Calendar Events')}
          {renderPermissionToggle(admin, 'canAssignChildrenToEvents', 'Assign Children to Events')}
          {renderPermissionToggle(admin, 'canAssignCaregiversToEvents', 'Assign Caregivers to Events')}
        </Card.Content>
      </Card>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No other admins in this group</Text>
      <Text style={styles.emptySubtext}>
        Auto-approve settings will appear when there are multiple admins
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading auto-approve settings...</Text>
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

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Auto-Approve Settings</Text>
        <Text style={styles.headerDescription}>
          Pre-approve specific actions from other admins. When more than 50% of other admins have
          pre-approved an action type, it will execute immediately without requiring approval.
        </Text>
      </View>

      <FlatList
        data={admins}
        renderItem={renderAdmin}
        keyExtractor={(item) => item.groupMemberId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  headerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminInfo: {
    marginLeft: 12,
    flex: 1,
  },
  adminName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  permissionLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
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
});
