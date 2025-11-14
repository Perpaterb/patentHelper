/**
 * MediaPicker Component
 *
 * Reusable component for picking photos/videos from camera or library.
 * Handles image compression and size validation.
 *
 * Usage:
 * <MediaPicker
 *   onSelect={(file) => uploadFile(file)}
 *   mediaType="photo" | "video" | "all"
 *   maxSize={10 * 1024 * 1024} // 10MB
 *   allowMultiple={false}
 *   imageQuality={0.8}
 *   profileIcon={false} // Set to true for 512x512 profile icons
 * />
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * MediaPicker component
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when file is selected: (file) => void
 *   file: { uri, type, name, size, mimeType }
 * @param {string} [props.mediaType='photo'] - Type of media: 'photo', 'video', 'all'
 * @param {number} [props.maxSize] - Max file size in bytes (optional)
 * @param {boolean} [props.allowMultiple=false] - Allow multiple file selection
 * @param {number} [props.imageQuality=0.8] - Image compression quality (0-1)
 * @param {boolean} [props.profileIcon=false] - Resize to 512x512 for profile icons
 * @param {string} [props.label] - Custom button label
 * @param {Function} [props.renderTrigger] - Custom render function: (onPress, isLoading) => JSX.Element
 * @param {Function} [props.onProcessingChange] - Callback when processing state changes: (isProcessing) => void
 * @param {boolean} [props.disabled=false] - Disable the picker
 */
const MediaPicker = ({
  onSelect,
  mediaType = 'photo',
  maxSize,
  allowMultiple = false,
  imageQuality = 0.8,
  profileIcon = false,
  label,
  renderTrigger,
  onProcessingChange,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Notify parent when processing state changes
  React.useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isLoading);
    }
  }, [isLoading, onProcessingChange]);

  /**
   * Request camera permissions
   */
  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera access is required to take photos/videos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  /**
   * Request media library permissions
   */
  const requestLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library access is required to select photos/videos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  /**
   * Compress and resize image
   * @param {string} uri - Image URI
   * @returns {Promise<Object>} Compressed image result
   */
  const compressImage = async (uri) => {
    try {
      const manipulateOptions = [];

      // Resize profile icons to 512x512
      if (profileIcon) {
        manipulateOptions.push({
          resize: { width: 512, height: 512 },
        });
      } else {
        // For regular images, maintain aspect ratio but limit max dimension
        manipulateOptions.push({
          resize: { width: 1920 }, // Max width 1920px (maintains aspect ratio)
        });
      }

      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulateOptions,
        {
          compress: imageQuality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result;
    } catch (error) {
      console.error('Image compression error:', error);
      throw new Error('Failed to compress image');
    }
  };

  /**
   * Get file size from URI
   * @param {string} uri - File URI
   * @returns {Promise<number>} File size in bytes
   */
  const getFileSize = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Get file size error:', error);
      return 0;
    }
  };

  /**
   * Process selected media
   * @param {Object} result - ImagePicker result
   */
  const processMedia = async (result) => {
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    setIsLoading(true);

    try {
      const selectedAssets = allowMultiple ? result.assets : [result.assets[0]];
      const processedFiles = [];

      for (const asset of selectedAssets) {
        let finalUri = asset.uri;
        let finalSize = asset.fileSize;

        // Compress images (not videos)
        if (asset.type === 'image') {
          const compressed = await compressImage(asset.uri);
          finalUri = compressed.uri;
          finalSize = await getFileSize(compressed.uri);
        } else {
          // For videos, get actual file size if not provided
          if (!finalSize) {
            finalSize = await getFileSize(asset.uri);
          }
        }

        // Validate file size
        if (maxSize && finalSize > maxSize) {
          const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
          const actualSizeMB = (finalSize / (1024 * 1024)).toFixed(1);
          Alert.alert(
            'File Too Large',
            `File size (${actualSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB).`,
            [{ text: 'OK' }]
          );
          continue;
        }

        // Determine MIME type and file extension
        let mimeType = 'application/octet-stream';
        let ext = 'bin';

        if (asset.type === 'image') {
          // Images are always compressed to JPEG format
          mimeType = 'image/jpeg';
          ext = 'jpg';
        } else if (asset.type === 'video') {
          // Determine video extension from URI
          const videoExt = asset.uri.split('.').pop()?.toLowerCase();
          ext = videoExt || 'mp4';
          mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        }

        // Generate filename
        const timestamp = Date.now();
        const fileName = `${asset.type}_${timestamp}.${ext}`;

        // Create file object
        const file = {
          uri: finalUri,
          type: asset.type,
          name: fileName,
          size: finalSize,
          mimeType: mimeType,
        };

        processedFiles.push(file);
      }

      // Call onSelect with array if allowMultiple, otherwise with single file
      if (processedFiles.length > 0) {
        if (allowMultiple) {
          onSelect(processedFiles);
        } else {
          onSelect(processedFiles[0]);
        }
      }
    } catch (error) {
      console.error('Process media error:', error);
      Alert.alert(
        'Error',
        'Failed to process media. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Pick from camera
   */
  const pickFromCamera = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaType === 'photo'
          ? ImagePicker.MediaTypeOptions.Images
          : mediaType === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All,
        allowsEditing: profileIcon, // Allow editing for profile icons (square crop)
        aspect: profileIcon ? [1, 1] : undefined,
        quality: imageQuality,
        videoMaxDuration: 120, // 2 minutes max for videos
      });

      await processMedia(result);
    } catch (error) {
      console.error('Camera picker error:', error);
      Alert.alert(
        'Error',
        'Failed to open camera. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Pick from library
   */
  const pickFromLibrary = async () => {
    const hasPermission = await requestLibraryPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'photo'
          ? ImagePicker.MediaTypeOptions.Images
          : mediaType === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All,
        allowsEditing: profileIcon, // Allow editing for profile icons (square crop)
        aspect: profileIcon ? [1, 1] : undefined,
        quality: imageQuality,
        allowsMultipleSelection: allowMultiple,
      });

      await processMedia(result);
    } catch (error) {
      console.error('Library picker error:', error);
      Alert.alert(
        'Error',
        'Failed to open photo library. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Show picker options
   */
  const showPickerOptions = () => {
    const options = [
      {
        text: `Take ${mediaType === 'video' ? 'Video' : 'Photo'}`,
        onPress: pickFromCamera,
      },
      {
        text: `Choose from Library`,
        onPress: pickFromLibrary,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ];

    Alert.alert(
      profileIcon ? 'Profile Icon' : 'Add Media',
      profileIcon ? 'Choose a photo for your profile icon' : 'Select an option',
      options
    );
  };

  // Default labels
  const getDefaultLabel = () => {
    if (profileIcon) return 'Change Photo';
    if (mediaType === 'photo') return 'Add Photo';
    if (mediaType === 'video') return 'Add Video';
    return 'Add Media';
  };

  // If custom trigger is provided, use it
  if (renderTrigger) {
    return renderTrigger(showPickerOptions, isLoading);
  }

  // Otherwise, render default button
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={showPickerOptions}
        disabled={isLoading || disabled}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Processing...' : (label || getDefaultLabel())}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MediaPicker;
