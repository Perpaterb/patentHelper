/**
 * MyAccountScreen Test Suite
 *
 * Tests for the account information screen.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import MyAccountScreen from '../../screens/MyAccountScreen';

// Mock useKindeAuth
jest.mock('@kinde-oss/kinde-auth-react');

// Mock MaterialCommunityIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('MyAccountScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockUser = {
    email: 'test@example.com',
    given_name: 'Test',
    family_name: 'User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useKindeAuth.mockReturnValue({
      user: mockUser,
    });
  });

  const renderMyAccountScreen = () => {
    return render(
      <PaperProvider>
        <MyAccountScreen navigation={mockNavigation} />
      </PaperProvider>
    );
  };

  describe('Content Rendering', () => {
    it('should render page title and subtitle', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('My Account');
        expect(tree).toContain('Manage your account settings');
      });
    });

    it('should render account information card', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Account Information');
        expect(tree).toContain('Email');
      });
    });

    it('should display user email', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('test@example.com');
      });
    });

    it('should show Kinde authentication info', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Kinde');
        expect(tree).toContain('passwordless');
      });
    });
  });

  describe('No User Email', () => {
    it('should show "Not available" when email is missing', async () => {
      useKindeAuth.mockReturnValue({
        user: {},
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Not available');
      });
    });
  });
});
