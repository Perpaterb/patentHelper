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
import { Portal, Dialog, Button, Text } from 'react-native-paper';
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
          <Dialog.Content style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </Dialog.Content>
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
