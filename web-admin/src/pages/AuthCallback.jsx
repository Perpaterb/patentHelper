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
  const { getToken, getUser, isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    async function handleCallback() {
      if (isLoading) {
        return;
      }

      if (isAuthenticated) {
        try {
          // Get the access token and user info from Kinde
          const kindeToken = await getToken();
          const kindeUser = await getUser();

          if (!kindeToken) {
            throw new Error('No token received from Kinde');
          }

          if (!kindeUser || !kindeUser.id || !kindeUser.email) {
            throw new Error('No user information received from Kinde');
          }

          console.log('Kinde authentication successful, exchanging token...');

          // Exchange Kinde token for backend JWT
          const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/exchange`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({
              kindeToken,
              kindeUser: {
                id: kindeUser.id,
                email: kindeUser.email,
                given_name: kindeUser.given_name,
                family_name: kindeUser.family_name,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Token exchange failed');
          }

          const data = await response.json();

          // Store the backend JWT token
          if (data.accessToken) {
            authService.storeAccessToken(data.accessToken);
            console.log('Authentication successful, backend token stored');
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
  }, [isAuthenticated, isLoading, getToken, getUser, navigate]);

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
