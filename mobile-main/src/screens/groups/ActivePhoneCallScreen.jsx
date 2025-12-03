/**
 * Active Phone Call Screen
 *
 * Shows during an active or ringing phone call.
 * Displays:
 * - Call status (ringing/active)
 * - Participants with their status
 * - Call duration timer (when connected)
 * - End call button
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { Text, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import { CustomAlert } from '../../components/CustomAlert';

/**
 * @typedef {Object} ActivePhoneCallScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * ActivePhoneCallScreen component
 *
 * @param {ActivePhoneCallScreenProps} props
 * @returns {JSX.Element}
 */
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

export default function ActivePhoneCallScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall, isInitiator } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [endingCall, setEndingCall] = useState(false);
  const [leavingCall, setLeavingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!passedCall) {
      loadCallDetails();
    }

    // Start polling for call status updates
    startPolling();

    // Prevent back button from leaving the call without ending
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true;
    });

    return () => {
      stopPolling();
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
   * Start polling for call status updates
   */
  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/groups/${groupId}/phone-calls`);
        const updatedCall = response.data.phoneCalls?.find(c => c.callId === callId);
        if (updatedCall) {
          setCall(updatedCall);

          // If call ended, navigate away
          if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
            stopPolling();
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
    }, 3000); // Poll every 3 seconds
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
   * Format duration in seconds to mm:ss
   */
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle leaving the call (without ending it for others)
   */
  const handleLeaveCall = () => {
    if (leavingCall) return;

    const message = isInitiator
      ? 'As the initiator, leaving will end the call for everyone.'
      : 'Are you sure you want to leave this call? The call will continue for others.';

    CustomAlert.alert(
      'Leave Call',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeavingCall(true);
            try {
              const response = await api.put(`/groups/${groupId}/phone-calls/${callId}/leave`);
              stopPolling();

              if (response.data.callEnded) {
                // Call ended, go to details
                navigation.replace('PhoneCallDetails', {
                  groupId,
                  callId,
                  call: { ...call, status: 'ended', endedAt: new Date().toISOString() },
                });
              } else {
                // Just left, go back to phone calls list
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

  /**
   * Handle ending the call for everyone
   */
  const handleEndCall = () => {
    if (endingCall) return;

    CustomAlert.alert(
      'End Call for Everyone',
      'This will end the call for all participants. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End for All',
          style: 'destructive',
          onPress: async () => {
            setEndingCall(true);
            try {
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
      {/* Call Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusEmoji}>
          {isRinging ? '📲' : '📞'}
        </Text>
        <Text style={styles.statusText}>
          {isRinging ? 'Ringing...' : 'Call Connected'}
        </Text>
        {isActive && (
          <Text style={styles.durationText}>
            {formatDuration(callDuration)}
          </Text>
        )}
      </View>

      {/* Participants */}
      <View style={styles.participantsContainer}>
        <Text style={styles.participantsLabel}>
          {isRinging ? (isInitiator ? 'Calling:' : 'Incoming call from:') : 'In this call:'}
        </Text>
        <View style={styles.participantsList}>
          {/* Show initiator first (if not the current user viewing) */}
          {call.initiator && !isInitiator && (
            <View style={styles.participantItem}>
              <Avatar.Text
                size={60}
                label={call.initiator.iconLetters || '?'}
                style={{ backgroundColor: call.initiator.iconColor || '#6200ee' }}
                color={getContrastTextColor(call.initiator.iconColor || '#6200ee')}
              />
              <Text style={styles.participantName}>
                {call.initiator.displayName || 'Unknown'}
              </Text>
              <Text style={[styles.participantStatus, { color: '#4caf50' }]}>
                {isActive ? 'connected' : 'calling'}
              </Text>
            </View>
          )}

          {/* Show other participants */}
          {call.participants?.map(participant => {
            // Skip showing initiator in participants list (already shown above)
            if (participant.groupMemberId === call.initiatedBy) return null;

            const bgColor = participant.iconColor || '#6200ee';
            const statusColor = getParticipantStatusColor(participant.status);

            // Show visual indicator for participants who left
            const isInCall = ['invited', 'accepted', 'joined'].includes(participant.status);

            return (
              <View
                key={participant.groupMemberId}
                style={[
                  styles.participantItem,
                  !isInCall && styles.participantLeft
                ]}
              >
                <Avatar.Text
                  size={60}
                  label={participant.iconLetters || '?'}
                  style={{
                    backgroundColor: bgColor,
                    opacity: isInCall ? 1 : 0.5,
                  }}
                  color={getContrastTextColor(bgColor)}
                />
                <Text style={[
                  styles.participantName,
                  !isInCall && styles.participantNameLeft
                ]}>
                  {participant.displayName || 'Unknown'}
                </Text>
                <Text style={[styles.participantStatus, { color: statusColor }]}>
                  {participant.status}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Leave Call Button - for participants to leave without ending */}
        <Button
          mode="contained"
          onPress={handleLeaveCall}
          loading={leavingCall}
          disabled={leavingCall || endingCall}
          style={styles.leaveCallButton}
          buttonColor="#ff9800"
          textColor="#fff"
          icon="exit-run"
          contentStyle={styles.callButtonContent}
          labelStyle={styles.callButtonLabel}
        >
          {leavingCall ? 'Leaving...' : 'Leave Call'}
        </Button>

        {/* End Call Button - for initiator or to end for everyone */}
        {isInitiator && (
          <Button
            mode="contained"
            onPress={handleEndCall}
            loading={endingCall}
            disabled={endingCall || leavingCall}
            style={styles.endCallButton}
            buttonColor="#d32f2f"
            textColor="#fff"
            icon="phone-hangup"
            contentStyle={styles.callButtonContent}
            labelStyle={styles.callButtonLabel}
          >
            {endingCall ? 'Ending...' : 'End for All'}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    paddingVertical: 60,
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
  statusContainer: {
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 36,
    color: '#4caf50',
    fontWeight: 'bold',
    marginTop: 8,
  },
  participantsContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  participantsLabel: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  participantItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  participantName: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
    fontWeight: '500',
  },
  participantStatus: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  participantLeft: {
    opacity: 0.6,
  },
  participantNameLeft: {
    color: '#999',
  },
  actionContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  leaveCallButton: {
    borderRadius: 40,
    width: '100%',
  },
  endCallButton: {
    borderRadius: 40,
    width: '100%',
  },
  callButtonContent: {
    height: 56,
  },
  callButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
