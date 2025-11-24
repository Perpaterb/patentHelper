/**
 * SecretSantaDetailScreen
 *
 * View and manage a Secret Santa event.
 * Shows event details, participants, and admin controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl,  } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  Chip,
  List,
  Divider,
  ActivityIndicator,
  Portal,
  Modal,
  Menu,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

export default function SecretSantaDetailScreen({ navigation, route }) {
  const { groupId, krisKringleId, eventName } = route.params;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Action states
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // Menu states
  const [menuVisible, setMenuVisible] = useState(null);

  /**
   * Load event details
   */
  const loadEvent = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/kris-kringle/${krisKringleId}`);
      setEvent(response.data.krisKringle);
    } catch (err) {
      console.error('Load secret santa error:', err);

      if (err.isAuthError) {
        console.log('[SecretSantaDetail] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load Secret Santa event');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load on mount and when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [groupId, krisKringleId])
  );

  /**
   * Handle refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadEvent();
  };

  /**
   * Generate matches
   */
  const handleGenerateMatches = async () => {
    if (event.participants.length < 3) {
      CustomAlert.alert('Not Enough Participants', 'You need at least 3 participants to generate matches');
      return;
    }

    CustomAlert.alert(
      'Generate Matches?',
      'This will randomly assign each participant to give a gift to another participant. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              setGenerating(true);
              await api.post(`/groups/${groupId}/kris-kringle/${krisKringleId}/generate-matches`);
              CustomAlert.alert('Success', 'Matches have been generated!');
              loadEvent();
            } catch (err) {
              console.error('Generate matches error:', err);
              CustomAlert.alert('Error', err.response?.data?.message || 'Failed to generate matches');
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Resend email to participant
   */
  const handleResendEmail = async (participantId) => {
    setMenuVisible(null);

    try {
      setResendingId(participantId);
      await api.post(`/groups/${groupId}/kris-kringle/${krisKringleId}/participants/${participantId}/resend`);
      CustomAlert.alert('Email Sent', 'A new email with a fresh passcode has been sent.');
      loadEvent();
    } catch (err) {
      console.error('Resend email error:', err);
      CustomAlert.alert('Error', err.response?.data?.message || 'Failed to resend email');
    } finally {
      setResendingId(null);
    }
  };

  /**
   * Delete event
   */
  const handleDelete = async () => {
    const isBeforeExchange = event.exchangeDate && new Date(event.exchangeDate) > new Date();

    const message = isBeforeExchange
      ? 'This will delete the Secret Santa event and notify all participants via email. This cannot be undone.'
      : 'This will delete the Secret Santa event. This cannot be undone.';

    CustomAlert.alert(
      'Delete Secret Santa?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await api.delete(`/groups/${groupId}/kris-kringle/${krisKringleId}`);
              navigation.goBack();
            } catch (err) {
              console.error('Delete event error:', err);
              CustomAlert.alert('Error', err.response?.data?.message || 'Failed to delete event');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Format datetime for display
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  /**
   * Get status chip color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return '#9e9e9e';
      case 'active':
        return '#4caf50';
      case 'completed':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  /**
   * Check if assignments have been revealed
   */
  const isRevealed = () => {
    if (!event.assigningDateTime) return true;
    return new Date(event.assigningDateTime) <= new Date();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={loadEvent}>Retry</Button>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>{eventName || event.name}</Text>
        <IconButton
          icon="delete"
          onPress={handleDelete}
          loading={deleting}
          disabled={deleting}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Event Details Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>{event.name}</Title>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(event.status) }]}
                textStyle={styles.statusChipText}
              >
                {event.status}
              </Chip>
            </View>

            {event.occasion && (
              <Paragraph style={styles.occasion}>{event.occasion}</Paragraph>
            )}

            <Divider style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Exchange Date</Text>
                <Text style={styles.detailValue}>{formatDate(event.exchangeDate)}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Gift Value</Text>
                <Text style={styles.detailValue}>
                  {event.priceLimit ? `$${event.priceLimit}` : 'Not set'}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Names Revealed</Text>
                <Text style={styles.detailValue}>
                  {isRevealed() ? 'Yes' : formatDateTime(event.assigningDateTime)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Matches Generated</Text>
                <Text style={styles.detailValue}>
                  {event.isAssigned ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>

            {!event.isAssigned && (
              <Button
                mode="contained"
                icon="shuffle-variant"
                onPress={handleGenerateMatches}
                loading={generating}
                disabled={generating || event.participants.length < 3}
                style={styles.generateButton}
              >
                Generate Matches
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Participants Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              Participants ({event.participants?.length || 0})
            </Title>

            {event.participants?.length === 0 ? (
              <Text style={styles.noParticipants}>No participants added</Text>
            ) : (
              event.participants.map((participant, index) => (
                <View key={participant.participantId}>
                  <View style={styles.participantItem}>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{participant.name}</Text>
                      <Text style={styles.participantEmail}>{participant.email}</Text>
                      <View style={styles.participantChips}>
                        {!participant.groupMemberId && (
                          <Chip
                            style={styles.externalChip}
                            textStyle={styles.chipText}
                          >
                            External
                          </Chip>
                        )}
                        {participant.hasViewed && (
                          <Chip
                            style={styles.viewedChip}
                            textStyle={styles.chipText}
                          >
                            Viewed
                          </Chip>
                        )}
                        {event.isAssigned && participant.match && isRevealed() && (
                          <Chip
                            style={styles.matchChip}
                            textStyle={styles.chipText}
                            icon="arrow-right"
                          >
                            {participant.match.name}
                          </Chip>
                        )}
                      </View>
                    </View>

                    <Menu
                      visible={menuVisible === participant.participantId}
                      onDismiss={() => setMenuVisible(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          onPress={() => setMenuVisible(participant.participantId)}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => handleResendEmail(participant.participantId)}
                        title="Resend Email"
                        leadingIcon="email"
                        disabled={resendingId === participant.participantId}
                      />
                    </Menu>
                  </View>
                  {index < event.participants.length - 1 && (
                    <Divider style={styles.participantDivider} />
                  )}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoText}>
              Each participant receives an email with a unique link and passcode to view their assignment.
              {!event.isAssigned && ' Generate matches to reveal assignments.'}
              {event.isAssigned && !isRevealed() && ` Assignments will be revealed on ${formatDateTime(event.assigningDateTime)}.`}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
  },
  statusChip: {
    marginLeft: 8,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  occasion: {
    color: '#666',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  noParticipants: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantEmail: {
    fontSize: 12,
    color: '#666',
  },
  participantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  externalChip: {
    backgroundColor: '#ff9800',
    height: 24,
  },
  viewedChip: {
    backgroundColor: '#4caf50',
    height: 24,
  },
  matchChip: {
    backgroundColor: '#2196f3',
    height: 24,
  },
  chipText: {
    color: '#fff',
    fontSize: 10,
  },
  participantDivider: {
    marginVertical: 4,
  },
  infoCard: {
    backgroundColor: '#e3f2fd',
  },
  infoText: {
    fontSize: 12,
    color: '#1565c0',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 20,
  },
});
