/**
 * Subscription Page
 *
 * Manage subscription plans, billing, and payment methods.
 */

import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

function Subscription() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Subscription Management
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Subscription Features
        </Typography>
        <Typography variant="body1">
          Manage your subscription plan ($8/month for admin access)
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • View current subscription status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Update payment method (Stripe)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • View billing history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Cancel subscription
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Subscription;
