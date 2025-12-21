/**
 * Calendar Layers Modal Component
 *
 * Displays a list of calendar layers (one per group member) with controls for:
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
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Title, Text, IconButton } from 'react-native-paper';
import ColorPickerModal from './ColorPickerModal';
import api from '../services/api';

/**
 * @typedef {Object} Layer
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
 * @typedef {Object} CalendarLayersModalProps
 * @property {boolean} visible - Whether modal is visible
 * @property {string} groupId - Group ID
 * @property {function} onClose - Callback when modal is closed
 * @property {function} onLayersChanged - Callback when layers are updated
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
}) {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // memberLayerId being updated
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(null);

  // Fetch layers when modal opens
  useEffect(() => {
    if (visible && groupId) {
      fetchLayers();
    }
  }, [visible, groupId]);

  /**
   * Fetch calendar layers from API
   */
  const fetchLayers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}/calendar/layers`);
      if (response.data.success) {
        setLayers(response.data.layers);
        if (onLayersChanged) {
          onLayersChanged(response.data.layers);
        }
      }
    } catch (error) {
      console.error('Error fetching calendar layers:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a layer preference
   * @param {string} memberLayerId
   * @param {Object} updates
   */
  const updateLayer = async (memberLayerId, updates) => {
    try {
      setUpdating(memberLayerId);
      const response = await api.put(
        `/groups/${groupId}/calendar/layers/${memberLayerId}`,
        updates
      );
      if (response.data.success) {
        // Update local state
        setLayers((prev) =>
          prev.map((layer) =>
            layer.memberLayerId === memberLayerId
              ? { ...layer, ...response.data.preference }
              : layer
          )
        );
        // Notify parent
        if (onLayersChanged) {
          const updatedLayers = layers.map((layer) =>
            layer.memberLayerId === memberLayerId
              ? { ...layer, ...response.data.preference }
              : layer
          );
          onLayersChanged(updatedLayers);
        }
      }
    } catch (error) {
      console.error('Error updating layer:', error);
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Toggle visibility for a layer
   * @param {Layer} layer
   */
  const toggleVisibility = (layer) => {
    updateLayer(layer.memberLayerId, { isVisible: !layer.isVisible });
  };

  /**
   * Toggle notifications for a layer
   * @param {Layer} layer
   */
  const toggleNotifications = (layer) => {
    updateLayer(layer.memberLayerId, {
      notificationsEnabled: !layer.notificationsEnabled,
    });
  };

  /**
   * Open color picker for a layer
   * @param {Layer} layer
   */
  const openColorPicker = (layer) => {
    setSelectedLayer(layer);
    setColorPickerVisible(true);
  };

  /**
   * Handle color selection
   * @param {string} color - Hex color
   */
  const handleColorSelected = (color) => {
    if (selectedLayer) {
      updateLayer(selectedLayer.memberLayerId, { customColor: color });
    }
    setColorPickerVisible(false);
    setSelectedLayer(null);
  };

  /**
   * Get the effective color for a layer
   * @param {Layer} layer
   * @returns {string}
   */
  const getEffectiveColor = (layer) => {
    return layer.customColor || layer.defaultColor || '#6200ee';
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
   * Render a single layer row
   * @param {Object} param0
   * @returns {JSX.Element}
   */
  const renderLayer = ({ item: layer }) => {
    const isUpdating = updating === layer.memberLayerId;
    const effectiveColor = getEffectiveColor(layer);

    return (
      <View style={styles.layerRow}>
        {/* Visibility Toggle */}
        <IconButton
          icon={layer.isVisible ? 'eye' : 'eye-off'}
          iconColor={layer.isVisible ? '#6200ee' : '#999'}
          size={24}
          onPress={() => toggleVisibility(layer)}
          disabled={isUpdating}
          style={styles.iconButton}
        />

        {/* Notification Toggle */}
        <IconButton
          icon={layer.notificationsEnabled ? 'bell' : 'bell-off'}
          iconColor={layer.notificationsEnabled ? '#6200ee' : '#999'}
          size={24}
          onPress={() => toggleNotifications(layer)}
          disabled={isUpdating}
          style={styles.iconButton}
        />

        {/* Color Circle */}
        <TouchableOpacity
          onPress={() => openColorPicker(layer)}
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
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{layer.displayName}</Text>
          <Text style={styles.memberRole}>{getRoleLabel(layer.role)}</Text>
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

              {/* Layer List */}
              <FlatList
                data={layers}
                keyExtractor={(item) => item.memberLayerId}
                renderItem={renderLayer}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
              />
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
        initialColor={selectedLayer ? getEffectiveColor(selectedLayer) : '#6200ee'}
        onConfirm={handleColorSelected}
        onCancel={() => {
          setColorPickerVisible(false);
          setSelectedLayer(null);
        }}
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
    maxHeight: '80%',
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
  list: {
    maxHeight: 300,
  },
  listContent: {
    paddingVertical: 8,
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
  memberInfo: {
    flex: 1,
    marginLeft: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    color: '#666',
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
