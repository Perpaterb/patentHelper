/**
 * ImageViewer Component
 *
 * Full-screen image viewer with pinch-to-zoom and swipe-to-dismiss.
 *
 * Usage:
 * <ImageViewer
 *   visible={showViewer}
 *   imageUrl={selectedImage}
 *   onClose={() => setShowViewer(false)}
 * />
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * ImageViewer component
 * @param {Object} props
 * @param {boolean} props.visible - Whether the viewer is visible
 * @param {string} props.imageUrl - URL of the image to display
 * @param {Function} props.onClose - Callback when viewer is closed
 */
const ImageViewer = ({ visible, imageUrl, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Zoom animation
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  /**
   * Handle image load
   */
  const handleImageLoad = () => {
    setIsLoading(false);

    // Get image dimensions
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => {
          // Calculate dimensions to fit screen
          const ratio = Math.min(SCREEN_WIDTH / width, SCREEN_HEIGHT / height);
          setImageDimensions({
            width: width * ratio,
            height: height * ratio,
          });
        },
        (error) => {
          console.error('Get image size error:', error);
          // Use screen dimensions as fallback
          setImageDimensions({
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT * 0.8,
          });
        }
      );
    }
  };

  /**
   * Handle image load error
   */
  const handleImageError = (error) => {
    console.error('Image failed to load:', error.nativeEvent.error);
    setIsLoading(false);
  };

  /**
   * Download image to device
   */
  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is required to save images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Download image to temporary location
      const filename = imageUrl.split('/').pop() + '.jpg';
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Save to media library
      await MediaLibrary.createAssetAsync(downloadResult.uri);

      Alert.alert(
        'Success',
        'Image saved to your photo library!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Download Failed',
        error.message || 'Failed to save image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Handle pinch gesture
   */
  const onPinchEvent = (event) => {
    scale.value = savedScale.value * event.nativeEvent.scale;
  };

  /**
   * Handle pinch state change
   */
  const onPinchStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      // Limit scale between 1x and 3x
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    }
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    // Reset zoom
    scale.value = 1;
    savedScale.value = 1;
    setIsLoading(true);
    onClose();
  };

  /**
   * Animated image style
   */
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.overlay}>
          {/* Status bar (hidden on Android) */}
          <StatusBar hidden={Platform.OS === 'android'} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <View style={styles.closeIconContainer}>
              <View style={styles.closeIconLine1} />
              <View style={styles.closeIconLine2} />
            </View>
          </TouchableOpacity>

          {/* Download button */}
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
            disabled={isDownloading || isLoading}
          >
            <View style={styles.downloadIconContainer}>
              {isDownloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  {/* Download icon: arrow down into tray */}
                  <View style={styles.downloadTray} />
                  <View style={styles.downloadArrowLine} />
                  <View style={styles.downloadArrowHead} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Loading indicator */}
          {isLoading && (
            <ActivityIndicator
              size="large"
              color="#ffffff"
              style={styles.loader}
            />
          )}

          {/* Image with pinch-to-zoom */}
          <PinchGestureHandler
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.image,
                  imageDimensions.width > 0 && {
                    width: imageDimensions.width,
                    height: imageDimensions.height,
                  },
                ]}
                resizeMode="contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  closeIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconLine1: {
    position: 'absolute',
    width: 28,
    height: 3,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  closeIconLine2: {
    position: 'absolute',
    width: 28,
    height: 3,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 2,
  },
  downloadButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
    padding: 12,
  },
  downloadIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  downloadTray: {
    position: 'absolute',
    bottom: 8,
    width: 24,
    height: 8,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#ffffff',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  downloadArrowLine: {
    position: 'absolute',
    top: 6,
    width: 3,
    height: 14,
    backgroundColor: '#ffffff',
    borderRadius: 1.5,
  },
  downloadArrowHead: {
    position: 'absolute',
    top: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  loader: {
    position: 'absolute',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});

export default ImageViewer;
