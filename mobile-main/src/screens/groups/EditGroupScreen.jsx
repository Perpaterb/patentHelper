/**
 * Edit Group Screen
 *
 * Form to edit group details (name, icon, background color) and delete group.
 * Only accessible to group admins.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Title, Text, HelperText } from 'react-native-paper';
import api from '../../services/api';
import ColorPickerModal from '../../components/ColorPickerModal';

/**
 * @typedef {Object} EditGroupScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * EditGroupScreen component
 *
 * @param {EditGroupScreenProps} props
 * @returns {JSX.Element}
 */
export default function EditGroupScreen({ navigation, route }) {
  const { groupId, groupName: initialName, groupIcon: initialIcon, groupColor: initialColor } = route.params;

  const [groupName, setGroupName] = useState(initialName || '');
  const [icon, setIcon] = useState(initialIcon || '');
  const [backgroundColor, setBackgroundColor] = useState(initialColor || '#6200ee');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  /**
   * Open color picker
   */
  const handleOpenColorPicker = () => {
    setColorPickerVisible(true);
  };

  /**
   * Handle color selection
   */
  const handleColorConfirm = (color) => {
    setBackgroundColor(color);
    setColorPickerVisible(false);
  };

  /**
   * Handle color picker cancel
   */
  const handleColorCancel = () => {
    setColorPickerVisible(false);
  };

  /**
   * Handle form submission (update group)
   */
  const handleSubmit = async () => {
    // Validate
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.put(`/groups/${groupId}`, {
        name: groupName.trim(),
        icon: icon.trim() || undefined,
        backgroundColor: backgroundColor,
      });

      Alert.alert(
        'Success',
        `Group "${groupName}" updated successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Update group error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[EditGroup] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to update group';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle delete group
   */
  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteGroup,
        },
      ]
    );
  };

  /**
   * Confirm delete group
   */
  const confirmDeleteGroup = async () => {
    try {
      setDeleting(true);
      setError(null);

      await api.delete(`/groups/${groupId}`);

      Alert.alert(
        'Request Sent',
        'Request for deleting the group has been made.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to groups list
              navigation.navigate('Groups');
            },
          },
        ]
      );
    } catch (err) {
      console.error('Delete group error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[EditGroup] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete group';

      // Show specific error if approval is required
      if (errorMessage.includes('Approval Required') || errorMessage.includes('approval')) {
        Alert.alert(
          'Approval Sent',
          'Delete approval requests have been sent to all other admins. The group will be deleted if more than 75% of admins approve.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to groups list
                navigation.navigate('Groups');
              },
            },
          ]
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Edit Group</Title>
        <Text style={styles.subtitle}>
          Update group name, icon, and color. Only admins can edit groups.
        </Text>

        {error && (
          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>
        )}

        <TextInput
          label="Group Name *"
          value={groupName}
          onChangeText={setGroupName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g., Family Chat, Weekend Plans"
          maxLength={255}
          disabled={loading || deleting}
        />

        <TextInput
          label="Icon (emoji or single character)"
          value={icon}
          onChangeText={setIcon}
          mode="outlined"
          style={styles.input}
          placeholder="e.g., 🏠, 👨‍👩‍👧‍👦, F"
          maxLength={2}
          disabled={loading || deleting}
        />

        <View style={styles.colorSection}>
          <Text style={styles.colorLabel}>Group Color</Text>
          <TouchableOpacity
            style={styles.colorButton}
            onPress={handleOpenColorPicker}
            disabled={loading || deleting}
          >
            <View style={[styles.colorPreview, { backgroundColor }]} />
            <Text style={styles.colorButtonText}>
              {backgroundColor.toUpperCase()}
            </Text>
            <Text style={styles.colorButtonLabel}>Tap to change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <View
            style={[
              styles.previewBox,
              { backgroundColor: backgroundColor || '#6200ee' },
            ]}
          >
            <Text style={styles.previewIcon}>
              {icon || groupName[0] || '?'}
            </Text>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || deleting || !groupName.trim()}
          style={styles.submitButton}
        >
          Save Changes
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={loading || deleting}
          style={styles.cancelButton}
        >
          Cancel
        </Button>

        {/* Delete Group Section */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <Text style={styles.dangerZoneText}>
            Deleting a group is permanent and cannot be undone. All messages, calendar events, and finance records will be hidden but preserved in audit logs.
          </Text>
          <Text style={styles.dangerZoneText}>
            If there are multiple admins, approval requests will be sent to all other admins. The group will be deleted if more than 75% of admins approve.
          </Text>
          <Button
            mode="outlined"
            onPress={handleDeleteGroup}
            loading={deleting}
            disabled={loading || deleting}
            style={styles.deleteButton}
            textColor="#d32f2f"
          >
            Delete Group
          </Button>
        </View>
      </View>

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={backgroundColor}
        onConfirm={handleColorConfirm}
        onCancel={handleColorCancel}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  colorSection: {
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  colorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  colorButtonLabel: {
    fontSize: 12,
    color: '#999',
  },
  preview: {
    marginVertical: 20,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  previewBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIcon: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 6,
  },
  cancelButton: {
    marginTop: 8,
  },
  dangerZone: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  dangerZoneText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    borderColor: '#d32f2f',
  },
});
