/**
 * Messages Screen
 *
 * Displays messages for a message group and allows sending new messages.
 * Main messaging interface for message group communication.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, TouchableOpacity, ScrollView, Dimensions, Alert, Image, ActivityIndicator } from 'react-native';
import { TextInput, IconButton, Text, Chip, Avatar, Menu, Divider as MenuDivider } from 'react-native-paper';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';
import MediaPicker from '../../components/shared/MediaPicker';
import ImageViewer from '../../components/shared/ImageViewer';
import VideoPlayer from '../../components/shared/VideoPlayer';
import UserAvatar from '../../components/shared/UserAvatar';
import { uploadFile, uploadMultipleFiles, getFileUrl } from '../../services/upload.service';

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
  const [isMember, setIsMember] = useState(true); // Track if user is a member of the message group
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [longPressedMessage, setLongPressedMessage] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState([]); // Array of {fileId, type, url}
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // Calculate max height for input (50% of screen height)
  const screenHeight = Dimensions.get('window').height;
  const maxInputHeight = screenHeight * 0.5;

  useEffect(() => {
    loadMessageGroupInfo();
    loadMessages();
  }, [messageGroupId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom(false); // No animation on initial load
      }, 100);
    }
  }, [messages.length]);

  // Add scroll to bottom button in header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="arrow-down"
          iconColor="#ffffff"
          size={24}
          onPress={() => scrollToBottom(true)}
          style={{ marginRight: -4, marginLeft: -3, marginTop: 0 }}
        />
      ),
    });
  }, [navigation]);

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
      // Save members for @ mentions and read receipt calculations
      const messageGroup = response.data.messageGroup;
      if (messageGroup?.members) {
        // Preserve both groupMemberId and groupMember properties
        const membersList = messageGroup.members.map(m => ({
          ...m.groupMember,
          groupMemberId: m.groupMemberId
        }));
        setMembers(membersList);

        // Check if current user is a member of this message group
        const userIsMember = membersList.some(m => m.groupMemberId === memberId);
        setIsMember(userIsMember);
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
   * Handle media selection and upload
   */
  const handleMediaSelect = async (files) => {
    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const uploadedFiles = await uploadMultipleFiles(
        files,
        'messages',
        groupId,
        (progress) => setUploadProgress(progress)
      );

      // Add uploaded files to attachedMedia
      const mediaItems = uploadedFiles.map(file => ({
        fileId: file.fileId,
        type: file.mimeType.startsWith('image/') ? 'image' : 'video',
        url: file.fileId,
      }));

      setAttachedMedia([...attachedMedia, ...mediaItems]);
    } catch (err) {
      console.error('Media upload error:', err);
      Alert.alert('Upload Failed', err.message || 'Failed to upload media');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle removing attached media
   */
  const handleRemoveMedia = (fileId) => {
    setAttachedMedia(attachedMedia.filter(m => m.fileId !== fileId));
  };

  /**
   * Handle media tap to view full-screen
   */
  const handleMediaTap = (media) => {
    setSelectedMediaUrl(getFileUrl(media.url));
    if (media.mediaType === 'image') {
      setShowImageViewer(true);
    } else {
      setShowVideoPlayer(true);
    }
  };

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  /**
   * Send a new message
   */
  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachedMedia.length === 0) return;

    // Supervisors cannot send messages (per appplan.md line 91)
    if (userRole === 'supervisor') {
      setError('Supervisors cannot send messages');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const payload = {
        content: newMessage.trim() || ' ', // Backend requires content, use space if only media
        mentions: selectedMentions,
      };

      // Add media file IDs if any
      if (attachedMedia.length > 0) {
        payload.mediaFiles = attachedMedia.map(m => ({
          fileId: m.fileId,
          mimeType: m.type === 'image' ? 'image/jpeg' : 'video/mp4',
        }));
      }

      const response = await api.post(`/groups/${groupId}/message-groups/${messageGroupId}/messages`, payload);

      // Add new message to list
      setMessages([...messages, response.data.message]);
      setNewMessage('');
      setSelectedMentions([]);
      setAttachedMedia([]);

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
   * Calculate read receipt status for a message
   * @param {Object} message - The message object
   * @returns {'sending'|'delivered'|'read-some'|'read-all'} - The read status
   */
  const getReadReceiptStatus = (message) => {
    // If message has messageId from server, it's at least delivered
    if (!message.messageId) {
      return 'sending';
    }

    // If no read receipts, message is delivered but not read
    if (!message.readReceipts || message.readReceipts.length === 0) {
      return 'delivered';
    }

    // Calculate total REGISTERED members excluding the sender
    // Only count members who have registered (isRegistered === true)
    // Members created by admins who haven't logged in don't count toward read receipts
    const registeredMembersExcludingSender = members.filter(
      m => m.groupMemberId !== message.sender?.groupMemberId && m.isRegistered === true
    ).length;

    const readCount = message.readReceipts.length;

    // If all registered members have read it
    if (readCount >= registeredMembersExcludingSender && registeredMembersExcludingSender > 0) {
      return 'read-all';
    }

    // Some registered members have read it
    return 'read-some';
  };

  /**
   * Render read receipt indicator (diamonds)
   * 4 states:
   * - sending: 1 gray diamond (◇)
   * - delivered: 2 gray diamonds (◇◇)
   * - read-some: 1 blue + 1 gray diamond (◆◇)
   * - read-all: 2 blue diamonds (◆◆)
   *
   * @param {Object} message - The message object
   * @returns {JSX.Element|null} - The read receipt component
   */
  const renderReadReceipt = (message) => {
    const status = getReadReceiptStatus(message);

    if (status === 'sending') {
      // 1 gray diamond - sent but not confirmed by server
      return <Text style={styles.readReceipt}>◇</Text>;
    }

    if (status === 'delivered') {
      // 2 gray diamonds - delivered to server, not read
      return <Text style={styles.readReceipt}>◇◇</Text>;
    }

    if (status === 'read-some') {
      // 1 blue + 1 gray diamond - read by some
      return (
        <Text style={styles.readReceipt}>
          <Text style={styles.readReceiptBlue}>◆</Text>
          <Text>◇</Text>
        </Text>
      );
    }

    // read-all: 2 blue diamonds - read by all
    return <Text style={[styles.readReceipt, styles.readReceiptBlue]}>◆◆</Text>;
  };

  /**
   * Handle long press on message
   */
  const handleLongPress = (message) => {
    setLongPressedMessage(message);
    setMenuVisible(true);
  };

  /**
   * Handle hide message action
   */
  const handleHideMessage = async () => {
    if (!longPressedMessage) return;

    setMenuVisible(false);

    try {
      await api.put(`/groups/${groupId}/message-groups/${messageGroupId}/messages/${longPressedMessage.messageId}/hide`);

      // Update local state
      setMessages(messages.map(msg =>
        msg.messageId === longPressedMessage.messageId
          ? { ...msg, isHidden: true }
          : msg
      ));

      setLongPressedMessage(null);
    } catch (err) {
      console.error('Hide message error:', err);
      if (!err.isAuthError) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to hide message');
      }
    }
  };

  /**
   * Handle unhide message action (admin only)
   */
  const handleUnhideMessage = async () => {
    if (!longPressedMessage) return;

    setMenuVisible(false);

    try {
      await api.put(`/groups/${groupId}/message-groups/${messageGroupId}/messages/${longPressedMessage.messageId}/unhide`);

      // Update local state
      setMessages(messages.map(msg =>
        msg.messageId === longPressedMessage.messageId
          ? { ...msg, isHidden: false }
          : msg
      ));

      setLongPressedMessage(null);
    } catch (err) {
      console.error('Unhide message error:', err);
      if (!err.isAuthError) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to unhide message');
      }
    }
  };

  /**
   * Render message item
   */
  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender?.groupMemberId === currentUserMemberId;
    const isHidden = item.isHidden || false;

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.messageWrapper,
          isMyMessage ? styles.messageWrapperRight : styles.messageWrapperLeft
        ]}>
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.messageBubbleRight : styles.messageBubbleLeft,
            isHidden && styles.messageBubbleHidden
          ]}>
            {isHidden && userRole === 'admin' && (
              <View style={styles.hiddenIndicator}>
                <IconButton icon="eye-off" size={16} iconColor="#999" style={styles.hiddenIcon} />
                <Text style={styles.hiddenText}>Hidden Message</Text>
              </View>
            )}
            <Text style={styles.senderName}>
              {item.sender?.displayName || 'Unknown'}
            </Text>

            {/* Render attached media */}
            {item.media && item.media.length > 0 && (
              <View style={styles.mediaContainer}>
                {item.media.map((media) => (
                  <TouchableOpacity
                    key={media.mediaId}
                    onPress={() => handleMediaTap(media)}
                    style={styles.mediaThumbnail}
                  >
                    {media.mediaType === 'image' ? (
                      <Image
                        source={{ uri: getFileUrl(media.url) }}
                        style={styles.mediaImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.videoThumbnail}>
                        <IconButton icon="play-circle" size={48} iconColor="#fff" />
                        <Text style={styles.videoText}>Video</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.messageContent}>{item.content}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
              {isMyMessage && renderReadReceipt(item)}
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
                  return (
                    <TouchableOpacity
                      key={member.groupMemberId}
                      style={styles.mentionPickerItem}
                      onPress={() => handleMentionSelect(member)}
                    >
                      <UserAvatar
                        profilePhotoUrl={member.profilePhotoUrl}
                        memberIcon={member.iconLetters}
                        iconColor={member.iconColor}
                        displayName={member.displayName}
                        size={40}
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

    // Non-members cannot send messages (admin viewing read-only)
    if (!isMember) {
      return (
        <View style={styles.supervisorNotice}>
          <Text style={styles.supervisorText}>
            You are not a member of this message group. You have read-only access.
          </Text>
        </View>
      );
    }

    return (
      <View>
        {/* Show attached media preview */}
        {attachedMedia.length > 0 && (
          <ScrollView horizontal style={styles.attachedMediaContainer}>
            {attachedMedia.map((media) => (
              <View key={media.fileId} style={styles.attachedMediaItem}>
                {media.type === 'image' ? (
                  <Image
                    source={{ uri: getFileUrl(media.url) }}
                    style={styles.attachedMediaThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.attachedMediaThumb}>
                    <IconButton icon="video" size={24} />
                  </View>
                )}
                <IconButton
                  icon="close-circle"
                  size={20}
                  iconColor="#f44336"
                  onPress={() => handleRemoveMedia(media.fileId)}
                  style={styles.removeMediaButton}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Upload/Processing progress indicator */}
        {(uploading || processing) && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#6200ee" />
            <Text style={styles.uploadingText}>
              {processing && !uploading ? 'Processing images...' : `Uploading... ${uploadProgress}%`}
            </Text>
          </View>
        )}

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
            disabled={sending || uploading}
          />
          <View style={styles.buttonColumn}>
            <MediaPicker
              onSelect={handleMediaSelect}
              mediaType="both"
              maxSize={100 * 1024 * 1024} // 100MB for videos
              allowMultiple={true}
              imageQuality={0.8}
              disabled={uploading || sending || processing}
              onProcessingChange={setProcessing}
              renderTrigger={(onPress, isLoading) => (
                <IconButton
                  icon="plus"
                  mode="outlined"
                  size={32}
                  onPress={onPress}
                  disabled={uploading || sending || isLoading}
                  style={styles.addButton}
                />
              )}
            />
            <IconButton
              icon="send"
              mode="contained"
              iconColor="#fff"
              containerColor="#6200ee"
              size={24}
              onPress={handleSendMessage}
              disabled={(!newMessage.trim() && attachedMedia.length === 0) || sending || uploading}
              style={styles.sendButton}
            />
          </View>
        </View>
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

  /**
   * Render long-press menu
   */
  const renderMessageMenu = () => {
    if (!longPressedMessage) return null;

    const isMyMessage = longPressedMessage.sender?.groupMemberId === currentUserMemberId;
    const isHidden = longPressedMessage.isHidden || false;

    return (
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setMenuVisible(false);
          setLongPressedMessage(null);
        }}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => {
            setMenuVisible(false);
            setLongPressedMessage(null);
          }}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Message Options</Text>
            <MenuDivider />

            {/* Hide/Unhide option for admins or own messages */}
            {userRole === 'admin' && !isHidden && (
              <TouchableOpacity style={styles.menuItem} onPress={handleHideMessage}>
                <IconButton icon="eye-off" size={20} />
                <Text style={styles.menuItemText}>Hide Message</Text>
              </TouchableOpacity>
            )}

            {userRole === 'admin' && isHidden && (
              <TouchableOpacity style={styles.menuItem} onPress={handleUnhideMessage}>
                <IconButton icon="eye" size={20} />
                <Text style={styles.menuItemText}>Unhide Message</Text>
              </TouchableOpacity>
            )}

            {userRole !== 'admin' && isMyMessage && !isHidden && (
              <TouchableOpacity style={styles.menuItem} onPress={handleHideMessage}>
                <IconButton icon="delete" size={20} />
                <Text style={styles.menuItemText}>Delete Message</Text>
              </TouchableOpacity>
            )}

            <MenuDivider />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setLongPressedMessage(null);
              }}
            >
              <Text style={[styles.menuItemText, styles.cancelText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

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
      />


      {renderMentionPicker()}
      {renderMessageMenu()}
      {renderInputArea()}

      {/* Image Viewer */}
      {selectedMediaUrl && (
        <ImageViewer
          visible={showImageViewer}
          imageUrl={selectedMediaUrl}
          onClose={() => {
            setShowImageViewer(false);
            setSelectedMediaUrl(null);
          }}
        />
      )}

      {/* Video Player */}
      {selectedMediaUrl && (
        <VideoPlayer
          visible={showVideoPlayer}
          videoUrl={selectedMediaUrl}
          onClose={() => {
            setShowVideoPlayer(false);
            setSelectedMediaUrl(null);
          }}
        />
      )}
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
  messageBubbleHidden: {
    backgroundColor: '#f0f0f0', // Grey background for hidden messages
    borderWidth: 1,
    borderColor: '#ddd',
  },
  hiddenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 4,
  },
  hiddenIcon: {
    margin: 0,
    padding: 0,
  },
  hiddenText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
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
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  readReceipt: {
    fontSize: 12,
    color: '#999',
  },
  readReceiptBlue: {
    color: '#2196F3',
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
  buttonColumn: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  addButton: {
    margin: 0,
    width: 40,
    height: 40,
  },
  sendButton: {
    margin: 0,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 250,
    maxWidth: 300,
    padding: 8,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 12,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  cancelText: {
    color: '#999',
    textAlign: 'center',
    width: '100%',
    marginLeft: 0,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  mediaThumbnail: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  videoThumbnail: {
    width: 200,
    height: 200,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  videoText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  attachedMediaContainer: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  attachedMediaItem: {
    position: 'relative',
    marginRight: 8,
  },
  attachedMediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    margin: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
  },
});
