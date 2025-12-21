/**
 * ImportCalendarModal Component Tests
 *
 * Tests for the import calendar modal including:
 * - Form rendering and validation
 * - URL import flow
 * - File picker integration
 * - Color selection
 * - API submission
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ImportCalendarModal from '../ImportCalendarModal';
import api from '../../services/api';

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock the ColorPickerModal
jest.mock('../ColorPickerModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="color-picker-modal" /> : null),
  };
});

describe('ImportCalendarModal', () => {
  const mockGroupId = 'test-group-id';
  const mockOnClose = jest.fn();
  const mockOnImported = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible is true', () => {
    const { getByText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    expect(getByText('Import Calendar')).toBeTruthy();
  });

  it('should not render modal content when visible is false', () => {
    const { queryByText } = render(
      <ImportCalendarModal
        visible={false}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    expect(queryByText('Import Calendar')).toBeNull();
  });

  it('should display all form fields', () => {
    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    expect(getByText('Calendar Name')).toBeTruthy();
    expect(getByPlaceholderText('e.g., Work Calendar')).toBeTruthy();
    expect(getByText('Import From')).toBeTruthy();
    expect(getByText('URL')).toBeTruthy();
    expect(getByText('File')).toBeTruthy();
    expect(getByText('Calendar Color')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Import')).toBeTruthy();
  });

  it('should show URL input when URL source type is selected', () => {
    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    expect(getByText('Calendar URL')).toBeTruthy();
    expect(getByPlaceholderText('https://calendar.google.com/...')).toBeTruthy();
    expect(getByText('Sync Interval')).toBeTruthy();
  });

  it('should show file picker when file source type is selected', () => {
    const { getByText, queryByText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    // Click on File radio button
    fireEvent.press(getByText('File'));

    // Should show file picker instead of URL input
    expect(getByText('Select File')).toBeTruthy();
    expect(getByText('Choose .ics file')).toBeTruthy();
    expect(queryByText('Calendar URL')).toBeNull();
  });

  it('should call onClose when Cancel button is pressed', () => {
    const { getByText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    fireEvent.press(getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error when trying to import without name', async () => {
    const { getByText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    fireEvent.press(getByText('Import'));

    await waitFor(() => {
      expect(getByText('Please enter a name for the calendar')).toBeTruthy();
    });
  });

  it('should show error when trying to import URL without URL', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    // Enter name but not URL
    fireEvent.changeText(getByPlaceholderText('e.g., Work Calendar'), 'My Calendar');
    fireEvent.press(getByText('Import'));

    await waitFor(() => {
      expect(getByText('Please enter a calendar URL')).toBeTruthy();
    });
  });

  it('should show error for invalid URL', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    fireEvent.changeText(getByPlaceholderText('e.g., Work Calendar'), 'My Calendar');
    fireEvent.changeText(getByPlaceholderText('https://calendar.google.com/...'), 'not-a-url');
    fireEvent.press(getByText('Import'));

    await waitFor(() => {
      expect(getByText('Please enter a valid URL')).toBeTruthy();
    });
  });

  it('should show error when trying to import file without selecting file', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    fireEvent.changeText(getByPlaceholderText('e.g., Work Calendar'), 'My Calendar');
    fireEvent.press(getByText('File'));
    fireEvent.press(getByText('Import'));

    await waitFor(() => {
      expect(getByText('Please select an .ics file')).toBeTruthy();
    });
  });

  it('should successfully import calendar via URL', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        calendar: {
          importedCalendarId: 'new-calendar-id',
          name: 'Work Calendar',
          color: '#6200ee',
        },
      },
    });

    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    fireEvent.changeText(getByPlaceholderText('e.g., Work Calendar'), 'Work Calendar');
    fireEvent.changeText(
      getByPlaceholderText('https://calendar.google.com/...'),
      'https://example.com/calendar.ics'
    );
    fireEvent.press(getByText('Import'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/groups/${mockGroupId}/calendar/imported`,
        expect.objectContaining({
          name: 'Work Calendar',
          sourceType: 'url',
          sourceUrl: 'https://example.com/calendar.ics',
        })
      );
    });

    await waitFor(() => {
      expect(mockOnImported).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show API error message', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Failed to fetch calendar URL',
        },
      },
    });

    const { getByText, getByPlaceholderText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    fireEvent.changeText(getByPlaceholderText('e.g., Work Calendar'), 'Work Calendar');
    fireEvent.changeText(
      getByPlaceholderText('https://calendar.google.com/...'),
      'https://example.com/calendar.ics'
    );
    fireEvent.press(getByText('Import'));

    await waitFor(() => {
      expect(getByText('Failed to fetch calendar URL')).toBeTruthy();
    });
  });

  it('should display default color options', () => {
    const { getAllByTestId, getByText } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    // Should show Calendar Color label
    expect(getByText('Calendar Color')).toBeTruthy();
    // Should show Selected color text
    expect(getByText(/Selected:/)).toBeTruthy();
  });

  it('should allow changing sync interval', () => {
    const { getByDisplayValue } = render(
      <ImportCalendarModal
        visible={true}
        groupId={mockGroupId}
        onClose={mockOnClose}
        onImported={mockOnImported}
      />
    );

    const syncInput = getByDisplayValue('6');
    fireEvent.changeText(syncInput, '12');
    expect(getByDisplayValue('12')).toBeTruthy();
  });
});
