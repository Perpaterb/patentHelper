/**
 * AudioPlayer Component
 *
 * Displays audio messages with play/pause, progress bar, and duration.
 * Used for rendering audio attachments in message bubbles.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

/**
 * Format milliseconds to mm:ss
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatDuration(ms) {
  if (!ms || !isFinite(ms) || isNaN(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * AudioPlayer component
 *
 * @param {Object} props
 * @param {string} props.uri - URI of the audio file
 * @param {number} [props.duration] - Duration in milliseconds from server (used as fallback)
 * @param {boolean} [props.isMyMessage] - Whether this is the current user's message (for styling)
 * @param {string} [props.mimeType] - MIME type of the audio file (not used, kept for compatibility)
 * @returns {JSX.Element}
 */
export default function AudioPlayer({ uri, duration: serverDuration, isMyMessage = false, mimeType }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  // Use server-provided duration as default, fallback to 0
  const [duration, setDuration] = useState(serverDuration || 0);
  const [error, setError] = useState(null);

  const soundRef = useRef(null);

  // Load sound on mount
  useEffect(() => {
    loadSound();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [uri]);

  // Update duration if server provides it later
  useEffect(() => {
    if (serverDuration && serverDuration > 0 && (!duration || duration === 0)) {
      setDuration(serverDuration);
    }
  }, [serverDuration]);

  /**
   * Load the audio file
   */
  const loadSound = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);

      // Only update duration from audio file if it's a valid number and we don't have a server duration
      if (status.isLoaded && status.durationMillis && !isNaN(status.durationMillis) && status.durationMillis > 0) {
        setDuration(status.durationMillis);
      }

      setIsLoading(false);
    } catch (err) {
      // Don't spam console with errors, just set error state
      setError('Failed to load audio');
      setIsLoading(false);
    }
  };

  /**
   * Handle playback status updates
   */
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      const pos = status.positionMillis || 0;
      setPosition(pos);
      setIsPlaying(status.isPlaying || false);

      // Update duration from audio if it's valid
      if (status.durationMillis && isFinite(status.durationMillis) && !isNaN(status.durationMillis) && status.durationMillis > 0) {
        setDuration(prevDuration => {
          // Only update if we don't have a valid duration
          if (!prevDuration || prevDuration === 0) {
            return status.durationMillis;
          }
          return prevDuration;
        });
      }

      // When playback finishes, use position as duration if we don't have one
      if (status.didJustFinish) {
        setDuration(prevDuration => {
          if ((!prevDuration || prevDuration === 0) && pos > 0) {
            return pos;
          }
          return prevDuration;
        });
        setPosition(0);
        setIsPlaying(false);
      }
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = async () => {
    // Use soundRef for more reliable access
    const currentSound = soundRef.current;
    if (!currentSound) {
      await loadSound();
      return;
    }

    try {
      // Check if sound is actually loaded before operating on it
      const status = await currentSound.getStatusAsync();
      if (!status.isLoaded) {
        await loadSound();
        return;
      }

      if (isPlaying) {
        await currentSound.pauseAsync();
      } else {
        // If at end, restart from beginning
        if (duration > 0 && position >= duration - 100) {
          await currentSound.setPositionAsync(0);
        }
        await currentSound.playAsync();
      }
    } catch (err) {
      // Try to reload the sound if there's an error
      setError('Playback failed. Tap to retry.');
    }
  };

  // Track progress bar width for seek calculations
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  /**
   * Seek to position when user taps on progress bar
   */
  const handleSeek = async (event) => {
    const currentSound = soundRef.current;
    if (!currentSound || !duration || progressBarWidth === 0) return;

    const { locationX } = event.nativeEvent;
    const seekPosition = (locationX / progressBarWidth) * duration;

    try {
      await currentSound.setPositionAsync(Math.max(0, Math.floor(seekPosition)));
    } catch (err) {
      // Silently handle seek errors
    }
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const backgroundColor = isMyMessage ? '#bbdefb' : '#f5f5f5';
  const iconColor = isMyMessage ? '#1976d2' : '#6200ee';
  const textColor = isMyMessage ? '#1976d2' : '#333';

  if (error) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor }]}
        onPress={loadSound}
      >
        <MaterialCommunityIcons name="refresh" size={24} color="#f44336" />
        <Text style={styles.errorText}>Tap to retry</Text>
        {duration > 0 && (
          <Text style={[styles.durationText, { color: textColor, marginLeft: 8 }]}>
            {formatDuration(duration)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <TouchableOpacity
        onPress={togglePlayPause}
        disabled={isLoading}
        style={styles.playButton}
      >
        {isLoading ? (
          <ActivityIndicator size={28} color={iconColor} />
        ) : (
          <MaterialCommunityIcons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={36}
            color={iconColor}
          />
        )}
      </TouchableOpacity>

      <View style={styles.progressContainer}>
        <Pressable
          style={styles.progressBarContainer}
          onPress={handleSeek}
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: iconColor,
                },
              ]}
            />
            {/* Seek indicator dot */}
            <View
              style={[
                styles.seekDot,
                {
                  left: `${progressPercent}%`,
                  backgroundColor: iconColor,
                },
              ]}
            />
          </View>
        </Pressable>
        <Text style={[styles.durationText, { color: textColor }]}>
          {formatDuration(isPlaying ? position : duration)}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="waveform"
        size={20}
        color={iconColor}
        style={styles.waveformIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    minWidth: 200,
    maxWidth: 280,
  },
  playButton: {
    marginRight: 8,
  },
  progressContainer: {
    flex: 1,
    marginRight: 8,
  },
  progressBarContainer: {
    marginBottom: 4,
    paddingVertical: 8, // Larger touch target
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  seekDot: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  waveformIcon: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
});
