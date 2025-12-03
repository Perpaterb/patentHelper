/**
 * Phone Call Details Screen
 *
 * Shows details of a phone call including:
 * - Call status and duration
 * - Participants list with their status
 * - Recording playback (if available and not hidden)
 * - Admin can request recording deletion
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Card, Title, Text, Avatar, Button, Chip, IconButton, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

/**
 * @typedef {Object} PhoneCallDetailsScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * PhoneCallDetailsScreen component
 *
 * @param {PhoneCallDetailsScreenProps} props
 * @returns {JSX.Element}
 */
export default function PhoneCallDetailsScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [userRole, setUserRole] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [endingCall, setEndingCall] = useState(false);

  useEffect(() => {
    loadGroupInfo();
    if (!passedCall) {
      loadCallDetails();
    }

    // Cleanup sound on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [callId]);

  /**
   * Load group info to get user role
   */
  const loadGroupInfo = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setUserRole(response.data.group?.userRole);
    } catch (err) {
      console.error('Load group info error:', err);
    }
  };

  /**
   * Load call details from API
   */
  const loadCallDetails = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/phone-calls`);
      const foundCall = response.data.phoneCalls?.find(c => c.callId === callId);
      if (foundCall) {
        setCall(foundCall);
      }
    } catch (err) {
      console.error('Load call details error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format duration from milliseconds
   */
  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Format date/time
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'ended':
        return { bg: '#e8f5e9', text: '#2e7d32', border: '#4caf50' };
      case 'active':
        return { bg: '#e3f2fd', text: '#1565c0', border: '#2196f3' };
      case 'ringing':
        return { bg: '#fff3e0', text: '#e65100', border: '#ff9800' };
      case 'missed':
        return { bg: '#ffebee', text: '#c62828', border: '#f44336' };
      default:
        return { bg: '#f5f5f5', text: '#666', border: '#999' };
    }
  };

  /**
   * Get participant status color
   */
  const getParticipantStatusColor = (status) => {
    switch (status) {
      case 'joined':
      case 'accepted':
        return '#4caf50';
      case 'left':
        return '#ff9800';
      case 'rejected':
        return '#f44336';
      case 'missed':
        return '#9e9e9e';
      case 'invited':
        return '#2196f3';
      default:
        return '#666';
    }
  };

  /**
   * Play or pause recording
   */
  const togglePlayback = async () => {
    if (!call?.recordingUrl) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        setLoadingAudio(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: call.recordingUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
        setLoadingAudio(false);
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      Alert.alert('Playback Error', 'Failed to play recording');
      setLoadingAudio(false);
    }
  };

  /**
   * Handle playback status updates
   */
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis || call?.recordingDurationMs || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  /**
   * Seek to position
   */
  const seekTo = async (positionMs) => {
    if (sound) {
      await sound.setPositionAsync(positionMs);
    }
  };

  /**
   * Handle hide recording (admin only)
   */
  const handleHideRecording = () => {
    Alert.alert(
      'Hide Recording',
      'Are you sure you want to hide this recording? This action requires admin approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/groups/${groupId}/phone-calls/${callId}/hide-recording`);
              Alert.alert('Success', 'Recording has been hidden');
              setCall(prev => ({ ...prev, recordingIsHidden: true }));
            } catch (err) {
              console.error('Hide recording error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to hide recording');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle ending the call
   */
  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            setEndingCall(true);
            try {
              await api.put(`/groups/${groupId}/phone-calls/${callId}/end`);
              setCall(prev => ({ ...prev, status: 'ended', endedAt: new Date().toISOString() }));
              Alert.alert('Call Ended', 'The call has been ended.');
            } catch (err) {
              console.error('End call error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to end call');
            } finally {
              setEndingCall(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CustomNavigationHeader
          title="Call Details"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.container}>
        <CustomNavigationHeader
          title="Call Details"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Text>Call not found</Text>
        </View>
      </View>
    );
  }

  const statusColors = getStatusColor(call.status);
  const hasRecording = call.recordingUrl && !call.recordingIsHidden;

  return (
    <View style={styles.container}>
      <CustomNavigationHeader
        title="Call Details"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Call Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.callIconLarge}>
                <Text style={styles.callEmojiLarge}>📞</Text>
              </View>
              <View style={styles.headerInfo}>
                <Chip
                  mode="outlined"
                  style={[styles.statusChip, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}
                  textStyle={[styles.statusChipText, { color: statusColors.text }]}
                >
                  {call.status}
                </Chip>
                <Text style={styles.dateText}>{formatDateTime(call.startedAt)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{formatDuration(call.durationMs)}</Text>
            </View>

            {call.connectedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Connected at:</Text>
                <Text style={styles.infoValue}>{formatDateTime(call.connectedAt)}</Text>
              </View>
            )}

            {call.endedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ended at:</Text>
                <Text style={styles.infoValue}>{formatDateTime(call.endedAt)}</Text>
              </View>
            )}

            {/* End Call Button - show for active or ringing calls */}
            {(call.status === 'active' || call.status === 'ringing') && (
              <Button
                mode="contained"
                onPress={handleEndCall}
                loading={endingCall}
                disabled={endingCall}
                style={styles.endCallButton}
                buttonColor="#d32f2f"
                textColor="#fff"
                icon="phone-hangup"
              >
                {endingCall ? 'Ending...' : 'End Call'}
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Recording Card */}
        {hasRecording && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Recording</Title>

              <View style={styles.playerContainer}>
                <IconButton
                  icon={loadingAudio ? 'loading' : isPlaying ? 'pause' : 'play'}
                  size={40}
                  onPress={togglePlayback}
                  disabled={loadingAudio}
                  style={styles.playButton}
                  iconColor="#fff"
                />

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` }
                      ]}
                    />
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatDuration(playbackPosition)}</Text>
                    <Text style={styles.timeText}>{formatDuration(call.recordingDurationMs)}</Text>
                  </View>
                </View>
              </View>

              {/* Admin can hide recording */}
              {userRole === 'admin' && (
                <Button
                  mode="outlined"
                  onPress={handleHideRecording}
                  style={styles.hideButton}
                  textColor="#d32f2f"
                >
                  Hide Recording
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Recording Hidden Notice */}
        {call.recordingIsHidden && (
          <Card style={[styles.card, styles.hiddenCard]}>
            <Card.Content>
              <View style={styles.hiddenNotice}>
                <Text style={styles.hiddenIcon}>🚫</Text>
                <Text style={styles.hiddenText}>Recording has been hidden</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Participants Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              Participants ({call.participants?.length || 0})
            </Title>

            {/* Initiator */}
            {call.initiator && (
              <View style={styles.participantRow}>
                <Avatar.Text
                  size={40}
                  label={call.initiator.iconLetters || '?'}
                  style={{ backgroundColor: call.initiator.iconColor || '#6200ee' }}
                  color={getContrastTextColor(call.initiator.iconColor || '#6200ee')}
                />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {call.initiator.displayName || 'Unknown'}
                  </Text>
                  <Text style={styles.participantRole}>Caller (Initiator)</Text>
                </View>
              </View>
            )}

            {/* Other participants */}
            {call.participants?.map(participant => {
              if (participant.groupMemberId === call.initiatedBy) return null;
              const statusColor = getParticipantStatusColor(participant.status);
              const bgColor = participant.iconColor || '#6200ee';

              return (
                <View key={participant.groupMemberId} style={styles.participantRow}>
                  <Avatar.Text
                    size={40}
                    label={participant.iconLetters || '?'}
                    style={{ backgroundColor: bgColor }}
                    color={getContrastTextColor(bgColor)}
                  />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.displayName || 'Unknown'}
                    </Text>
                    <Text style={[styles.participantStatus, { color: statusColor }]}>
                      {participant.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  callIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  callEmojiLarge: {
    fontSize: 32,
  },
  headerInfo: {
    flex: 1,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusChipText: {
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  endCallButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playButton: {
    backgroundColor: '#4caf50',
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  hideButton: {
    borderColor: '#d32f2f',
  },
  hiddenCard: {
    backgroundColor: '#fff3e0',
  },
  hiddenNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  hiddenText: {
    fontSize: 14,
    color: '#e65100',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  participantRole: {
    fontSize: 13,
    color: '#4caf50',
  },
  participantStatus: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
