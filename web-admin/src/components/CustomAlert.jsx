/**
 * Custom Alert Component
 *
 * Cross-platform alert dialog that works on both web and mobile.
 * Replaces React Native's Alert.alert which doesn't work properly on web.
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
import { View, StyleSheet, Platform } from 'react-native';
import { Portal, Dialog, Button, Paragraph, Text } from 'react-native-paper';
import { Alert as RNAlert } from 'react-native';

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
    // On native mobile, use the built-in Alert
    if (Platform.OS !== 'web') {
      RNAlert.alert(alertTitle, alertMessage, alertButtons);
      return;
    }

    // On web, use our custom dialog
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

  return (
    <CustomAlertContext.Provider value={{ showAlert }}>
      {children}
      <Portal>
        <Dialog visible={visible} onDismiss={hideAlert} style={styles.dialog}>
          {title && (
            <Dialog.Title style={styles.title}>{title}</Dialog.Title>
          )}
          <Dialog.Content>
            <Paragraph style={styles.message}>{message}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.actions}>
            {buttons.map((button, index) => {
              const isCancelButton = button.style === 'cancel';
              const isDestructiveButton = button.style === 'destructive';

              return (
                <Button
                  key={index}
                  mode={isCancelButton ? 'outlined' : 'contained'}
                  onPress={() => handleButtonPress(button)}
                  style={[
                    styles.button,
                    isCancelButton && styles.cancelButton,
                  ]}
                  labelStyle={[
                    isDestructiveButton && styles.destructiveLabel,
                  ]}
                  buttonColor={
                    isDestructiveButton ? '#d32f2f' : undefined
                  }
                >
                  {button.text}
                </Button>
              );
            })}
          </Dialog.Actions>
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
      // Fallback to native alert on mobile or window.alert on web
      if (Platform.OS === 'web') {
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
      } else {
        RNAlert.alert(title, message, buttons);
      }
    }
  },
};

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  button: {
    marginLeft: 8,
  },
  cancelButton: {
    borderColor: '#ccc',
  },
  destructiveLabel: {
    color: '#fff',
  },
});
