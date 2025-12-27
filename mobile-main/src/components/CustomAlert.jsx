/**
 * Custom Alert Component
 *
 * Cross-platform alert dialog that works on both web and mobile.
 * Replaces React Native's Alert.alert which doesn't work properly on web.
 *
 * On Android, native Alert only supports up to 3 buttons. When more than 3
 * buttons are needed, this component uses a custom Modal dialog instead.
 *
 * Usage:
 *   import { CustomAlert } from '../components/CustomAlert';
 *
 *   // Show alert
 *   CustomAlert.alert(
 *     'Title',
 *     'Message',
 *     [
 *       { text: 'Cancel', style: 'cancel' },
 *       { text: 'OK', onPress: () => console.log('OK pressed') }
 *     ]
 *   );
 *
 *   // Or use the hook in a component
 *   const { showAlert } = useCustomAlert();
 *   showAlert('Title', 'Message', [...buttons]);
 */

import React, { createContext, useContext, useState } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { Alert as RNAlert } from 'react-native';

const MAX_NATIVE_BUTTONS = 3; // Android native Alert only supports up to 3 buttons

const CustomAlertContext = createContext(null);

/**
 * Provider component to wrap the app
 */
export function CustomAlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);

  const showAlert = (alertTitle, alertMessage, alertButtons = [{ text: 'OK' }]) => {
    // On native mobile with 3 or fewer buttons, use the built-in Alert
    // Android's native Alert only supports up to 3 buttons
    const buttonCount = alertButtons?.length || 1;
    if (Platform.OS !== 'web' && buttonCount <= MAX_NATIVE_BUTTONS) {
      RNAlert.alert(alertTitle, alertMessage, alertButtons);
      return;
    }

    // On web, or when more than 3 buttons, use our custom dialog
    setTitle(alertTitle);
    setMessage(alertMessage);
    setButtons(alertButtons);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  const handleButtonPress = (button) => {
    hideAlert();
    if (button.onPress) {
      // Small delay to allow dialog to close smoothly
      setTimeout(() => {
        button.onPress();
      }, 100);
    }
  };

  // Determine if we need scrollable buttons (more than 4 buttons)
  const needsScroll = buttons.length > 4;

  return (
    <CustomAlertContext.Provider value={{ showAlert }}>
      {children}
      <Portal>
        <Dialog
          visible={visible}
          onDismiss={hideAlert}
          style={[
            styles.dialog,
            // Ensure proper centering
            { alignSelf: 'center', marginLeft: 'auto', marginRight: 'auto' }
          ]}
        >
          {title && (
            <Dialog.Title style={styles.title}>{title}</Dialog.Title>
          )}
          <Dialog.Content style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </Dialog.Content>
          {needsScroll ? (
            <ScrollView style={styles.scrollableActions} contentContainerStyle={styles.scrollableActionsContent}>
              {buttons.map((button, index) => {
                const isCancelButton = button.style === 'cancel';
                const isDestructiveButton = button.style === 'destructive';

                return (
                  <Button
                    key={index}
                    mode="text"
                    onPress={() => handleButtonPress(button)}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={[
                      styles.buttonLabel,
                      isCancelButton && styles.cancelButtonLabel,
                      isDestructiveButton && styles.destructiveButtonLabel,
                    ]}
                    uppercase={false}
                  >
                    {button.text}
                  </Button>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.actions}>
              {buttons.map((button, index) => {
                const isCancelButton = button.style === 'cancel';
                const isDestructiveButton = button.style === 'destructive';

                return (
                  <Button
                    key={index}
                    mode="text"
                    onPress={() => handleButtonPress(button)}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={[
                      styles.buttonLabel,
                      isCancelButton && styles.cancelButtonLabel,
                      isDestructiveButton && styles.destructiveButtonLabel,
                    ]}
                    uppercase={false}
                  >
                    {button.text}
                  </Button>
                );
              })}
            </View>
          )}
        </Dialog>
      </Portal>
    </CustomAlertContext.Provider>
  );
}

/**
 * Hook to show alerts from components
 */
export function useCustomAlert() {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within CustomAlertProvider');
  }
  return context;
}

/**
 * Static method for backwards compatibility with Alert.alert
 */
let globalShowAlert = null;

export function setGlobalAlertHandler(showAlert) {
  globalShowAlert = showAlert;
}

export const CustomAlert = {
  alert: (title, message, buttons) => {
    if (globalShowAlert) {
      globalShowAlert(title, message, buttons);
    } else {
      // Fallback when CustomAlertProvider is not available
      const buttonCount = buttons?.length || 1;

      if (Platform.OS === 'web') {
        // Web fallback using confirm dialog
        const buttonText = buttons && buttons.length > 0 ? buttons.map(b => b.text).join(' / ') : 'OK';
        if (window.confirm(`${title}\n\n${message}\n\n[${buttonText}]`)) {
          // Find the non-cancel button and call its onPress
          const actionButton = buttons?.find(b => b.style !== 'cancel');
          if (actionButton && actionButton.onPress) {
            actionButton.onPress();
          }
        } else {
          // Find the cancel button and call its onPress
          const cancelButton = buttons?.find(b => b.style === 'cancel');
          if (cancelButton && cancelButton.onPress) {
            cancelButton.onPress();
          }
        }
      } else if (buttonCount <= MAX_NATIVE_BUTTONS) {
        // Native alert works for 3 or fewer buttons
        RNAlert.alert(title, message, buttons);
      } else {
        // More than 3 buttons on native - warn and show truncated alert
        // This shouldn't happen if CustomAlertProvider is properly set up
        console.warn('CustomAlert: More than 3 buttons provided without CustomAlertProvider. Some buttons may not appear.');
        RNAlert.alert(title, message, buttons?.slice(0, MAX_NATIVE_BUTTONS));
      }
    }
  },
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxWidth: 320,
    minWidth: 280,
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  scrollableActions: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  scrollableActionsContent: {
    flexDirection: 'column',
  },
  button: {
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6200ee',
  },
  cancelButtonLabel: {
    color: '#999',
  },
  destructiveButtonLabel: {
    color: '#d32f2f',
  },
});
