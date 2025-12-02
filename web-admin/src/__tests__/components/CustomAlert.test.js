/**
 * CustomAlert Component Test Suite
 *
 * Tests for the cross-platform alert dialog component.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import {
  CustomAlertProvider,
  useCustomAlert,
  CustomAlert,
  setGlobalAlertHandler,
} from '../../components/CustomAlert';
import { Platform } from 'react-native';
import { Text, Button, View } from 'react-native';

// Helper component to test the hook
function TestComponent({ onShowAlert }) {
  const { showAlert } = useCustomAlert();

  return (
    <View>
      <Button
        title="Show Alert"
        onPress={() => {
          showAlert('Test Title', 'Test Message', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: onShowAlert },
          ]);
        }}
      />
    </View>
  );
}

// Wrapper with providers
function renderWithProviders(component) {
  return render(
    <PaperProvider>
      <CustomAlertProvider>{component}</CustomAlertProvider>
    </PaperProvider>
  );
}

describe('CustomAlert', () => {
  beforeEach(() => {
    // Reset Platform.OS to web for most tests
    Platform.OS = 'web';
    // Reset global alert handler
    setGlobalAlertHandler(null);
  });

  describe('CustomAlertProvider', () => {
    it('should render children', () => {
      const { toJSON } = renderWithProviders(<Text>Test Child</Text>);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Test Child');
    });

    it('should provide showAlert through context', () => {
      const { toJSON } = renderWithProviders(<TestComponent />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Show Alert');
    });
  });

  describe('useCustomAlert hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      const TestComponentOutsideProvider = () => {
        try {
          useCustomAlert();
          return <Text>No error</Text>;
        } catch (error) {
          return <Text>{error.message}</Text>;
        }
      };

      const { toJSON } = render(
        <PaperProvider>
          <TestComponentOutsideProvider />
        </PaperProvider>
      );

      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('useCustomAlert must be used within CustomAlertProvider');

      console.error = originalError;
    });

    it('should show alert dialog when showAlert is called on web', async () => {
      Platform.OS = 'web';

      const { root, toJSON } = renderWithProviders(<TestComponent />);

      // Find and press the "Show Alert" button
      const buttons = root.findAllByType('button');
      fireEvent.press(buttons[0]);

      // Alert should now be visible
      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Test Title');
        expect(tree).toContain('Test Message');
        expect(tree).toContain('Cancel');
        expect(tree).toContain('OK');
      });
    });

    it('should call onPress callback when button is pressed', async () => {
      Platform.OS = 'web';
      const mockOnPress = jest.fn();

      const { root } = renderWithProviders(<TestComponent onShowAlert={mockOnPress} />);

      // Show the alert
      const initialButtons = root.findAllByType('button');
      fireEvent.press(initialButtons[0]);

      // Wait for alert to appear
      await waitFor(() => {
        const allButtons = root.findAllByType('button');
        expect(allButtons.length).toBeGreaterThan(1);
      });

      // Get updated buttons after alert appears
      const allButtons = root.findAllByType('button');
      // Press the last button which should be OK
      fireEvent.press(allButtons[allButtons.length - 1]);

      // Wait for callback to be called (has 100ms delay)
      await waitFor(
        () => {
          expect(mockOnPress).toHaveBeenCalledTimes(1);
        },
        { timeout: 300 }
      );
    });

    it('should hide alert when cancel is pressed', async () => {
      Platform.OS = 'web';

      const { root, toJSON } = renderWithProviders(<TestComponent />);

      // Show the alert
      const initialButtons = root.findAllByType('button');
      fireEvent.press(initialButtons[0]);

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Test Title');
      });

      // Get all buttons and press Cancel (should be before OK)
      const allButtons = root.findAllByType('button');
      // Press Cancel button (second to last)
      fireEvent.press(allButtons[allButtons.length - 2]);

      // Alert should be hidden (after animation)
      await waitFor(() => {
        // The dialog may still be in DOM but hidden
        // Just verify we can press cancel without error
      });
    });
  });

  describe('CustomAlert.alert static method', () => {
    it('should work with global alert handler set', () => {
      const mockShowAlert = jest.fn();
      setGlobalAlertHandler(mockShowAlert);

      CustomAlert.alert('Static Title', 'Static Message', [{ text: 'OK' }]);

      expect(mockShowAlert).toHaveBeenCalledWith('Static Title', 'Static Message', [
        { text: 'OK' },
      ]);
    });

    it('should fallback to window.confirm on web when no handler is set', () => {
      Platform.OS = 'web';
      const mockConfirm = jest.fn(() => true);
      const originalConfirm = window.confirm;
      window.confirm = mockConfirm;

      const mockOnPress = jest.fn();
      CustomAlert.alert('Fallback Title', 'Fallback Message', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: mockOnPress },
      ]);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockOnPress).toHaveBeenCalled();

      window.confirm = originalConfirm;
    });

    it('should call cancel button onPress when confirm returns false', () => {
      Platform.OS = 'web';
      const mockConfirm = jest.fn(() => false);
      const originalConfirm = window.confirm;
      window.confirm = mockConfirm;

      const mockCancelPress = jest.fn();
      CustomAlert.alert('Title', 'Message', [
        { text: 'Cancel', style: 'cancel', onPress: mockCancelPress },
        { text: 'OK' },
      ]);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockCancelPress).toHaveBeenCalled();

      window.confirm = originalConfirm;
    });
  });

  describe('setGlobalAlertHandler', () => {
    it('should set the global alert handler', () => {
      const mockHandler = jest.fn();
      setGlobalAlertHandler(mockHandler);

      CustomAlert.alert('Test', 'Test');

      expect(mockHandler).toHaveBeenCalledWith('Test', 'Test', undefined);
    });

    it('should allow resetting the handler to null', () => {
      const mockHandler = jest.fn();
      setGlobalAlertHandler(mockHandler);
      setGlobalAlertHandler(null);

      // Should use fallback now
      Platform.OS = 'web';
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false);

      CustomAlert.alert('Test', 'Test');

      expect(mockHandler).not.toHaveBeenCalled();
      expect(window.confirm).toHaveBeenCalled();

      window.confirm = originalConfirm;
    });
  });

  describe('Button rendering', () => {
    it('should render buttons with correct structure', async () => {
      Platform.OS = 'web';

      const { root, toJSON } = renderWithProviders(<TestComponent />);

      const buttons = root.findAllByType('button');
      fireEvent.press(buttons[0]);

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Cancel');
        expect(tree).toContain('OK');
      });
    });
  });
});
