/**
 * Incoming Call Handler
 *
 * Wrapper component that listens for incoming phone and video calls.
 * Shows the overlay and navigates to the appropriate call screen.
 * Should be rendered inside NavigationContainer.
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useIncomingCall } from '../contexts/IncomingCallContext';
import IncomingCallOverlay from './IncomingCallOverlay';
import { CustomAlert } from './CustomAlert';

/**
 * IncomingCallHandler component
 * @returns {JSX.Element|null}
 */
export default function IncomingCallHandler() {
  const navigation = useNavigation();
  const { incomingCall, callType, acceptCall, rejectCall } = useIncomingCall();

  // Debug: Log when incoming call state changes
  React.useEffect(() => {
    console.log('[IncomingCallHandler] incomingCall state:', incomingCall ? {
      callId: incomingCall.callId,
      groupName: incomingCall.groupName,
      initiator: incomingCall.initiator?.displayName,
      callType,
    } : null);
  }, [incomingCall, callType]);

  const handleAccept = async () => {
    try {
      const call = await acceptCall();
      if (call) {
        // Navigate to the appropriate call screen based on call type
        if (call.callType === 'video') {
          navigation.navigate('ActiveVideoCall', {
            groupId: call.groupId,
            callId: call.callId,
            call,
            isInitiator: false,
          });
        } else {
          navigation.navigate('ActivePhoneCall', {
            groupId: call.groupId,
            callId: call.callId,
            call,
            isInitiator: false,
          });
        }
      }
    } catch (err) {
      CustomAlert.alert('Error', 'Failed to accept call');
    }
  };

  const handleReject = async () => {
    try {
      await rejectCall();
    } catch (err) {
      CustomAlert.alert('Error', 'Failed to reject call');
    }
  };

  return (
    <IncomingCallOverlay
      visible={!!incomingCall}
      call={incomingCall}
      callType={callType || 'phone'}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}
