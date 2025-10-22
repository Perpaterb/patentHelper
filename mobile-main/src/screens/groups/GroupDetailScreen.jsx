/**
 * Group Detail Screen
 *
 * Displays group messages and allows sending new messages.
 * Main messaging interface for group communication.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, Text, Avatar, Chip } from 'react-native-paper';
import api from '../../services/api';

/**
 * @typedef {Object} GroupDetailScreenProps
 * @property {Object} navigation - React Navigation navigation object
 * @property {Object} route - React Navigation route object
 */

/**
 * GroupDetailScreen component
 *
 * @param {GroupDetailScreenProps} props
 * @returns {JSX.Element}
 */
export default function GroupDetailScreen({ navigation, route }) {
  const { groupId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadGroupInfo();
    loadMessages();
  }, [groupId]);

  /**
   * Load group information
   */
  const loadGroupInfo = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroupInfo(response.data.group);
      setUserRole(response.data.group.userRole);
    } catch (err) {
      console.error('Load group info error:', err);
    }
  };

  /**
   * Load messages from API
   */
  const loadMessages = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/messages`);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Load messages error:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
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

      const response = await api.post(`/groups/${groupId}/messages`, {
        content: newMessage.trim(),
      });

      // Add new message to list
      setMessages([...messages, response.data.message]);
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Send message error:', err);
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
  const renderMessage = ({ item }) => (
    <View style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <Avatar.Text
          size={32}
          label={item.sender?.given_name?.[0] || 'U'}
          style={styles.avatar}
        />
        <View style={styles.messageInfo}>
          <Text style={styles.senderName}>
            {item.sender?.given_name} {item.sender?.family_name}
          </Text>
          <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
      <Text style={styles.messageContent}>{item.content}</Text>
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
  );

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
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          mode="outlined"
          style={styles.input}
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
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

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
  messageContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    backgroundColor: '#6200ee',
  },
  messageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  messageContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
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
    maxHeight: 100,
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
});
