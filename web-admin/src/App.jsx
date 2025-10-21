/**
 * Main App Component
 *
 * Sets up routing and application structure with Kinde authentication.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { KindeProvider } from '@kinde-oss/kinde-auth-react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import config from './config/env';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Subscription from './pages/Subscription';
import Account from './pages/Account';
import Logs from './pages/Logs';
import AuthCallback from './pages/AuthCallback';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useKindeAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <Logs />
              </ProtectedRoute>
            }
          />

          {/* Fallback - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <KindeProvider
      clientId={config.kinde.clientId}
      domain={config.kinde.domain}
      redirectUri={config.kinde.redirectUri}
      logoutUri={config.kinde.logoutRedirectUri}
      onRedirectCallback={(user, appState) => {
        console.log('Kinde redirect callback:', user);
      }}
    >
      <AppRoutes />
    </KindeProvider>
  );
}

export default App;
