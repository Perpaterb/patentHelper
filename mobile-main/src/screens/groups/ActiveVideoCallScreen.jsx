/**
 * Active Video Call Screen
 *
 * Shows during an active or ringing video call.
 * Features:
 * - LiveKit for video/audio with server-side recording
 * - Remote video as full screen, local video as PiP
 * - Call status (ringing/active)
 * - Call duration timer (when connected)
 * - Camera toggle, mute, and flip buttons
 * - End call button
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, Platform, Dimensions } from 'react-native';
import { Text, Avatar, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import { CustomAlert } from '../../components/CustomAlert';

// LiveKit imports
import {
  useRoom,
  useParticipants,
  useTracks,
  VideoTrack,
  AudioSession,
  registerGlobals,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

// Register LiveKit globals for React Native
registerGlobals();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// PiP dimensions
const PIP_WIDTH = 120;
const PIP_HEIGHT = 160;
const PIP_MARGIN = 16;

/**
 * ActiveVideoCallScreen component
 */
export default function ActiveVideoCallScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall, isInitiator } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [endingCall, setEndingCall] = useState(false);
  const [leavingCall, setLeavingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Camera and audio state
  const [cameraFacing, setCameraFacing] = useState('front');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

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

  // Get video tracks
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], {
    room,
    onlySubscribed: false,
  });

  // Separate local and remote tracks
  const localVideoTrack = tracks.find(
    t => t.participant?.isLocal && t.source === Track.Source.Camera
  );
  const remoteVideoTrack = tracks.find(
    t => !t.participant?.isLocal && t.source === Track.Source.Camera
  );

  useEffect(() => {
    if (!passedCall) {
      loadCallDetails();
    }

    // Start polling for call status updates
    startPolling();

    // Set up audio
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
          defaultOutput: 'speaker',
        },
      });
      await AudioSession.startAudioSession();
    } catch (err) {
      console.error('[ActiveVideoCall] Audio setup error:', err);
    }
  };

  /**
   * Connect to LiveKit room
   */
  const connectToLiveKit = async () => {
    try {
      console.log('[ActiveVideoCall] Connecting to LiveKit...');

      // Get token from backend
      const response = await api.get(`/groups/${groupId}/video-calls/${callId}/livekit-token`);
      const { livekitUrl, token, roomName } = response.data;

      if (!livekitUrl || !token) {
        throw new Error('LiveKit not configured on server');
      }

      // Connect to LiveKit room
      await connect(livekitUrl, token, {
        autoSubscribe: true,
      });

      // Enable camera and microphone
      if (room) {
        await room.localParticipant?.setCameraEnabled(true);
        await room.localParticipant?.setMicrophoneEnabled(true);
      }

      setLivekitConnected(true);
      console.log('[ActiveVideoCall] Connected to LiveKit room:', roomName);
    } catch (err) {
      console.error('[ActiveVideoCall] LiveKit connection error:', err);
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
      console.error('[ActiveVideoCall] LiveKit disconnect error:', err);
    }
  };

  /**
   * Start server-side recording (initiator only)
   */
  const startServerRecording = async () => {
    if (recordingStartedRef.current) return;
    recordingStartedRef.current = true;

    try {
      console.log('[ActiveVideoCall] Starting server-side recording...');
      await api.post(`/groups/${groupId}/video-calls/${callId}/start-recording`);
      setIsRecording(true);
      console.log('[ActiveVideoCall] Server-side recording started');
    } catch (err) {
      console.error('[ActiveVideoCall] Failed to start server recording:', err);
      // Don't fail the call if recording fails
    }
  };

  /**
   * Stop server-side recording
   */
  const stopServerRecording = async () => {
    if (!isRecording) return;

    try {
      console.log('[ActiveVideoCall] Stopping server-side recording...');
      await api.post(`/groups/${groupId}/video-calls/${callId}/stop-recording`);
      setIsRecording(false);
      console.log('[ActiveVideoCall] Server-side recording stopped');
    } catch (err) {
      console.error('[ActiveVideoCall] Failed to stop server recording:', err);
    }
  };

  const fetchCallUpdate = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/video-calls`);
      const updatedCall = response.data.videoCalls?.find(c => c.callId === callId);
      if (updatedCall) {
        setCall(updatedCall);

        if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
          console.log('[ActiveVideoCall] Call ended remotely');
          stopPolling();
          await stopServerRecording();
          await disconnectLiveKit();

          navigation.replace('VideoCallDetails', {
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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCameraFacing = async () => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
    // LiveKit handles camera switching internally
    if (room?.localParticipant) {
      const currentTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (currentTrack) {
        // Toggle camera by disabling and re-enabling with different facingMode
        await room.localParticipant.setCameraEnabled(false);
        await room.localParticipant.setCameraEnabled(true, {
          facingMode: cameraFacing === 'front' ? 'environment' : 'user',
        });
      }
    }
  };

  const handleToggleCamera = async () => {
    const newValue = !isCameraOn;
    setIsCameraOn(newValue);

    if (room?.localParticipant) {
      await room.localParticipant.setCameraEnabled(newValue);
    }
  };

  const handleToggleMute = async () => {
    const newValue = !isMuted;
    setIsMuted(newValue);

    if (room?.localParticipant) {
      await room.localParticipant.setMicrophoneEnabled(!newValue);
    }
  };

  const handleLeaveCall = () => {
    if (leavingCall) return;

    CustomAlert.alert(
      'Leave Video Call',
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
              const response = await api.put(`/groups/${groupId}/video-calls/${callId}/leave`);
              stopPolling();

              if (response.data.callEnded) {
                navigation.replace('VideoCallDetails', {
                  groupId,
                  callId,
                  call: { ...call, status: 'ended', endedAt: new Date().toISOString() },
                });
              } else {
                navigation.replace('VideoCalls', { groupId });
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
      'End Video Call for Everyone',
      'This will end the video call for all participants. Are you sure?',
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
              await api.put(`/groups/${groupId}/video-calls/${callId}/end`);
              stopPolling();
              navigation.replace('VideoCallDetails', {
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
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteVideoTrack?.publication?.track ? (
          <VideoTrack
            trackRef={remoteVideoTrack}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          // Placeholder when no remote stream
          <View style={styles.remoteVideoPlaceholder}>
            {remoteParticipant && (
              <>
                <Avatar.Text
                  size={100}
                  label={remoteParticipant.iconLetters || '?'}
                  style={{ backgroundColor: remoteParticipant.iconColor || '#6200ee' }}
                  color={getContrastTextColor(remoteParticipant.iconColor || '#6200ee')}
                />
                <Text style={styles.remoteName}>
                  {remoteParticipant.displayName || 'Participant'}
                </Text>
                <Text style={styles.connectionStatus}>
                  {isRinging ? 'Calling...' :
                   !livekitConnected && !livekitError ? 'Connecting...' :
                   livekitError ? 'Connection failed' :
                   remoteParticipantsCount > 0 ? 'Connected (camera off)' :
                   'Waiting for participant...'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Top Status Bar */}
        <View style={styles.topBar}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {isRinging ? '👋 Ringing...' : '👋 Video Call'}
            </Text>
          </View>
          {isActive && (
            <Text style={styles.durationText}>
              {formatDuration(callDuration)}
            </Text>
          )}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingLabel}>REC</Text>
            </View>
          )}
        </View>
      </View>

      {/* Local Video (PiP) */}
      <View style={styles.pipContainer}>
        {localVideoTrack?.publication?.track && isCameraOn ? (
          <VideoTrack
            trackRef={localVideoTrack}
            style={styles.pipVideo}
            objectFit="cover"
            mirror={cameraFacing === 'front'}
          />
        ) : (
          <View style={styles.pipPlaceholder}>
            <Text style={styles.pipPlaceholderText}>
              {!isCameraOn ? '📷 Off' : !livekitConnected ? 'Connecting...' : 'You'}
            </Text>
          </View>
        )}
        <Text style={styles.pipLabel}>You</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <IconButton
            icon={isMuted ? 'microphone-off' : 'microphone'}
            iconColor={isMuted ? '#f44336' : '#fff'}
            size={28}
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={handleToggleMute}
          />
          <IconButton
            icon={isCameraOn ? 'video' : 'video-off'}
            iconColor={!isCameraOn ? '#f44336' : '#fff'}
            size={28}
            style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
            onPress={handleToggleCamera}
          />
          {Platform.OS !== 'web' && (
            <IconButton
              icon="camera-flip"
              iconColor="#fff"
              size={28}
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            />
          )}
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
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
  },
  remoteName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  connectionStatus: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  durationText: {
    color: '#4caf50',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
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
  pipContainer: {
    position: 'absolute',
    top: 110,
    right: PIP_MARGIN,
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pipVideo: {
    width: '100%',
    height: '100%',
  },
  pipPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
  },
  pipPlaceholderText: {
    color: '#fff',
    fontSize: 12,
  },
  pipLabel: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    gap: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 30,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 0,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
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
    bottom: 160,
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
