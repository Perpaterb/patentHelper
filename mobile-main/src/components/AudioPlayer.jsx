/**
 * AudioPlayer Component
 *
 * Displays audio messages with play/pause, progress bar, and duration.
 * Used for rendering audio attachments in message bubbles.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

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
 * AudioPlayer component
 *
 * @param {Object} props
 * @param {string} props.uri - URI of the audio file
 * @param {number} [props.duration] - Duration in milliseconds (optional, will be calculated if not provided)
 * @param {boolean} [props.isMyMessage] - Whether this is the current user's message (for styling)
 * @returns {JSX.Element}
 */
export default function AudioPlayer({ uri, duration: initialDuration, isMyMessage = false }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [error, setError] = useState(null);

  const soundRef = useRef(null);

  // Load sound on mount
  useEffect(() => {
    loadSound();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [uri]);

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

      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load audio:', err);
      setError('Failed to load audio');
      setIsLoading(false);
    }
  };

  /**
   * Handle playback status updates
   */
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying || false);

      if (status.durationMillis && status.durationMillis !== duration) {
        setDuration(status.durationMillis);
      }

      // Reset when playback finishes
      if (status.didJustFinish) {
        setPosition(0);
        setIsPlaying(false);
      }
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        // If at end, restart from beginning
        if (position >= duration - 100) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
      }
    } catch (err) {
      console.error('Playback error:', err);
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
      console.error('Seek error:', err);
    }
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  const backgroundColor = isMyMessage ? '#bbdefb' : '#f5f5f5';
  const iconColor = isMyMessage ? '#1976d2' : '#6200ee';
  const textColor = isMyMessage ? '#1976d2' : '#333';

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <MaterialCommunityIcons name="alert-circle" size={24} color="#f44336" />
        <Text style={styles.errorText}>Audio unavailable</Text>
      </View>
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
