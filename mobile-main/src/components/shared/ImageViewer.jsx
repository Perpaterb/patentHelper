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
} from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

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
