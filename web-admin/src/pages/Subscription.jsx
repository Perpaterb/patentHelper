/**
 * Subscription Page
 *
 * Manage subscription plans, billing, and payment methods.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../services/api';

function Subscription() {
  const [pricing, setPricing] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch both pricing and subscription data
   */
  async function fetchData() {
    await Promise.all([fetchPricing(), fetchSubscription()]);
  }

  /**
   * Fetch pricing information from backend
   */
  async function fetchPricing() {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/pricing');
      setPricing(response.data.pricing);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Failed to load pricing information. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetch current subscription status
   */
  async function fetchSubscription() {
    try {
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      // Don't show error if user just doesn't have a subscription
      if (err.response?.status !== 404) {
        setError('Failed to load subscription information.');
      }
    }
  }

  /**
   * Handle subscription checkout
   * @param {string} priceId - Stripe price ID
   */
  async function handleSubscribe(priceId) {
    try {
      setSubscribing(true);
      setError(null);

      // Create checkout session
      const response = await api.post('/subscriptions/checkout', {
        priceId: priceId,
        successUrl: `${window.location.origin}/subscription?success=true`,
        cancelUrl: `${window.location.origin}/subscription?canceled=true`,
      });

      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Subscription checkout failed:', err);
      setError(err.response?.data?.message || 'Failed to start checkout. Please try again.');
      setSubscribing(false);
    }
  }

  /**
   * Handle subscription cancellation
   */
  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel your subscription? Access will continue until the end of your current billing period.')) {
      return;
    }

    try {
      setCanceling(true);
      setError(null);

      const response = await api.post('/subscriptions/cancel');

      // Refresh subscription data
      await fetchSubscription();

      alert(`Subscription canceled. Access will continue until ${new Date(response.data.cancelAt).toLocaleDateString()}`);
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError(err.response?.data?.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  }

  /**
   * Handle subscription reactivation
   */
  async function handleReactivate() {
    if (!window.confirm('Reactivate your subscription? Your access will continue without interruption.')) {
      return;
    }

    try {
      setReactivating(true);
      setError(null);

      await api.post('/subscriptions/reactivate');

      // Refresh subscription data
      await fetchSubscription();

      alert('Subscription reactivated successfully!');
    } catch (err) {
      console.error('Reactivation failed:', err);
      setError(err.response?.data?.message || 'Failed to reactivate subscription. Please try again.');
    } finally {
      setReactivating(false);
    }
  }

  /**
   * Format price for display
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code
   * @returns {string} Formatted price with $AUD prefix
   */
  function formatPrice(amount, currency) {
    const formattedAmount = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);

    // Replace $ with $AUD for clarity
    return formattedAmount.replace('$', '$AUD ');
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
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
   * Check if user is on free trial
   * @returns {boolean} True if on trial, false otherwise
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
   * @returns {Date|null} Trial end date or null
   */
  function getTrialEndDate() {
    if (!subscription || !subscription.createdAt) return null;

    const createdAt = new Date(subscription.createdAt);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 20);

    return trialEndDate;
  }

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading pricing information...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Subscription Management
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Choose the plan that best fits your needs. All plans include access to the admin features.
      </Typography>

      {/* Show error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Show success message */}
      {new URLSearchParams(window.location.search).get('success') === 'true' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Subscription successful! Your admin access is now active.
        </Alert>
      )}

      {/* Show canceled message */}
      {new URLSearchParams(window.location.search).get('canceled') === 'true' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Checkout canceled. You can subscribe anytime.
        </Alert>
      )}

      {/* Pricing cards */}
      {pricing && (
        <Grid container spacing={3}>
          {/* Admin Subscription Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid',
                borderColor: 'primary.main',
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {pricing.adminSubscription.name}
                </Typography>
                <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                  {formatPrice(pricing.adminSubscription.amount, pricing.adminSubscription.currency)}
                  <Typography component="span" variant="h6" color="text.secondary">
                    /{pricing.adminSubscription.interval}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {pricing.adminSubscription.description}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Full admin access</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">10GB storage included</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Audit log exports</Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                {subscription?.isSubscribed ? (
                  <Box sx={{ width: '100%', textAlign: 'center', py: 1 }}>
                    <Chip label="Active Subscription" color="success" />
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => handleSubscribe(pricing.adminSubscription.priceId)}
                    disabled={subscribing}
                  >
                    {subscribing ? <CircularProgress size={24} /> : 'Subscribe Now'}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>

          {/* Additional Storage Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {pricing.additionalStorage.name}
                </Typography>
                <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                  {formatPrice(pricing.additionalStorage.amount, pricing.additionalStorage.currency)}
                  <Typography component="span" variant="h6" color="text.secondary">
                    /{pricing.additionalStorage.interval}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {pricing.additionalStorage.description}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Additional 2GB storage</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Store more media files</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Keep more audit logs</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Automatically charged as needed</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Current Subscription Status */}
      {(subscription?.isSubscribed || isOnFreeTrial()) && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Subscription
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={isOnFreeTrial() ? 'Free Trial' : subscription.endDate ? 'Canceling' : 'Active'}
                    color={isOnFreeTrial() ? 'info' : subscription.endDate ? 'warning' : 'success'}
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Subscription Started
                </Typography>
                <Typography variant="body1">
                  {formatDate(subscription.startDate)}
                </Typography>
              </Box>

              {(subscription.stripe?.currentPeriodEnd || subscription.endDate || isOnFreeTrial()) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isOnFreeTrial() ? 'Last day of access' : subscription.endDate ? 'Last day of access' : 'Next Billing Date'}
                  </Typography>
                  <Typography variant="body1">
                    {isOnFreeTrial()
                      ? formatDate(getTrialEndDate())
                      : formatDate(subscription.stripe?.currentPeriodEnd || subscription.endDate)}
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Storage Used
                </Typography>
                <Typography variant="body1">
                  {subscription.storageUsedGb} GB
                </Typography>
              </Box>

              {parseFloat(subscription.storageUsedGb) > 10 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Additional Storage Charges
                  </Typography>
                  <Typography variant="body1">
                    {Math.ceil((parseFloat(subscription.storageUsedGb) - 10) / 2)} × $AUD 1.00/month
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({(parseFloat(subscription.storageUsedGb) - 10).toFixed(2)} GB over base 10GB)
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Cancel or Reactivate Button - Hidden for trial users */}
          {!isOnFreeTrial() && (
            subscription.endDate ? (
              // Show Reactivate button if subscription is canceled but still active
              <Box sx={{ mt: 3, borderTop: 1, borderColor: 'divider', pt: 3 }}>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={handleReactivate}
                  disabled={reactivating}
                >
                  {reactivating ? <CircularProgress size={24} /> : 'Reactivate Subscription'}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Keep your access active by reactivating your subscription
                </Typography>
              </Box>
            ) : (
              // Show Cancel button if subscription is active
              <Box sx={{ mt: 3, borderTop: 1, borderColor: 'divider', pt: 3 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancel}
                  disabled={canceling}
                >
                  {canceling ? <CircularProgress size={24} /> : 'Cancel Subscription'}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Access will continue until the end of your current billing period
                </Typography>
              </Box>
            )
          )}

          {/* Cancellation Warning Message */}
          {subscription.endDate && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              Your subscription has been canceled. Your last day of access will be {formatDate(subscription.endDate)}. You can reactivate above to keep your access.
            </Alert>
          )}
        </Paper>
      )}

      {/* No Subscription Message */}
      {!subscription?.isSubscribed && !isOnFreeTrial() && !loading && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Subscription
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have an active subscription. Subscribe above to access admin features.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}

export default Subscription;
