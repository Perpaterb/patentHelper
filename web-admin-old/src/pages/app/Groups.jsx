/**
 * Groups List Page
 *
 * Displays all groups the user belongs to and allows creating new groups.
 * Ported from mobile-main GroupsListScreen.
 */

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  CircularProgress,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Chip,
  IconButton,
  Badge,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import MailIcon from '@mui/icons-material/Mail';
import api from '../../services/api';
import PhoneFrame from '../../components/layout/PhoneFrame';

function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create group dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Invitations
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [invitesDialogOpen, setInvitesDialogOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchInvitations();
  }, []);

  async function fetchGroups() {
    try {
      setLoading(true);
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvitations() {
    try {
      const response = await api.get('/invitations');
      setPendingInvitations(response.data.invitations || []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await api.post('/groups', {
        name: newGroupName.trim(),
      });

      setGroups([...groups, response.data.group]);
      setNewGroupName('');
      setCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create group:', err);
      setError(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  }

  async function handleAcceptInvitation(invitationId) {
    try {
      await api.post(`/invitations/${invitationId}/accept`);
      await fetchGroups();
      await fetchInvitations();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setError('Failed to accept invitation.');
    }
  }

  async function handleDeclineInvitation(invitationId) {
    try {
      await api.post(`/invitations/${invitationId}/decline`);
      await fetchInvitations();
    } catch (err) {
      console.error('Failed to decline invitation:', err);
      setError('Failed to decline invitation.');
    }
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getRoleColor(role) {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'parent':
        return 'success';
      case 'caregiver':
        return 'info';
      case 'child':
        return 'warning';
      case 'supervisor':
        return 'secondary';
      default:
        return 'default';
    }
  }

  if (loading) {
    return (
      <PhoneFrame>
        <Box sx={{ textAlign: 'center', pt: 8 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading groups...</Typography>
        </Box>
      </PhoneFrame>
    );
  }

  return (
    <>
      <PhoneFrame>
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">My Groups</Typography>
            <Box>
              {pendingInvitations.length > 0 && (
                <IconButton
                  color="primary"
                  onClick={() => setInvitesDialogOpen(true)}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  <Badge badgeContent={pendingInvitations.length} color="error">
                    <MailIcon />
                  </Badge>
                </IconButton>
              )}
              <IconButton
                color="primary"
                onClick={() => setCreateDialogOpen(true)}
                size="small"
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Groups List */}
          {groups.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                No Groups Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first group to get started.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Group
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {groups.map((group) => (
                <Card key={group.groupId}>
                  <CardActionArea onClick={() => navigate(`/groups/${group.groupId}`)}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: group.iconColor || 'primary.main',
                            mr: 1.5,
                            width: 40,
                            height: 40,
                            fontSize: '0.9rem',
                          }}
                        >
                          {getInitials(group.name)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" noWrap>
                            {group.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={group.role}
                              size="small"
                              color={getRoleColor(group.role)}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {group.memberCount || 0} member{group.memberCount !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </PhoneFrame>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
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
                handleCreateGroup();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroupName.trim() || creating}
          >
            {creating ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invitations Dialog */}
      <Dialog open={invitesDialogOpen} onClose={() => setInvitesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pending Invitations</DialogTitle>
        <DialogContent>
          {pendingInvitations.length === 0 ? (
            <Typography color="text.secondary">No pending invitations.</Typography>
          ) : (
            pendingInvitations.map((invitation) => (
              <Box
                key={invitation.invitationId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{invitation.groupName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Role: {invitation.role}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    size="small"
                    onClick={() => handleDeclineInvitation(invitation.invitationId)}
                    sx={{ mr: 1 }}
                  >
                    Decline
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleAcceptInvitation(invitation.invitationId)}
                  >
                    Accept
                  </Button>
                </Box>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvitesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Groups;
