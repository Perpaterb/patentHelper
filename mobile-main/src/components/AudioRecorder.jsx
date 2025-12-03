/**
 * AudioRecorder Component
 *
 * Provides audio recording functionality with volume visualization.
 * Shows recording state with animated circle and timer.
 * Includes review mode with playback before sending.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { Audio } from 'expo-av';

const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes

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
 * AudioRecorder component
 *
 * @param {Object} props
 * @param {Function} props.onRecordingComplete - Called with {uri, duration, mimeType} when recording is done and user wants to send
 * @param {Function} props.onCancel - Called when user cancels recording
 * @returns {JSX.Element}
 */
export default function AudioRecorder({ onRecordingComplete, onCancel }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [sound, setSound] = useState(null);
  const [metering, setMetering] = useState(-160); // dB level for visualization

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

  // Pulse animation based on metering
  useEffect(() => {
    if (isRecording) {
      // Convert dB to scale (dB range is typically -160 to 0)
      // Map to scale 0.8 to 1.5
      const normalizedLevel = Math.max(0, (metering + 160) / 160);
      const scale = 0.8 + normalizedLevel * 0.7;

      Animated.timing(pulseAnim, {
        toValue: scale,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [metering, isRecording]);

  /**
   * Start recording audio
   */
  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Audio permission not granted');
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording with metering enabled
      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        },
        (status) => {
          if (status.isRecording) {
            setMetering(status.metering ?? -160);
          }
        },
        100 // Update interval in ms
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1000;
          // Auto-stop at max duration
          if (newDuration >= MAX_DURATION_MS) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  /**
   * Stop recording audio
   */
  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Clear timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  /**
   * Play recorded audio for review
   */
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
      console.error('Failed to play recording:', error);
    }
  };

  /**
   * Pause playback
   */
  const pausePlayback = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  /**
   * Handle send - pass recording data to parent
   */
  const handleSend = () => {
    if (recordedUri) {
      onRecordingComplete({
        uri: recordedUri,
        duration: duration,
        mimeType: Platform.OS === 'ios' ? 'audio/x-m4a' : 'audio/mp4',
      });
    }
  };

  /**
   * Handle delete - discard recording
   */
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
          <Animated.View
            style={[
              styles.recordingCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          <Text style={styles.recordingLabel}>Recording...</Text>
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

  // Review mode (after recording stopped)
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

  // Initial state - start recording immediately
  useEffect(() => {
    startRecording();
  }, []);

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
  recordingCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f44336',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    minWidth: 60,
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
