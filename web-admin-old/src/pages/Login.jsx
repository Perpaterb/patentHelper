/**
 * Login Page
 *
 * Handles user authentication with Kinde OAuth.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

function Login() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isLoading } = useKindeAuth();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = () => {
    login();
  };

  const handleRegister = () => {
    register();
  };

  // Show loading if checking authentication
  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6">Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Parenting Helper
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Admin Portal
          </Typography>
          <Typography variant="body1" sx={{ mt: 3, mb: 4 }}>
            Sign in to manage your subscriptions, storage, and log exports
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={handleLogin}
              fullWidth
            >
              Sign In
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<PersonAddIcon />}
              onClick={handleRegister}
              fullWidth
            >
              Create Account
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            Powered by Kinde
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
