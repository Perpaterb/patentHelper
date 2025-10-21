/**
 * Logs Page
 *
 * Request and download audit log exports.
 */

import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

function Logs() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Log Exports
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Audit Log Export Features
        </Typography>
        <Typography variant="body1">
          Request and download complete audit logs for your groups
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Request new log export for any group
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Password-protected ZIP files
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Email notification when ready
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Download previous exports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Exports include all actions, messages, and media
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Logs;
