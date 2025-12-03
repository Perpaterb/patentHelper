/**
 * Incoming Call Handler
 *
 * Wrapper component that listens for incoming calls and shows the overlay.
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
  const { incomingCall, acceptCall, rejectCall } = useIncomingCall();

  const handleAccept = async () => {
    try {
      const call = await acceptCall();
      if (call) {
        navigation.navigate('ActivePhoneCall', {
          groupId: call.groupId,
          callId: call.callId,
          call,
          isInitiator: false,
        });
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
      callType="phone"
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}
