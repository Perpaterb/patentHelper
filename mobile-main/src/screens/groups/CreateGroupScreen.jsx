/**
 * Create Group Screen
 *
 * Form to create a new message group.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import { TextInput, Button, Title, Text, HelperText } from 'react-native-paper';
import api from '../../services/api';
import ColorPickerModal from '../../components/ColorPickerModal';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

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

      // On web, CustomAlert.alert callbacks don't work, so navigate immediately
      if (Platform.OS === 'web') {
        // Use window.alert for web
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`Group "${groupName}" created successfully!`);
        }
        navigation.goBack();
      } else {
        // On mobile, use CustomAlert.alert with callback
        CustomAlert.alert(
          'Success',
          `Group "${groupName}" created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      console.error('Create group error:', err);

      // Don't show error if it's an auth error - logout happens automatically
      if (err.isAuthError) {
        console.log('[CreateGroup] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to create group';

      if (errorMessage.includes('subscription')) {
        CustomAlert.alert(
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
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="Create Group"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
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

        <View style={styles.colorSection}>
          <Text style={styles.colorLabel}>Group Color</Text>
          <TouchableOpacity
            style={styles.colorButton}
            onPress={handleOpenColorPicker}
            disabled={loading}
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

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={backgroundColor}
        onConfirm={handleColorConfirm}
        onCancel={handleColorCancel}
      />
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
});
