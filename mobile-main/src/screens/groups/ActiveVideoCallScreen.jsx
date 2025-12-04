/**
 * Active Video Call Screen
 *
 * Shows during an active or ringing video call.
 * Features:
 * - WebRTC peer-to-peer video (web and mobile with dev build)
 * - Remote video as full screen, local video as PiP
 * - Call status (ringing/active)
 * - Call duration timer (when connected)
 * - Camera toggle, mute, and flip buttons
 * - End call button
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import { CustomAlert } from '../../components/CustomAlert';
import { useWebRTC } from '../../hooks/useWebRTC';

// Import RTCView for mobile
let RTCView = null;
if (Platform.OS !== 'web') {
  try {
    RTCView = require('react-native-webrtc').RTCView;
  } catch (e) {
    console.log('[ActiveVideoCall] RTCView not available');
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// PiP dimensions
const PIP_WIDTH = 120;
const PIP_HEIGHT = 160;
const PIP_MARGIN = 16;

/**
 * ActiveVideoCallScreen component
 *
 * @param {Object} props
 * @returns {JSX.Element}
 */
export default function ActiveVideoCallScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall, isInitiator } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [endingCall, setEndingCall] = useState(false);
  const [leavingCall, setLeavingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Camera and audio state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraFacing, setCameraFacing] = useState('front');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [webCameraGranted, setWebCameraGranted] = useState(false);
  const [noCameraAvailable, setNoCameraAvailable] = useState(false);

  // Server-side recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle');

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // WebRTC hook - video calls with video enabled
  const {
    localStream,
    remoteStreams,
    isConnecting,
    error: webrtcError,
    connectionStates,
    isWebRTCSupported,
    toggleVideo,
    toggleAudio,
    stopConnection,
  } = useWebRTC({
    groupId,
    callId,
    isActive: call?.status === 'active',
    isInitiator,
    audioOnly: false,
    callType: 'video',
  });

  // Get first remote stream (for 1-to-1 calls)
  const remoteStreamEntries = Object.entries(remoteStreams);
  const firstRemoteStream = remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null;
  const firstRemotePeerId = remoteStreamEntries.length > 0 ? remoteStreamEntries[0][0] : null;

  useEffect(() => {
    if (!passedCall) {
      loadCallDetails();
    }

    // Request permissions on mount
    requestPermissions();

    // Start polling for call status updates
    startPolling();

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

  // Attach streams to video elements on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      if (remoteVideoRef.current && firstRemoteStream) {
        remoteVideoRef.current.srcObject = firstRemoteStream;
      }
    }
  }, [localStream, firstRemoteStream]);

  // Start recording when call becomes active
  useEffect(() => {
    if (call?.status === 'active' && !isRecording && recordingStatus === 'idle') {
      console.log('[ActiveVideoCall] Call is active, starting recording...');
      setTimeout(() => startRecording(), 500);
    }
  }, [call?.status]);

  /**
   * Request camera and microphone permissions
   */
  const requestPermissions = async () => {
    try {
      console.log('[ActiveVideoCall] Requesting permissions...');

      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          stream.getTracks().forEach(track => track.stop());
          setWebCameraGranted(true);
          await requestCameraPermission();
          await requestMicPermission();
        } catch (browserError) {
          console.log('[ActiveVideoCall] Browser permission error:', browserError.name);
          if (browserError.name === 'NotFoundError') {
            setNoCameraAvailable(true);
          }
          // Try audio only
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream.getTracks().forEach(track => track.stop());
            await requestMicPermission();
          } catch (audioErr) {
            console.log('[ActiveVideoCall] Audio permission denied');
          }
        }
      } else {
        if (!cameraPermission?.granted) {
          await requestCameraPermission();
        }
        if (!micPermission?.granted) {
          await requestMicPermission();
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
    } catch (error) {
      console.error('[ActiveVideoCall] Permission error:', error);
    }
  };

  /**
   * Fetch latest call data
   */
  const fetchCallUpdate = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/video-calls`);
      const updatedCall = response.data.videoCalls?.find(c => c.callId === callId);
      if (updatedCall) {
        setCall(updatedCall);

        if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
          console.log('[ActiveVideoCall] Call ended remotely');
          stopPolling();
          await stopRecording();
          stopConnection();

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

  const toggleCameraFacing = () => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const handleToggleCamera = () => {
    const newValue = !isCameraOn;
    setIsCameraOn(newValue);
    toggleVideo(newValue);
  };

  const handleToggleMute = () => {
    const newValue = !isMuted;
    setIsMuted(newValue);
    toggleAudio(!newValue);
  };

  /**
   * Start server-side recording
   * Initiator triggers the ghost recorder on the server
   */
  const startRecording = async () => {
    if (isRecording) return;
    if (!isInitiator) {
      console.log('[ActiveVideoCall] Only initiator can start recording');
      return;
    }

    console.log('[ActiveVideoCall] Starting server-side recording...');
    setRecordingStatus('recording');

    try {
      const response = await api.post(`/groups/${groupId}/video-calls/${callId}/start-recording`);
      if (response.data.isRecording) {
        setIsRecording(true);
        console.log('[ActiveVideoCall] Server-side recording started');
      }
    } catch (err) {
      console.error('[ActiveVideoCall] Start recording error:', err);
      setRecordingStatus('error');
    }
  };

  /**
   * Stop server-side recording
   */
  const stopRecording = async () => {
    if (!isRecording) return;
    if (!isInitiator) return;

    console.log('[ActiveVideoCall] Stopping server-side recording...');
    setRecordingStatus('stopping');

    try {
      await api.post(`/groups/${groupId}/video-calls/${callId}/stop-recording`);
      console.log('[ActiveVideoCall] Server-side recording stopped');
    } catch (err) {
      console.error('[ActiveVideoCall] Stop recording error:', err);
    } finally {
      setIsRecording(false);
      setRecordingStatus('idle');
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
              await stopRecording();
              stopConnection();
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
              await stopRecording();
              stopConnection();
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
  const hasCameraPermission = cameraPermission?.granted || webCameraGranted;

  // Get remote participant info - the person we're talking to
  const remoteParticipant = isInitiator
    ? call.participants?.find(p => ['accepted', 'joined'].includes(p.status)) || call.participants?.[0]
    : call.initiator;

  return (
    <View style={styles.container}>
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {Platform.OS === 'web' && firstRemoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={styles.remoteVideo}
          />
        ) : Platform.OS !== 'web' && RTCView && firstRemoteStream ? (
          <RTCView
            streamURL={firstRemoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
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
                   isConnecting ? 'Connecting...' :
                   !isWebRTCSupported ? 'Requires development build' :
                   'Waiting for video...'}
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
        {Platform.OS === 'web' && localStream && isCameraOn ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={styles.pipVideo}
          />
        ) : Platform.OS !== 'web' && RTCView && localStream && isCameraOn ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.pipVideo}
            objectFit="cover"
            mirror={true}
            zOrder={1}
          />
        ) : hasCameraPermission && isCameraOn && Platform.OS !== 'web' && !RTCView ? (
          <CameraView
            style={styles.pipVideo}
            facing={cameraFacing}
            mute={true}
          />
        ) : (
          <View style={styles.pipPlaceholder}>
            <Text style={styles.pipPlaceholderText}>
              {!isCameraOn ? '📷 Off' : noCameraAvailable ? 'No cam' : 'You'}
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
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
    objectFit: 'cover',
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
