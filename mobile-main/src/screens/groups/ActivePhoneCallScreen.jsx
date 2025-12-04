/**
 * Active Phone Call Screen
 *
 * Shows during an active or ringing phone call.
 * Features:
 * - LiveKit for audio with server-side recording
 * - Participant avatars and status
 * - Call duration timer (when connected)
 * - Mute and speaker controls
 * - End call button
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { Text, Avatar, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import { CustomAlert } from '../../components/CustomAlert';

// LiveKit imports
import {
  useRoom,
  useParticipants,
  AudioSession,
  registerGlobals,
} from '@livekit/react-native';

// Register LiveKit globals for React Native
registerGlobals();

/**
 * Get color for participant status
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
    case 'invited':
      return '#2196f3';
    default:
      return '#666';
  }
};

/**
 * ActivePhoneCallScreen component
 */
export default function ActivePhoneCallScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall, isInitiator } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [endingCall, setEndingCall] = useState(false);
  const [leavingCall, setLeavingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // LiveKit connection state
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [livekitError, setLivekitError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const recordingStartedRef = useRef(false);

  // LiveKit Room hook
  const { room, connect, disconnect } = useRoom();
  const participants = useParticipants({ room });

  useEffect(() => {
    if (!passedCall) {
      loadCallDetails();
    }

    // Start polling for call status updates
    startPolling();

    // Set up audio mode
    setupAudio();

    // Prevent back button from leaving without ending
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true;
    });

    return () => {
      stopPolling();
      disconnectLiveKit();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      backHandler.remove();
    };
  }, [callId]);

  // Connect to LiveKit when call becomes active
  useEffect(() => {
    if (call?.status === 'active' && !livekitConnected && !livekitError) {
      connectToLiveKit();
    }
  }, [call?.status]);

  // Start duration timer when call becomes active
  useEffect(() => {
    if (call?.status === 'active' && call?.connectedAt) {
      startDurationTimer();
    }
  }, [call?.status, call?.connectedAt]);

  // Start server-side recording when connected
  useEffect(() => {
    if (livekitConnected && call?.status === 'active' && isInitiator && !recordingStartedRef.current) {
      startServerRecording();
    }
  }, [livekitConnected, call?.status, isInitiator]);

  const setupAudio = async () => {
    try {
      // Configure audio for LiveKit
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: ['speaker', 'earpiece'],
          audioFocusMode: 'gain',
        },
        ios: {
          defaultOutput: 'earpiece',
        },
      });
      await AudioSession.startAudioSession();
    } catch (err) {
      console.error('[ActivePhoneCall] Audio setup error:', err);
    }
  };

  /**
   * Connect to LiveKit room
   */
  const connectToLiveKit = async () => {
    try {
      console.log('[ActivePhoneCall] Connecting to LiveKit...');

      // Get token from backend
      const response = await api.get(`/groups/${groupId}/phone-calls/${callId}/livekit-token`);
      const { livekitUrl, token, roomName } = response.data;

      if (!livekitUrl || !token) {
        throw new Error('LiveKit not configured on server');
      }

      // Connect to LiveKit room
      await connect(livekitUrl, token, {
        autoSubscribe: true,
      });

      setLivekitConnected(true);
      console.log('[ActivePhoneCall] Connected to LiveKit room:', roomName);
    } catch (err) {
      console.error('[ActivePhoneCall] LiveKit connection error:', err);
      setLivekitError(err.message || 'Failed to connect to call');
    }
  };

  /**
   * Disconnect from LiveKit room
   */
  const disconnectLiveKit = async () => {
    try {
      if (room) {
        await disconnect();
      }
      await AudioSession.stopAudioSession();
    } catch (err) {
      console.error('[ActivePhoneCall] LiveKit disconnect error:', err);
    }
  };

  /**
   * Start server-side recording (initiator only)
   */
  const startServerRecording = async () => {
    if (recordingStartedRef.current) return;
    recordingStartedRef.current = true;

    try {
      console.log('[ActivePhoneCall] Starting server-side recording...');
      await api.post(`/groups/${groupId}/phone-calls/${callId}/start-recording`);
      setIsRecording(true);
      console.log('[ActivePhoneCall] Server-side recording started');
    } catch (err) {
      console.error('[ActivePhoneCall] Failed to start server recording:', err);
      // Don't fail the call if recording fails
    }
  };

  /**
   * Stop server-side recording
   */
  const stopServerRecording = async () => {
    if (!isRecording) return;

    try {
      console.log('[ActivePhoneCall] Stopping server-side recording...');
      await api.post(`/groups/${groupId}/phone-calls/${callId}/stop-recording`);
      setIsRecording(false);
      console.log('[ActivePhoneCall] Server-side recording stopped');
    } catch (err) {
      console.error('[ActivePhoneCall] Failed to stop server recording:', err);
    }
  };

  const fetchCallUpdate = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/phone-calls`);
      const updatedCall = response.data.phoneCalls?.find(c => c.callId === callId);
      if (updatedCall) {
        setCall(updatedCall);

        if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
          console.log('[ActivePhoneCall] Call ended remotely');
          stopPolling();
          await stopServerRecording();
          await disconnectLiveKit();

          navigation.replace('PhoneCallDetails', {
            groupId,
            callId,
            call: updatedCall,
          });
        }
      }
    } catch (err) {
      console.error('Poll call status error:', err);
    }
  };

  const startPolling = () => {
    fetchCallUpdate();
    pollRef.current = setInterval(fetchCallUpdate, 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startDurationTimer = () => {
    if (timerRef.current) return;
    const startTime = call.connectedAt ? new Date(call.connectedAt).getTime() : Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = async () => {
    const newValue = !isMuted;
    setIsMuted(newValue);

    // Toggle microphone in LiveKit
    if (room?.localParticipant) {
      await room.localParticipant.setMicrophoneEnabled(!newValue);
    }
  };

  const handleToggleSpeaker = async () => {
    const newValue = !isSpeaker;
    setIsSpeaker(newValue);

    try {
      // Switch audio output
      if (Platform.OS === 'ios') {
        await AudioSession.configureAudio({
          ios: {
            defaultOutput: newValue ? 'speaker' : 'earpiece',
          },
        });
      } else {
        await AudioSession.configureAudio({
          android: {
            preferredOutputList: newValue ? ['speaker'] : ['earpiece', 'speaker'],
          },
        });
      }
    } catch (err) {
      console.error('[ActivePhoneCall] Speaker toggle error:', err);
    }
  };

  const handleLeaveCall = () => {
    if (leavingCall) return;

    CustomAlert.alert(
      'Leave Phone Call',
      isInitiator
        ? 'As the initiator, leaving will end the call for everyone.'
        : 'Are you sure you want to leave this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeavingCall(true);
            try {
              if (isInitiator) {
                await stopServerRecording();
              }
              await disconnectLiveKit();
              const response = await api.put(`/groups/${groupId}/phone-calls/${callId}/leave`);
              stopPolling();

              if (response.data.callEnded) {
                navigation.replace('PhoneCallDetails', {
                  groupId,
                  callId,
                  call: { ...call, status: 'ended', endedAt: new Date().toISOString() },
                });
              } else {
                navigation.replace('PhoneCalls', { groupId });
              }
            } catch (err) {
              console.error('Leave call error:', err);
              CustomAlert.alert('Error', err.response?.data?.message || 'Failed to leave call');
              setLeavingCall(false);
            }
          },
        },
      ]
    );
  };

  const handleEndCall = () => {
    if (endingCall) return;

    CustomAlert.alert(
      'End Phone Call for Everyone',
      'This will end the phone call for all participants. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End for All',
          style: 'destructive',
          onPress: async () => {
            setEndingCall(true);
            try {
              await stopServerRecording();
              await disconnectLiveKit();
              await api.put(`/groups/${groupId}/phone-calls/${callId}/end`);
              stopPolling();
              navigation.replace('PhoneCallDetails', {
                groupId,
                callId,
                call: { ...call, status: 'ended', endedAt: new Date().toISOString() },
              });
            } catch (err) {
              console.error('End call error:', err);
              CustomAlert.alert('Error', err.response?.data?.message || 'Failed to end call');
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
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Call not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const isRinging = call.status === 'ringing';
  const isActive = call.status === 'active';

  // Get remote participant info - the person we're talking to
  const remoteParticipant = isInitiator
    ? call.participants?.find(p => ['accepted', 'joined'].includes(p.status)) || call.participants?.[0]
    : call.initiator;

  // LiveKit participants count (excluding local)
  const remoteParticipantsCount = participants.filter(p => !p.isLocal).length;

  return (
    <View style={styles.container}>
      {/* Top Status */}
      <View style={styles.topSection}>
        <Text style={styles.statusText}>
          {isRinging ? '📞 Calling...' : '📞 Phone Call'}
        </Text>
        {isActive && (
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        )}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>REC</Text>
          </View>
        )}
      </View>

      {/* Main Content - Participant Avatar */}
      <View style={styles.mainContent}>
        {remoteParticipant && (
          <>
            <View style={styles.avatarPulse}>
              <Avatar.Text
                size={120}
                label={remoteParticipant.iconLetters || '?'}
                style={{ backgroundColor: remoteParticipant.iconColor || '#6200ee' }}
                color={getContrastTextColor(remoteParticipant.iconColor || '#6200ee')}
              />
            </View>
            <Text style={styles.participantName}>
              {remoteParticipant.displayName || 'Participant'}
            </Text>
            <Text style={styles.connectionStatus}>
              {isRinging ? 'Ringing...' :
               !livekitConnected && !livekitError ? 'Connecting...' :
               livekitError ? 'Connection failed' :
               remoteParticipantsCount > 0 ? 'Connected' :
               'Waiting for participant...'}
            </Text>
          </>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <View style={styles.controlItem}>
            <IconButton
              icon={isMuted ? 'microphone-off' : 'microphone'}
              iconColor={isMuted ? '#f44336' : '#fff'}
              size={32}
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}
            />
            <Text style={styles.controlLabel}>Mute</Text>
          </View>

          <View style={styles.controlItem}>
            <IconButton
              icon={isSpeaker ? 'volume-high' : 'volume-medium'}
              iconColor="#fff"
              size={32}
              style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
              onPress={handleToggleSpeaker}
            />
            <Text style={styles.controlLabel}>Speaker</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={handleLeaveCall}
            loading={leavingCall}
            disabled={leavingCall || endingCall}
            style={styles.leaveButton}
            buttonColor="#ff9800"
            textColor="#fff"
            icon="exit-run"
          >
            {leavingCall ? 'Leaving...' : 'Leave'}
          </Button>
          {isInitiator && (
            <Button
              mode="contained"
              onPress={handleEndCall}
              loading={endingCall}
              disabled={endingCall || leavingCall}
              style={styles.endButton}
              buttonColor="#d32f2f"
              textColor="#fff"
              icon="phone-hangup"
            >
              {endingCall ? 'Ending...' : 'End All'}
            </Button>
          )}
        </View>
      </View>

      {/* LiveKit Error */}
      {livekitError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{livekitError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topSection: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  durationText: {
    color: '#4caf50',
    fontSize: 32,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  recordingLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarPulse: {
    padding: 12,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  participantName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  connectionStatus: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
  },
  bottomControls: {
    paddingBottom: 50,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    gap: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 40,
  },
  controlItem: {
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  leaveButton: {
    borderRadius: 24,
  },
  endButton: {
    borderRadius: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    marginHorizontal: 40,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
