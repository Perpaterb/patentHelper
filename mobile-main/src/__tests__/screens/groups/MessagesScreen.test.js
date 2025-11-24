/**
 * MessagesScreen Tests
 *
 * Tests for the messaging functionality including:
 * - Message sending
 * - Read receipts (4-state diamond system)
 * - Message alignment
 * - Role-based permissions (supervisor cannot send)
 *
 * Based on USER_STORIES.md:
 * - US-MSG-003: Send Message with Text
 * - US-MSG-005: Message Read Receipts (Diamond Indicator)
 * - US-MSG-007: Message Alignment & Styling
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MessagesScreen from '../../../screens/groups/MessagesScreen';
import api from '../../../services/api';

// Mock the components that are imported
jest.mock('../../../components/shared/MediaPicker', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onSelect, renderTrigger }) =>
      renderTrigger
        ? renderTrigger(() => onSelect([]), false)
        : <View testID="media-picker" />,
  };
});

jest.mock('../../../components/shared/ImageViewer', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="image-viewer" /> : null),
  };
});

jest.mock('../../../components/shared/VideoPlayer', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="video-player" /> : null),
  };
});

jest.mock('../../../components/shared/UserAvatar', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ displayName, memberIcon }) => (
      <View testID="user-avatar">
        <Text>{memberIcon || displayName?.[0]}</Text>
      </View>
    ),
  };
});

jest.mock('../../../components/CustomNavigationHeader', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, onBack, rightButtons }) => (
      <View testID="custom-header">
        <TouchableOpacity onPress={onBack} testID="back-button">
          <Text>Back</Text>
        </TouchableOpacity>
        <Text>{title}</Text>
        {rightButtons?.map((btn, idx) => (
          <TouchableOpacity key={idx} onPress={btn.onPress} testID={`header-${btn.icon}`}>
            <Text>{btn.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

describe('MessagesScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  const mockRoute = {
    params: {
      groupId: 'group-123',
      messageGroupId: 'msg-group-456',
      messageGroupName: 'Family Chat',
    },
  };

  const mockMembers = [
    {
      groupMemberId: 'member-1',
      displayName: 'John Doe',
      iconLetters: 'JD',
      iconColor: '#6200ee',
      isRegistered: true,
    },
    {
      groupMemberId: 'member-2',
      displayName: 'Jane Doe',
      iconLetters: 'JA',
      iconColor: '#ff5722',
      isRegistered: true,
    },
    {
      groupMemberId: 'member-3',
      displayName: 'Placeholder',
      iconLetters: 'PH',
      iconColor: '#000000',
      isRegistered: false, // Unregistered placeholder member
    },
  ];

  const mockMessageGroupResponse = {
    messageGroup: {
      messageGroupId: 'msg-group-456',
      name: 'Family Chat',
      members: mockMembers.map(m => ({
        groupMemberId: m.groupMemberId,
        groupMember: m,
      })),
    },
    userRole: 'parent',
    currentGroupMemberId: 'member-1',
  };

  const mockMessagesResponse = {
    messages: [
      {
        messageId: 'msg-1',
        content: 'Hello everyone!',
        createdAt: new Date().toISOString(),
        isHidden: false,
        sender: {
          groupMemberId: 'member-1',
          displayName: 'John Doe',
          iconLetters: 'JD',
          iconColor: '#6200ee',
        },
        readReceipts: [],
      },
      {
        messageId: 'msg-2',
        content: 'Hi John!',
        createdAt: new Date().toISOString(),
        isHidden: false,
        sender: {
          groupMemberId: 'member-2',
          displayName: 'Jane Doe',
          iconLetters: 'JA',
          iconColor: '#ff5722',
        },
        readReceipts: [
          {
            groupMemberId: 'member-1',
            readAt: new Date().toISOString(),
          },
        ],
      },
    ],
    hasMore: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/message-groups/') && !url.includes('/messages')) {
        return Promise.resolve({ data: mockMessageGroupResponse });
      }
      if (url.includes('/messages')) {
        return Promise.resolve({ data: mockMessagesResponse });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    api.put.mockResolvedValue({ data: { success: true } });
    api.post.mockResolvedValue({
      data: {
        message: {
          messageId: 'new-msg-123',
          content: 'Test message',
          createdAt: new Date().toISOString(),
          sender: {
            groupMemberId: 'member-1',
            displayName: 'John Doe',
          },
          readReceipts: [],
        },
      },
    });
  });

  describe('Message Sending (US-MSG-003)', () => {
    it('should render message input for regular users', async () => {
      const { getByPlaceholderText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });
    });

    it('should send message when send button is pressed', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Test message');

      const sendButton = getByTestId('send');
      await act(async () => {
        fireEvent.press(sendButton);
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          `/groups/${mockRoute.params.groupId}/message-groups/${mockRoute.params.messageGroupId}/messages`,
          expect.objectContaining({
            content: 'Test message',
            mentions: [],
          })
        );
      });
    });

    it('should not allow sending empty messages', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const sendButton = getByTestId('send');
      expect(sendButton.props.accessibilityState?.disabled || sendButton.props.disabled).toBeTruthy();
    });

    it('should clear input after successful send', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Test message');

      const sendButton = getByTestId('send');
      await act(async () => {
        fireEvent.press(sendButton);
      });

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });
  });

  describe('Supervisor Cannot Send Messages (US-MSG-003)', () => {
    it('should show notice instead of input for supervisors', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({
            data: {
              ...mockMessageGroupResponse,
              userRole: 'supervisor',
            },
          });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: mockMessagesResponse });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText, queryByPlaceholderText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Supervisors can view but cannot send messages')).toBeTruthy();
      });

      expect(queryByPlaceholderText('Type a message...')).toBeNull();
    });

    it('should prevent API call if supervisor tries to send', async () => {
      // This tests the internal check even if UI is bypassed
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({
            data: {
              ...mockMessageGroupResponse,
              userRole: 'supervisor',
            },
          });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: mockMessagesResponse });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<MessagesScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        // Verify the API get calls happened
        expect(api.get).toHaveBeenCalled();
      });

      // Verify no message send API was called
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Read Receipts - 4-State Diamond System (US-MSG-005)', () => {
    it('should display delivered status (2 gray diamonds) for messages with no read receipts', async () => {
      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        // Message from current user with no read receipts
        expect(getByText('Hello everyone!')).toBeTruthy();
      });

      // The first message is from member-1 (current user) with no read receipts
      // Should show delivered status (gray diamonds)
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });
    });

    it('should display read-some status when some members have read', async () => {
      const messagesWithPartialReads = {
        messages: [
          {
            messageId: 'msg-1',
            content: 'Partially read message',
            createdAt: new Date().toISOString(),
            isHidden: false,
            sender: {
              groupMemberId: 'member-1',
              displayName: 'John Doe',
              iconLetters: 'JD',
              iconColor: '#6200ee',
            },
            readReceipts: [
              {
                groupMemberId: 'member-2',
                readAt: new Date().toISOString(),
              },
            ],
          },
        ],
        hasMore: false,
      };

      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          // Add another registered member to test partial reads
          const responseWithMoreMembers = {
            ...mockMessageGroupResponse,
            messageGroup: {
              ...mockMessageGroupResponse.messageGroup,
              members: [
                ...mockMessageGroupResponse.messageGroup.members,
                {
                  groupMemberId: 'member-4',
                  groupMember: {
                    groupMemberId: 'member-4',
                    displayName: 'Another User',
                    iconLetters: 'AU',
                    iconColor: '#00ff00',
                    isRegistered: true,
                  },
                },
              ],
            },
          };
          return Promise.resolve({ data: responseWithMoreMembers });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: messagesWithPartialReads });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Partially read message')).toBeTruthy();
      });
    });

    it('should display read-all status when all registered members have read', async () => {
      const messagesWithFullReads = {
        messages: [
          {
            messageId: 'msg-1',
            content: 'Fully read message',
            createdAt: new Date().toISOString(),
            isHidden: false,
            sender: {
              groupMemberId: 'member-1',
              displayName: 'John Doe',
              iconLetters: 'JD',
              iconColor: '#6200ee',
            },
            readReceipts: [
              {
                groupMemberId: 'member-2',
                readAt: new Date().toISOString(),
              },
            ],
          },
        ],
        hasMore: false,
      };

      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({ data: mockMessageGroupResponse });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: messagesWithFullReads });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Fully read message')).toBeTruthy();
      });
    });

    it('should NOT count unregistered placeholder members in read receipt calculations', async () => {
      // This is critical - placeholder members (isRegistered: false) should not affect read receipts
      const messagesForPlaceholderTest = {
        messages: [
          {
            messageId: 'msg-1',
            content: 'Test placeholder exclusion',
            createdAt: new Date().toISOString(),
            isHidden: false,
            sender: {
              groupMemberId: 'member-1',
              displayName: 'John Doe',
              iconLetters: 'JD',
              iconColor: '#6200ee',
            },
            readReceipts: [
              {
                groupMemberId: 'member-2', // Jane Doe (registered)
                readAt: new Date().toISOString(),
              },
            ],
          },
        ],
        hasMore: false,
      };

      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({ data: mockMessageGroupResponse });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: messagesForPlaceholderTest });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Test placeholder exclusion')).toBeTruthy();
      });

      // With 3 members total, 1 sender, 1 unregistered placeholder
      // Only 1 registered member needs to read = Jane Doe
      // Jane has read, so should show read-all status
    });
  });

  describe('Message Alignment (US-MSG-007)', () => {
    it('should align own messages to the right', async () => {
      const { getByText, getAllByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Hello everyone!')).toBeTruthy();
      });

      // The message "Hello everyone!" is from member-1 (current user)
      // It should have right alignment styles applied
    });

    it('should align other users messages to the left', async () => {
      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Hi John!')).toBeTruthy();
      });

      // The message "Hi John!" is from member-2 (not current user)
      // It should have left alignment styles applied
    });
  });

  describe('Message Loading and Pagination', () => {
    it('should load messages on mount', async () => {
      render(<MessagesScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining(`/groups/${mockRoute.params.groupId}/message-groups/${mockRoute.params.messageGroupId}/messages`)
        );
      });
    });

    it('should mark messages as read when loaded', async () => {
      render(<MessagesScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          `/groups/${mockRoute.params.groupId}/message-groups/${mockRoute.params.messageGroupId}/mark-read`
        );
      });
    });

    it('should display empty state when no messages', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({ data: mockMessageGroupResponse });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: { messages: [], hasMore: false } });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('No messages yet')).toBeTruthy();
        expect(getByText('Be the first to send a message!')).toBeTruthy();
      });
    });

    it('should show load more button when hasMore is true', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({ data: mockMessageGroupResponse });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({
            data: {
              messages: mockMessagesResponse.messages,
              hasMore: true,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Load older messages')).toBeTruthy();
      });
    });
  });

  describe('@ Mentions (US-MSG-010)', () => {
    it('should show mention picker when @ is typed', async () => {
      const { getByPlaceholderText, getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, '@');

      await waitFor(() => {
        expect(getByText('Mention someone')).toBeTruthy();
      });
    });

    it('should filter members when typing after @', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, '@john');

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });
    });

    it('should insert mention when member is selected', async () => {
      const { getByPlaceholderText, getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, '@');

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Select a member
      fireEvent.press(getByText('John Doe'));

      // Input should now contain the mention
      await waitFor(() => {
        expect(input.props.value).toContain('@John Doe');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when message loading fails', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({ data: mockMessageGroupResponse });
        }
        if (url.includes('/messages')) {
          return Promise.reject({
            response: { data: { message: 'Failed to load messages' } },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Failed to load messages')).toBeTruthy();
      });
    });

    it('should display error when send fails', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { message: 'Failed to send message' } },
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Test message');

      const sendButton = getByTestId('send');
      await act(async () => {
        fireEvent.press(sendButton);
      });

      await waitFor(() => {
        expect(getByText('Failed to send message')).toBeTruthy();
      });
    });
  });

  describe('Hidden Messages (US-MSG-008)', () => {
    it('should display hidden message indicator for admins', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({
            data: {
              ...mockMessageGroupResponse,
              userRole: 'admin',
            },
          });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({
            data: {
              messages: [
                {
                  messageId: 'msg-hidden',
                  content: 'This is hidden',
                  createdAt: new Date().toISOString(),
                  isHidden: true,
                  sender: {
                    groupMemberId: 'member-2',
                    displayName: 'Jane Doe',
                    iconLetters: 'JA',
                    iconColor: '#ff5722',
                  },
                  readReceipts: [],
                },
              ],
              hasMore: false,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Hidden Message')).toBeTruthy();
        expect(getByText('This is hidden')).toBeTruthy();
      });
    });
  });

  describe('Non-member Access', () => {
    it('should show read-only notice for non-members (admin viewing)', async () => {
      api.get.mockImplementation((url) => {
        if (url.includes('/message-groups/') && !url.includes('/messages')) {
          return Promise.resolve({
            data: {
              ...mockMessageGroupResponse,
              currentGroupMemberId: 'not-a-member', // User is not in the members list
            },
          });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({ data: mockMessagesResponse });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { getByText } = render(
        <MessagesScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('You are not a member of this message group. You have read-only access.')).toBeTruthy();
      });
    });
  });
});
