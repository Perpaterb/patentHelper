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
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { Text, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

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
export default function ActivePhoneCallScreen({ navigation, route }) {
  const { groupId, callId, call: passedCall, isInitiator } = route.params;
  const [call, setCall] = useState(passedCall || null);
  const [loading, setLoading] = useState(!passedCall);
  const [endingCall, setEndingCall] = useState(false);
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
   * Handle ending the call
   */
  const handleEndCall = () => {
    if (endingCall) return;

    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
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
              Alert.alert('Error', err.response?.data?.message || 'Failed to end call');
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
          {isInitiator ? 'Calling:' : 'In call with:'}
        </Text>
        <View style={styles.participantsList}>
          {call.participants?.map(participant => {
            if (isInitiator && participant.groupMemberId === call.initiatedBy) return null;
            const bgColor = participant.iconColor || '#6200ee';

            return (
              <View key={participant.groupMemberId} style={styles.participantItem}>
                <Avatar.Text
                  size={60}
                  label={participant.iconLetters || '?'}
                  style={{ backgroundColor: bgColor }}
                  color={getContrastTextColor(bgColor)}
                />
                <Text style={styles.participantName}>
                  {participant.displayName || 'Unknown'}
                </Text>
                <Text style={styles.participantStatus}>
                  {participant.status}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* End Call Button */}
      <View style={styles.actionContainer}>
        <Button
          mode="contained"
          onPress={handleEndCall}
          loading={endingCall}
          disabled={endingCall}
          style={styles.endCallButton}
          buttonColor="#d32f2f"
          textColor="#fff"
          icon="phone-hangup"
          contentStyle={styles.endCallButtonContent}
          labelStyle={styles.endCallButtonLabel}
        >
          {endingCall ? 'Ending...' : 'End Call'}
        </Button>
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
  actionContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  endCallButton: {
    borderRadius: 40,
    width: '100%',
  },
  endCallButtonContent: {
    height: 60,
  },
  endCallButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
