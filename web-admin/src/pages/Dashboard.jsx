/**
 * Dashboard Page
 *
 * Main dashboard showing overview of subscription, storage, and quick actions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import StorageIcon from '@mui/icons-material/Storage';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import DownloadIcon from '@mui/icons-material/Download';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import WarningIcon from '@mui/icons-material/Warning';
import api from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useKindeAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      // Don't show error if user just doesn't have a subscription
      if (err.response?.status !== 404) {
        setError('Failed to load subscription information.');
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Check if user is on free trial
   */
  function isOnFreeTrial() {
    if (!subscription || subscription.isSubscribed) return false;

    const now = new Date();
    const createdAt = new Date(subscription.createdAt);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 20);

    return now < trialEndDate;
  }

  /**
   * Get trial end date
   */
  function getTrialEndDate() {
    if (!subscription || !subscription.createdAt) return null;

    const createdAt = new Date(subscription.createdAt);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 20);

    return trialEndDate;
  }

  /**
   * Get days remaining in trial
   */
  function getDaysRemainingInTrial() {
    const trialEnd = getTrialEndDate();
    if (!trialEnd) return 0;

    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Format date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Calculate additional storage charges
   */
  function calculateAdditionalCharges() {
    if (!subscription || parseFloat(subscription.storageUsedGb) <= 10) {
      return { units: 0, cost: 0, overageGb: 0 };
    }

    const overageGb = parseFloat(subscription.storageUsedGb) - 10;
    const units = Math.ceil(overageGb / 2);
    const cost = units * 1.0;

    return { units, cost, overageGb };
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
      </Container>
    );
  }

  const additionalCharges = calculateAdditionalCharges();
  const onTrial = isOnFreeTrial();
  const daysRemaining = getDaysRemainingInTrial();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back{user?.email ? `, ${user.email}` : ''}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Trial Warning */}
      {onTrial && (
        <Alert
          severity={daysRemaining <= 5 ? 'warning' : 'info'}
          icon={daysRemaining <= 5 ? <WarningIcon /> : undefined}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            <strong>Free Trial:</strong> {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}{' '}
            remaining until {formatDate(getTrialEndDate())}
          </Typography>
          <Button
            size="small"
            variant="contained"
            sx={{ mt: 1 }}
            onClick={() => navigate('/subscription')}
          >
            Subscribe Now
          </Button>
        </Alert>
      )}

      {/* Storage Warning */}
      {additionalCharges.overageGb > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You're using {additionalCharges.overageGb.toFixed(2)} GB over your base 10GB storage.
            Additional charges: $AUD {additionalCharges.cost.toFixed(2)}/month
          </Typography>
        </Alert>
      )}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Subscription Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SubscriptionsIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Subscription Status</Typography>
              </Box>

              {!subscription?.isSubscribed && !onTrial ? (
                <>
                  <Chip label="No Active Subscription" color="default" sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Subscribe to access admin features and manage your groups.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/subscription')}
                  >
                    Subscribe Now
                  </Button>
                </>
              ) : onTrial ? (
                <>
                  <Chip label="Free Trial" color="info" sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Trial ends: {formatDate(getTrialEndDate())}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/subscription')}
                  >
                    View Plans
                  </Button>
                </>
              ) : (
                <>
                  <Chip
                    label={subscription.endDate ? 'Canceling' : 'Active'}
                    color={subscription.endDate ? 'warning' : 'success'}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {subscription.endDate
                      ? `Last day of access: ${formatDate(subscription.endDate)}`
                      : `Next billing: ${formatDate(subscription.stripe?.currentPeriodEnd)}`}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/subscription')}
                  >
                    Manage Subscription
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Storage Usage</Typography>
              </Box>

              {subscription ? (
                <>
                  <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                    {subscription.storageUsedGb} GB
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Currently used
                  </Typography>

                  {additionalCharges.overageGb > 0 && (
                    <>
                      <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
                        {additionalCharges.overageGb.toFixed(2)} GB over base 10GB
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Additional charges: {additionalCharges.units} × $AUD 1.00 = $AUD{' '}
                        {additionalCharges.cost.toFixed(2)}/month
                      </Typography>
                    </>
                  )}

                  <Button variant="outlined" color="primary" onClick={() => navigate('/account')}>
                    View Details
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loading storage information...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Quick Actions
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 3,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/subscription')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SubscriptionsIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Subscription</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Manage your subscription plan and billing
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 3,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/logs')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <DownloadIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Export Logs</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Request and download audit log exports
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 3,
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/account')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccountCircleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">My Account</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              View storage details and account settings
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;
