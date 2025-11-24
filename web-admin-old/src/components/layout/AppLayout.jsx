/**
 * App Layout Component
 *
 * Main layout with navigation drawer and app bar.
 */

import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import MenuIcon from '@mui/icons-material/Menu';
import AppsIcon from '@mui/icons-material/Apps';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import StorageIcon from '@mui/icons-material/Storage';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;

function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useKindeAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem('accessToken');

    // Logout with Kinde (will redirect to logout page)
    logout();
  };

  // TODO: Get isAdmin from user context/API to conditionally show admin-only items
  const isAdmin = true; // Placeholder - replace with actual admin check

  const menuItems = [
    { text: 'Web App', icon: <AppsIcon />, path: '/groups' },
    { text: 'Subscription', icon: <SubscriptionsIcon />, path: '/subscription' },
    { text: 'My Account', icon: <AccountCircleIcon />, path: '/account' },
    ...(isAdmin ? [
      { text: 'Storage Management', icon: <StorageIcon />, path: '/storage' },
      { text: 'Audit Logs', icon: <HistoryIcon />, path: '/logs' },
    ] : []),
  ];

  const drawer = (
    <Box>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Family Helper
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar /> {/* Spacer for app bar */}
        {children}
      </Box>
    </Box>
  );
}

export default AppLayout;
