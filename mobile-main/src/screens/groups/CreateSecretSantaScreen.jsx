/**
 * CreateSecretSantaScreen
 *
 * Create a new Secret Santa event with participants.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Divider,
  Chip,
  List,
  Portal,
  Modal,
  Card,
  Title,
  ActivityIndicator,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';

export default function CreateSecretSantaScreen({ navigation, route }) {
  const { groupId } = route.params;

  // Form state
  const [name, setName] = useState('');
  const [priceLimit, setPriceLimit] = useState('');
  const [exchangeDate, setExchangeDate] = useState(null);
  const [assigningDateTime, setAssigningDateTime] = useState(new Date());

  // Participants
  const [participants, setParticipants] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);

  // Date picker state
  const [showExchangeDatePicker, setShowExchangeDatePicker] = useState(false);
  const [showAssigningDatePicker, setShowAssigningDatePicker] = useState(false);

  // Modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Load group members on mount
  useEffect(() => {
    loadGroupMembers();
  }, []);

  /**
   * Load group members for participant selection
   */
  const loadGroupMembers = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroupMembers(response.data.group?.members || []);
    } catch (err) {
      console.error('Load group members error:', err);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Add a group member as participant
   */
  const handleAddMember = (member) => {
    // Check if already added
    if (participants.some(p => p.groupMemberId === member.groupMemberId)) {
      Alert.alert('Already Added', `${member.displayName || member.user?.displayName} is already a participant`);
      return;
    }

    setParticipants([
      ...participants,
      {
        groupMemberId: member.groupMemberId,
        name: member.user?.displayName || member.displayName,
        email: member.user?.email || member.email,
        isGroupMember: true,
      },
    ]);
    setShowMemberModal(false);
  };

  /**
   * Add an external participant
   */
  const handleAddExternal = () => {
    if (!externalName.trim() || !externalEmail.trim()) {
      Alert.alert('Required Fields', 'Please enter both name and email');
      return;
    }

    // Check if email already exists
    if (participants.some(p => p.email?.toLowerCase() === externalEmail.toLowerCase())) {
      Alert.alert('Already Added', 'A participant with this email already exists');
      return;
    }

    setParticipants([
      ...participants,
      {
        name: externalName.trim(),
        email: externalEmail.trim().toLowerCase(),
        isGroupMember: false,
      },
    ]);

    setExternalName('');
    setExternalEmail('');
    setShowExternalModal(false);
  };

  /**
   * Remove a participant
   */
  const handleRemoveParticipant = (index) => {
    const newParticipants = [...participants];
    newParticipants.splice(index, 1);
    setParticipants(newParticipants);
  };

  /**
   * Handle create
   */
  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name for the Secret Santa');
      return;
    }

    if (participants.length < 3) {
      Alert.alert('Not Enough Participants', 'You need at least 3 participants for Secret Santa');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        priceLimit: priceLimit ? parseFloat(priceLimit) : null,
        exchangeDate: exchangeDate ? exchangeDate.toISOString() : null,
        assigningDateTime: assigningDateTime.toISOString(),
        participants: participants.map(p => ({
          groupMemberId: p.groupMemberId || null,
          name: p.name,
          email: p.email,
        })),
      };

      const response = await api.post(`/groups/${groupId}/kris-kringle`, payload);

      Alert.alert(
        'Secret Santa Created!',
        `${participants.length} participants have been emailed with their access link and passcode.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Create secret santa error:', err);

      if (err.isAuthError) {
        console.log('[CreateSecretSanta] Auth error detected - user will be logged out');
        return;
      }

      Alert.alert('Error', err.response?.data?.message || 'Failed to create Secret Santa');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date) => {
    if (!date) return 'Select date';
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
  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>New Secret Santa</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Event Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Event Details</Title>

            <TextInput
              label="Event Name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              placeholder="Christmas Gift Exchange 2024"
            />

            <TextInput
              label="Gift Value ($)"
              value={priceLimit}
              onChangeText={setPriceLimit}
              mode="outlined"
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="25"
            />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowExchangeDatePicker(true)}
            >
              <Text style={styles.dateLabel}>Exchange Date</Text>
              <Text style={styles.dateValue}>{formatDate(exchangeDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowAssigningDatePicker(true)}
            >
              <Text style={styles.dateLabel}>Reveal Names On</Text>
              <Text style={styles.dateValue}>{formatDateTime(assigningDateTime)}</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Participants */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.participantsHeader}>
              <Title style={styles.sectionTitle}>Participants ({participants.length})</Title>
            </View>

            <Text style={styles.tipText}>
              Tip: It's better to add people as group members before adding them to Secret Santa.
              This allows them to link their gift registry.
            </Text>

            {participants.length === 0 ? (
              <Text style={styles.noParticipants}>No participants added yet</Text>
            ) : (
              participants.map((p, index) => (
                <View key={index} style={styles.participantItem}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{p.name}</Text>
                    <Text style={styles.participantEmail}>{p.email}</Text>
                    {!p.isGroupMember && (
                      <Chip style={styles.externalChip} textStyle={styles.externalChipText}>
                        External
                      </Chip>
                    )}
                  </View>
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => handleRemoveParticipant(index)}
                  />
                </View>
              ))
            )}

            <View style={styles.addButtonsRow}>
              <Button
                mode="outlined"
                icon="account-plus"
                onPress={() => setShowMemberModal(true)}
                style={styles.addButton}
              >
                Add Member
              </Button>
              <Button
                mode="outlined"
                icon="email-plus"
                onPress={() => setShowExternalModal(true)}
                style={styles.addButton}
              >
                Add External
              </Button>
            </View>

            {participants.length > 0 && participants.length < 3 && (
              <Text style={styles.warningText}>
                Need at least 3 participants ({3 - participants.length} more)
              </Text>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading || participants.length < 3}
          style={styles.createButton}
        >
          Create Secret Santa
        </Button>
      </ScrollView>

      {/* Member Selection Modal */}
      <Portal>
        <Modal
          visible={showMemberModal}
          onDismiss={() => setShowMemberModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Title style={styles.modalTitle}>Select Group Member</Title>
          <Divider />
          {loadingMembers ? (
            <ActivityIndicator style={styles.modalLoading} />
          ) : (
            <ScrollView style={styles.memberList}>
              {groupMembers
                .filter(m => !participants.some(p => p.groupMemberId === m.groupMemberId))
                .map((member) => (
                  <List.Item
                    key={member.groupMemberId}
                    title={member.user?.displayName || member.displayName}
                    description={member.user?.email || member.email}
                    onPress={() => handleAddMember(member)}
                    left={() => (
                      <View style={[styles.memberIcon, { backgroundColor: member.user?.iconColor || member.iconColor || '#6200ee' }]}>
                        <Text style={styles.memberIconText}>
                          {member.user?.memberIcon || member.iconLetters || '??'}
                        </Text>
                      </View>
                    )}
                  />
                ))}
              {groupMembers.filter(m => !participants.some(p => p.groupMemberId === m.groupMemberId)).length === 0 && (
                <Text style={styles.noMembersText}>All group members have been added</Text>
              )}
            </ScrollView>
          )}
          <Button onPress={() => setShowMemberModal(false)} style={styles.modalButton}>
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* External Participant Modal */}
      <Portal>
        <Modal
          visible={showExternalModal}
          onDismiss={() => setShowExternalModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Title style={styles.modalTitle}>Add External Participant</Title>
          <Divider />
          <View style={styles.externalForm}>
            <TextInput
              label="Name *"
              value={externalName}
              onChangeText={setExternalName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email *"
              value={externalEmail}
              onChangeText={setExternalEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.externalNote}>
              They will receive an email with a link and passcode to view their assignment.
            </Text>
          </View>
          <View style={styles.modalButtons}>
            <Button onPress={() => setShowExternalModal(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAddExternal}>
              Add
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Date Pickers */}
      {showExchangeDatePicker && (
        <DateTimePicker
          value={exchangeDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowExchangeDatePicker(false);
            if (date) setExchangeDate(date);
          }}
        />
      )}

      {showAssigningDatePicker && (
        <DateTimePicker
          value={assigningDateTime}
          mode="datetime"
          display="default"
          onChange={(event, date) => {
            setShowAssigningDatePicker(false);
            if (date) setAssigningDateTime(date);
          }}
        />
      )}
    </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  externalChip: {
    backgroundColor: '#ff9800',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  externalChipText: {
    color: '#fff',
    fontSize: 10,
  },
  addButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  addButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  warningText: {
    color: '#ff9800',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  createButton: {
    marginTop: 16,
    marginBottom: 20,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    padding: 16,
    fontSize: 18,
  },
  modalLoading: {
    padding: 40,
  },
  memberList: {
    maxHeight: 300,
  },
  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  memberIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noMembersText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  modalButton: {
    margin: 8,
  },
  externalForm: {
    padding: 16,
  },
  externalNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
  },
});
