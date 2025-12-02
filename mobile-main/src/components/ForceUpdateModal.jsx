/**
 * Force Update Modal Component
 *
 * Non-dismissible modal that blocks app usage when an update is required.
 * Displays a message and button to redirect user to the app store.
 *
 * Usage:
 *   <ForceUpdateModal
 *     visible={needsUpdate}
 *     currentVersion="1.0.0"
 *     minVersion="1.1.0"
 *     updateUrl={{ ios: "...", android: "..." }}
 *   />
 */

import React from 'react';
import { View, StyleSheet, Platform, Linking, Image } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';

/**
 * ForceUpdateModal component
 * @param {Object} props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {string} props.currentVersion - User's current app version
 * @param {string} props.minVersion - Minimum required version
 * @param {Object} props.updateUrl - Object with ios and android store URLs
 * @param {string} [props.updateUrl.ios] - iOS App Store URL
 * @param {string} [props.updateUrl.android] - Android Play Store URL
 */
const ForceUpdateModal = ({ visible, currentVersion, minVersion, updateUrl }) => {
  /**
   * Open the appropriate app store based on platform
   */
  const handleUpdatePress = async () => {
    let storeUrl = null;

    if (Platform.OS === 'ios') {
      storeUrl = updateUrl?.ios;
    } else if (Platform.OS === 'android') {
      storeUrl = updateUrl?.android;
    } else if (Platform.OS === 'web') {
      // On web, try to open the appropriate store or show a message
      // Default to iOS App Store link
      storeUrl = updateUrl?.ios || updateUrl?.android;
    }

    if (storeUrl) {
      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        } else {
          console.error('Cannot open URL:', storeUrl);
        }
      } catch (error) {
        console.error('Error opening store URL:', error);
      }
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <View style={styles.overlay}>
        <Dialog
          visible={visible}
          dismissable={false}
          style={styles.dialog}
        >
          <View style={styles.iconContainer}>
            <View style={styles.updateIcon}>
              <Text style={styles.updateIconText}>↑</Text>
            </View>
          </View>

          <Dialog.Title style={styles.title}>Update Required</Dialog.Title>

          <Dialog.Content style={styles.content}>
            <Text style={styles.message}>
              A new version of the app is available. Please update to continue using the app.
            </Text>
            <View style={styles.versionInfo}>
              <Text style={styles.versionText}>
                Your version: <Text style={styles.versionNumber}>{currentVersion}</Text>
              </Text>
              <Text style={styles.versionText}>
                Required version: <Text style={styles.versionNumber}>{minVersion}</Text>
              </Text>
            </View>
          </Dialog.Content>

          <Dialog.Actions style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleUpdatePress}
              style={styles.updateButton}
              contentStyle={styles.updateButtonContent}
              labelStyle={styles.updateButtonLabel}
            >
              Update Now
            </Button>
          </Dialog.Actions>
        </Dialog>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxWidth: 340,
    minWidth: 300,
    alignSelf: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    margin: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  updateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateIconText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    paddingTop: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  versionInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  versionText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginVertical: 2,
  },
  versionNumber: {
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    justifyContent: 'center',
  },
  updateButton: {
    borderRadius: 8,
    flex: 1,
    backgroundColor: '#6200ee',
  },
  updateButtonContent: {
    paddingVertical: 8,
  },
  updateButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ForceUpdateModal;
