/**
 * Auth Callback Page
 *
 * Handles the OAuth callback from Kinde after successful authentication.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import authService from '../services/auth.service';

function AuthCallback() {
  const navigate = useNavigate();
  const { getToken, isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    async function handleCallback() {
      if (isLoading) {
        return;
      }

      if (isAuthenticated) {
        try {
          // Get the access token from Kinde
          const kindeToken = await getToken();

          // Store the token (we'll use Kinde's token for now)
          // In production, you might want to exchange this for a backend token
          if (kindeToken) {
            authService.storeAccessToken(kindeToken);
            console.log('Authentication successful, token stored');
          }

          // Redirect to dashboard
          navigate('/', { replace: true });
        } catch (error) {
          console.error('Error handling auth callback:', error);
          navigate('/login', { replace: true });
        }
      } else {
        // Not authenticated, redirect to login
        navigate('/login', { replace: true });
      }
    }

    handleCallback();
  }, [isAuthenticated, isLoading, getToken, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          Completing sign in...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we finish setting up your account
        </Typography>
      </Box>
    </Container>
  );
}

export default AuthCallback;
