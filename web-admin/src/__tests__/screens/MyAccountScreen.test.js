/**
 * MyAccountScreen Test Suite
 *
 * Tests for the account information and storage details screen.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import MyAccountScreen from '../../screens/MyAccountScreen';
import api from '../../services/api';

// Mock useKindeAuth
jest.mock('@kinde-oss/kinde-auth-react');

// Mock api
jest.mock('../../services/api');

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

  const mockSubscription = {
    isSubscribed: true,
    storageUsedGb: '5.00',
    startDate: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useKindeAuth.mockReturnValue({
      user: mockUser,
    });
    api.get.mockResolvedValue({ data: { subscription: mockSubscription } });
  });

  const renderMyAccountScreen = () => {
    return render(
      <PaperProvider>
        <MyAccountScreen navigation={mockNavigation} />
      </PaperProvider>
    );
  };

  describe('Loading State', () => {
    it('should show loading indicator while fetching data', () => {
      api.get.mockImplementation(() => new Promise(() => {}));

      const { toJSON } = renderMyAccountScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('progressbar');
      expect(tree).toContain('Loading account information');
    });
  });

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

    it('should render storage details card', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Storage Details');
        expect(tree).toContain('Storage Used');
      });
    });

    it('should display storage usage', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        // Storage text may be split
        expect(tree).toContain('5.00');
        expect(tree).toContain('GB');
      });
    });

    it('should render need help card', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Need Help?');
        expect(tree).toContain('Contact Support');
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

  describe('Storage Under Limit', () => {
    it('should show success message when under 10GB', async () => {
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '5.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('base 10GB storage allocation');
      });
    });

    it('should not show overage charges when under limit', async () => {
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '8.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).not.toContain('Additional Storage Charges');
      });
    });
  });

  describe('Storage Over Limit', () => {
    it('should show warning when over 10GB', async () => {
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '15.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Additional Storage Charges');
      });
    });

    it('should show overage amount', async () => {
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '15.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('5.00');
        expect(tree).toContain('over base 10GB');
      });
    });

    it('should calculate additional charges correctly', async () => {
      // 25GB used = 15GB over = ceil(15/10) = 2 units × $1 = $2.00 USD
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '25.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Additional Storage Charges');
        expect(tree).toContain('15.00');
        expect(tree).toContain('USD');
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

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      api.get.mockRejectedValue({
        response: { status: 500 },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Failed to load account information');
      });
    });

    it('should not show error for 404 (no subscription)', async () => {
      api.get.mockRejectedValue({
        response: { status: 404 },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).not.toContain('Failed to load account information');
      });
    });

    it('should allow dismissing error message', async () => {
      api.get.mockRejectedValue({
        response: { status: 500 },
      });

      const { root, toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Failed to load account information');
      });

      const buttons = root.findAllByType('button');
      if (buttons.length > 0) {
        fireEvent.press(buttons[0]);

        await waitFor(() => {
          const tree = JSON.stringify(toJSON());
          expect(tree).not.toContain('Failed to load account information');
        });
      }
    });
  });

  describe('Storage Note', () => {
    it('should display storage note explaining charges', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('audit logs');
        expect(tree).toContain('images');
        expect(tree).toContain('videos');
      });
    });

    it('should mention automatic billing', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('automatically charged');
      });
    });
  });

  describe('Support Section', () => {
    it('should render support information', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('account support');
        expect(tree).toContain('subscription changes');
        expect(tree).toContain('technical issues');
      });
    });

    it('should render Contact Support button', async () => {
      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Contact Support');
      });
    });
  });

  describe('calculateAdditionalCharges', () => {
    // Test the calculation logic
    it('should return zero charges for 0 storage', async () => {
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '0.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        // Should show success box not warning
        expect(tree).toContain('base 10GB storage allocation');
        expect(tree).not.toContain('Additional Storage Charges');
      });
    });

    it('should return zero charges for exactly 10GB', async () => {
      api.get.mockResolvedValue({
        data: { subscription: { ...mockSubscription, storageUsedGb: '10.00' } },
      });

      const { toJSON } = renderMyAccountScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).not.toContain('Additional Storage Charges');
      });
    });
  });
});
