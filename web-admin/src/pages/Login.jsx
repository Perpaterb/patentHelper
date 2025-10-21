/**
 * Login Page
 *
 * Handles user authentication with Kinde OAuth.
 */

import React from 'react';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

function Login() {
  const handleLogin = () => {
    // This will be implemented with Kinde integration
    console.log('Login clicked');
  };

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
          <Button
            variant="contained"
            size="large"
            startIcon={<LoginIcon />}
            onClick={handleLogin}
            fullWidth
          >
            Sign In with Kinde
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
