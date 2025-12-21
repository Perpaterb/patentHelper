/**
 * CalendarLayersModal Component Tests
 *
 * Tests for the calendar layers modal including:
 * - Rendering member calendars and imported calendars sections
 * - Layer visibility and notification toggles
 * - Import button functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CalendarLayersModal from '../CalendarLayersModal';
import api from '../../services/api';

// Mock the ColorPickerModal
jest.mock('../ColorPickerModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="color-picker-modal" /> : null),
  };
});

// Mock the ImportCalendarModal
jest.mock('../ImportCalendarModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="import-calendar-modal" /> : null),
  };
});

describe('CalendarLayersModal', () => {
  const mockGroupId = 'test-group-id';
  const mockOnClose = jest.fn();
  const mockOnLayersChanged = jest.fn();
  const mockOnImportedCalendarsChanged = jest.fn();

  const mockMemberLayers = [
    {
      memberLayerId: 'member-1',
      displayName: 'John Doe',
      iconLetters: 'JD',
      defaultColor: '#6200ee',
      role: 'admin',
      isVisible: true,
      notificationsEnabled: true,
      customColor: null,
    },
    {
      memberLayerId: 'member-2',
      displayName: 'Jane Smith',
      iconLetters: 'JS',
      defaultColor: '#03DAC5',
      role: 'parent',
      isVisible: true,
      notificationsEnabled: false,
      customColor: '#FF5722',
    },
  ];

  const mockImportedCalendars = [
    {
      importedCalendarId: 'calendar-1',
      name: 'Work Calendar',
      sourceType: 'url',
      color: '#4CAF50',
      lastSyncStatus: 'success',
      isVisible: true,
      notificationsEnabled: true,
      customColor: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default API responses
    api.get.mockImplementation((url) => {
      if (url.includes('/calendar/layers')) {
        return Promise.resolve({
          data: { success: true, layers: mockMemberLayers },
        });
      }
      if (url.includes('/calendar/imported')) {
        return Promise.resolve({
          data: { success: true, calendars: mockImportedCalendars },
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render modal when visible is true', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('Calendar Layers')).toBeTruthy();
    });
  });

  it('should show loading state initially', () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    expect(getByText('Loading layers...')).toBeTruthy();
  });

  it('should fetch and display member layers', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('MEMBER CALENDARS')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  it('should display role labels for members', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('Admin')).toBeTruthy();
      expect(getByText('Parent')).toBeTruthy();
    });
  });

  it('should fetch and display imported calendars', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('IMPORTED CALENDARS')).toBeTruthy();
      expect(getByText('Work Calendar')).toBeTruthy();
    });
  });

  it('should show empty state when no imported calendars', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/calendar/layers')) {
        return Promise.resolve({
          data: { success: true, layers: mockMemberLayers },
        });
      }
      if (url.includes('/calendar/imported')) {
        return Promise.resolve({
          data: { success: true, calendars: [] },
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('No imported calendars yet')).toBeTruthy();
    });
  });

  it('should show Import Calendar button', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('Import Calendar')).toBeTruthy();
    });
  });

  it('should call onClose when Close button is pressed', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('Close')).toBeTruthy();
    });

    fireEvent.press(getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onLayersChanged when layers are fetched', async () => {
    render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(mockOnLayersChanged).toHaveBeenCalledWith(mockMemberLayers);
    });
  });

  it('should call onImportedCalendarsChanged when calendars are fetched', async () => {
    render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(mockOnImportedCalendarsChanged).toHaveBeenCalledWith(mockImportedCalendars);
    });
  });

  it('should handle API errors gracefully for member layers', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/calendar/layers')) {
        return Promise.reject(new Error('Network error'));
      }
      if (url.includes('/calendar/imported')) {
        return Promise.resolve({
          data: { success: true, calendars: mockImportedCalendars },
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    // Should still render the modal without crashing
    await waitFor(() => {
      expect(getByText('MEMBER CALENDARS')).toBeTruthy();
      expect(getByText('No member calendars found')).toBeTruthy();
    });
  });

  it('should handle API errors gracefully for imported calendars', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/calendar/layers')) {
        return Promise.resolve({
          data: { success: true, layers: mockMemberLayers },
        });
      }
      if (url.includes('/calendar/imported')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    // Should still render member calendars without crashing
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('IMPORTED CALENDARS')).toBeTruthy();
    });
  });

  it('should display legend with visibility, notifications, and color icons', async () => {
    const { getByText } = render(
      <CalendarLayersModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onLayersChanged={mockOnLayersChanged}
        onImportedCalendarsChanged={mockOnImportedCalendarsChanged}
      />
    );

    await waitFor(() => {
      expect(getByText('Visibility')).toBeTruthy();
      expect(getByText('Notifications')).toBeTruthy();
      expect(getByText('Color')).toBeTruthy();
    });
  });
});
