/**
 * ImageViewer Component
 *
 * Full-screen image viewer with pinch-to-zoom and swipe-to-dismiss.
 * On web, uses full browser window instead of phone-sized container.
 *
 * Usage:
 * <ImageViewer
 *   visible={showViewer}
 *   imageUrl={selectedImage}
 *   onClose={() => setShowViewer(false)}
 * />
 */

import React, { useState, useEffect } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

// Only import native modules on native platforms
let MediaLibrary;
let FileSystem;
if (Platform.OS !== 'web') {
  MediaLibrary = require('expo-media-library');
  FileSystem = require('expo-file-system/legacy');
}

// Use window dimensions, updated on resize for web
const getScreenDimensions = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return Dimensions.get('window');
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();

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
  const [screenSize, setScreenSize] = useState(getScreenDimensions());

  // Zoom animation
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  // Update screen size on window resize (web)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setScreenSize({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
          // Calculate dimensions to fit 90% of screen
          const maxWidth = screenSize.width * 0.9;
          const maxHeight = screenSize.height * 0.9;
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          setImageDimensions({
            width: width * ratio,
            height: height * ratio,
          });
        },
        (error) => {
          console.error('Get image size error:', error);
          // Use 90% of screen dimensions as fallback
          setImageDimensions({
            width: screenSize.width * 0.9,
            height: screenSize.height * 0.9,
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

      // Web platform - use anchor element for download
      if (Platform.OS === 'web') {
        const link = window.document.createElement('a');
        link.href = imageUrl;
        // Extract filename from URL and ensure it has extension
        let filename = imageUrl.split('/').pop() || 'image';
        if (!filename.includes('.')) {
          filename += '.jpg';
        }
        link.download = filename;
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        CustomAlert.alert(
          'Download Started',
          'Image download has started.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Native platform - use MediaLibrary and FileSystem
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        CustomAlert.alert(
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

      CustomAlert.alert(
        'Success',
        'Image saved to your photo library!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Download error:', error);
      CustomAlert.alert(
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
                  // Use dynamic screenSize for fullscreen on web (90% in both dimensions)
                  {
                    width: imageDimensions.width > 0 ? Math.min(imageDimensions.width, screenSize.width * 0.9) : screenSize.width * 0.9,
                    height: imageDimensions.height > 0 ? Math.min(imageDimensions.height, screenSize.height * 0.9) : screenSize.height * 0.9,
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

// Static styles that don't depend on screen size
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
    top: Platform.OS === 'ios' ? 50 : (Platform.OS === 'web' ? 20 : 20),
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
    top: Platform.OS === 'ios' ? 50 : (Platform.OS === 'web' ? 20 : 20),
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
    // Default size, will be overridden by dynamic styles
    width: '100%',
    height: '80%',
  },
});

export default ImageViewer;
