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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

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
   * Format price for display
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code
   * @returns {string} Formatted price
   */
  function formatPrice(amount, currency) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
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
                position: 'relative',
                border: '2px solid',
                borderColor: 'primary.main',
              }}
            >
              <Chip
                label="Required for Admin"
                color="primary"
                size="small"
                sx={{ position: 'absolute', top: 16, right: 16 }}
              />
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">20-day free trial</Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => handleSubscribe(pricing.adminSubscription.priceId)}
                  disabled={subscribing}
                >
                  {subscribing ? <CircularProgress size={24} /> : 'Subscribe Now'}
                </Button>
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
                </Box>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={() => handleSubscribe(pricing.additionalStorage.priceId)}
                  disabled={subscribing}
                >
                  {subscribing ? <CircularProgress size={24} /> : 'Add Storage'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Current Subscription Status (Placeholder for Phase 2 Week 5) */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Current Subscription
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your subscription status will appear here once you subscribe.
        </Typography>
      </Paper>
    </Container>
  );
}

export default Subscription;
