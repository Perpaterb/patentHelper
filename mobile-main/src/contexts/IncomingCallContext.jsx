/**
 * Incoming Call Context
 *
 * Provides global incoming call detection by polling the API.
 * Shows an overlay when there's an incoming call for the current user.
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

    // Poll immediately
    checkForIncomingCalls();

    // Then poll every 5 seconds
    pollRef.current = setInterval(() => {
      checkForIncomingCalls();
    }, 5000);
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
   * Check all groups for incoming calls
   */
  const checkForIncomingCalls = async () => {
    try {
      // First get the user's groups
      const groupsResponse = await api.get('/groups');
      const groups = groupsResponse.data.groups || [];

      // Check each group for ringing calls
      for (const group of groups) {
        try {
          const callsResponse = await api.get(`/groups/${group.groupId}/phone-calls`);
          const calls = callsResponse.data.phoneCalls || [];

          // Find any ringing call where current user is a participant but not the initiator
          const ringingCall = calls.find(call => {
            if (call.status !== 'ringing') return false;

            // Get current user's member ID in this group
            const currentUserMemberId = group.currentUserMember?.groupMemberId;
            if (!currentUserMemberId) return false;

            // Check if user is a participant (but not initiator)
            const isParticipant = call.participants?.some(
              p => p.groupMemberId === currentUserMemberId
            );
            const isInitiator = call.initiatedBy === currentUserMemberId;

            // Check participant status - only show if invited (not yet accepted/rejected)
            const participantStatus = call.participants?.find(
              p => p.groupMemberId === currentUserMemberId
            )?.status;

            return isParticipant && !isInitiator && participantStatus === 'invited';
          });

          if (ringingCall) {
            setIncomingCall({
              ...ringingCall,
              groupId: group.groupId,
              groupName: group.name,
            });
            return; // Found an incoming call, stop searching
          }
        } catch (err) {
          // Ignore errors for individual groups
          console.log('Error checking calls for group:', group.groupId);
        }
      }

      // No incoming calls found
      setIncomingCall(null);
    } catch (err) {
      console.error('Error checking for incoming calls:', err);
    }
  };

  /**
   * Accept the incoming call
   */
  const acceptCall = async () => {
    if (!incomingCall) return null;

    try {
      await api.put(`/groups/${incomingCall.groupId}/phone-calls/${incomingCall.callId}/accept`);
      const acceptedCall = { ...incomingCall };
      setIncomingCall(null);
      return acceptedCall;
    } catch (err) {
      console.error('Error accepting call:', err);
      throw err;
    }
  };

  /**
   * Reject the incoming call
   */
  const rejectCall = async () => {
    if (!incomingCall) return;

    try {
      await api.put(`/groups/${incomingCall.groupId}/phone-calls/${incomingCall.callId}/reject`);
      setIncomingCall(null);
    } catch (err) {
      console.error('Error rejecting call:', err);
      throw err;
    }
  };

  /**
   * Dismiss the incoming call overlay (without rejecting)
   */
  const dismissCall = () => {
    setIncomingCall(null);
  };

  return (
    <IncomingCallContext.Provider
      value={{
        incomingCall,
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
