/**
 * Video Call Details Screen
 *
 * Shows details of a video call including:
 * - Call status and duration
 * - Participants list with their status
 * - Recording playback (if available and not hidden)
 * - Admin can request recording deletion
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Title, Text, Avatar, Button, Chip, IconButton, ActivityIndicator } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';
import { CustomAlert } from '../../components/CustomAlert';
import { CONFIG } from '../../constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * VideoCallDetailsScreen component
 *
 * @param {Object} props
 * @returns {JSX.Element}
 */
export default function VideoCallDetailsScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [userRole, setUserRole] = useState(null);
  const [videoStatus, setVideoStatus] = useState({});
  const [endingCall, setEndingCall] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    loadGroupInfo();
    if (!passedCall) {
      loadCallDetails();
    }
  }, [callId]);

  // Poll for recording after call ends (recording takes time to upload)
  useEffect(() => {
    // Only poll if call just ended and doesn't have recording yet
    const shouldPoll = call?.status === 'ended' &&
                       !call?.recordingUrl &&
                       !call?.recording?.url;

    if (!shouldPoll) return;

    let pollCount = 0;
    const maxPolls = 12; // Poll for up to 60 seconds (12 * 5s)

    const pollForRecording = setInterval(async () => {
      pollCount++;
      console.log(`[VideoCallDetails] Polling for recording (${pollCount}/${maxPolls})...`);

      try {
        const response = await api.get(`/groups/${groupId}/video-calls`);
        const updatedCall = response.data.videoCalls?.find(c => c.callId === callId);

        if (updatedCall) {
          // Check if recording is now available
          if (updatedCall.recordingUrl || updatedCall.recording?.url) {
            console.log('[VideoCallDetails] Recording found, updating state');
            setCall(updatedCall);
            clearInterval(pollForRecording);
          } else if (updatedCall.durationMs !== call.durationMs) {
            // Duration updated even if no recording yet
            setCall(updatedCall);
          }
        }
      } catch (err) {
        console.error('[VideoCallDetails] Poll error:', err);
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.log('[VideoCallDetails] Max polls reached, stopping');
        clearInterval(pollForRecording);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollForRecording);
  }, [call?.status, call?.recordingUrl, call?.recording?.url, groupId, callId]);

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
      const response = await api.get(`/groups/${groupId}/video-calls`);
      const foundCall = response.data.videoCalls?.find(c => c.callId === callId);
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
   * Get full recording URL
   */
  const getRecordingUrl = () => {
    if (!call?.recording?.url && !call?.recordingUrl) return null;
    const relativeUrl = call?.recording?.url || call?.recordingUrl;
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${CONFIG.API_BASE_URL}${relativeUrl}`;
  };

  /**
   * Handle video playback status
   */
  const handleVideoStatusUpdate = (status) => {
    setVideoStatus(status);
  };

  /**
   * Handle hide recording (admin only)
   */
  const handleHideRecording = () => {
    CustomAlert.alert(
      'Hide Recording',
      'Are you sure you want to hide this recording? This action requires admin approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/groups/${groupId}/video-calls/${callId}/hide-recording`);
              CustomAlert.alert('Success', 'Recording has been hidden');
              setCall(prev => ({ ...prev, recordingIsHidden: true }));
            } catch (err) {
              console.error('Hide recording error:', err);
              CustomAlert.alert('Error', err.response?.data?.message || 'Failed to hide recording');
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
    CustomAlert.alert(
      'End Video Call',
      'Are you sure you want to end this video call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            setEndingCall(true);
            try {
              await api.put(`/groups/${groupId}/video-calls/${callId}/end`);
              setCall(prev => ({ ...prev, status: 'ended', endedAt: new Date().toISOString() }));
              CustomAlert.alert('Call Ended', 'The video call has been ended.');
            } catch (err) {
              console.error('End call error:', err);
              CustomAlert.alert('Error', err.response?.data?.message || 'Failed to end call');
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
          title="Video Call Details"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196f3" />
        </View>
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.container}>
        <CustomNavigationHeader
          title="Video Call Details"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Text>Call not found</Text>
        </View>
      </View>
    );
  }

  const statusColors = getStatusColor(call.status);
  const hasRecording = (call.recording?.url || call.recordingUrl) &&
                       !call.recording?.isHidden && !call.recordingIsHidden;
  const recordingUrl = getRecordingUrl();
  // Check if recording is still processing
  const isRecordingProcessing = call.recording?.status === 'processing';

  return (
    <View style={styles.container}>
      <CustomNavigationHeader
        title="Video Call Details"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Call Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.callIconLarge}>
                <Text style={styles.callEmojiLarge}>👋</Text>
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
                {endingCall ? 'Ending...' : 'End Video Call'}
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Recording Processing Placeholder */}
        {isRecordingProcessing && (
          <Card style={[styles.card, styles.processingCard]}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Recording</Title>
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#ff9800" />
                <Text style={styles.processingTitle}>Processing Recording</Text>
                <Text style={styles.processingText}>
                  Your video recording is being processed. This may take a few moments.
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Recording Card */}
        {hasRecording && !isRecordingProcessing && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Recording</Title>

              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: recordingUrl }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  onPlaybackStatusUpdate={handleVideoStatusUpdate}
                />
              </View>

              <View style={styles.videoDuration}>
                <Text style={styles.videoDurationText}>
                  Duration: {formatDuration(call.recording?.durationMs || call.recordingDurationMs)}
                </Text>
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

        {/* Recording Hidden/Deleted Notice */}
        {(call.recordingIsHidden || call.recording?.isHidden) && (
          <Card style={[styles.card, styles.deletedCard]}>
            <Card.Content>
              <View style={styles.deletedNotice}>
                <View style={styles.deletedIconContainer}>
                  <Text style={styles.deletedIcon}>🗑️</Text>
                </View>
                <View style={styles.deletedInfo}>
                  <Text style={styles.deletedTitle}>Recording Deleted by Admin</Text>
                  {call.recording?.hiddenBy && (
                    <View style={styles.deletedByRow}>
                      <Avatar.Text
                        size={24}
                        label={call.recording.hiddenBy.iconLetters || '?'}
                        style={{ backgroundColor: call.recording.hiddenBy.iconColor || '#d32f2f' }}
                        color={getContrastTextColor(call.recording.hiddenBy.iconColor || '#d32f2f')}
                      />
                      <Text style={styles.deletedByText}>
                        {call.recording.hiddenBy.displayName || 'Admin'}
                        {call.recording.hiddenAt &&
                          ` • ${formatDateTime(call.recording.hiddenAt)}`
                        }
                      </Text>
                    </View>
                  )}
                  {!call.recording?.hiddenBy && (
                    <Text style={styles.deletedByText}>
                      This recording was removed by a group admin
                    </Text>
                  )}
                </View>
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
  videoContainer: {
    width: '100%',
    height: (SCREEN_WIDTH - 64) * 9 / 16, // 16:9 aspect ratio
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoDuration: {
    alignItems: 'center',
    marginBottom: 16,
  },
  videoDurationText: {
    fontSize: 14,
    color: '#666',
  },
  hideButton: {
    borderColor: '#d32f2f',
  },
  processingCard: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e65100',
    marginTop: 16,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#f57c00',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  deletedCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  deletedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deletedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffcdd2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deletedIcon: {
    fontSize: 24,
  },
  deletedInfo: {
    flex: 1,
  },
  deletedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c62828',
    marginBottom: 4,
  },
  deletedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deletedByText: {
    fontSize: 13,
    color: '#d32f2f',
    marginLeft: 8,
    flex: 1,
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
    color: '#2196f3',
  },
  participantStatus: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
