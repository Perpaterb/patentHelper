/**
 * Create Child Responsibility Event Screen
 *
 * Form for creating child responsibility events (who's responsible for which child when).
 * Requires at least one child and exactly one responsible adult (or manual entry like "School").
 * Optional handoff to another responsible party at end time.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import DateTimeSelector, { formatDateByType } from '../../components/DateTimeSelector';
import API from '../../services/api';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

export default function CreateChildEventScreen({ navigation, route }) {
  const { groupId, defaultStartDate } = route.params;

  // Initialize dates
  const initialStartDate = defaultStartDate ? new Date(defaultStartDate) : new Date();
  const initialEndDate = new Date(initialStartDate.getTime() + 60 * 60 * 1000); // +1 hour

  // Event details
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('WEEKLY');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);

  // Group members
  const [members, setMembers] = useState([]);
  const [children, setChildren] = useState([]); // Available children
  const [adults, setAdults] = useState([]); // Available adults (admin/parent/caregiver)

  // Selected data
  const [selectedChildren, setSelectedChildren] = useState([]); // Array of childIds
  const [responsibleType, setResponsibleType] = useState('member'); // 'member' or 'other'
  const [responsibleMemberId, setResponsibleMemberId] = useState(null);
  const [responsibleOtherName, setResponsibleOtherName] = useState('');
  const [responsibleOtherColor, setResponsibleOtherColor] = useState('#FF5722');

  // Handoff
  const [hasHandoff, setHasHandoff] = useState(false);
  const [handoffType, setHandoffType] = useState('member');
  const [handoffMemberId, setHandoffMemberId] = useState(null);
  const [handoffOtherName, setHandoffOtherName] = useState('');
  const [handoffOtherColor, setHandoffOtherColor] = useState('#4CAF50');

  // Modal states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [showChildrenPicker, setShowChildrenPicker] = useState(false);
  const [showResponsiblePicker, setShowResponsiblePicker] = useState(false);
  const [showHandoffPicker, setShowHandoffPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState('responsible'); // 'responsible' or 'handoff'

  // Predefined colors for manual entries
  const colorOptions = [
    '#FF5722', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFC107', '#FF9800', '#FF5722', '#795548',
  ];

  // Fetch group members on mount
  useEffect(() => {
    fetchGroupMembers();
  }, []);

  const fetchGroupMembers = async () => {
    try {
      const response = await API.get(`/groups/${groupId}`);
      if (response.data.success) {
        const allMembers = response.data.group.members || [];
        setMembers(allMembers);

        // Filter children
        const childMembers = allMembers.filter(m => m.role === 'child');
        setChildren(childMembers);

        // Filter adults (admin, parent, adult, caregiver)
        const adultMembers = allMembers.filter(m =>
          m.role === 'admin' || m.role === 'parent' || m.role === 'adult' || m.role === 'caregiver'
        );
        setAdults(adultMembers);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      CustomAlert.alert('Error', 'Failed to load group members');
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!title.trim()) {
      CustomAlert.alert('Error', 'Please enter a title');
      return;
    }

    if (selectedChildren.length === 0) {
      CustomAlert.alert('Error', 'Please select at least one child');
      return;
    }

    if (responsibleType === 'member' && !responsibleMemberId) {
      CustomAlert.alert('Error', 'Please select a responsible adult');
      return;
    }

    if (responsibleType === 'other' && !responsibleOtherName.trim()) {
      CustomAlert.alert('Error', 'Please enter a name for the responsible party');
      return;
    }

    if (hasHandoff) {
      if (handoffType === 'member' && !handoffMemberId) {
        CustomAlert.alert('Error', 'Please select a handoff person');
        return;
      }
      if (handoffType === 'other' && !handoffOtherName.trim()) {
        CustomAlert.alert('Error', 'Please enter a name for the handoff party');
        return;
      }
    }

    try {
      // Build recurrence rule if recurring
      let recurrenceRule = null;
      if (isRecurring) {
        if (recurrenceFrequency === 'FORTNIGHTLY') {
          recurrenceRule = 'FREQ=WEEKLY;INTERVAL=2';
        } else if (recurrenceFrequency === 'QUARTERLY') {
          recurrenceRule = 'FREQ=MONTHLY;INTERVAL=3';
        } else {
          recurrenceRule = `FREQ=${recurrenceFrequency}`;
        }

        if (recurrenceEndDate) {
          const endDateStr = recurrenceEndDate.toISOString().split('T')[0].replace(/-/g, '');
          recurrenceRule += `;UNTIL=${endDateStr}`;
        }
      }

      // Create child responsibility events (one per child)
      const responsibilityEvents = selectedChildren.map(childId => ({
        childId,
        startResponsibilityType: responsibleType,
        startResponsibleMemberId: responsibleType === 'member' ? responsibleMemberId : null,
        startResponsibleOtherName: responsibleType === 'other' ? responsibleOtherName : null,
        startResponsibleOtherIconLetters: responsibleType === 'other' ? generateIconLetters(responsibleOtherName) : null,
        startResponsibleOtherColor: responsibleType === 'other' ? responsibleOtherColor : null,
        endResponsibilityType: hasHandoff ? handoffType : responsibleType,
        endResponsibleMemberId: hasHandoff && handoffType === 'member' ? handoffMemberId : (hasHandoff ? null : responsibleMemberId),
        endResponsibleOtherName: hasHandoff && handoffType === 'other' ? handoffOtherName : (hasHandoff ? null : (responsibleType === 'other' ? responsibleOtherName : null)),
        endResponsibleOtherIconLetters: hasHandoff && handoffType === 'other' ? generateIconLetters(handoffOtherName) : (hasHandoff ? null : (responsibleType === 'other' ? generateIconLetters(responsibleOtherName) : null)),
        endResponsibleOtherColor: hasHandoff && handoffType === 'other' ? handoffOtherColor : (hasHandoff ? null : (responsibleType === 'other' ? responsibleOtherColor : null)),
      }));

      const response = await API.post(`/groups/${groupId}/calendar/responsibility-events`, {
        title,
        notes,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        isRecurring,
        recurrenceRule,
        recurrenceEndDate: recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
        responsibilityEvents,
      });

      if (response.data.success) {
        CustomAlert.alert('Success', 'Child responsibility event created', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      CustomAlert.alert('Error', error.response?.data?.message || 'Failed to create event');
    }
  };

  const generateIconLetters = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const toggleChildSelection = (childId) => {
    if (selectedChildren.includes(childId)) {
      setSelectedChildren(selectedChildren.filter(id => id !== childId));
    } else {
      setSelectedChildren([...selectedChildren, childId]);
    }
  };

  const formatFrequency = (freq) => {
    switch (freq) {
      case 'DAILY': return 'Every Day';
      case 'WEEKLY': return 'Every Week';
      case 'FORTNIGHTLY': return 'Every Fortnight (2 weeks)';
      case 'MONTHLY': return 'Every Month';
      case 'QUARTERLY': return 'Every Quarter (3 months)';
      case 'YEARLY': return 'Every Year';
      default: return 'Every Week';
    }
  };

  const getSelectedChildrenNames = () => {
    if (selectedChildren.length === 0) return 'None selected';
    const names = selectedChildren.map(id => {
      const child = children.find(c => c.groupMemberId === id);
      return child ? child.displayName : '';
    }).filter(Boolean);
    return names.join(', ');
  };

  const getResponsibleName = () => {
    if (responsibleType === 'member') {
      if (!responsibleMemberId) return 'None selected';
      const adult = adults.find(a => a.groupMemberId === responsibleMemberId);
      return adult ? adult.displayName : 'None selected';
    } else {
      return responsibleOtherName || 'Not entered';
    }
  };

  const getHandoffName = () => {
    if (handoffType === 'member') {
      if (!handoffMemberId) return 'None selected';
      const adult = adults.find(a => a.groupMemberId === handoffMemberId);
      return adult ? adult.displayName : 'None selected';
    } else {
      return handoffOtherName || 'Not entered';
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="New Child Event"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Soccer Practice, School Day"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional details..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Children *</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowChildrenPicker(true)}>
          <Text style={styles.pickerText}>{getSelectedChildrenNames()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Responsible Adult *</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.typeButton, responsibleType === 'member' && styles.typeButtonActive]}
            onPress={() => setResponsibleType('member')}
          >
            <Text style={[styles.typeButtonText, responsibleType === 'member' && styles.typeButtonTextActive]}>
              Group Member
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, responsibleType === 'other' && styles.typeButtonActive]}
            onPress={() => setResponsibleType('other')}
          >
            <Text style={[styles.typeButtonText, responsibleType === 'other' && styles.typeButtonTextActive]}>
              Other (School, etc.)
            </Text>
          </TouchableOpacity>
        </View>

        {responsibleType === 'member' ? (
          <TouchableOpacity style={styles.picker} onPress={() => setShowResponsiblePicker(true)}>
            <Text style={styles.pickerText}>{getResponsibleName()}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={responsibleOtherName}
              onChangeText={setResponsibleOtherName}
              placeholder="e.g., School, Afterschool Care"
            />
            <TouchableOpacity
              style={styles.colorPickerButton}
              onPress={() => {
                setColorPickerTarget('responsible');
                setShowColorPicker(true);
              }}
            >
              <View style={[styles.colorPreview, { backgroundColor: responsibleOtherColor }]} />
              <Text style={styles.colorPickerButtonText}>Choose Color</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Handoff at End Time</Text>
          <TouchableOpacity
            style={[styles.toggle, hasHandoff && styles.toggleActive]}
            onPress={() => setHasHandoff(!hasHandoff)}
          >
            <View style={[styles.toggleCircle, hasHandoff && styles.toggleCircleActive]} />
          </TouchableOpacity>
        </View>

        {hasHandoff && (
          <>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.typeButton, handoffType === 'member' && styles.typeButtonActive]}
                onPress={() => setHandoffType('member')}
              >
                <Text style={[styles.typeButtonText, handoffType === 'member' && styles.typeButtonTextActive]}>
                  Group Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, handoffType === 'other' && styles.typeButtonActive]}
                onPress={() => setHandoffType('other')}
              >
                <Text style={[styles.typeButtonText, handoffType === 'other' && styles.typeButtonTextActive]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>

            {handoffType === 'member' ? (
              <TouchableOpacity style={styles.picker} onPress={() => setShowHandoffPicker(true)}>
                <Text style={styles.pickerText}>{getHandoffName()}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={handoffOtherName}
                  onChangeText={setHandoffOtherName}
                  placeholder="e.g., Grandma, Sports Coach"
                />
                <TouchableOpacity
                  style={styles.colorPickerButton}
                  onPress={() => {
                    setColorPickerTarget('handoff');
                    setShowColorPicker(true);
                  }}
                >
                  <View style={[styles.colorPreview, { backgroundColor: handoffOtherColor }]} />
                  <Text style={styles.colorPickerButtonText}>Choose Color</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Start Time</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.pickerText}>{formatDateByType(startDate, 1)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text style={styles.pickerText}>{formatDateByType(endDate, 1)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Recurring Event</Text>
          <TouchableOpacity
            style={[styles.toggle, isRecurring && styles.toggleActive]}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.toggleCircle, isRecurring && styles.toggleCircleActive]} />
          </TouchableOpacity>
        </View>

        {isRecurring && (
          <>
            <TouchableOpacity style={styles.picker} onPress={() => setShowFrequencyPicker(true)}>
              <Text style={styles.pickerText}>{formatFrequency(recurrenceFrequency)}</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 10 }]}>Repeat Until (Optional)</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowRecurrenceEndPicker(true)}
            >
              <Text style={styles.pickerText}>
                {recurrenceEndDate ? formatDateByType(recurrenceEndDate, 3) : 'Forever'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>Create Child Event</Text>
      </TouchableOpacity>

      {/* Date/Time Pickers */}
      <DateTimeSelector
        value={startDate}
        onChange={(newDate) => {
          setStartDate(newDate);
          // Auto-adjust end date if it's before new start date
          if (endDate <= newDate) {
            setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
          }
        }}
        format={1}
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        title="Start Time"
      />

      <DateTimeSelector
        value={endDate}
        onChange={setEndDate}
        format={1}
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        title="End Time"
        minimumDate={startDate}
      />

      <DateTimeSelector
        value={recurrenceEndDate || new Date()}
        onChange={setRecurrenceEndDate}
        format={3}
        visible={showRecurrenceEndPicker}
        onClose={() => setShowRecurrenceEndPicker(false)}
        title="Repeat Until"
        minimumDate={startDate}
      />

      {/* Frequency Picker */}
      {showFrequencyPicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              Platform.OS === 'web' && styles.modalContentWeb
            ]}>
              <Text style={styles.pickerModalTitle}>Repeat Frequency</Text>
              {['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={styles.pickerOption}
                  onPress={() => {
                    setRecurrenceFrequency(freq);
                    setShowFrequencyPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{formatFrequency(freq)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowFrequencyPicker(false)}>
                <Text style={styles.cancelModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Children Picker */}
      {showChildrenPicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              Platform.OS === 'web' && styles.modalContentWeb
            ]}>
              <Text style={styles.pickerModalTitle}>Select Children</Text>
              <ScrollView style={styles.checkboxList}>
                {children.map(child => (
                  <TouchableOpacity
                    key={child.groupMemberId}
                    style={styles.checkboxItem}
                    onPress={() => toggleChildSelection(child.groupMemberId)}
                  >
                    <View style={[styles.checkbox, selectedChildren.includes(child.groupMemberId) && styles.checkboxChecked]}>
                      {selectedChildren.includes(child.groupMemberId) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>{child.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowChildrenPicker(false)}>
                <Text style={styles.cancelModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Responsible Adult Picker */}
      {showResponsiblePicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              Platform.OS === 'web' && styles.modalContentWeb
            ]}>
              <Text style={styles.pickerModalTitle}>Select Responsible Adult</Text>
              {adults.map(adult => (
                <TouchableOpacity
                  key={adult.groupMemberId}
                  style={styles.pickerOption}
                  onPress={() => {
                    setResponsibleMemberId(adult.groupMemberId);
                    setShowResponsiblePicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{adult.displayName} ({adult.role})</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowResponsiblePicker(false)}>
                <Text style={styles.cancelModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Handoff Picker */}
      {showHandoffPicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              Platform.OS === 'web' && styles.modalContentWeb
            ]}>
              <Text style={styles.pickerModalTitle}>Select Handoff Person</Text>
              {adults.map(adult => (
                <TouchableOpacity
                  key={adult.groupMemberId}
                  style={styles.pickerOption}
                  onPress={() => {
                    setHandoffMemberId(adult.groupMemberId);
                    setShowHandoffPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{adult.displayName} ({adult.role})</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowHandoffPicker(false)}>
                <Text style={styles.cancelModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Color Picker */}
      {showColorPicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent,
              Platform.OS === 'web' && styles.modalContentWeb
            ]}>
              <Text style={styles.pickerModalTitle}>Choose Color</Text>
              <View style={styles.colorGrid}>
                {colorOptions.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }]}
                    onPress={() => {
                      if (colorPickerTarget === 'responsible') {
                        setResponsibleOtherColor(color);
                      } else {
                        setHandoffOtherColor(color);
                      }
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowColorPicker(false)}>
                <Text style={styles.cancelModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#6200ee',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#fafafa',
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorPickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  modalContentWeb: {
    maxWidth: 300,
    transform: [{ translateX: 120 }],
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  checkboxList: {
    maxHeight: 300,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  doneButton: {
    backgroundColor: '#6200ee',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 8,
    borderWidth: 2,
    borderColor: '#ddd',
  },
});
