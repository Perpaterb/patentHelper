/**
 * Account Page
 *
 * Manage account settings and view storage details.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import StorageIcon from '@mui/icons-material/Storage';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import api from '../services/api';

function Account() {
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
      if (err.response?.status !== 404) {
        setError('Failed to load account information.');
      }
    } finally {
      setLoading(false);
    }
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
        <Typography sx={{ mt: 2 }}>Loading account information...</Typography>
      </Container>
    );
  }

  const additionalCharges = calculateAdditionalCharges();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Account
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account settings and view storage details
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Account Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Account Information</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                </Box>
                <Typography variant="body1">{user?.email || 'Not available'}</Typography>
              </Box>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Authentication is managed by Kinde with passwordless login. To update your email or
                  security settings, please contact support.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <StorageIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Storage Details</Typography>
              </Box>

              {subscription ? (
                <>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Storage Used
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {subscription.storageUsedGb} GB
                    </Typography>
                  </Box>

                  {additionalCharges.overageGb > 0 ? (
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Additional Storage Charges</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {additionalCharges.overageGb.toFixed(2)} GB over base 10GB
                      </Typography>
                      <Typography variant="body2">
                        {additionalCharges.units} × $AUD 1.00 = $AUD {additionalCharges.cost.toFixed(2)}
                        /month
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="body2">
                        You're using {subscription.storageUsedGb} GB of your base 10GB storage allocation.
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Storage includes audit logs, images, and videos from all groups where you are an
                      admin. Additional storage is automatically charged at $AUD 1.00 per 2GB per month.
                    </Typography>
                  </Box>
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

      {/* Account Actions */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Need Help?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For account support, subscription changes, or technical issues, please contact our support
          team.
        </Typography>
        <Button variant="outlined" color="primary">
          Contact Support
        </Button>
      </Paper>
    </Container>
  );
}

export default Account;
