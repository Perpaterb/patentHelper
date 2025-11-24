/**
 * Landing Page
 *
 * Public landing page showcasing app features and pricing.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  AppBar,
  Toolbar,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CelebrationIcon from '@mui/icons-material/Celebration';
import LockIcon from '@mui/icons-material/Lock';
import api from '../services/api';

function Landing() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isLoading } = useKindeAuth();
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    fetchPricing();
  }, []);

  async function fetchPricing() {
    try {
      const response = await api.get('/subscriptions/pricing');
      setPricing(response.data.pricing);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    } finally {
      setPricingLoading(false);
    }
  }

  function formatPrice(amount, currency) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'AUD',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  }

  const features = [
    {
      icon: <LockIcon sx={{ fontSize: 40 }} />,
      title: 'Secure & Encrypted Messaging',
      description: 'End-to-end encrypted group messaging with media sharing, mentions, and read receipts.',
    },
    {
      icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />,
      title: 'Shared Calendar',
      description: 'Coordinate schedules with events, child responsibilities, and handoff tracking.',
    },
    {
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 40 }} />,
      title: 'Finance Tracking',
      description: 'Track shared expenses, balances, and financial communications.',
    },
    {
      icon: <CardGiftcardIcon sx={{ fontSize: 40 }} />,
      title: 'Gift Registry',
      description: 'Manage wish lists and gift registries for birthdays and holidays.',
    },
    {
      icon: <CelebrationIcon sx={{ fontSize: 40 }} />,
      title: 'Secret Santa',
      description: 'Organize gift exchanges with automatic matching and anonymous wishlists.',
    },
    {
      icon: <ArticleIcon sx={{ fontSize: 40 }} />,
      title: 'Wiki Documents',
      description: 'Create and share important documents with rich text editing.',
    },
    {
      icon: <FolderIcon sx={{ fontSize: 40 }} />,
      title: 'Secure Storage',
      description: 'Upload and manage important documents securely.',
    },
    {
      icon: <HistoryIcon sx={{ fontSize: 40 }} />,
      title: 'Audit Logs',
      description: 'Complete history of all actions for accountability, legal compliance, and court order adherence.',
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Navigation */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'primary.main' }}>
            Family Helper
          </Typography>
          <Button color="primary" onClick={() => login()}>
            Login
          </Button>
          <Button variant="contained" color="primary" onClick={() => register()} sx={{ ml: 1 }}>
            Sign Up
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          py: 10,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Co-Parenting & Family Management Made Easy
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            All-in-one family and co-parenting app. Coordinate schedules, share expenses,
            and communicate securely with only the people you need and want to.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => register()}
            sx={{
              backgroundColor: 'white',
              color: 'primary.main',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            Start Free 20-Day Trial
          </Button>
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
            No credit card required
          </Typography>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" textAlign="center" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
          Everything You Need
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Pricing Section */}
      <Box sx={{ backgroundColor: 'white', py: 8 }}>
        <Container maxWidth="md">
          <Typography variant="h4" textAlign="center" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
            Simple, Transparent Pricing
          </Typography>

          {pricingLoading ? (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : pricing ? (
            <Grid container spacing={3} justifyContent="center">
              {/* Free Members Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 2,
                    height: '100%',
                  }}
                >
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Group Members
                  </Typography>
                  <Typography variant="h3" color="success.main" sx={{ mb: 1 }}>
                    Free
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    forever
                  </Typography>

                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {[
                      'Parents',
                      'Children',
                      'Caregivers',
                      'Supervisors',
                    ].map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2">{item}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    All features included when invited to a group
                  </Typography>
                </Paper>
              </Grid>

              {/* Admin Subscription Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    height: '100%',
                  }}
                >
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {pricing.adminSubscription.name}
                  </Typography>
                  <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                    {formatPrice(pricing.adminSubscription.amount, pricing.adminSubscription.currency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    per {pricing.adminSubscription.interval}
                  </Typography>

                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {[
                      'Full admin access',
                      '10GB storage included',
                      'Unlimited groups',
                      'Audit log exports',
                      'Secure messaging',
                      'Shared calendar',
                    ].map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2">{item}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => register()}
                    sx={{ mb: 2 }}
                  >
                    Start Free Trial
                  </Button>

                  <Typography variant="caption" color="text.secondary">
                    Minimum 1 admin per group
                  </Typography>
                </Paper>
              </Grid>

              {/* Additional Storage Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 2,
                    height: '100%',
                  }}
                >
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {pricing.additionalStorage.name}
                  </Typography>
                  <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                    {formatPrice(pricing.additionalStorage.amount, pricing.additionalStorage.currency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    per 2GB / {pricing.additionalStorage.interval}
                  </Typography>

                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {[
                      'Automatic billing as needed',
                      'Store more media files',
                      'Keep more documents',
                      'No storage limits',
                    ].map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                        <Typography variant="body2">{item}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Only charged when you exceed 10GB
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Only for admins
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <Typography textAlign="center" color="text.secondary">
              Unable to load pricing information.
            </Typography>
          )}
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Join families who are already using Family Helper to stay organized and connected.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => register()}
            sx={{ px: 4, py: 1.5 }}
          >
            Create Your Account
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ backgroundColor: '#333', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" textAlign="center">
            &copy; {new Date().getFullYear()} Family Helper. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default Landing;
