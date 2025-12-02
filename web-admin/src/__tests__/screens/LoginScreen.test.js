/**
 * LoginScreen Test Suite
 *
 * Tests for the login screen authentication flow.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import LoginScreen from '../../screens/LoginScreen';

// Mock useKindeAuth
jest.mock('@kinde-oss/kinde-auth-react');

describe('LoginScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderLoginScreen = () => {
    return render(
      <PaperProvider>
        <LoginScreen navigation={mockNavigation} />
      </PaperProvider>
    );
  };

  describe('Loading State', () => {
    it('should not navigate when isLoading is true', () => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: false,
        isLoading: true,
      });

      renderLoginScreen();

      // Should not navigate during loading
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Not Authenticated State', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should render login screen content', () => {
      const { toJSON } = renderLoginScreen();
      const tree = JSON.stringify(toJSON());

      // Verify key content exists in rendered output
      expect(tree).toContain('Family Helper');
      expect(tree).toContain('Welcome Back');
      expect(tree).toContain('Sign In');
      expect(tree).toContain('Back to Home');
    });

    it('should call login when Sign In button is pressed', () => {
      const mockLogin = jest.fn();
      useKindeAuth.mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: false,
      });

      const { root } = render(
        <PaperProvider>
          <LoginScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      // Find button elements in the root
      const buttons = root.findAllByType('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Click the first button (Sign In)
      fireEvent.press(buttons[0]);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it('should navigate to Landing when Back to Home is pressed', () => {
      const { root } = render(
        <PaperProvider>
          <LoginScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      const buttons = root.findAllByType('button');
      expect(buttons.length).toBe(2);

      // Press the second button (Back to Home)
      fireEvent.press(buttons[1]);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Landing');
    });

    it('should not navigate to Groups when not authenticated', () => {
      renderLoginScreen();
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith('Groups');
    });
  });

  describe('Authenticated State', () => {
    it('should navigate to Groups when authenticated', () => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: true,
        isLoading: false,
      });

      renderLoginScreen();

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Groups');
    });

    it('should not navigate when still loading even if authenticated', () => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: true,
        isLoading: true,
      });

      renderLoginScreen();

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Flow', () => {
    it('should handle transition from loading to authenticated', async () => {
      // Start with loading
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = renderLoginScreen();

      // Should not navigate yet
      expect(mockNavigation.navigate).not.toHaveBeenCalled();

      // Simulate auth completion
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: true,
        isLoading: false,
      });

      // Re-render with new auth state
      rerender(
        <PaperProvider>
          <LoginScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      // Should navigate to Groups
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Groups');
    });

    it('should handle transition from loading to not authenticated', () => {
      // Start with loading
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender, toJSON } = renderLoginScreen();

      // Simulate auth check completion (not authenticated)
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });

      rerender(
        <PaperProvider>
          <LoginScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      // Should show login form
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Sign In');

      // Should not navigate to Groups
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith('Groups');
    });
  });

  describe('UI Structure', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should render two buttons', () => {
      const { root } = render(
        <PaperProvider>
          <LoginScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      const buttons = root.findAllByType('button');
      expect(buttons).toHaveLength(2);
    });

    it('should render all expected text content', () => {
      const { toJSON } = renderLoginScreen();
      const tree = JSON.stringify(toJSON());

      const expectedTexts = [
        'Family Helper',
        'Welcome Back',
        'Sign in to manage your family groups',
        'Sign In',
        'Back to Home',
      ];

      expectedTexts.forEach((text) => {
        expect(tree).toContain(text);
      });
    });
  });
});
