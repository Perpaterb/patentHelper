/**
 * Incoming Call Overlay Component
 *
 * Full-screen overlay that shows when a user receives an incoming call.
 * Displays caller information and accept/reject buttons.
 * This component should be rendered at the app root level.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Animated, Vibration } from 'react-native';
import { Text, Avatar, Button, IconButton } from 'react-native-paper';
import { getContrastTextColor } from '../utils/colorUtils';

/**
 * @typedef {Object} IncomingCallOverlayProps
 * @property {boolean} visible - Whether the overlay is visible
 * @property {Object} call - The incoming call object
 * @property {string} call.callId - Call ID
 * @property {string} call.groupId - Group ID
 * @property {Object} call.initiator - Caller information
 * @property {string} call.groupName - Group name
 * @property {Array} call.participants - List of participants
 * @property {string} callType - Type of call ('phone' or 'video')
 * @property {Function} onAccept - Callback when user accepts the call
 * @property {Function} onReject - Callback when user rejects the call
 */

/**
 * IncomingCallOverlay component
 *
 * @param {IncomingCallOverlayProps} props
 * @returns {JSX.Element}
 */
export default function IncomingCallOverlay({
  visible,
  call,
  callType = 'phone',
  onAccept,
  onReject,
}) {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // Start pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Start vibration pattern
      const vibrationPattern = [0, 500, 200, 500];
      Vibration.vibrate(vibrationPattern, true);

      return () => {
        pulse.stop();
        Vibration.cancel();
      };
    }
  }, [visible]);

  // Debug: Log when overlay should render
  console.log('[IncomingCallOverlay] visible:', visible, 'call:', call?.callId);

  if (!visible || !call) return null;

  console.log('[IncomingCallOverlay] Rendering overlay for call:', call.callId);

  const callerName = call.initiator?.displayName || 'Unknown Caller';
  const callerIcon = call.initiator?.iconLetters || callerName[0] || '?';
  const callerColor = call.initiator?.iconColor || '#6200ee';
  const groupName = call.groupName || 'Unknown Group';

  // Get other participants (excluding initiator)
  const otherParticipants = call.participants
    ?.filter(p => p.groupMemberId !== call.initiatedBy)
    .map(p => p.groupMember?.displayName || 'Unknown')
    .join(', ');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Background gradient effect */}
        <View style={styles.backgroundTop} />
        <View style={styles.backgroundBottom} />

        {/* Content */}
        <View style={styles.content}>
          {/* Call type indicator */}
          <Text style={styles.callTypeText}>
            Incoming {callType === 'video' ? 'Video' : 'Phone'} Call
          </Text>

          {/* Group name */}
          <Text style={styles.groupNameText}>{groupName}</Text>

          {/* Caller avatar with pulse animation */}
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatarRing}>
              <Avatar.Text
                size={120}
                label={callerIcon}
                style={{ backgroundColor: callerColor }}
                color={getContrastTextColor(callerColor)}
              />
            </View>
          </Animated.View>

          {/* Caller name */}
          <Text style={styles.callerName}>{callerName}</Text>

          {/* Other participants if any */}
          {otherParticipants && (
            <Text style={styles.participantsText}>
              Also calling: {otherParticipants}
            </Text>
          )}

          {/* Call icon indicator */}
          <Text style={styles.callIcon}>
            {callType === 'video' ? '📹' : '📞'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {/* Reject button */}
          <View style={styles.actionButton}>
            <IconButton
              icon="phone-hangup"
              size={40}
              iconColor="#fff"
              style={styles.rejectButton}
              onPress={onReject}
            />
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          {/* Accept button */}
          <View style={styles.actionButton}>
            <IconButton
              icon={callType === 'video' ? 'video' : 'phone'}
              size={40}
              iconColor="#fff"
              style={styles.acceptButton}
              onPress={onAccept}
            />
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  backgroundTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#16213e',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  backgroundBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  callTypeText: {
    fontSize: 16,
    color: '#8892b0',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  groupNameText: {
    fontSize: 18,
    color: '#ccd6f6',
    marginBottom: 40,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatarRing: {
    padding: 8,
    borderRadius: 72,
    borderWidth: 3,
    borderColor: 'rgba(100, 255, 218, 0.3)',
  },
  callerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  participantsText: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 24,
    textAlign: 'center',
  },
  callIcon: {
    fontSize: 48,
    marginTop: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingBottom: 60,
    paddingTop: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#e53935',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  acceptButton: {
    backgroundColor: '#4caf50',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#ccd6f6',
  },
});
