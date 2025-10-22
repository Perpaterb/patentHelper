/**
 * Create Group Screen
 *
 * Form to create a new message group.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, Text, HelperText } from 'react-native-paper';
import api from '../../services/api';

/**
 * @typedef {Object} CreateGroupScreenProps
 * @property {Object} navigation - React Navigation navigation object
 */

/**
 * CreateGroupScreen component
 *
 * @param {CreateGroupScreenProps} props
 * @returns {JSX.Element}
 */
export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState('');
  const [icon, setIcon] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#6200ee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle form submission
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

      const response = await api.post('/groups', {
        name: groupName.trim(),
        icon: icon.trim() || undefined,
        backgroundColor: backgroundColor,
      });

      Alert.alert(
        'Success',
        `Group "${groupName}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Create group error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create group';

      if (errorMessage.includes('subscription')) {
        Alert.alert(
          'Subscription Required',
          'You need an active subscription to create groups. Please subscribe via the web app.',
          [
            { text: 'Cancel' },
            {
              text: 'Subscribe',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Create a New Group</Title>
        <Text style={styles.subtitle}>
          Groups allow you to communicate and organize with family members.
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
          disabled={loading}
        />

        <TextInput
          label="Icon (emoji or single character)"
          value={icon}
          onChangeText={setIcon}
          mode="outlined"
          style={styles.input}
          placeholder="e.g., 🏠, 👨‍👩‍👧‍👦, F"
          maxLength={2}
          disabled={loading}
        />

        <TextInput
          label="Background Color (hex)"
          value={backgroundColor}
          onChangeText={setBackgroundColor}
          mode="outlined"
          style={styles.input}
          placeholder="#6200ee"
          maxLength={7}
          disabled={loading}
        />

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
          disabled={loading || !groupName.trim()}
          style={styles.submitButton}
        >
          Create Group
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
});
