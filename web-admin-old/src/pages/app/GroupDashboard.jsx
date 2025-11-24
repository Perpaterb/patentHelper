/**
 * Group Dashboard Page
 *
 * Main dashboard for a group with tabs for Messages, Calendar, Finance, etc.
 * Ported from mobile-main GroupDashboardScreen.
 */

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
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
import PhoneFrame from '../../components/layout/PhoneFrame';

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
      <PhoneFrame>
        <Box sx={{ textAlign: 'center', pt: 8 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading group...</Typography>
        </Box>
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame>
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <IconButton onClick={() => navigate('/groups')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, ml: 1 }} noWrap>
            {group?.name}
          </Typography>
          <IconButton onClick={handleSettingsClick} size="small">
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0,
                px: 1,
                fontSize: '0.75rem',
              },
            }}
          >
            <Tab icon={<MessageIcon sx={{ fontSize: 16 }} />} label="Messages" iconPosition="start" />
            <Tab icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Calendar" iconPosition="start" />
            <Tab icon={<AccountBalanceWalletIcon sx={{ fontSize: 16 }} />} label="Finance" iconPosition="start" />
            <Tab icon={<CardGiftcardIcon sx={{ fontSize: 16 }} />} label="Registries" iconPosition="start" />
            <Tab icon={<ArticleIcon sx={{ fontSize: 16 }} />} label="Wiki" iconPosition="start" />
            <Tab icon={<FolderIcon sx={{ fontSize: 16 }} />} label="Documents" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1.5 }}>
          <Routes>
            <Route path="/" element={<MessagesTab groupId={groupId} group={group} />} />
            <Route path="/messages/*" element={<MessagesTab groupId={groupId} group={group} />} />
            <Route path="/calendar/*" element={<CalendarTab groupId={groupId} group={group} />} />
            <Route path="/finance/*" element={<FinanceTab groupId={groupId} group={group} />} />
            <Route path="/registries/*" element={<RegistriesTab groupId={groupId} group={group} />} />
            <Route path="/wiki/*" element={<WikiTab groupId={groupId} group={group} />} />
            <Route path="/documents/*" element={<DocumentsTab groupId={groupId} group={group} />} />
          </Routes>
        </Box>
      </Box>
    </PhoneFrame>
  );
}

export default GroupDashboard;
