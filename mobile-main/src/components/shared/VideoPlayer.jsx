/**
 * VideoPlayer Component
 *
 * Full-screen video player with playback controls and download button.
 * On web, uses full browser window instead of phone-sized container.
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
import { CustomAlert } from '../../components/CustomAlert';
import { Video, ResizeMode } from 'expo-av';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [screenSize, setScreenSize] = useState(getScreenDimensions());

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

  /**
   * Download video to device
   */
  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Web platform - use anchor element for download
      if (Platform.OS === 'web') {
        const link = window.document.createElement('a');
        link.href = videoUrl;
        // Extract filename from URL and ensure it has .mp4 extension
        let filename = videoUrl.split('/').pop() || 'video';
        if (!filename.includes('.')) {
          filename += '.mp4';
        }
        link.download = filename;
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        CustomAlert.alert(
          'Download Started',
          'Video download has started.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Native platform - use MediaLibrary and FileSystem
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        CustomAlert.alert(
          'Permission Required',
          'Photo library access is required to save videos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Download video to temporary location
      const filename = videoUrl.split('/').pop() + '.mp4';
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResult = await FileSystem.downloadAsync(videoUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Save to media library
      await MediaLibrary.createAssetAsync(downloadResult.uri);

      CustomAlert.alert(
        'Success',
        'Video saved to your photo library!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Download error:', error);
      CustomAlert.alert(
        'Download Failed',
        error.message || 'Failed to save video. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
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

          {/* Video player */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleScreenTap}
            style={[styles.videoTouchable, { width: screenSize.width * 0.9, height: screenSize.height * 0.9 }]}
          >
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={{ width: screenSize.width * 0.9, height: screenSize.height * 0.9 }}
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
  downloadButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (Platform.OS === 'web' ? 20 : 20),
    left: 20,
    zIndex: 20,
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
    zIndex: 10,
  },
  videoTouchable: {
    // Base styles, dimensions set dynamically
    justifyContent: 'center',
    alignItems: 'center',
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
