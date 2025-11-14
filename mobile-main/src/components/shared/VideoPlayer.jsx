/**
 * VideoPlayer Component
 *
 * Full-screen video player with playback controls.
 *
 * Usage:
 * <VideoPlayer
 *   visible={showPlayer}
 *   videoUrl={selectedVideo}
 *   onClose={() => setShowPlayer(false)}
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
  Text,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * VideoPlayer component
 * @param {Object} props
 * @param {boolean} props.visible - Whether the player is visible
 * @param {string} props.videoUrl - URL of the video to play
 * @param {Function} props.onClose - Callback when player is closed
 */
const VideoPlayer = ({ visible, videoUrl, onClose }) => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls) return;

    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  /**
   * Handle video ready
   */
  const handleReadyForDisplay = () => {
    setIsLoading(false);
  };

  /**
   * Handle playback status update
   */
  const handlePlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    setDuration(status.durationMillis || 0);
    setPosition(status.positionMillis || 0);

    // Loop video when finished
    if (status.didJustFinish) {
      videoRef.current?.setPositionAsync(0);
      setShowControls(true);
    }
  };

  /**
   * Handle play/pause toggle
   */
  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setShowControls(true);
  };

  /**
   * Handle close
   */
  const handleClose = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
      await videoRef.current.unloadAsync();
    }
    setIsLoading(true);
    setIsPlaying(false);
    setPosition(0);
    setShowControls(true);
    onClose();
  };

  /**
   * Handle screen tap (show controls)
   */
  const handleScreenTap = () => {
    setShowControls(true);
  };

  /**
   * Format time in MM:SS
   */
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setIsPlaying(false);
      setPosition(0);
      setShowControls(true);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
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

          {/* Video player */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleScreenTap}
            style={styles.videoTouchable}
          >
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              onReadyForDisplay={handleReadyForDisplay}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              useNativeControls={false}
            />
          </TouchableOpacity>

          {/* Controls overlay */}
          {showControls && !isLoading && (
            <View style={styles.controlsOverlay}>
              {/* Play/Pause button */}
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={togglePlayPause}
              >
                {isPlaying ? (
                  <View style={styles.pauseIcon}>
                    <View style={styles.pauseBar} />
                    <View style={styles.pauseBar} />
                  </View>
                ) : (
                  <View style={styles.playIcon} />
                )}
              </TouchableOpacity>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.timeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
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
    zIndex: 20,
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
    zIndex: 10,
  },
  videoTouchable: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 15,
  },
  playPauseButton: {
    alignSelf: 'center',
    marginBottom: 16,
    padding: 12,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderBottomWidth: 20,
    borderLeftWidth: 30,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
    marginLeft: 6, // Visual centering
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 8,
  },
  pauseBar: {
    width: 8,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6200ee',
    borderRadius: 2,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default VideoPlayer;
