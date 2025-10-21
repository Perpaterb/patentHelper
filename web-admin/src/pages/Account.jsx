/**
 * Account Page
 *
 * Manage account settings and storage usage.
 */

import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

function Account() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Account
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Storage Tracker
        </Typography>
        <Typography variant="body1">
          Monitor your storage usage across all groups where you're an admin
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • View total storage used
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Storage breakdown by group
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Upgrade storage ($1 per 2GB)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Storage includes: logs, images, videos
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Settings
        </Typography>
        <Typography variant="body1">Manage your account preferences</Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Email address
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Notification preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Account deletion
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Account;
