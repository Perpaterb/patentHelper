/**
 * AudioPlayer Component
 *
 * Displays audio messages with play/pause, progress bar, and duration.
 * Used for rendering audio attachments in message bubbles.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
 * @returns {JSX.Element}
 */
export default function AudioPlayer({ uri, duration: serverDuration, isMyMessage = false }) {
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

  /**
   * Seek to position
   */
  const handleSeek = async (event) => {
    if (!sound || !duration) return;

    const { locationX } = event.nativeEvent;
    const { width } = event.target.getBoundingClientRect?.() || { width: 150 };
    const seekPosition = (locationX / width) * duration;

    try {
      await sound.setPositionAsync(Math.floor(seekPosition));
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
          <MaterialCommunityIcons name="loading" size={28} color={iconColor} />
        ) : (
          <MaterialCommunityIcons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={36}
            color={iconColor}
          />
        )}
      </TouchableOpacity>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
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
          </View>
        </View>
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
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
