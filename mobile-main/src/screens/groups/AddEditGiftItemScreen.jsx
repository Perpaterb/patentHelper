/**
 * Add/Edit Gift Item Screen
 *
 * Allows users to add a new item to a gift registry or edit an existing item.
 * Users can set the title, link, photo URL, cost, and description.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Text,
  HelperText,
} from 'react-native-paper';
import api from '../../services/api';

/**
 * @typedef {Object} AddEditGiftItemScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * AddEditGiftItemScreen component
 *
 * @param {AddEditGiftItemScreenProps} props
 * @returns {JSX.Element}
 */
export default function AddEditGiftItemScreen({ navigation, route }) {
  const { groupId, registryId, itemId, mode, itemData } = route.params;
  const isEditMode = mode === 'edit';

  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set screen title
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Gift Item' : 'Add Gift Item',
    });
  }, [navigation, isEditMode]);

  // Load item data in edit mode
  useEffect(() => {
    if (isEditMode && itemData) {
      setTitle(itemData.title || '');
      setLink(itemData.link || '');
      setPhotoUrl(itemData.photoUrl || '');
      setCost(itemData.cost ? String(itemData.cost) : '');
      setDescription(itemData.description || '');
    }
  }, [isEditMode, itemData]);

  /**
   * Validate cost input
   */
  const validateCost = (value) => {
    if (!value) return true; // Cost is optional

    // Remove spaces
    const cleanValue = value.trim();

    // Allow empty string
    if (cleanValue === '') return true;

    // Check if it's a valid number with up to 2 decimal places
    const costRegex = /^\d+(\.\d{0,2})?$/;
    return costRegex.test(cleanValue);
  };

  /**
   * Handle cost change
   */
  const handleCostChange = (value) => {
    // Allow empty string
    if (value === '') {
      setCost('');
      setError(null);
      return;
    }

    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return; // Don't update if multiple decimal points
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return; // Don't update if more than 2 decimal places
    }

    setCost(cleanValue);
    setError(null);
  };

  /**
   * Handle create item submission
   */
  const handleCreate = async () => {
    // Validate title
    if (!title.trim()) {
      setError('Item title is required');
      return;
    }

    // Validate cost if provided
    if (cost && !validateCost(cost)) {
      setError('Invalid cost format. Use numbers only (e.g., 29.99)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        title: title.trim(),
      };

      if (link.trim()) payload.link = link.trim();
      if (photoUrl.trim()) payload.photoUrl = photoUrl.trim();
      if (cost.trim()) payload.cost = parseFloat(cost);
      if (description.trim()) payload.description = description.trim();

      const response = await api.post(
        `/groups/${groupId}/gift-registries/${registryId}/items`,
        payload
      );

      Alert.alert(
        'Item Added',
        `"${title.trim()}" has been added to the registry.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Create item error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AddEditGiftItem] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to add item';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle update item submission
   */
  const handleUpdate = async () => {
    // Validate title
    if (!title.trim()) {
      setError('Item title is required');
      return;
    }

    // Validate cost if provided
    if (cost && !validateCost(cost)) {
      setError('Invalid cost format. Use numbers only (e.g., 29.99)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        title: title.trim(),
      };

      if (link.trim()) payload.link = link.trim();
      if (photoUrl.trim()) payload.photoUrl = photoUrl.trim();
      if (cost.trim()) payload.cost = parseFloat(cost);
      if (description.trim()) payload.description = description.trim();

      const response = await api.put(
        `/groups/${groupId}/gift-registries/${registryId}/items/${itemId}`,
        payload
      );

      Alert.alert(
        'Item Updated',
        `"${title.trim()}" has been updated successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Update item error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[AddEditGiftItem] Auth error detected - user will be logged out');
        return;
      }

      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to update item';
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Title style={styles.title}>
            {isEditMode ? 'Edit Gift Item' : 'Add Gift Item'}
          </Title>
          <Text style={styles.subtitle}>
            {isEditMode
              ? 'Update the details of this gift item.'
              : 'Add a new item to your gift registry with details like title, link, cost, and description.'}
          </Text>

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <TextInput
            label="Item Title *"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setError(null);
            }}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Blue Teddy Bear, Lego Set"
            disabled={loading}
            maxLength={255}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Give this item a descriptive name
          </HelperText>

          <TextInput
            label="Link (Optional)"
            value={link}
            onChangeText={setLink}
            mode="outlined"
            style={styles.input}
            placeholder="https://example.com/product"
            disabled={loading}
            keyboardType="url"
            autoCapitalize="none"
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Link to product page (optional)
          </HelperText>

          <TextInput
            label="Photo URL (Optional)"
            value={photoUrl}
            onChangeText={setPhotoUrl}
            mode="outlined"
            style={styles.input}
            placeholder="https://example.com/image.jpg"
            disabled={loading}
            keyboardType="url"
            autoCapitalize="none"
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            URL to product image (optional)
          </HelperText>

          <TextInput
            label="Cost (Optional)"
            value={cost}
            onChangeText={handleCostChange}
            mode="outlined"
            style={styles.input}
            placeholder="29.99"
            disabled={loading}
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="$" />}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Estimated cost in dollars (optional)
          </HelperText>

          <TextInput
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.textArea}
            placeholder="Add any additional details..."
            disabled={loading}
            multiline
            numberOfLines={4}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Additional notes or preferences (optional)
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !title.trim()}
            style={styles.submitButton}
          >
            {isEditMode ? 'Update Item' : 'Add Item'}
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
    </KeyboardAvoidingView>
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
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    marginBottom: 4,
  },
  textArea: {
    marginBottom: 4,
    minHeight: 100,
  },
  helperTextInfo: {
    fontSize: 12,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 16,
  },
});
