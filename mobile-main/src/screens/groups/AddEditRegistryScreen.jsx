/**
 * Add/Edit Gift Registry Screen
 *
 * Allows users to create a new gift registry or edit an existing one.
 * Users can set the name, sharing type, and passcode (if applicable).
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Text,
  HelperText,
  RadioButton,
  Card,
} from 'react-native-paper';
import api from '../../services/api';

/**
 * @typedef {Object} AddEditRegistryScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * AddEditRegistryScreen component
 *
 * @param {AddEditRegistryScreenProps} props
 * @returns {JSX.Element}
 */
export default function AddEditRegistryScreen({ navigation, route }) {
  const { groupId, registryId, mode, registryData } = route.params;
  const isEditMode = mode === 'edit';

  const [name, setName] = useState('');
  const [sharingType, setSharingType] = useState('group_only');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set screen title
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Registry' : 'Create Registry',
    });
  }, [navigation, isEditMode]);

  // Load registry data in edit mode
  useEffect(() => {
    if (isEditMode && registryData) {
      setName(registryData.name || '');
      setSharingType(registryData.sharingType || 'group_only');
    }
  }, [isEditMode, registryData]);

  /**
   * Handle create registry submission
   */
  const handleCreate = async () => {
    // Validate name
    if (!name.trim()) {
      setError('Registry name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/groups/${groupId}/gift-registries`, {
        name: name.trim(),
        sharingType: sharingType,
      });

      Alert.alert(
        'Registry Created',
        `"${name.trim()}" has been created successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Create registry error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AddEditRegistry] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to create registry';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle update registry submission
   */
  const handleUpdate = async () => {
    // Validate name
    if (!name.trim()) {
      setError('Registry name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.put(`/groups/${groupId}/gift-registries/${registryId}`, {
        name: name.trim(),
      });

      Alert.alert(
        'Registry Updated',
        `"${name.trim()}" has been updated successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Update registry error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AddEditRegistry] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to update registry';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle submit (create or update)
   */
  const handleSubmit = () => {
    if (isEditMode) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>
          {isEditMode ? 'Edit Gift Registry' : 'Create Gift Registry'}
        </Title>
        <Text style={styles.subtitle}>
          {isEditMode
            ? 'Update the name of your gift registry.'
            : 'Create a new gift registry to share wish lists and gift ideas.'}
        </Text>

        {error && (
          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>
        )}

        <TextInput
          label="Registry Name *"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          mode="outlined"
          style={styles.input}
          placeholder="e.g., Sarah's Birthday, Christmas 2025"
          disabled={loading}
          maxLength={255}
        />
        <HelperText type="info" visible={true} style={styles.helperTextInfo}>
          Choose a descriptive name for this registry. It will be visible to all group members.
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !name.trim()}
          style={styles.submitButton}
        >
          {isEditMode ? 'Update Registry' : 'Create Registry'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
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
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    marginBottom: 4,
  },
  helperTextInfo: {
    fontSize: 12,
    marginBottom: 16,
  },
  sharingCard: {
    marginBottom: 24,
    elevation: 2,
  },
  sharingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  radioLabel: {
    flex: 1,
    marginLeft: 8,
    marginTop: 8,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  passcodeInfo: {
    fontSize: 12,
    marginTop: 8,
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 4,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 16,
  },
});
