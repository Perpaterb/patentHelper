/**
 * Active Phone Call Screen
 *
 * Shows during an active or ringing phone call.
 * Features:
 * - WebRTC peer-to-peer audio (web only for now)
 * - Participant avatars and status
 * - Call duration timer (when connected)
 * - Mute and speaker controls
 * - End call button
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { Text, Avatar, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import { CustomAlert } from '../../components/CustomAlert';
import { useWebRTC } from '../../hooks/useWebRTC';

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

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // WebRTC hook - audio only for phone calls
  const {
    localStream,
    remoteStreams,
    isConnecting,
    error: webrtcError,
    connectionStates,
    isWebRTCSupported,
    toggleAudio,
    stopConnection,
  } = useWebRTC({
    groupId,
    callId,
    isActive: call?.status === 'active',
    isInitiator,
    audioOnly: true,
    callType: 'phone',
  });

  // Get first remote stream (for 1-to-1 calls)
  const remoteStreamEntries = Object.entries(remoteStreams);
  const firstRemoteStream = remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null;

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
      stopConnection();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopRecording();
      backHandler.remove();
    };
  }, [callId]);

  // Start duration timer when call becomes active
  useEffect(() => {
    if (call?.status === 'active' && call?.connectedAt) {
      startDurationTimer();
    }
  }, [call?.status, call?.connectedAt]);

  // Play remote audio on web
  useEffect(() => {
    if (Platform.OS === 'web' && remoteAudioRef.current && firstRemoteStream) {
      remoteAudioRef.current.srcObject = firstRemoteStream;
    }
  }, [firstRemoteStream]);

  // Start recording when call becomes active
  useEffect(() => {
    if (call?.status === 'active' && !isRecording && recordingStatus === 'idle') {
      console.log('[ActivePhoneCall] Call is active, starting recording...');
      setTimeout(() => startRecording(), 500);
    }
  }, [call?.status]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !isSpeaker,
      });
    } catch (err) {
      console.error('[ActivePhoneCall] Audio setup error:', err);
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
          await stopRecording();
          stopConnection();

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

  const handleToggleMute = () => {
    const newValue = !isMuted;
    setIsMuted(newValue);
    toggleAudio(!newValue);
  };

  const handleToggleSpeaker = async () => {
    const newValue = !isSpeaker;
    setIsSpeaker(newValue);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !newValue,
      });
    } catch (err) {
      console.error('[ActivePhoneCall] Speaker toggle error:', err);
    }
  };

  /**
   * Start recording using MediaRecorder API (web) or Audio.Recording (mobile)
   */
  const startRecording = async () => {
    if (isRecording) return;

    console.log('[ActivePhoneCall] Starting recording...');
    setRecordingStatus('recording');
    setIsRecording(true);

    if (Platform.OS === 'web' && localStream) {
      try {
        // Combine local and remote audio for recording
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        // Add local audio
        if (localStream.getAudioTracks().length > 0) {
          const localAudioSource = audioContext.createMediaStreamSource(localStream);
          localAudioSource.connect(destination);
        }

        // Add remote audio if available
        if (firstRemoteStream?.getAudioTracks().length > 0) {
          const remoteAudioSource = audioContext.createMediaStreamSource(firstRemoteStream);
          remoteAudioSource.connect(destination);
        }

        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
        console.log('[ActivePhoneCall] MediaRecorder started');
      } catch (err) {
        console.error('[ActivePhoneCall] MediaRecorder error:', err);
        setRecordingStatus('error');
      }
    }
  };

  /**
   * Stop recording and upload
   */
  const stopRecording = async () => {
    if (!isRecording) return;

    console.log('[ActivePhoneCall] Stopping recording...');

    if (Platform.OS === 'web' && mediaRecorderRef.current) {
      return new Promise((resolve) => {
        mediaRecorderRef.current.onstop = async () => {
          try {
            setRecordingStatus('uploading');
            const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            recordedChunksRef.current = [];

            const formData = new FormData();
            formData.append('recording', blob, `phone-call-${callId}.webm`);

            await api.post(
              `/groups/${groupId}/phone-calls/${callId}/recording`,
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            console.log('[ActivePhoneCall] Recording uploaded');
          } catch (err) {
            console.error('[ActivePhoneCall] Upload error:', err);
          } finally {
            setIsRecording(false);
            setRecordingStatus('idle');
            resolve();
          }
        };
        mediaRecorderRef.current.stop();
      });
    }

    setIsRecording(false);
    setRecordingStatus('idle');
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
              await stopRecording();
              stopConnection();
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
              await stopRecording();
              stopConnection();
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

  // Get remote participant info
  const remoteParticipant = call.participants?.find(p =>
    p.groupMemberId !== call.initiatedBy && ['accepted', 'joined'].includes(p.status)
  ) || (isInitiator ? call.participants?.[0] : call.initiator);

  return (
    <View style={styles.container}>
      {/* Hidden audio element for remote stream on web */}
      {Platform.OS === 'web' && (
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      )}

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
               isConnecting ? 'Connecting audio...' :
               firstRemoteStream ? 'Connected' :
               !isWebRTCSupported ? 'WebRTC not supported on mobile yet' :
               'Waiting for audio...'}
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

      {/* WebRTC Error */}
      {webrtcError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{webrtcError}</Text>
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
