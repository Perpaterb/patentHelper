/**
 * WebRTC Hook for Video Calling
 *
 * Manages WebRTC peer connections for video calls.
 * Supports both web (native WebRTC API) and mobile (react-native-webrtc).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

// Import WebRTC classes - on mobile, use react-native-webrtc
let RTCPeerConnectionClass;
let RTCSessionDescriptionClass;
let RTCIceCandidateClass;
let mediaDevicesAPI;

if (Platform.OS === 'web') {
  // Web: Use native WebRTC API
  RTCPeerConnectionClass = typeof RTCPeerConnection !== 'undefined' ? RTCPeerConnection : null;
  RTCSessionDescriptionClass = typeof RTCSessionDescription !== 'undefined' ? RTCSessionDescription : null;
  RTCIceCandidateClass = typeof RTCIceCandidate !== 'undefined' ? RTCIceCandidate : null;
  mediaDevicesAPI = typeof navigator !== 'undefined' && navigator.mediaDevices ? navigator.mediaDevices : null;
} else {
  // Mobile: Use react-native-webrtc
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnectionClass = webrtc.RTCPeerConnection;
    RTCSessionDescriptionClass = webrtc.RTCSessionDescription;
    RTCIceCandidateClass = webrtc.RTCIceCandidate;
    mediaDevicesAPI = webrtc.mediaDevices;
  } catch (err) {
    console.warn('[WebRTC] react-native-webrtc not available:', err.message);
  }
}

/**
 * @typedef {Object} PeerConnection
 * @property {string} peerId - The peer's group member ID
 * @property {RTCPeerConnection} connection - The WebRTC peer connection
 * @property {MediaStream} remoteStream - The remote media stream
 * @property {string} connectionState - Current connection state
 */

/**
 * @typedef {Object} WebRTCState
 * @property {MediaStream} localStream - Local camera/mic stream
 * @property {Object.<string, PeerConnection>} peers - Map of peer connections
 * @property {boolean} isConnecting - Whether connection is in progress
 * @property {string} error - Error message if any
 */

/**
 * Hook for managing WebRTC calls (audio and video)
 *
 * @param {Object} options
 * @param {string} options.groupId - The group ID
 * @param {string} options.callId - The call ID
 * @param {boolean} options.isActive - Whether the call is active
 * @param {boolean} options.isInitiator - Whether current user initiated the call
 * @param {boolean} options.audioOnly - Whether this is audio-only (phone call) vs video call
 * @param {string} options.callType - 'phone' or 'video' - determines API endpoint
 * @returns {Object} WebRTC state and controls
 */
export function useWebRTC({ groupId, callId, isActive, isInitiator, audioOnly = false, callType = 'video' }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { peerId: MediaStream }
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [connectionStates, setConnectionStates] = useState({}); // { peerId: state }

  const peerConnectionsRef = useRef({}); // { peerId: RTCPeerConnection }
  const iceServersRef = useRef([]);
  const pollingRef = useRef(null);
  // WebRTC is supported if we have the necessary classes (either native web or react-native-webrtc)
  const isWebRTCSupported = RTCPeerConnectionClass !== null && mediaDevicesAPI !== null;

  // API endpoint base path depends on call type
  const apiBasePath = callType === 'phone'
    ? `/groups/${groupId}/phone-calls/${callId}`
    : `/groups/${groupId}/video-calls/${callId}`;

  /**
   * Create a new peer connection
   */
  const createPeerConnection = useCallback((peerId) => {
    if (!isWebRTCSupported) return null;

    console.log(`[WebRTC] Creating peer connection for ${peerId}`);

    const pc = new RTCPeerConnectionClass({
      iceServers: iceServersRef.current,
    });

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received track from ${peerId}`, event.track.kind);
      const stream = event.streams[0];
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: stream,
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] Sending ICE candidate to ${peerId}`);
        try {
          await api.post(`${apiBasePath}/signal`, {
            type: 'ice-candidate',
            data: event.candidate,
            targetPeerId: peerId,
          });
        } catch (err) {
          console.error('[WebRTC] Failed to send ICE candidate:', err);
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${peerId}:`, pc.connectionState);
      setConnectionStates(prev => ({
        ...prev,
        [peerId]: pc.connectionState,
      }));
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${peerId}:`, pc.iceConnectionState);
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  }, [groupId, callId, localStream, isWebRTCSupported]);

  /**
   * Create and send an offer
   */
  const createOffer = useCallback(async (peerId) => {
    if (!isWebRTCSupported) return;

    let pc = peerConnectionsRef.current[peerId];
    if (!pc) {
      pc = createPeerConnection(peerId);
    }

    try {
      console.log(`[WebRTC] Creating offer for ${peerId}`);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      await api.post(`${apiBasePath}/signal`, {
        type: 'offer',
        data: offer,
        targetPeerId: peerId,
      });
      console.log(`[WebRTC] Offer sent to ${peerId}`);
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
      setError('Failed to create offer');
    }
  }, [groupId, callId, createPeerConnection, isWebRTCSupported]);

  /**
   * Handle incoming offer and create answer
   */
  const handleOffer = useCallback(async (peerId, offer) => {
    if (!isWebRTCSupported) return;

    let pc = peerConnectionsRef.current[peerId];
    if (!pc) {
      pc = createPeerConnection(peerId);
    }

    try {
      console.log(`[WebRTC] Handling offer from ${peerId}`);
      await pc.setRemoteDescription(new RTCSessionDescriptionClass(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await api.post(`${apiBasePath}/signal`, {
        type: 'answer',
        data: answer,
        targetPeerId: peerId,
      });
      console.log(`[WebRTC] Answer sent to ${peerId}`);
    } catch (err) {
      console.error('[WebRTC] Failed to handle offer:', err);
      setError('Failed to handle offer');
    }
  }, [groupId, callId, createPeerConnection, isWebRTCSupported]);

  /**
   * Handle incoming answer
   */
  const handleAnswer = useCallback(async (peerId, answer) => {
    if (!isWebRTCSupported) return;

    const pc = peerConnectionsRef.current[peerId];
    if (!pc) {
      console.warn(`[WebRTC] No peer connection for ${peerId} to handle answer`);
      return;
    }

    try {
      console.log(`[WebRTC] Handling answer from ${peerId}`);
      await pc.setRemoteDescription(new RTCSessionDescriptionClass(answer));
    } catch (err) {
      console.error('[WebRTC] Failed to handle answer:', err);
      setError('Failed to handle answer');
    }
  }, [isWebRTCSupported]);

  /**
   * Handle incoming ICE candidate
   */
  const handleIceCandidate = useCallback(async (peerId, candidate) => {
    if (!isWebRTCSupported) return;

    const pc = peerConnectionsRef.current[peerId];
    if (!pc) {
      console.warn(`[WebRTC] No peer connection for ${peerId} to add ICE candidate`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidateClass(candidate));
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  }, [isWebRTCSupported]);

  /**
   * Process incoming signals
   */
  const processSignals = useCallback(async (signals) => {
    for (const signal of signals) {
      switch (signal.type) {
        case 'offer':
          await handleOffer(signal.from, signal.data);
          break;
        case 'answer':
          await handleAnswer(signal.from, signal.data);
          break;
        case 'ice-candidate':
          await handleIceCandidate(signal.from, signal.data);
          break;
        default:
          console.warn('[WebRTC] Unknown signal type:', signal.type);
      }
    }
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  /**
   * Poll for signals
   */
  const pollSignals = useCallback(async () => {
    if (!isActive || !isWebRTCSupported) return;

    try {
      const response = await api.get(`${apiBasePath}/signal`);
      const { signals, peers, myPeerId: receivedPeerId } = response.data;

      if (receivedPeerId && !myPeerId) {
        setMyPeerId(receivedPeerId);
      }

      // Process any incoming signals
      if (signals && signals.length > 0) {
        await processSignals(signals);
      }

      // If we're the initiator and there are new peers, send offers
      if (isInitiator && peers) {
        for (const peer of peers) {
          if (!peerConnectionsRef.current[peer.peerId] && peer.status !== 'invited') {
            await createOffer(peer.peerId);
          }
        }
      }
    } catch (err) {
      console.error('[WebRTC] Failed to poll signals:', err);
    }
  }, [groupId, callId, isActive, isInitiator, myPeerId, processSignals, createOffer, isWebRTCSupported]);

  /**
   * Initialize local stream
   */
  const initializeLocalStream = useCallback(async () => {
    if (!isWebRTCSupported) {
      console.log('[WebRTC] Not supported on this platform');
      setError('WebRTC is not available. Please use a development build with react-native-webrtc.');
      return null;
    }

    try {
      console.log(`[WebRTC] Getting local media stream (audioOnly: ${audioOnly})...`);
      const constraints = {
        video: !audioOnly, // No video for phone calls
        audio: true,
      };
      const stream = await mediaDevicesAPI.getUserMedia(constraints);
      setLocalStream(stream);
      console.log('[WebRTC] Local stream initialized');
      return stream;
    } catch (err) {
      console.error('[WebRTC] Failed to get local stream:', err);
      // Try audio only if video fails (for video calls)
      if (!audioOnly) {
        try {
          const audioStream = await mediaDevicesAPI.getUserMedia({
            video: false,
            audio: true,
          });
          setLocalStream(audioStream);
          console.log('[WebRTC] Audio-only stream initialized (video failed)');
          return audioStream;
        } catch (audioErr) {
          console.error('[WebRTC] Failed to get audio stream:', audioErr);
          setError('Failed to access microphone');
          return null;
        }
      } else {
        setError('Failed to access microphone');
        return null;
      }
    }
  }, [isWebRTCSupported, audioOnly]);

  /**
   * Fetch ICE servers
   */
  const fetchIceServers = useCallback(async () => {
    try {
      const response = await api.get(`${apiBasePath}/ice-servers`);
      iceServersRef.current = response.data.iceServers || [];
      console.log('[WebRTC] ICE servers fetched:', iceServersRef.current.length);
    } catch (err) {
      console.error('[WebRTC] Failed to fetch ICE servers:', err);
      // Use default Google STUN servers as fallback
      iceServersRef.current = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }, [groupId, callId]);

  /**
   * Start the WebRTC connection process
   */
  const startConnection = useCallback(async () => {
    if (!isWebRTCSupported) {
      setError('WebRTC is not available. Please use a development build.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Fetch ICE servers
      await fetchIceServers();

      // Initialize local stream
      await initializeLocalStream();

      // Start polling for signals
      pollingRef.current = setInterval(pollSignals, 1000);

      setIsConnecting(false);
    } catch (err) {
      console.error('[WebRTC] Failed to start connection:', err);
      setError('Failed to start video connection');
      setIsConnecting(false);
    }
  }, [fetchIceServers, initializeLocalStream, pollSignals, isWebRTCSupported]);

  /**
   * Stop all connections and cleanup
   */
  const stopConnection = useCallback(() => {
    console.log('[WebRTC] Stopping connections...');

    // Stop polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Close all peer connections
    for (const [peerId, pc] of Object.entries(peerConnectionsRef.current)) {
      console.log(`[WebRTC] Closing connection to ${peerId}`);
      pc.close();
    }
    peerConnectionsRef.current = {};

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear remote streams
    setRemoteStreams({});
    setConnectionStates({});
  }, [localStream]);

  /**
   * Toggle local video
   */
  const toggleVideo = useCallback((enabled) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  /**
   * Toggle local audio
   */
  const toggleAudio = useCallback((enabled) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  // Start connection when call becomes active
  useEffect(() => {
    if (isActive && isWebRTCSupported) {
      startConnection();
    }

    return () => {
      stopConnection();
    };
  }, [isActive, isWebRTCSupported]);

  // Poll signals while active
  useEffect(() => {
    if (isActive && localStream && !pollingRef.current && isWebRTCSupported) {
      pollingRef.current = setInterval(pollSignals, 1000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isActive, localStream, pollSignals, isWebRTCSupported]);

  return {
    // State
    localStream,
    remoteStreams,
    isConnecting,
    error,
    myPeerId,
    connectionStates,
    isWebRTCSupported,

    // Controls
    startConnection,
    stopConnection,
    toggleVideo,
    toggleAudio,
  };
}

export default useWebRTC;
