/**
 * Messages Tab
 *
 * Displays message groups and individual message threads.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../../services/api';

function MessagesTab({ groupId, group }) {
  const [messageGroups, setMessageGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Create message group dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    fetchMessageGroups();
  }, [groupId]);

  async function fetchMessageGroups() {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}/message-groups`);
      setMessageGroups(response.data.messageGroups || []);
    } catch (err) {
      console.error('Failed to fetch message groups:', err);
      setError('Failed to load message groups.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(messageGroupId) {
    try {
      setMessagesLoading(true);
      const response = await api.get(`/groups/${groupId}/message-groups/${messageGroupId}/messages`);
      setMessages(response.data.messages || []);

      // Mark as read
      await api.put(`/groups/${groupId}/message-groups/${messageGroupId}/mark-read`);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      setSending(true);
      await api.post(`/groups/${groupId}/message-groups/${selectedGroup.messageGroupId}/messages`, {
        content: newMessage.trim(),
      });

      setNewMessage('');
      await fetchMessages(selectedGroup.messageGroupId);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleCreateMessageGroup() {
    if (!newGroupName.trim()) return;

    try {
      const response = await api.post(`/groups/${groupId}/message-groups`, {
        name: newGroupName.trim(),
      });

      setMessageGroups([...messageGroups, response.data.messageGroup]);
      setNewGroupName('');
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create message group:', err);
      setError('Failed to create message group.');
    }
  }

  function handleSelectGroup(mg) {
    setSelectedGroup(mg);
    fetchMessages(mg.messageGroupId);
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If a message group is selected, show messages
  if (selectedGroup) {
    return (
      <Box sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => setSelectedGroup(null)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">{selectedGroup.name}</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Messages */}
        <Paper
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 2,
            mb: 2,
            backgroundColor: '#f5f5f5',
          }}
        >
          {messagesLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">
              No messages yet. Start the conversation!
            </Typography>
          ) : (
            messages.map((message) => (
              <Box
                key={message.messageId}
                sx={{
                  display: 'flex',
                  justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    backgroundColor: message.isOwn ? '#e3f2fd' : 'white',
                  }}
                >
                  {!message.isOwn && (
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5 }}>
                      {message.sender?.displayName || 'Unknown'}
                    </Typography>
                  )}
                  <Typography variant="body2">{message.content}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {formatTime(message.createdAt)}
                  </Typography>
                </Paper>
              </Box>
            ))
          )}
        </Paper>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            multiline
            maxRows={4}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    );
  }

  // Show message groups list
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Message Groups</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {messageGroups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No message groups yet. Create one to start messaging!
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {messageGroups.map((mg, index) => (
              <React.Fragment key={mg.messageGroupId}>
                {index > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleSelectGroup(mg)}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {mg.name?.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={mg.name}
                      secondary={mg.lastMessage?.content || 'No messages yet'}
                    />
                    {mg.unreadCount > 0 && (
                      <Chip
                        label={mg.unreadCount}
                        color="primary"
                        size="small"
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Create Message Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Message Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateMessageGroup();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateMessageGroup}
            variant="contained"
            disabled={!newGroupName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MessagesTab;
