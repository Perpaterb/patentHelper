/**
 * Add/Edit Item Screen
 *
 * Allows users to add a new item to an item registry or edit an existing item.
 * Users can set the title, storage location, category, currently borrowed by,
 * replacement value, photo, and description.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import {
  TextInput,
  Button,
  Title,
  Text,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import api from '../../services/api';
import MediaPicker from '../../components/shared/MediaPicker';
import ImageViewer from '../../components/shared/ImageViewer';
import { uploadFile, getFileUrl } from '../../services/upload.service';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

/**
 * @typedef {Object} AddEditItemScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * AddEditItemScreen component
 *
 * @param {AddEditItemScreenProps} props
 * @returns {JSX.Element}
 */
export default function AddEditItemScreen({ navigation, route }) {
  const { groupId, registryId, itemId, mode, itemData, registryType } = route.params;
  const isEditMode = mode === 'edit';
  const isPersonalLinked = registryType === 'personal_linked';

  const [title, setTitle] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [category, setCategory] = useState('');
  const [currentlyBorrowedBy, setCurrentlyBorrowedBy] = useState('');
  const [replacementValue, setReplacementValue] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Set screen title
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Item' : 'Add Item',
    });
  }, [navigation, isEditMode]);

  // Load item data in edit mode
  useEffect(() => {
    if (isEditMode && itemData) {
      setTitle(itemData.title || '');
      setStorageLocation(itemData.storageLocation || '');
      setCategory(itemData.category || '');
      setCurrentlyBorrowedBy(itemData.currentlyBorrowedBy || '');
      setReplacementValue(itemData.replacementValue ? String(itemData.replacementValue) : '');
      setPhotoUrl(itemData.photoUrl || '');
      // If photoUrl exists, it's a file ID from upload
      if (itemData.photoUrl) {
        setUploadedFileId(itemData.photoUrl);
      }
      setDescription(itemData.description || '');
    }
  }, [isEditMode, itemData]);

  /**
   * Handle photo selection and upload
   */
  const handlePhotoSelect = async (file) => {
    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const uploadedFile = await uploadFile(
        file,
        'item-registry',
        isPersonalLinked ? null : groupId, // No groupId for personal registries
        (progress) => setUploadProgress(progress)
      );

      setUploadedFileId(uploadedFile.fileId);
      setPhotoUrl(uploadedFile.fileId); // Store fileId in photoUrl field
      CustomAlert.alert('Success', 'Photo uploaded successfully');
    } catch (err) {
      console.error('Photo upload error:', err);
      CustomAlert.alert('Upload Failed', err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle photo removal
   */
  const handleRemovePhoto = () => {
    CustomAlert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setUploadedFileId(null);
            setPhotoUrl('');
          },
        },
      ]
    );
  };

  /**
   * Validate replacement value input
   */
  const validateReplacementValue = (value) => {
    if (!value) return true; // Replacement value is optional

    // Remove spaces
    const cleanValue = value.trim();

    // Allow empty string
    if (cleanValue === '') return true;

    // Check if it's a valid number with up to 2 decimal places
    const valueRegex = /^\d+(\.\d{0,2})?$/;
    return valueRegex.test(cleanValue);
  };

  /**
   * Handle replacement value change
   */
  const handleReplacementValueChange = (value) => {
    // Allow empty string
    if (value === '') {
      setReplacementValue('');
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

    setReplacementValue(cleanValue);
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

    // Validate replacement value if provided
    if (replacementValue && !validateReplacementValue(replacementValue)) {
      setError('Invalid replacement value format. Use numbers only (e.g., 29.99)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        title: title.trim(),
      };

      if (storageLocation.trim()) payload.storageLocation = storageLocation.trim();
      if (category.trim()) payload.category = category.trim();
      if (currentlyBorrowedBy.trim()) payload.currentlyBorrowedBy = currentlyBorrowedBy.trim();
      if (replacementValue.trim()) payload.replacementValue = parseFloat(replacementValue);
      if (photoUrl.trim()) payload.photoUrl = photoUrl.trim();
      if (description.trim()) payload.description = description.trim();

      // Use appropriate endpoint based on registry type
      const endpoint = isPersonalLinked
        ? `/users/personal-registries/item-registries/${registryId}/items`
        : `/groups/${groupId}/item-registries/${registryId}/items`;

      const response = await api.post(endpoint, payload);

      CustomAlert.alert(
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
        console.log('[AddEditItem] Auth error detected - user will be logged out');
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

    // Validate replacement value if provided
    if (replacementValue && !validateReplacementValue(replacementValue)) {
      setError('Invalid replacement value format. Use numbers only (e.g., 29.99)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        title: title.trim(),
      };

      if (storageLocation.trim()) payload.storageLocation = storageLocation.trim();
      if (category.trim()) payload.category = category.trim();
      if (currentlyBorrowedBy.trim()) payload.currentlyBorrowedBy = currentlyBorrowedBy.trim();
      if (replacementValue.trim()) payload.replacementValue = parseFloat(replacementValue);
      if (photoUrl.trim()) payload.photoUrl = photoUrl.trim();
      if (description.trim()) payload.description = description.trim();

      // Use appropriate endpoint based on registry type
      const endpoint = isPersonalLinked
        ? `/users/personal-registries/item-registries/${registryId}/items/${itemId}`
        : `/groups/${groupId}/item-registries/${registryId}/items/${itemId}`;

      const response = await api.put(endpoint, payload);

      CustomAlert.alert(
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
        console.log('[AddEditItem] Auth error detected - user will be logged out');
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
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="Item"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Title style={styles.title}>
            {isEditMode ? 'Edit Item' : 'Add Item'}
          </Title>
          <Text style={styles.subtitle}>
            {isEditMode
              ? 'Update the details of this item.'
              : 'Add a new item to your item registry with details like title, storage location, category, and replacement value.'}
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
            placeholder="e.g., Power Drill, Harry Potter Book Set"
            disabled={loading}
            maxLength={255}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Give this item a descriptive name
          </HelperText>

          <TextInput
            label="Storage Location (Optional)"
            value={storageLocation}
            onChangeText={setStorageLocation}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Garage shelf 3, Kitchen cabinet"
            disabled={loading}
            maxLength={255}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Where this item is stored
          </HelperText>

          <TextInput
            label="Category (Optional)"
            value={category}
            onChangeText={setCategory}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Books, Tools, Kitchen, Sports"
            disabled={loading}
            maxLength={255}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Category to organize items
          </HelperText>

          <TextInput
            label="Currently Borrowed By (Optional)"
            value={currentlyBorrowedBy}
            onChangeText={setCurrentlyBorrowedBy}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., John, Sarah"
            disabled={loading}
            maxLength={255}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Name of person currently borrowing this item
          </HelperText>

          {/* Photo Upload */}
          <View style={styles.photoSection}>
            <Text style={styles.photoLabel}>Photo (Optional)</Text>

            {uploadedFileId ? (
              <View style={styles.photoPreviewContainer}>
                <TouchableOpacity
                  onPress={() => setShowImageViewer(true)}
                  style={styles.photoPreview}
                >
                  <Image
                    source={{ uri: getFileUrl(uploadedFileId) }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <Button
                  mode="text"
                  onPress={handleRemovePhoto}
                  disabled={loading || uploading}
                  style={styles.removePhotoButton}
                  textColor="#d32f2f"
                >
                  Remove Photo
                </Button>
              </View>
            ) : (
              <View>
                <MediaPicker
                  onSelect={handlePhotoSelect}
                  mediaType="photo"
                  maxSize={10 * 1024 * 1024} // 10MB
                  allowMultiple={false}
                  imageQuality={0.8}
                  label={uploading ? `Uploading... ${uploadProgress}%` : 'Add Photo'}
                />
                {uploading && (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color="#6200ee" />
                    <Text style={styles.uploadingText}>{uploadProgress}%</Text>
                  </View>
                )}
              </View>
            )}

            <HelperText type="info" visible={true} style={styles.helperTextInfo}>
              Upload an item image (max 10MB)
            </HelperText>
          </View>

          <TextInput
            label="Replacement Value (Optional)"
            value={replacementValue}
            onChangeText={handleReplacementValueChange}
            mode="outlined"
            style={styles.input}
            placeholder="29.99"
            disabled={loading}
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="$" />}
          />
          <HelperText type="info" visible={true} style={styles.helperTextInfo}>
            Estimated replacement cost in dollars (optional)
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
            Additional notes about this item (optional)
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

      {/* Image Viewer */}
      {uploadedFileId && (
        <ImageViewer
          visible={showImageViewer}
          imageUrl={getFileUrl(uploadedFileId)}
          onClose={() => setShowImageViewer(false)}
        />
      )}
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
  photoSection: {
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  photoPreviewContainer: {
    marginBottom: 8,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    marginTop: 0,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
  },
});
