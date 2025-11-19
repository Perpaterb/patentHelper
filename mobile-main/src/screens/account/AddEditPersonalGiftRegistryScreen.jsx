/**
 * Add/Edit Personal Gift Registry Screen
 *
 * Allows users to create a new personal gift registry or edit an existing one.
 * Users can set the name and sharing type (external_link or external_link_passcode).
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
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

/**
 * @typedef {Object} AddEditPersonalGiftRegistryScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * AddEditPersonalGiftRegistryScreen component
 *
 * @param {AddEditPersonalGiftRegistryScreenProps} props
 * @returns {JSX.Element}
 */
export default function AddEditPersonalGiftRegistryScreen({ navigation, route }) {
  const { mode, registryId, registryName, sharingType: initialSharingType, onSave } = route.params;
  const isEditMode = mode === 'edit';

  const [name, setName] = useState('');
  const [sharingType, setSharingType] = useState('external_link');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set screen title
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Gift Registry' : 'Create Gift Registry',
    });
  }, [navigation, isEditMode]);

  // Load registry data in edit mode
  useEffect(() => {
    if (isEditMode) {
      setName(registryName || '');
      setSharingType(initialSharingType || 'external_link');
    }
  }, [isEditMode, registryName, initialSharingType]);

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

      const response = await api.post('/users/personal-registries/gift-registries', {
        name: name.trim(),
        sharingType: sharingType,
      });

      Alert.alert(
        'Registry Created',
        `"${name.trim()}" has been created successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSave) onSave();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Create registry error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AddEditPersonalGiftRegistry] Auth error detected - user will be logged out');
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

      const response = await api.put(`/users/personal-registries/gift-registries/${registryId}`, {
        name: name.trim(),
      });

      Alert.alert(
        'Registry Updated',
        `"${name.trim()}" has been updated successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSave) onSave();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Update registry error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AddEditPersonalGiftRegistry] Auth error detected - user will be logged out');
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
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="Gift Registry"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Title style={styles.title}>
          {isEditMode ? 'Edit Personal Gift Registry' : 'Create Personal Gift Registry'}
        </Title>
        <Text style={styles.subtitle}>
          {isEditMode
            ? 'Update the name of your gift registry.'
            : 'Create a new personal gift registry to share wish lists and gift ideas.'}
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
          placeholder="e.g., My Birthday Wishlist, Wedding Registry"
          disabled={loading}
          maxLength={255}
        />
        <HelperText type="info" visible={true} style={styles.helperTextInfo}>
          Choose a descriptive name for this registry
        </HelperText>

        {!isEditMode && (
          <Card style={styles.sharingCard}>
            <Card.Content>
              <Text style={styles.sharingTitle}>Sharing Options *</Text>
              <HelperText type="info" visible={true} style={styles.helperTextInfo}>
                Choose how this registry can be accessed
              </HelperText>

              <RadioButton.Group
                onValueChange={(value) => setSharingType(value)}
                value={sharingType}
              >
                <View style={styles.radioOption}>
                  <RadioButton.Android value="external_link" disabled={loading} />
                  <View style={styles.radioLabel}>
                    <Text style={styles.radioTitle}>Public Link</Text>
                    <Text style={styles.radioDescription}>
                      Anyone with the link can view this registry
                    </Text>
                  </View>
                </View>

                <View style={styles.radioOption}>
                  <RadioButton.Android value="external_link_passcode" disabled={loading} />
                  <View style={styles.radioLabel}>
                    <Text style={styles.radioTitle}>Link with Passcode</Text>
                    <Text style={styles.radioDescription}>
                      Anyone with the link and 6-digit passcode can view this registry
                    </Text>
                  </View>
                </View>
              </RadioButton.Group>

              {sharingType === 'external_link_passcode' && (
                <HelperText type="info" visible={true} style={styles.passcodeInfo}>
                  A 6-digit passcode will be automatically generated after creation
                </HelperText>
              )}
            </Card.Content>
          </Card>
        )}

        {isEditMode && (
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Note: Sharing type cannot be changed after creation
          </HelperText>
        )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
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
