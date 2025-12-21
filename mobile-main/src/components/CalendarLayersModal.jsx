/**
 * Calendar Layers Modal Component
 *
 * Displays calendar layers in two sections:
 * 1. Member Calendars - One layer per group member
 * 2. Imported Calendars - External calendars (iCal URL or file)
 *
 * Each layer has controls for:
 * - Visibility toggle (eye icon)
 * - Notification toggle (bell icon)
 * - Color picker (color circle)
 *
 * Each user has their own layer preferences that only affect their view.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Title, Text, IconButton, Button } from 'react-native-paper';
import ColorPickerModal from './ColorPickerModal';
import ImportCalendarModal from './ImportCalendarModal';
import api from '../services/api';

/**
 * @typedef {Object} MemberLayer
 * @property {string} memberLayerId - GroupMember ID
 * @property {string} displayName - Member's display name
 * @property {string} iconLetters - Member's icon letters
 * @property {string} defaultColor - Member's default icon color
 * @property {string} role - Member's role in the group
 * @property {boolean} isVisible - Whether layer is visible
 * @property {boolean} notificationsEnabled - Whether notifications are enabled
 * @property {string|null} customColor - Custom color override (null = use default)
 */

/**
 * @typedef {Object} ImportedCalendar
 * @property {string} importedCalendarId - Calendar ID
 * @property {string} name - Calendar name
 * @property {string} color - Calendar color
 * @property {string} sourceType - 'url' or 'file'
 * @property {string} lastSyncStatus - 'success', 'error', or 'pending'
 * @property {boolean} isVisible - Whether layer is visible
 * @property {boolean} notificationsEnabled - Whether notifications are enabled
 * @property {string|null} customColor - Custom color override
 */

/**
 * @typedef {Object} CalendarLayersModalProps
 * @property {boolean} visible - Whether modal is visible
 * @property {string} groupId - Group ID
 * @property {function} onClose - Callback when modal is closed
 * @property {function} onLayersChanged - Callback when member layers are updated
 * @property {function} onImportedCalendarsChanged - Callback when imported calendars are updated
 */

/**
 * CalendarLayersModal component
 * @param {CalendarLayersModalProps} props
 * @returns {JSX.Element}
 */
export default function CalendarLayersModal({
  visible,
  groupId,
  onClose,
  onLayersChanged,
  onImportedCalendarsChanged,
}) {
  const [memberLayers, setMemberLayers] = useState([]);
  const [importedCalendars, setImportedCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // ID being updated
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // 'member' or 'imported'
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Fetch layers when modal opens
  useEffect(() => {
    if (visible && groupId) {
      fetchAllLayers();
    }
  }, [visible, groupId]);

  /**
   * Fetch both member layers and imported calendars
   */
  const fetchAllLayers = async () => {
    try {
      setLoading(true);

      // Fetch both in parallel
      const [memberResponse, importedResponse] = await Promise.all([
        api.get(`/groups/${groupId}/calendar/layers`),
        api.get(`/groups/${groupId}/calendar/imported`),
      ]);

      if (memberResponse.data.success) {
        setMemberLayers(memberResponse.data.layers);
        if (onLayersChanged) {
          onLayersChanged(memberResponse.data.layers);
        }
      }

      if (importedResponse.data.success) {
        setImportedCalendars(importedResponse.data.calendars);
        if (onImportedCalendarsChanged) {
          onImportedCalendarsChanged(importedResponse.data.calendars);
        }
      }
    } catch (error) {
      console.error('Error fetching calendar layers:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a member layer preference
   * @param {string} memberLayerId
   * @param {Object} updates
   */
  const updateMemberLayer = async (memberLayerId, updates) => {
    try {
      setUpdating(memberLayerId);
      const response = await api.put(
        `/groups/${groupId}/calendar/layers/${memberLayerId}`,
        updates
      );
      if (response.data.success) {
        setMemberLayers((prev) =>
          prev.map((layer) =>
            layer.memberLayerId === memberLayerId
              ? { ...layer, ...response.data.preference }
              : layer
          )
        );
        if (onLayersChanged) {
          const updatedLayers = memberLayers.map((layer) =>
            layer.memberLayerId === memberLayerId
              ? { ...layer, ...response.data.preference }
              : layer
          );
          onLayersChanged(updatedLayers);
        }
      }
    } catch (error) {
      console.error('Error updating member layer:', error);
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Update an imported calendar preference
   * @param {string} calendarId
   * @param {Object} updates
   */
  const updateImportedCalendarPreference = async (calendarId, updates) => {
    try {
      setUpdating(calendarId);
      const response = await api.put(
        `/groups/${groupId}/calendar/imported/${calendarId}/preference`,
        updates
      );
      if (response.data.success) {
        setImportedCalendars((prev) =>
          prev.map((cal) =>
            cal.importedCalendarId === calendarId
              ? { ...cal, ...response.data.preference }
              : cal
          )
        );
        if (onImportedCalendarsChanged) {
          const updatedCalendars = importedCalendars.map((cal) =>
            cal.importedCalendarId === calendarId
              ? { ...cal, ...response.data.preference }
              : cal
          );
          onImportedCalendarsChanged(updatedCalendars);
        }
      }
    } catch (error) {
      console.error('Error updating imported calendar preference:', error);
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Delete an imported calendar
   * @param {string} calendarId
   */
  const deleteImportedCalendar = async (calendarId) => {
    try {
      setUpdating(calendarId);
      const response = await api.delete(
        `/groups/${groupId}/calendar/imported/${calendarId}`
      );
      if (response.data.success) {
        setImportedCalendars((prev) =>
          prev.filter((cal) => cal.importedCalendarId !== calendarId)
        );
        if (onImportedCalendarsChanged) {
          const updatedCalendars = importedCalendars.filter(
            (cal) => cal.importedCalendarId !== calendarId
          );
          onImportedCalendarsChanged(updatedCalendars);
        }
      }
    } catch (error) {
      console.error('Error deleting imported calendar:', error);
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Toggle visibility for a member layer
   * @param {MemberLayer} layer
   */
  const toggleMemberVisibility = (layer) => {
    updateMemberLayer(layer.memberLayerId, { isVisible: !layer.isVisible });
  };

  /**
   * Toggle notifications for a member layer
   * @param {MemberLayer} layer
   */
  const toggleMemberNotifications = (layer) => {
    updateMemberLayer(layer.memberLayerId, {
      notificationsEnabled: !layer.notificationsEnabled,
    });
  };

  /**
   * Toggle visibility for an imported calendar
   * @param {ImportedCalendar} calendar
   */
  const toggleImportedVisibility = (calendar) => {
    updateImportedCalendarPreference(calendar.importedCalendarId, {
      isVisible: !calendar.isVisible,
    });
  };

  /**
   * Toggle notifications for an imported calendar
   * @param {ImportedCalendar} calendar
   */
  const toggleImportedNotifications = (calendar) => {
    updateImportedCalendarPreference(calendar.importedCalendarId, {
      notificationsEnabled: !calendar.notificationsEnabled,
    });
  };

  /**
   * Open color picker for a member layer
   * @param {MemberLayer} layer
   */
  const openMemberColorPicker = (layer) => {
    setSelectedItem(layer);
    setSelectedItemType('member');
    setColorPickerVisible(true);
  };

  /**
   * Open color picker for an imported calendar
   * @param {ImportedCalendar} calendar
   */
  const openImportedColorPicker = (calendar) => {
    setSelectedItem(calendar);
    setSelectedItemType('imported');
    setColorPickerVisible(true);
  };

  /**
   * Handle color selection
   * @param {string} color - Hex color
   */
  const handleColorSelected = (color) => {
    if (selectedItem && selectedItemType === 'member') {
      updateMemberLayer(selectedItem.memberLayerId, { customColor: color });
    } else if (selectedItem && selectedItemType === 'imported') {
      updateImportedCalendarPreference(selectedItem.importedCalendarId, {
        customColor: color,
      });
    }
    setColorPickerVisible(false);
    setSelectedItem(null);
    setSelectedItemType(null);
  };

  /**
   * Get the effective color for a member layer
   * @param {MemberLayer} layer
   * @returns {string}
   */
  const getMemberEffectiveColor = (layer) => {
    return layer.customColor || layer.defaultColor || '#6200ee';
  };

  /**
   * Get the effective color for an imported calendar
   * @param {ImportedCalendar} calendar
   * @returns {string}
   */
  const getImportedEffectiveColor = (calendar) => {
    return calendar.customColor || calendar.color || '#6200ee';
  };

  /**
   * Get role display label
   * @param {string} role
   * @returns {string}
   */
  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      parent: 'Parent',
      child: 'Child',
      caregiver: 'Caregiver',
      supervisor: 'Supervisor',
    };
    return labels[role] || role;
  };

  /**
   * Handle calendar import success
   * @param {Object} newCalendar
   */
  const handleCalendarImported = (newCalendar) => {
    setImportedCalendars((prev) => [...prev, newCalendar]);
    if (onImportedCalendarsChanged) {
      onImportedCalendarsChanged([...importedCalendars, newCalendar]);
    }
  };

  /**
   * Render a member layer row
   * @param {MemberLayer} layer
   * @returns {JSX.Element}
   */
  const renderMemberLayer = (layer) => {
    const isUpdating = updating === layer.memberLayerId;
    const effectiveColor = getMemberEffectiveColor(layer);

    return (
      <View key={layer.memberLayerId} style={styles.layerRow}>
        {/* Visibility Toggle */}
        <IconButton
          icon={layer.isVisible ? 'eye' : 'eye-off'}
          iconColor={layer.isVisible ? '#6200ee' : '#999'}
          size={24}
          onPress={() => toggleMemberVisibility(layer)}
          disabled={isUpdating}
          style={styles.iconButton}
        />

        {/* Notification Toggle */}
        <IconButton
          icon={layer.notificationsEnabled ? 'bell' : 'bell-off'}
          iconColor={layer.notificationsEnabled ? '#6200ee' : '#999'}
          size={24}
          onPress={() => toggleMemberNotifications(layer)}
          disabled={isUpdating}
          style={styles.iconButton}
        />

        {/* Color Circle */}
        <TouchableOpacity
          onPress={() => openMemberColorPicker(layer)}
          disabled={isUpdating}
          style={styles.colorButton}
        >
          <View
            style={[
              styles.colorCircle,
              { backgroundColor: effectiveColor },
            ]}
          />
        </TouchableOpacity>

        {/* Member Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{layer.displayName}</Text>
          <Text style={styles.itemSubtitle}>{getRoleLabel(layer.role)}</Text>
        </View>

        {/* Loading indicator */}
        {isUpdating && (
          <ActivityIndicator
            size="small"
            color="#6200ee"
            style={styles.loadingIndicator}
          />
        )}
      </View>
    );
  };

  /**
   * Render an imported calendar row
   * @param {ImportedCalendar} calendar
   * @returns {JSX.Element}
   */
  const renderImportedCalendar = (calendar) => {
    const isUpdating = updating === calendar.importedCalendarId;
    const effectiveColor = getImportedEffectiveColor(calendar);

    return (
      <View key={calendar.importedCalendarId} style={styles.layerRow}>
        {/* Visibility Toggle */}
        <IconButton
          icon={calendar.isVisible ? 'eye' : 'eye-off'}
          iconColor={calendar.isVisible ? '#6200ee' : '#999'}
          size={24}
          onPress={() => toggleImportedVisibility(calendar)}
          disabled={isUpdating}
          style={styles.iconButton}
        />

        {/* Notification Toggle */}
        <IconButton
          icon={calendar.notificationsEnabled ? 'bell' : 'bell-off'}
          iconColor={calendar.notificationsEnabled ? '#6200ee' : '#999'}
          size={24}
          onPress={() => toggleImportedNotifications(calendar)}
          disabled={isUpdating}
          style={styles.iconButton}
        />

        {/* Color Circle */}
        <TouchableOpacity
          onPress={() => openImportedColorPicker(calendar)}
          disabled={isUpdating}
          style={styles.colorButton}
        >
          <View
            style={[
              styles.colorCircle,
              { backgroundColor: effectiveColor },
            ]}
          />
        </TouchableOpacity>

        {/* Calendar Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{calendar.name}</Text>
          <Text style={styles.itemSubtitle}>
            {calendar.sourceType === 'url' ? 'URL' : 'File'}
            {calendar.lastSyncStatus === 'error' && ' - Sync Error'}
          </Text>
        </View>

        {/* Delete Button */}
        <IconButton
          icon="delete-outline"
          iconColor="#d32f2f"
          size={20}
          onPress={() => deleteImportedCalendar(calendar.importedCalendarId)}
          disabled={isUpdating}
          style={styles.deleteButton}
        />

        {/* Loading indicator */}
        {isUpdating && (
          <ActivityIndicator
            size="small"
            color="#6200ee"
            style={styles.loadingIndicator}
          />
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Title style={styles.title}>Calendar Layers</Title>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Text style={styles.loadingText}>Loading layers...</Text>
            </View>
          ) : (
            <>
              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <IconButton icon="eye" size={16} iconColor="#666" />
                  <Text style={styles.legendText}>Visibility</Text>
                </View>
                <View style={styles.legendItem}>
                  <IconButton icon="bell" size={16} iconColor="#666" />
                  <Text style={styles.legendText}>Notifications</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendColorCircle} />
                  <Text style={styles.legendText}>Color</Text>
                </View>
              </View>

              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={true}
              >
                {/* Member Calendars Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>MEMBER CALENDARS</Text>
                  {memberLayers.map(renderMemberLayer)}
                </View>

                {/* Imported Calendars Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>IMPORTED CALENDARS</Text>
                  {importedCalendars.length > 0 ? (
                    importedCalendars.map(renderImportedCalendar)
                  ) : (
                    <Text style={styles.emptyText}>
                      No imported calendars yet
                    </Text>
                  )}

                  {/* Import Button */}
                  <TouchableOpacity
                    style={styles.importButton}
                    onPress={() => setImportModalVisible(true)}
                  >
                    <IconButton icon="plus" size={20} iconColor="#6200ee" />
                    <Text style={styles.importButtonText}>Import Calendar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={
          selectedItem
            ? selectedItemType === 'member'
              ? getMemberEffectiveColor(selectedItem)
              : getImportedEffectiveColor(selectedItem)
            : '#6200ee'
        }
        onConfirm={handleColorSelected}
        onCancel={() => {
          setColorPickerVisible(false);
          setSelectedItem(null);
          setSelectedItemType(null);
        }}
      />

      {/* Import Calendar Modal */}
      <ImportCalendarModal
        visible={importModalVisible}
        groupId={groupId}
        onClose={() => setImportModalVisible(false)}
        onImported={handleCalendarImported}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginLeft: -4,
  },
  legendColorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6200ee',
    marginRight: 4,
  },
  scrollContent: {
    maxHeight: 400,
  },
  scrollContentContainer: {
    paddingVertical: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconButton: {
    margin: 0,
  },
  colorButton: {
    padding: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    margin: 0,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#6200ee',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9f6ff',
  },
  importButtonText: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#6200ee',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
