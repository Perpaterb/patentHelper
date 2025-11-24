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
import Landing from './pages/Landing';
import Subscription from './pages/Subscription';
import Account from './pages/Account';
import Logs from './pages/Logs';
import AuthCallback from './pages/AuthCallback';

// App Pages (ported from mobile)
import Groups from './pages/app/Groups';
import GroupDashboard from './pages/app/GroupDashboard';

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
  const { isAuthenticated, isLoading, getToken, user } = useKindeAuth();
  const [tokenExchanged, setTokenExchanged] = React.useState(false);

  // Handle token exchange when Kinde authentication completes
  React.useEffect(() => {
    async function exchangeToken() {
      // Skip if still loading or not authenticated
      if (isLoading || !isAuthenticated) {
        return;
      }

      // Skip if we already exchanged the token in this session
      if (tokenExchanged) {
        return;
      }

      try {
        // Get the Kinde access token
        const kindeToken = await getToken();

        if (!kindeToken || !user || !user.email) {
          return;
        }

        // Send both token and user info to backend
        const exchangePayload = {
          kindeToken,
          kindeUser: {
            id: user.id,
            email: user.email,
            given_name: user.given_name,
            family_name: user.family_name,
          },
        };

        // Exchange Kinde token for backend JWT
        const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for refresh token
          body: JSON.stringify(exchangePayload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Token exchange failed');
        }

        const data = await response.json();

        // Store the backend JWT token
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          setTokenExchanged(true);
        }
      } catch (error) {
        console.error('Token exchange failed:', error.message);
      }
    }

    exchangeToken();
  }, [isAuthenticated, isLoading, getToken, user, tokenExchanged]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Admin Dashboard Routes */}
          <Route
            path="/dashboard"
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

          {/* App Routes (ported from mobile) */}
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:groupId/*"
            element={
              <ProtectedRoute>
                <GroupDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  const handleRedirectCallback = async (user, appState) => {
    console.log('Kinde redirect callback:', user);

    // Get the Kinde token and exchange it for backend JWT
    try {
      // We need to get the token from Kinde
      // This will be handled in a useEffect in AppRoutes
    } catch (error) {
      console.error('Error in redirect callback:', error);
    }
  };

  return (
    <KindeProvider
      clientId={config.kinde.clientId}
      domain={config.kinde.domain}
      redirectUri={config.kinde.redirectUri}
      logoutUri={config.kinde.logoutRedirectUri}
      onRedirectCallback={handleRedirectCallback}
    >
      <AppRoutes />
    </KindeProvider>
  );
}

export default App;
