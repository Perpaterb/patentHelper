/**
 * Recording Queue Modal
 *
 * Shows queue status when server is at recording capacity.
 * Allows users to:
 * - Wait in queue for their turn
 * - See their position
 * - Exit the queue
 * - Skip queue by disabling recording (via settings reminder)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Surface, ActivityIndicator, IconButton } from 'react-native-paper';
import api from '../services/api';

/**
 * @typedef {Object} RecordingQueueModalProps
 * @property {boolean} visible - Whether modal is visible
 * @property {Object} queueInfo - Queue information from join endpoint
 * @property {string} groupId - Group ID
 * @property {string} callType - 'video' or 'phone'
 * @property {Function} onTurnReady - Callback when it's user's turn
 * @property {Function} onExit - Callback when user exits queue
 * @property {Function} onClose - Callback to close modal
 */

/**
 * RecordingQueueModal component
 *
 * @param {RecordingQueueModalProps} props
 * @returns {JSX.Element}
 */
export default function RecordingQueueModal({
  visible,
  queueInfo,
  groupId,
  callType,
  onTurnReady,
  onExit,
  onClose,
}) {
  const [position, setPosition] = useState(queueInfo?.position || 1);
  const [totalInQueue, setTotalInQueue] = useState(queueInfo?.totalInQueue || 1);
  const [isChecking, setIsChecking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const pollIntervalRef = useRef(null);

  // Start polling for turn status when modal becomes visible
  useEffect(() => {
    if (visible && queueInfo?.queueId) {
      // Initial check
      checkTurn();

      // Poll every 5 seconds
      pollIntervalRef.current = setInterval(checkTurn, 5000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [visible, queueInfo?.queueId]);

  // Update position when queueInfo changes
  useEffect(() => {
    if (queueInfo) {
      setPosition(queueInfo.position);
      setTotalInQueue(queueInfo.totalInQueue);
    }
  }, [queueInfo]);

  /**
   * Check if it's the user's turn
   */
  const checkTurn = async () => {
    if (!queueInfo?.queueId) return;

    try {
      const response = await api.get(`/recording-queue/check-turn/${queueInfo.queueId}`);

      if (response.data.isYourTurn) {
        // Clear polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        onTurnReady();
      } else {
        // Update position
        setPosition(response.data.position);
        setTotalInQueue(response.data.totalInQueue);
      }
    } catch (err) {
      console.error('Check turn error:', err);
      // If queue entry not found, it may have expired
      if (err.response?.status === 404) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        onClose();
      }
    }
  };

  /**
   * Exit the queue
   */
  const handleExitQueue = async () => {
    if (!queueInfo?.queueId) {
      onExit();
      return;
    }

    setIsExiting(true);
    try {
      await api.post('/recording-queue/leave', {
        queueId: queueInfo.queueId,
      });

      // Clear polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      onExit();
    } catch (err) {
      console.error('Exit queue error:', err);
      // Even if API fails, still close modal
      onExit();
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleExitQueue}
    >
      <View style={styles.overlay}>
        <Surface style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Recording Queue</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleExitQueue}
              disabled={isExiting}
            />
          </View>

          <View style={styles.content}>
            {/* Queue Position Display */}
            <View style={styles.positionContainer}>
              <Text style={styles.positionLabel}>Your Position</Text>
              <View style={styles.positionCircle}>
                <Text style={styles.positionNumber}>{position}</Text>
              </View>
              <Text style={styles.queueInfo}>
                {totalInQueue > 1 ? `of ${totalInQueue} in queue` : 'in queue'}
              </Text>
            </View>

            {/* Explanation */}
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationTitle}>Why am I in a queue?</Text>
              <Text style={styles.explanationText}>
                This queue is only for calls with recording enabled, as recording requires server resources.
              </Text>
              <Text style={styles.explanationText}>
                We are a very new app and as we get more users we can pay for more servers. This has been logged and support have been informed that you are in the queue.
              </Text>
            </View>

            {/* Tip */}
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>
                If you don't need {callType} recording, you can disable it in Group Settings to skip the queue.
              </Text>
            </View>

            {/* Waiting indicator */}
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color="#2196f3" />
              <Text style={styles.waitingText}>Waiting for your turn...</Text>
            </View>
          </View>

          {/* Exit Button */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleExitQueue}
              loading={isExiting}
              disabled={isExiting}
              style={styles.exitButton}
              icon="exit-to-app"
            >
              Exit Queue
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    elevation: 8,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  positionContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  positionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  positionCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  positionNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  queueInfo: {
    fontSize: 14,
    color: '#666',
  },
  explanationContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  tipContainer: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  tipText: {
    fontSize: 13,
    color: '#e65100',
    lineHeight: 18,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  waitingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2196f3',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  exitButton: {
    borderColor: '#f44336',
  },
});
