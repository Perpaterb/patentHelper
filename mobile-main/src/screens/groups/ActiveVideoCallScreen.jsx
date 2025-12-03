/**
 * Active Video Call Screen
 *
 * Shows during an active or ringing video call.
 * Displays:
 * - Camera view (self and participants)
 * - Call status (ringing/active)
 * - Call duration timer (when connected)
 * - Camera toggle, mute, and flip buttons
 * - End call button
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, Platform, Dimensions } from 'react-native';
import { Text, Avatar, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio, Video } from 'expo-av';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import { CustomAlert } from '../../components/CustomAlert';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle');

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const cameraRef = useRef(null);
  const recordingRef = useRef(null);
  const audioRecordingRef = useRef(null); // For audio-only recording when no camera

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync?.().catch(console.error);
      }
      if (audioRecordingRef.current) {
        audioRecordingRef.current.stopAndUnloadAsync?.().catch(console.error);
      }
      backHandler.remove();
    };
  }, [callId]);

  // Start duration timer when call becomes active
  useEffect(() => {
    if (call?.status === 'active' && call?.connectedAt) {
      startDurationTimer();
    }
  }, [call?.status, call?.connectedAt]);

  /**
   * Request camera and microphone permissions
   */
  const requestPermissions = async () => {
    try {
      console.log('[ActiveVideoCall] Requesting camera and microphone permissions...');

      if (!cameraPermission?.granted) {
        const { granted: cameraGranted } = await requestCameraPermission();
        if (!cameraGranted) {
          CustomAlert.alert(
            'Camera Permission Required',
            'Please allow camera access for video calls.',
            [{ text: 'OK' }]
          );
        }
      }

      if (!micPermission?.granted) {
        const { granted: micGranted } = await requestMicPermission();
        if (!micGranted) {
          CustomAlert.alert(
            'Microphone Permission Required',
            'Please allow microphone access for video calls.',
            [{ text: 'OK' }]
          );
        }
      }

      // Set audio mode for video recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('[ActiveVideoCall] Permission request error:', error);
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
        console.log('[ActiveVideoCall] Updated call data:', {
          status: updatedCall.status,
          participantCount: updatedCall.participants?.length,
        });
        setCall(updatedCall);

        // If call ended, stop recording and navigate away
        if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
          console.log('[ActiveVideoCall] Call ended remotely');
          stopPolling();

          if (isRecording) {
            await stopRecordingAndUpload();
          }

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

  /**
   * Start polling for call status updates
   */
  const startPolling = () => {
    fetchCallUpdate();
    pollRef.current = setInterval(fetchCallUpdate, 2000);
  };

  /**
   * Stop polling
   */
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  /**
   * Start call duration timer
   */
  const startDurationTimer = () => {
    if (timerRef.current) return;

    const startTime = call.connectedAt ? new Date(call.connectedAt).getTime() : Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      setCallDuration(Math.floor((now - startTime) / 1000));
    }, 1000);
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
   * Format duration in seconds to mm:ss
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Toggle camera facing (front/back)
   */
  const toggleCameraFacing = () => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  /**
   * Toggle camera on/off
   */
  const toggleCamera = () => {
    setIsCameraOn(prev => !prev);
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  /**
   * Start recording - always attempts to record regardless of permissions
   * Falls back through: video -> audio -> silent audio
   */
  const startRecording = async () => {
    if (isRecording) return;

    console.log('[ActiveVideoCall] Starting recording (will try all methods)...');
    setRecordingStatus('recording');
    setIsRecording(true);

    // Try 1: Video recording with camera
    if (cameraRef.current && cameraPermission?.granted && isCameraOn) {
      try {
        console.log('[ActiveVideoCall] Attempting video recording with camera...');
        const recording = await cameraRef.current.recordAsync({
          maxDuration: 3600, // 1 hour max
          quality: '720p',
          mute: isMuted,
        });
        recordingRef.current = recording;
        console.log('[ActiveVideoCall] Video recording started successfully');
        return;
      } catch (videoError) {
        console.log('[ActiveVideoCall] Video recording failed:', videoError.message);
      }
    }

    // Try 2: Audio-only recording (requires mic permission)
    try {
      console.log('[ActiveVideoCall] Attempting audio-only recording...');
      const audioRecording = new Audio.Recording();
      await audioRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await audioRecording.startAsync();
      audioRecordingRef.current = audioRecording;
      console.log('[ActiveVideoCall] Audio recording started successfully');
      return;
    } catch (audioError) {
      console.log('[ActiveVideoCall] Audio recording failed:', audioError.message);
    }

    // Try 3: Silent/low-quality audio as last resort
    try {
      console.log('[ActiveVideoCall] Attempting fallback silent recording...');
      const silentRecording = new Audio.Recording();
      await silentRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 8000,
          numberOfChannels: 1,
          bitRate: 16000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MIN,
          sampleRate: 8000,
          numberOfChannels: 1,
          bitRate: 16000,
          linearPCMBitDepth: 8,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 16000,
        },
      });
      await silentRecording.startAsync();
      audioRecordingRef.current = silentRecording;
      console.log('[ActiveVideoCall] Fallback recording started');
      return;
    } catch (fallbackError) {
      console.log('[ActiveVideoCall] Fallback recording also failed:', fallbackError.message);
    }

    // All recording methods failed - log but continue call
    console.error('[ActiveVideoCall] All recording methods failed - call will proceed without recording');
    setRecordingStatus('error');
    // Don't set isRecording to false - we want to show we tried
  };

  /**
   * Stop recording and upload to server
   */
  const stopRecordingAndUpload = async () => {
    if (!isRecording) {
      console.log('[ActiveVideoCall] No active recording to stop');
      return;
    }

    try {
      console.log('[ActiveVideoCall] Stopping recording...');
      setRecordingStatus('uploading');

      let recordingUri = null;
      let mimeType = 'video/mp4';
      let fileName = `video-call-${callId}.mp4`;

      // Check if we have a video recording
      if (cameraRef.current && recordingRef.current) {
        cameraRef.current.stopRecording();
        const recording = await recordingRef.current;
        recordingUri = recording?.uri;
        if (Platform.OS === 'web') {
          mimeType = 'video/webm';
          fileName = `video-call-${callId}.webm`;
        }
      }
      // Otherwise check for audio-only recording
      else if (audioRecordingRef.current) {
        await audioRecordingRef.current.stopAndUnloadAsync();
        const uri = audioRecordingRef.current.getURI();
        recordingUri = uri;
        mimeType = 'audio/m4a';
        fileName = `video-call-${callId}.m4a`;
      }

      if (recordingUri) {
        console.log('[ActiveVideoCall] Recording saved to:', recordingUri);

        // Create form data for upload
        const formData = new FormData();

        if (Platform.OS === 'web') {
          const response = await fetch(recordingUri);
          const blob = await response.blob();
          formData.append('recording', blob, fileName);
        } else {
          formData.append('recording', {
            uri: recordingUri,
            type: mimeType,
            name: fileName,
          });
        }

        // Upload to backend
        await api.post(
          `/groups/${groupId}/video-calls/${callId}/recording`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log('[ActiveVideoCall] Recording uploaded successfully');
      }

      recordingRef.current = null;
      audioRecordingRef.current = null;
      setIsRecording(false);
      setRecordingStatus('idle');
    } catch (error) {
      console.error('[ActiveVideoCall] Failed to stop/upload recording:', error);
      setRecordingStatus('error');
    }
  };

  // Start recording when call becomes active - regardless of camera permission
  useEffect(() => {
    if (call?.status === 'active' && !isRecording && recordingStatus === 'idle') {
      console.log('[ActiveVideoCall] Call is active, starting recording...');
      // Small delay to ensure audio mode is set up
      const timer = setTimeout(() => {
        startRecording();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [call?.status]);

  /**
   * Handle leaving the call
   */
  const handleLeaveCall = () => {
    if (leavingCall) return;

    const message = isInitiator
      ? 'As the initiator, leaving will end the call for everyone.'
      : 'Are you sure you want to leave this call?';

    CustomAlert.alert(
      'Leave Video Call',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeavingCall(true);
            try {
              await stopRecordingAndUpload();
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

  /**
   * Handle ending the call for everyone
   */
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
              await stopRecordingAndUpload();
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
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  const isRinging = call.status === 'ringing';
  const isActive = call.status === 'active';

  return (
    <View style={styles.container}>
      {/* Camera View */}
      {cameraPermission?.granted && isCameraOn ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          mode="video"
          mute={isMuted}
        >
          {/* Overlay content on camera */}
          <View style={styles.overlay}>
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

            {/* Participants Row */}
            <View style={styles.participantsRow}>
              <Text style={styles.participantsLabel}>
                {isRinging ? (isInitiator ? 'Calling:' : 'Incoming from:') : 'In call:'}
              </Text>
              <View style={styles.participantAvatars}>
                {call.initiator && (
                  <View style={styles.participantBadge}>
                    <Avatar.Text
                      size={32}
                      label={call.initiator.iconLetters || '?'}
                      style={{ backgroundColor: call.initiator.iconColor || '#6200ee' }}
                      color={getContrastTextColor(call.initiator.iconColor || '#6200ee')}
                    />
                    <Text style={styles.participantLabel}>
                      {isInitiator ? 'You' : call.initiator.displayName?.split(' ')[0]}
                    </Text>
                  </View>
                )}
                {call.participants?.filter(p => p.groupMemberId !== call.initiatedBy).slice(0, 3).map(participant => (
                  <View key={participant.groupMemberId} style={styles.participantBadge}>
                    <Avatar.Text
                      size={32}
                      label={participant.iconLetters || '?'}
                      style={{
                        backgroundColor: participant.iconColor || '#6200ee',
                        opacity: ['left', 'rejected'].includes(participant.status) ? 0.5 : 1,
                      }}
                      color={getContrastTextColor(participant.iconColor || '#6200ee')}
                    />
                    <Text style={[
                      styles.participantLabel,
                      ['left', 'rejected'].includes(participant.status) && styles.participantLabelGray
                    ]}>
                      {participant.displayName?.split(' ')[0]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Control Buttons Row */}
              <View style={styles.controlsRow}>
                <IconButton
                  icon={isMuted ? 'microphone-off' : 'microphone'}
                  iconColor={isMuted ? '#f44336' : '#fff'}
                  size={28}
                  style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                  onPress={toggleMute}
                />
                <IconButton
                  icon={isCameraOn ? 'video' : 'video-off'}
                  iconColor={!isCameraOn ? '#f44336' : '#fff'}
                  size={28}
                  style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
                  onPress={toggleCamera}
                />
                <IconButton
                  icon="camera-flip"
                  iconColor="#fff"
                  size={28}
                  style={styles.controlButton}
                  onPress={toggleCameraFacing}
                />
              </View>

              {/* Action Buttons */}
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
          </View>
        </CameraView>
      ) : (
        // Camera off or no permission - show placeholder
        <View style={styles.noCameraContainer}>
          <View style={styles.noCameraContent}>
            <Text style={styles.noCameraEmoji}>👋</Text>
            <Text style={styles.noCameraText}>
              {cameraPermission?.granted === false ? 'Camera permission required' : 'Camera is off'}
            </Text>
            {cameraPermission?.granted === false && (
              <Button mode="contained" onPress={requestPermissions} style={styles.permissionButton}>
                Grant Permission
              </Button>
            )}
          </View>

          {/* Show controls even without camera */}
          <View style={styles.bottomControlsNoCam}>
            <View style={styles.controlsRow}>
              <IconButton
                icon={isMuted ? 'microphone-off' : 'microphone'}
                iconColor={isMuted ? '#f44336' : '#fff'}
                size={28}
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                onPress={toggleMute}
              />
              <IconButton
                icon={isCameraOn ? 'video' : 'video-off'}
                iconColor={!isCameraOn ? '#f44336' : '#fff'}
                size={28}
                style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
                onPress={toggleCamera}
              />
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
                Leave
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
                  End All
                </Button>
              )}
            </View>
          </View>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    paddingBottom: 30,
  },
  topBar: {
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
  participantsRow: {
    alignItems: 'center',
  },
  participantsLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  participantAvatars: {
    flexDirection: 'row',
    gap: 16,
  },
  participantBadge: {
    alignItems: 'center',
  },
  participantLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  participantLabelGray: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  bottomControls: {
    alignItems: 'center',
    gap: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  noCameraContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  noCameraContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCameraEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  noCameraText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
  },
  permissionButton: {
    marginTop: 16,
  },
  bottomControlsNoCam: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
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
});
