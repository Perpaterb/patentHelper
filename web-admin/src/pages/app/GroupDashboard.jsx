/**
 * Group Dashboard Page
 *
 * Main dashboard for a group with tabs for Messages, Calendar, Finance, etc.
 * Ported from mobile-main GroupDashboardScreen.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { useParams, useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import MessageIcon from '@mui/icons-material/Message';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import api from '../../services/api';

// Tab content components (placeholders for now)
import MessagesTab from './tabs/MessagesTab';
import CalendarTab from './tabs/CalendarTab';
import FinanceTab from './tabs/FinanceTab';
import RegistriesTab from './tabs/RegistriesTab';
import WikiTab from './tabs/WikiTab';
import DocumentsTab from './tabs/DocumentsTab';

function GroupDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/calendar')) return 1;
    if (path.includes('/finance')) return 2;
    if (path.includes('/registries')) return 3;
    if (path.includes('/wiki')) return 4;
    if (path.includes('/documents')) return 5;
    return 0; // Messages is default
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  async function fetchGroup() {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data.group);
    } catch (err) {
      console.error('Failed to fetch group:', err);
      setError('Failed to load group. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(event, newValue) {
    setActiveTab(newValue);
    const paths = ['messages', 'calendar', 'finance', 'registries', 'wiki', 'documents'];
    navigate(`/groups/${groupId}/${paths[newValue]}`);
  }

  function handleSettingsClick(event) {
    setSettingsAnchor(event.currentTarget);
  }

  function handleSettingsClose() {
    setSettingsAnchor(null);
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading group...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/groups')}
          underline="hover"
          color="inherit"
        >
          Groups
        </Link>
        <Typography color="text.primary">{group?.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/groups')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {group?.name}
        </Typography>
        <IconButton onClick={handleSettingsClick}>
          <SettingsIcon />
        </IconButton>
        <Menu
          anchorEl={settingsAnchor}
          open={Boolean(settingsAnchor)}
          onClose={handleSettingsClose}
        >
          <MenuItem onClick={() => { handleSettingsClose(); navigate(`/groups/${groupId}/settings`); }}>
            Group Settings
          </MenuItem>
          <MenuItem onClick={() => { handleSettingsClose(); navigate(`/groups/${groupId}/members`); }}>
            Manage Members
          </MenuItem>
        </Menu>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<MessageIcon />} label="Messages" iconPosition="start" />
          <Tab icon={<CalendarMonthIcon />} label="Calendar" iconPosition="start" />
          <Tab icon={<AccountBalanceWalletIcon />} label="Finance" iconPosition="start" />
          <Tab icon={<CardGiftcardIcon />} label="Registries" iconPosition="start" />
          <Tab icon={<ArticleIcon />} label="Wiki" iconPosition="start" />
          <Tab icon={<FolderIcon />} label="Documents" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Routes>
        <Route path="/" element={<MessagesTab groupId={groupId} group={group} />} />
        <Route path="/messages/*" element={<MessagesTab groupId={groupId} group={group} />} />
        <Route path="/calendar/*" element={<CalendarTab groupId={groupId} group={group} />} />
        <Route path="/finance/*" element={<FinanceTab groupId={groupId} group={group} />} />
        <Route path="/registries/*" element={<RegistriesTab groupId={groupId} group={group} />} />
        <Route path="/wiki/*" element={<WikiTab groupId={groupId} group={group} />} />
        <Route path="/documents/*" element={<DocumentsTab groupId={groupId} group={group} />} />
      </Routes>
    </Container>
  );
}

export default GroupDashboard;
