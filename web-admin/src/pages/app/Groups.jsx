/**
 * Groups List Page
 *
 * Displays all groups the user belongs to and allows creating new groups.
 * Ported from mobile-main GroupsListScreen.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading groups...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">My Groups</Typography>
        <Box>
          {pendingInvitations.length > 0 && (
            <IconButton
              color="primary"
              onClick={() => setInvitesDialogOpen(true)}
              sx={{ mr: 2 }}
            >
              <Badge badgeContent={pendingInvitations.length} color="error">
                <MailIcon />
              </Badge>
            </IconButton>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Group
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Groups Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first group to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Group
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.groupId}>
              <Card>
                <CardActionArea onClick={() => navigate(`/groups/${group.groupId}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: group.iconColor || 'primary.main',
                          mr: 2,
                          width: 48,
                          height: 48,
                        }}
                      >
                        {getInitials(group.name)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap>
                          {group.name}
                        </Typography>
                        <Chip
                          label={group.role}
                          size="small"
                          color={getRoleColor(group.role)}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {group.memberCount || 0} member{group.memberCount !== 1 ? 's' : ''}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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
    </Container>
  );
}

export default Groups;
