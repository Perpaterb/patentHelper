/**
 * Dashboard Page
 *
 * Main dashboard showing overview of subscription, storage, and quick actions.
 */

import React from 'react';
import { Box, Container, Typography, Grid, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import StorageIcon from '@mui/icons-material/Storage';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import DownloadIcon from '@mui/icons-material/Download';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Subscription Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 200,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/subscription')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SubscriptionsIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Subscription</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              Manage your subscription plan and billing information
            </Typography>
            <Button variant="outlined" size="small" sx={{ mt: 2 }}>
              Manage
            </Button>
          </Paper>
        </Grid>

        {/* Storage Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 200,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/account')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StorageIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Storage</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              Track your storage usage and upgrade if needed
            </Typography>
            <Button variant="outlined" size="small" sx={{ mt: 2 }}>
              View Usage
            </Button>
          </Paper>
        </Grid>

        {/* Log Exports Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 200,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/logs')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DownloadIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Log Exports</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              Request and download audit log exports
            </Typography>
            <Button variant="outlined" size="small" sx={{ mt: 2 }}>
              Export Logs
            </Button>
          </Paper>
        </Grid>

        {/* Account Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 200,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/account')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccountCircleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">My Account</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              Manage your account settings and preferences
            </Typography>
            <Button variant="outlined" size="small" sx={{ mt: 2 }}>
              Settings
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Welcome Message */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome to Parenting Helper Admin
        </Typography>
        <Typography variant="body1">
          This is your admin portal for managing subscriptions, storage, and log exports for your
          Parenting Helper groups. Use the cards above to navigate to different sections.
        </Typography>
      </Paper>
    </Container>
  );
}

export default Dashboard;
