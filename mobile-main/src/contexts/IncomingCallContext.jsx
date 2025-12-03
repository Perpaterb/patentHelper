/**
 * Incoming Call Context
 *
 * Provides global incoming call detection by polling the API.
 * Shows an overlay when there's an incoming phone or video call for the current user.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import api from '../services/api';

const IncomingCallContext = createContext(null);

/**
 * Provider component for incoming call detection
 * @param {Object} props
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {React.ReactNode} props.children
 */
export function IncomingCallProvider({ children, isAuthenticated = false }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [callType, setCallType] = useState(null); // 'phone' or 'video'
  const [currentUserId, setCurrentUserId] = useState(null);
  const pollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Start/stop polling based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      // Start polling when authenticated and app is active
      startPolling();

      // Listen for app state changes
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          // App has come to foreground
          startPolling();
        } else if (nextAppState.match(/inactive|background/)) {
          // App has gone to background
          stopPolling();
        }
        appStateRef.current = nextAppState;
      });

      return () => {
        stopPolling();
        subscription?.remove();
      };
    } else {
      // Stop polling when not authenticated
      stopPolling();
      setIncomingCall(null);
    }
  }, [isAuthenticated]);

  /**
   * Start polling for incoming calls
   */
  const startPolling = () => {
    if (pollRef.current) return;

    console.log('[IncomingCallContext] Starting polling for incoming calls');

    // Poll immediately
    checkForIncomingCalls();

    // Then poll every 3 seconds for more responsive call detection
    pollRef.current = setInterval(() => {
      checkForIncomingCalls();
    }, 3000);
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
   * Check all groups for incoming calls (both phone and video)
   * Uses the /phone-calls/active and /video-calls/active endpoints
   */
  const checkForIncomingCalls = async () => {
    try {
      // First get the user's groups
      const groupsResponse = await api.get('/groups');
      const groups = groupsResponse.data.groups || [];

      // Check each group for incoming phone and video calls
      for (const group of groups) {
        // Check for incoming phone calls
        try {
          const phoneCallsResponse = await api.get(`/groups/${group.groupId}/phone-calls/active`);
          const { incomingCalls: incomingPhoneCalls = [] } = phoneCallsResponse.data;

          if (incomingPhoneCalls.length > 0) {
            const incomingPhoneCall = incomingPhoneCalls[0];
            console.log('[IncomingCallContext] Found incoming phone call:', incomingPhoneCall.callId, 'in group:', group.name);
            setIncomingCall({
              ...incomingPhoneCall,
              groupId: group.groupId,
              groupName: group.name,
            });
            setCallType('phone');
            return; // Found an incoming call, stop searching
          }
        } catch (err) {
          // Ignore errors for individual groups (e.g., permission denied)
          console.log('[IncomingCallContext] Error checking phone calls for group:', group.groupId, err.message);
        }

        // Check for incoming video calls
        try {
          const videoCallsResponse = await api.get(`/groups/${group.groupId}/video-calls/active`);
          const { incomingCalls: incomingVideoCalls = [] } = videoCallsResponse.data;

          if (incomingVideoCalls.length > 0) {
            const incomingVideoCall = incomingVideoCalls[0];
            console.log('[IncomingCallContext] Found incoming video call:', incomingVideoCall.callId, 'in group:', group.name);
            setIncomingCall({
              ...incomingVideoCall,
              groupId: group.groupId,
              groupName: group.name,
            });
            setCallType('video');
            return; // Found an incoming call, stop searching
          }
        } catch (err) {
          // Ignore errors for individual groups (e.g., permission denied)
          console.log('[IncomingCallContext] Error checking video calls for group:', group.groupId, err.message);
        }
      }

      // No incoming calls found
      setIncomingCall(null);
      setCallType(null);
    } catch (err) {
      console.error('[IncomingCallContext] Error checking for incoming calls:', err);
    }
  };

  /**
   * Accept the incoming call
   * @returns {Promise<Object>} The accepted call object with callType
   */
  const acceptCall = async () => {
    if (!incomingCall) return null;

    try {
      const currentCallType = callType;
      const endpoint = currentCallType === 'video'
        ? `/groups/${incomingCall.groupId}/video-calls/${incomingCall.callId}/respond`
        : `/groups/${incomingCall.groupId}/phone-calls/${incomingCall.callId}/respond`;

      console.log('[IncomingCallContext] Accepting', currentCallType, 'call:', incomingCall.callId);
      await api.put(endpoint, { action: 'accept' });

      const acceptedCall = { ...incomingCall, callType: currentCallType };
      setIncomingCall(null);
      setCallType(null);
      return acceptedCall;
    } catch (err) {
      console.error('[IncomingCallContext] Error accepting call:', err);
      throw err;
    }
  };

  /**
   * Reject the incoming call
   */
  const rejectCall = async () => {
    if (!incomingCall) return;

    try {
      const currentCallType = callType;
      const endpoint = currentCallType === 'video'
        ? `/groups/${incomingCall.groupId}/video-calls/${incomingCall.callId}/respond`
        : `/groups/${incomingCall.groupId}/phone-calls/${incomingCall.callId}/respond`;

      console.log('[IncomingCallContext] Rejecting', currentCallType, 'call:', incomingCall.callId);
      await api.put(endpoint, { action: 'reject' });

      setIncomingCall(null);
      setCallType(null);
    } catch (err) {
      console.error('[IncomingCallContext] Error rejecting call:', err);
      throw err;
    }
  };

  /**
   * Dismiss the incoming call overlay (without rejecting)
   */
  const dismissCall = () => {
    setIncomingCall(null);
    setCallType(null);
  };

  return (
    <IncomingCallContext.Provider
      value={{
        incomingCall,
        callType,
        acceptCall,
        rejectCall,
        dismissCall,
        checkForIncomingCalls,
      }}
    >
      {children}
    </IncomingCallContext.Provider>
  );
}

/**
 * Hook to use incoming call context
 */
export function useIncomingCall() {
  const context = useContext(IncomingCallContext);
  if (!context) {
    throw new Error('useIncomingCall must be used within IncomingCallProvider');
  }
  return context;
}
