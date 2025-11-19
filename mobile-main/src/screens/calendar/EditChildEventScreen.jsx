import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

const RECURRENCE_OPTIONS = [
  { label: 'Daily', value: 'FREQ=DAILY' },
  { label: 'Weekly', value: 'FREQ=WEEKLY' },
  { label: 'Fortnightly', value: 'FREQ=WEEKLY;INTERVAL=2' },
  { label: 'Monthly', value: 'FREQ=MONTHLY' },
  { label: 'Quarterly', value: 'FREQ=MONTHLY;INTERVAL=3' },
  { label: 'Yearly', value: 'FREQ=YEARLY' },
];

const PREDEFINED_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];

export default function EditChildEventScreen({ route, navigation }) {
  const { groupId, eventId } = route.params;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('FREQ=DAILY');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
  const [isForever, setIsForever] = useState(true);

  // Responsibility events data
  const [responsibilityEvents, setResponsibilityEvents] = useState([]);
  const [allChildren, setAllChildren] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

  // Modal states
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    fetchEvent();
    fetchGroupMembers();
  }, []);

  const fetchEvent = async () => {
    try {
      const response = await API.get(`/groups/${groupId}/calendar/events/${eventId}`);
      const event = response.data.event;

      setTitle(event.title || '');
      setNotes(event.notes || '');
      setStartDate(new Date(event.startTime));
      setEndDate(new Date(event.endTime));
      setIsRecurring(event.isRecurring || false);
      setRecurrenceRule(event.recurrencePattern || 'FREQ=DAILY');

      if (event.recurrenceEndDate) {
        setRecurrenceEndDate(new Date(event.recurrenceEndDate));
        setIsForever(false);
      }

      // Extract responsibility events data
      if (event.responsibilityEvents && event.responsibilityEvents.length > 0) {
        setResponsibilityEvents(event.responsibilityEvents);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching event:', err);
      Alert.alert('Error', 'Failed to load event details');
      navigation.goBack();
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const response = await API.get(`/groups/${groupId}`);
      const members = response.data.group.members || [];

      const children = members.filter(m => m.role === 'child');
      const adults = members.filter(m => ['admin', 'parent', 'caregiver'].includes(m.role));

      setAllChildren(children);
      setAllMembers(adults);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Validation Error', 'End time must be after start time');
      return;
    }

    try {
      await API.put(`/groups/${groupId}/calendar/events/${eventId}`, {
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : null,
        recurrenceEndDate: isRecurring && !isForever && recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
      });

      Alert.alert('Success', 'Event updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Error updating event:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update event');
    }
  };

  const handleDelete = () => {
    if (isRecurring) {
      // Show options for recurring events
      Alert.alert(
        'Delete Recurring Event',
        'Choose delete option:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete This Event Only',
            onPress: () => confirmDelete(false, false),
          },
          {
            text: 'Delete This and Future Events',
            onPress: () => confirmDelete(false, true),
          },
          {
            text: 'Delete Entire Series',
            onPress: () => confirmDelete(true, false),
            style: 'destructive',
          },
        ],
        { cancelable: true }
      );
    } else {
      // Single event
      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: () => confirmDelete(false, false), style: 'destructive' },
        ]
      );
    }
  };

  const confirmDelete = async (deleteSeries, fromDate) => {
    try {
      const params = new URLSearchParams();
      if (deleteSeries) {
        params.append('deleteSeries', 'true');
      } else if (fromDate) {
        params.append('fromDate', startDate.toISOString());
      }

      await API.delete(`/groups/${groupId}/calendar/events/${eventId}?${params.toString()}`);

      Alert.alert('Success', 'Event deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Error deleting event:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleStartDateConfirm = () => {
    setStartDate(tempDate);
    setShowStartDatePicker(false);
  };

  const handleEndDateConfirm = () => {
    setEndDate(tempDate);
    setShowEndDatePicker(false);
  };

  const handleRecurrenceEndConfirm = () => {
    setRecurrenceEndDate(tempDate);
    setShowRecurrenceEndPicker(false);
  };

  const getRecurrenceLabel = () => {
    const option = RECURRENCE_OPTIONS.find(opt => opt.value === recurrenceRule);
    return option ? option.label : 'Daily';
  };

  const getChildName = (childId) => {
    const child = allChildren.find(c => c.groupMemberId === childId);
    return child ? child.displayName : 'Unknown Child';
  };

  const getMemberName = (memberId) => {
    const member = allMembers.find(m => m.groupMemberId === memberId);
    return member ? member.displayName : 'Unknown Member';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="Edit Child Event"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.updateButtonContainer}>
        <TouchableOpacity onPress={handleUpdate} style={styles.updateButton}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor="#999"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Start Date/Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Start Date & Time *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setTempDate(startDate);
              setShowStartDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {startDate.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Date/Time */}
        <View style={styles.section}>
          <Text style={styles.label}>End Date & Time *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setTempDate(endDate);
              setShowEndDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {endDate.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recurring Toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Recurring Event</Text>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              <View style={[styles.toggleTrack, isRecurring && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recurrence Options */}
        {isRecurring && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Repeat</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowRecurrenceModal(true)}
              >
                <Text style={styles.dateButtonText}>{getRecurrenceLabel()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.label}>Repeat Forever</Text>
                <TouchableOpacity
                  style={styles.toggle}
                  onPress={() => setIsForever(!isForever)}
                >
                  <View style={[styles.toggleTrack, isForever && styles.toggleTrackActive]}>
                    <View style={[styles.toggleThumb, isForever && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {!isForever && (
              <View style={styles.section}>
                <Text style={styles.label}>Repeat Until</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    setTempDate(recurrenceEndDate || new Date());
                    setShowRecurrenceEndPicker(true);
                  }}
                >
                  <Text style={styles.dateButtonText}>
                    {recurrenceEndDate ? recurrenceEndDate.toLocaleDateString() : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Responsibility Events Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Child Responsibilities</Text>
          {responsibilityEvents.map((re, idx) => (
            <View key={idx} style={styles.responsibilityCard}>
              <Text style={styles.responsibilityText}>
                <Text style={styles.bold}>Child:</Text> {getChildName(re.childId)}
              </Text>
              <Text style={styles.responsibilityText}>
                <Text style={styles.bold}>Responsible Adult:</Text>{' '}
                {re.startResponsibilityType === 'member'
                  ? getMemberName(re.startResponsibleMemberId)
                  : re.startResponsibleOtherName}
              </Text>
              {re.endResponsibleMemberId || re.endResponsibleOtherName ? (
                <Text style={styles.responsibilityText}>
                  <Text style={styles.bold}>Handoff To:</Text>{' '}
                  {re.endResponsibilityType === 'member'
                    ? getMemberName(re.endResponsibleMemberId)
                    : re.endResponsibleOtherName}
                </Text>
              ) : null}
            </View>
          ))}
          <Text style={styles.helperText}>
            Note: Child responsibility assignments cannot be edited. Delete and recreate the event to change assignments.
          </Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Event</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modals */}
      {showStartDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setTempDate(date);
                }}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowStartDatePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.goButton} onPress={handleStartDateConfirm}>
                  <Text style={styles.goButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showEndDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setTempDate(date);
                }}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEndDatePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.goButton} onPress={handleEndDateConfirm}>
                  <Text style={styles.goButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showRecurrenceEndPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setTempDate(date);
                }}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowRecurrenceEndPicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.goButton} onPress={handleRecurrenceEndConfirm}>
                  <Text style={styles.goButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Recurrence Modal */}
      {showRecurrenceModal && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Repeat Frequency</Text>
              {RECURRENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setRecurrenceRule(option.value);
                    setShowRecurrenceModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRecurrenceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  updateButtonContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'flex-end',
  },
  updateButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    padding: 4,
  },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: '#6200ee',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginLeft: 2,
  },
  toggleThumbActive: {
    marginLeft: 24,
  },
  responsibilityCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  responsibilityText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  bold: {
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
  },
  goButton: {
    flex: 1,
    backgroundColor: '#6200ee',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
});
