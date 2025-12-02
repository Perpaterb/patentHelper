/**
 * LandingScreen Test Suite
 *
 * Tests for the public landing page showcasing app features and pricing.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import LandingScreen from '../../screens/LandingScreen';
import api from '../../services/api';

// Mock useKindeAuth
jest.mock('@kinde-oss/kinde-auth-react');

// Mock api
jest.mock('../../services/api');

// Mock MaterialCommunityIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('LandingScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockPricing = {
    adminSubscription: {
      name: 'Admin Subscription',
      amount: 300, // $3.00 USD
      currency: 'usd',
      interval: 'month',
    },
    additionalStorage: {
      name: 'Additional Storage',
      amount: 100, // $1.00 USD per 10GB
      currency: 'usd',
      unit: '10GB',
      interval: 'month',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { pricing: mockPricing } });
  });

  const renderLandingScreen = () => {
    return render(
      <PaperProvider>
        <LandingScreen navigation={mockNavigation} />
      </PaperProvider>
    );
  };

  describe('Loading State', () => {
    it('should show loading indicator when auth is loading', () => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: true,
      });

      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      // Should show progressbar (ActivityIndicator renders as role="progressbar")
      expect(tree).toContain('progressbar');
    });

    it('should not navigate when isLoading is true', () => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: true,
        isLoading: true,
      });

      renderLandingScreen();

      // Should not navigate during loading
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated User Redirect', () => {
    it('should navigate to Groups when authenticated', () => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: true,
        isLoading: false,
      });

      renderLandingScreen();

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Groups');
    });
  });

  describe('Unauthenticated State - Content Rendering', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should render header with logo', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Family Helper');
    });

    it('should render hero section with title and subtitle', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Co-Parenting & Family Management Made Easy');
      expect(tree).toContain('All-in-one family and co-parenting app');
    });

    it('should render free trial CTA button', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Start Free 20-Day Trial');
      expect(tree).toContain('No credit card required');
    });

    it('should render all feature cards', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      const features = [
        'Secure & Encrypted Messaging',
        'Shared Calendar',
        'Finance Tracking',
        'Gift Registry',
        'Secret Santa',
        'Wiki Documents',
        'Secure Storage',
        'Audit Logs',
      ];

      features.forEach((feature) => {
        expect(tree).toContain(feature);
      });
    });

    it('should render "Everything You Need" section title', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Everything You Need');
    });

    it('should render pricing section title', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Simple, Transparent Pricing');
    });

    it('should render CTA section', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Ready to Get Started?');
      expect(tree).toContain('Create Your Account');
    });

    it('should render footer with copyright', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      const currentYear = new Date().getFullYear();
      // The copyright text may be split across children, so check individually
      expect(tree).toContain('©');
      expect(tree).toContain(String(currentYear));
      expect(tree).toContain('Family Helper');
    });
  });

  describe('Authentication Actions', () => {
    it('should call login when Login button is pressed', () => {
      const mockLogin = jest.fn();
      useKindeAuth.mockReturnValue({
        login: mockLogin,
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });

      const { root } = render(
        <PaperProvider>
          <LandingScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      const buttons = root.findAllByType('button');
      // Login button is typically the first text button in header
      fireEvent.press(buttons[0]);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it('should call register when Sign Up button is pressed', () => {
      const mockRegister = jest.fn();
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: mockRegister,
        isAuthenticated: false,
        isLoading: false,
      });

      const { root } = render(
        <PaperProvider>
          <LandingScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      const buttons = root.findAllByType('button');
      // Sign Up is the second button in header
      fireEvent.press(buttons[1]);

      expect(mockRegister).toHaveBeenCalledTimes(1);
    });

    it('should call register when "Start Free 20-Day Trial" button is pressed', () => {
      const mockRegister = jest.fn();
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: mockRegister,
        isAuthenticated: false,
        isLoading: false,
      });

      const { root } = render(
        <PaperProvider>
          <LandingScreen navigation={mockNavigation} />
        </PaperProvider>
      );

      const buttons = root.findAllByType('button');
      // The third button should be the CTA "Start Free 20-Day Trial"
      fireEvent.press(buttons[2]);

      expect(mockRegister).toHaveBeenCalled();
    });
  });

  describe('Pricing Data Fetching', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should fetch pricing on mount', async () => {
      renderLandingScreen();

      expect(api.get).toHaveBeenCalledWith('/subscriptions/pricing');
    });

    it('should display pricing data when loaded', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Admin Subscription');
        expect(tree).toContain('Additional Storage');
      });
    });

    it('should display formatted price for admin subscription', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        // USD format: $3.00 (new competitive pricing)
        expect(tree).toMatch(/\$3\.00/);
      });

      // Check separately since the text might appear on its own
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('month');
    });

    it('should display free tier card', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Group Members');
        expect(tree).toContain('Free');
        expect(tree).toContain('forever');
      });
    });

    it('should display member roles in free tier', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Parents');
        expect(tree).toContain('Children');
        expect(tree).toContain('Caregivers');
        expect(tree).toContain('Supervisors');
      });
    });

    it('should display admin features list', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Full admin access');
        expect(tree).toContain('10GB storage included');
        expect(tree).toContain('Unlimited groups');
        expect(tree).toContain('Audit log exports');
      });
    });

    it('should display error message when pricing fails to load', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Unable to load pricing information');
      });
    });
  });

  describe('Price Formatting', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should format prices in USD currency', async () => {
      api.get.mockResolvedValue({
        data: {
          pricing: {
            adminSubscription: {
              name: 'Admin',
              amount: 500, // $5.00 USD
              currency: 'usd',
              interval: 'month',
            },
            additionalStorage: {
              name: 'Storage',
              amount: 200, // $2.00 USD
              currency: 'usd',
              unit: '10GB',
              interval: 'month',
            },
          },
        },
      });

      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        // USD format: $5.00 and $2.00
        expect(tree).toMatch(/\$5\.00/);
        expect(tree).toMatch(/\$2\.00/);
      });
    });
  });

  describe('UI Structure', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should render header buttons (Login and Sign Up)', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Login');
      expect(tree).toContain('Sign Up');
    });

    it('should render "Start Free Trial" button in pricing section', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Start Free Trial');
      });
    });

    it('should render minimum admin note', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Minimum 1 admin per group');
      });
    });

    it('should render storage billing note', async () => {
      const { toJSON } = renderLandingScreen();

      await waitFor(() => {
        const tree = JSON.stringify(toJSON());
        expect(tree).toContain('Billed per 10GB chunk');
      });
    });
  });

  describe('Feature Descriptions', () => {
    beforeEach(() => {
      useKindeAuth.mockReturnValue({
        login: jest.fn(),
        register: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should render messaging feature description', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('End-to-end encrypted group messaging');
    });

    it('should render calendar feature description', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Coordinate schedules with events');
    });

    it('should render audit logs feature with compliance mention', () => {
      const { toJSON } = renderLandingScreen();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('accountability');
      expect(tree).toContain('legal compliance');
      expect(tree).toContain('court order');
    });
  });
});
