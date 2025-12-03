/**
 * AudioRecorder Component
 *
 * Provides audio recording functionality with volume visualization.
 * Shows recording state with animated circle and timer.
 * Circle color indicates audio level: green (good), orange (high), red (too loud).
 * On web, uses simulated pulse since metering isn't available.
 * Includes review mode with playback before sending.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { Audio } from 'expo-av';

const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const IS_WEB = Platform.OS === 'web';

// Color thresholds for audio levels (1-10 scale)
const LEVEL_COLORS = {
  good: '#4CAF50',    // Green - levels 1-7
  warning: '#FF9800', // Orange - levels 8-9
  danger: '#f44336',  // Red - level 10
};

/**
 * Format milliseconds to mm:ss
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Convert dB metering value to 1-10 level scale
 * @param {number} dB - Metering value in dB (typically -160 to 0)
 * @returns {number} Level from 1-10
 */
function dbToLevel(dB) {
  if (dB <= -60) return 1;
  if (dB >= 0) return 10;
  const normalized = (dB + 60) / 60;
  return Math.round(1 + normalized * 9);
}

/**
 * Get color based on audio level
 * @param {number} level - Audio level 1-10
 * @returns {string} Color hex code
 */
function getLevelColor(level) {
  if (level >= 10) return LEVEL_COLORS.danger;
  if (level >= 8) return LEVEL_COLORS.warning;
  return LEVEL_COLORS.good;
}

/**
 * AudioRecorder component
 */
export default function AudioRecorder({ onRecordingComplete, onCancel }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [sound, setSound] = useState(null);
  const [metering, setMetering] = useState(-160);
  const [audioLevel, setAudioLevel] = useState(5); // Default to mid-level for web
  const [levelColor, setLevelColor] = useState(LEVEL_COLORS.good);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Pulse animation for native (based on metering)
  useEffect(() => {
    if (isRecording && !IS_WEB) {
      const level = dbToLevel(metering);
      setAudioLevel(level);
      setLevelColor(getLevelColor(level));
      const scale = 0.8 + (level / 10) * 0.7;

      Animated.timing(pulseAnim, {
        toValue: scale,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [metering, isRecording]);

  // On web, just show a static red circle (no metering available)
  useEffect(() => {
    if (isRecording && IS_WEB) {
      setLevelColor(LEVEL_COLORS.danger); // Red dot on web
      setAudioLevel(null); // Don't show level number on web
    }
  }, [isRecording]);

  // Start recording on mount
  useEffect(() => {
    if (!isRecording && !recordedUri && !recording) {
      startRecording();
    }
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: !IS_WEB, // Only enable on native
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (status.isRecording && !IS_WEB) {
            setMetering(status.metering ?? -160);
          }
        },
        100
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1000;
          if (newDuration >= MAX_DURATION_MS) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      // Silently handle errors
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
    } catch (error) {
      // Silently handle errors
    }
  };

  const playRecording = async () => {
    if (!recordedUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
            }
          }
        }
      );

      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      // Silently handle errors
    }
  };

  const pausePlayback = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleSend = () => {
    if (recordedUri) {
      // Determine correct mimeType based on platform
      // Web uses MediaRecorder which produces WebM format
      // iOS produces m4a, Android produces mp4/m4a
      let mimeType;
      if (IS_WEB) {
        mimeType = 'audio/webm';
      } else if (Platform.OS === 'ios') {
        mimeType = 'audio/x-m4a';
      } else {
        mimeType = 'audio/mp4';
      }

      onRecordingComplete({
        uri: recordedUri,
        duration: duration,
        mimeType: mimeType,
      });
    }
  };

  const handleDelete = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setRecordedUri(null);
    setDuration(0);
    setPlaybackPosition(0);
    onCancel();
  };

  // Recording mode
  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={styles.recordingContainer}>
          <View style={styles.levelIndicatorContainer}>
            <Animated.View
              style={[
                styles.recordingCircle,
                {
                  backgroundColor: levelColor,
                  transform: IS_WEB ? [] : [{ scale: pulseAnim }],
                },
              ]}
            />
            {audioLevel !== null && (
              <Text style={[styles.levelText, { color: '#fff' }]}>
                {audioLevel}
              </Text>
            )}
          </View>
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: levelColor }]}>
              {formatDuration(duration)}
            </Text>
            <Text style={styles.recordingLabel}>Recording...</Text>
          </View>
        </View>
        <IconButton
          icon="stop"
          mode="contained"
          iconColor="#fff"
          containerColor="#f44336"
          size={32}
          onPress={stopRecording}
          style={styles.stopButton}
        />
      </View>
    );
  }

  // Review mode
  if (recordedUri) {
    return (
      <View style={styles.container}>
        <View style={styles.reviewContainer}>
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            mode="contained"
            iconColor="#fff"
            containerColor="#6200ee"
            size={32}
            onPress={isPlaying ? pausePlayback : playRecording}
          />
          <View style={styles.durationInfo}>
            <Text style={styles.durationText}>
              {formatDuration(isPlaying ? playbackPosition : duration)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${duration > 0 ? (playbackPosition / duration) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <IconButton
            icon="delete"
            mode="outlined"
            iconColor="#f44336"
            size={24}
            onPress={handleDelete}
          />
          <IconButton
            icon="send"
            mode="contained"
            iconColor="#fff"
            containerColor="#6200ee"
            size={24}
            onPress={handleSend}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Preparing to record...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  recordingCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'absolute',
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    zIndex: 1,
  },
  timerContainer: {
    flex: 1,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  recordingLabel: {
    fontSize: 14,
    color: '#666',
  },
  stopButton: {
    marginLeft: 8,
  },
  reviewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationInfo: {
    flex: 1,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6200ee',
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});
