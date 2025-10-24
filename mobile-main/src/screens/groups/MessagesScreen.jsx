/**
 * Messages Screen
 *
 * Displays messages for a message group and allows sending new messages.
 * Main messaging interface for message group communication.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { TextInput, IconButton, Text, Chip, Avatar } from 'react-native-paper';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * @typedef {Object} MessagesScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * MessagesScreen component
 *
 * @param {MessagesScreenProps} props
 * @returns {JSX.Element}
 */
export default function MessagesScreen({ navigation, route }) {
  const { groupId, messageGroupId, messageGroupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserMemberId, setCurrentUserMemberId] = useState(null);
  const [members, setMembers] = useState([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [selectedMentions, setSelectedMentions] = useState([]);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // Calculate max height for input (50% of screen height)
  const screenHeight = Dimensions.get('window').height;
  const maxInputHeight = screenHeight * 0.5;

  useEffect(() => {
    loadMessageGroupInfo();
    loadMessages();
  }, [messageGroupId]);

  /**
   * Load message group information
   */
  const loadMessageGroupInfo = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/message-groups/${messageGroupId}`);
      setGroupInfo(response.data.messageGroup);
      // Get user's role from the group member info
      setUserRole(response.data.userRole);
      // Get current user's group member ID for message alignment
      const memberId = response.data.currentGroupMemberId;
      setCurrentUserMemberId(memberId);
      // Save members for @ mentions
      const messageGroup = response.data.messageGroup;
      if (messageGroup?.members) {
        setMembers(messageGroup.members.map(m => m.groupMember));
      }
    } catch (err) {
      console.error('Load message group info error:', err);
    }
  };

  /**
   * Load messages from API (last 50 messages)
   */
  const loadMessages = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/message-groups/${messageGroupId}/messages?limit=50`);
      const fetchedMessages = response.data.messages || [];
      setMessages(fetchedMessages);
      setHasMore(response.data.hasMore || false);

      // Mark messages as read
      try {
        await api.put(`/groups/${groupId}/message-groups/${messageGroupId}/mark-read`);
      } catch (markReadErr) {
        console.error('Mark as read error:', markReadErr);
        // Don't fail the whole operation if mark-as-read fails
      }

      // Scroll to bottom after messages load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err) {
      console.error('Load messages error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[Messages] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load more older messages
   */
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    try {
      setLoadingMore(true);
      setError(null);

      // Get timestamp of oldest message for pagination
      const oldestMessage = messages[0];
      const before = oldestMessage.createdAt;

      const response = await api.get(
        `/groups/${groupId}/message-groups/${messageGroupId}/messages?limit=50&before=${before}`
      );
      const olderMessages = response.data.messages || [];

      // Prepend older messages to the beginning of the list
      setMessages([...olderMessages, ...messages]);
      setHasMore(response.data.hasMore || false);
    } catch (err) {
      console.error('Load more messages error:', err);

      if (err.isAuthError) {
        console.log('[Messages] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * Handle text change and detect @ for mentions
   */
  const handleTextChange = (text) => {
    setNewMessage(text);

    // Check for @ symbol and get search text
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      // Only show picker if @ is followed by nothing or letters/numbers (no space after @)
      if (!textAfterAt.includes(' ') && textAfterAt.length < 30) {
        setMentionSearchText(textAfterAt.toLowerCase());
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  };

  /**
   * Handle mention selection from picker
   */
  const handleMentionSelect = (member) => {
    // Find the last @ position
    const lastAtIndex = newMessage.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Replace everything after @ with the selected member's display name
      const beforeAt = newMessage.substring(0, lastAtIndex);
      const newText = `${beforeAt}@${member.displayName} `;
      setNewMessage(newText);

      // Add member to selectedMentions if not already there
      if (!selectedMentions.includes(member.groupMemberId)) {
        setSelectedMentions([...selectedMentions, member.groupMemberId]);
      }
    }

    // Close picker and focus back on input
    setShowMentionPicker(false);
    setMentionSearchText('');
    inputRef.current?.focus();
  };

  /**
   * Get filtered members for mention picker
   */
  const getFilteredMembers = () => {
    if (!mentionSearchText) {
      return members;
    }
    return members.filter(member =>
      member.displayName.toLowerCase().includes(mentionSearchText)
    );
  };

  /**
   * Send a new message
   */
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Supervisors cannot send messages (per appplan.md line 91)
    if (userRole === 'supervisor') {
      setError('Supervisors cannot send messages');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await api.post(`/groups/${groupId}/message-groups/${messageGroupId}/messages`, {
        content: newMessage.trim(),
        mentions: selectedMentions,
      });

      // Add new message to list
      setMessages([...messages, response.data.message]);
      setNewMessage('');
      setSelectedMentions([]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Send message error:', err);

      // Don't show error if it's an auth error
      if (err.isAuthError) {
        console.log('[Messages] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  /**
   * Format message timestamp
   */
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  /**
   * Render message item
   */
  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender?.groupMemberId === currentUserMemberId;

    return (
      <View style={[
        styles.messageWrapper,
        isMyMessage ? styles.messageWrapperRight : styles.messageWrapperLeft
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.messageBubbleRight : styles.messageBubbleLeft
        ]}>
          <Text style={styles.senderName}>
            {item.sender?.displayName || 'Unknown'}
          </Text>
          <Text style={styles.messageContent}>{item.content}</Text>
          <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
          {item.isHidden && (
            <Chip
              mode="outlined"
              style={styles.hiddenChip}
              textStyle={{ fontSize: 10 }}
            >
              HIDDEN
            </Chip>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render load more button
   */
  const renderLoadMore = () => {
    if (!hasMore || messages.length === 0) return null;

    return (
      <View style={styles.loadMoreContainer}>
        <IconButton
          icon="chevron-up"
          mode="contained"
          onPress={loadMoreMessages}
          disabled={loadingMore}
          size={20}
          style={styles.loadMoreButton}
        />
        <Text style={styles.loadMoreText}>
          {loadingMore ? 'Loading...' : 'Load older messages'}
        </Text>
      </View>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>
        {userRole === 'supervisor'
          ? 'As a supervisor, you can view but not send messages'
          : 'Be the first to send a message!'}
      </Text>
    </View>
  );

  /**
   * Render mention picker modal
   */
  const renderMentionPicker = () => {
    const filteredMembers = getFilteredMembers();

    return (
      <Modal
        visible={showMentionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMentionPicker(false)}
      >
        <TouchableOpacity
          style={styles.mentionPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowMentionPicker(false)}
        >
          <View style={styles.mentionPickerContainer}>
            <ScrollView style={styles.mentionPickerScroll}>
              <Text style={styles.mentionPickerTitle}>Mention someone</Text>
              {filteredMembers.length === 0 ? (
                <Text style={styles.mentionPickerEmpty}>No members found</Text>
              ) : (
                filteredMembers.map((member) => {
                  const bgColor = member.iconColor || '#6200ee';
                  return (
                    <TouchableOpacity
                      key={member.groupMemberId}
                      style={styles.mentionPickerItem}
                      onPress={() => handleMentionSelect(member)}
                    >
                      <Avatar.Text
                        size={40}
                        label={member.iconLetters || '?'}
                        style={{ backgroundColor: bgColor }}
                        color={getContrastTextColor(bgColor)}
                      />
                      <Text style={styles.mentionPickerItemText}>
                        {member.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  /**
   * Render input area
   */
  const renderInputArea = () => {
    // Supervisors cannot send messages
    if (userRole === 'supervisor') {
      return (
        <View style={styles.supervisorNotice}>
          <Text style={styles.supervisorText}>
            Supervisors can view but cannot send messages
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          value={newMessage}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          mode="outlined"
          style={[styles.input, { maxHeight: maxInputHeight }]}
          multiline
          maxLength={10000}
          disabled={sending}
        />
        <IconButton
          icon="send"
          mode="contained"
          iconColor="#fff"
          containerColor="#6200ee"
          size={24}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          style={styles.sendButton}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={styles.messagesList}
        ListHeaderComponent={renderLoadMore}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {renderMentionPicker()}
      {renderInputArea()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    width: '90%',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
  },
  messageBubbleLeft: {
    backgroundColor: '#fff',
  },
  messageBubbleRight: {
    backgroundColor: '#e3f2fd', // Light blue
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
  hiddenChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#ffebee',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginBottom: 4,
  },
  supervisorNotice: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderTopWidth: 1,
    borderTopColor: '#ffd54f',
  },
  supervisorText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  loadMoreContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  loadMoreButton: {
    backgroundColor: '#e3f2fd',
  },
  loadMoreText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mentionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mentionPickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingTop: 16,
    elevation: 5,
  },
  mentionPickerScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mentionPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  mentionPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  mentionPickerItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
    fontWeight: '500',
  },
  mentionPickerEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
