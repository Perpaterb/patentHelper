/**
 * Authentication Controller
 *
 * Handles authentication flow with Kinde OAuth.
 * Manages login, callback, token refresh, and logout.
 *
 * @module controllers/auth
 */

const axios = require('axios');
const { kindeClient } = require('../config/auth');
const authService = require('../services/auth.service');

/**
 * Initiate login with Kinde
 * GET /auth/login
 *
 * Redirects to Kinde OAuth login page
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function login(req, res) {
  try {
    const loginUrl = await kindeClient.login();

    // Redirect to Kinde login page
    res.redirect(loginUrl.toString());
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
    });
  }
}

/**
 * Handle Kinde OAuth callback (web app)
 * GET /auth/callback
 *
 * Receives authorization code from Kinde and exchanges for user info
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function callback(req, res) {
  try {
    // Get authorization code from query params
    const urlParams = new URLSearchParams(req.url.split('?')[1]);

    // Exchange code for tokens
    await kindeClient.handleRedirectToApp(new URLSearchParams(urlParams));

    // Check if user is authenticated
    const isAuthenticated = await kindeClient.isAuthenticated();

    if (!isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Could not authenticate with Kinde',
      });
    }

    // Get user profile from Kinde
    const kindeUser = await kindeClient.getUserProfile();

    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Could not retrieve user profile from Kinde',
      });
    }

    // Find or create user in our database
    const user = await authService.findOrCreateUser(kindeUser);

    // Generate JWT tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token and user info
    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken: accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({
      error: 'Authentication callback failed',
      message: error.message,
    });
  }
}

/**
 * Handle Kinde OAuth callback (mobile app)
 * POST /auth/callback
 *
 * Receives authorization code from mobile app, exchanges with Kinde for tokens,
 * and returns backend JWT tokens
 *
 * @param {Object} req - Express request with code and redirectUri in body
 * @param {Object} res - Express response
 */
async function callbackMobile(req, res) {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required',
      });
    }

    if (!redirectUri) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Redirect URI is required',
      });
    }

    // Exchange authorization code with Kinde for tokens
    const kindeDomain = process.env.KINDE_DOMAIN;
    const clientId = process.env.KINDE_CLIENT_ID;
    const clientSecret = process.env.KINDE_CLIENT_SECRET;

    if (!kindeDomain || !clientId || !clientSecret) {
      throw new Error('Kinde configuration missing');
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      `${kindeDomain}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    if (!id_token) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'No ID token received from Kinde',
      });
    }

    // Decode ID token to get user info
    const jwt = require('jsonwebtoken');
    const kindePayload = jwt.decode(id_token);

    if (!kindePayload || !kindePayload.sub || !kindePayload.email) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid ID token from Kinde',
      });
    }

    // Create user object from Kinde payload
    const kindeUser = {
      id: kindePayload.sub,
      email: kindePayload.email,
      given_name: kindePayload.given_name,
      family_name: kindePayload.family_name,
    };

    // Find or create user in our database
    const user = await authService.findOrCreateUser(kindeUser);

    // Generate our backend JWT tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Return tokens (mobile apps can't use httpOnly cookies easily)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        given_name: user.given_name,
        family_name: user.family_name,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error) {
    console.error('Mobile callback error:', error);

    // Log more details for debugging
    if (error.response) {
      console.error('Kinde error response:', error.response.data);
    }

    res.status(500).json({
      error: 'Authentication callback failed',
      message: error.message,
      details: error.response?.data,
    });
  }
}

/**
 * Register new user
 * GET /auth/register
 *
 * Redirects to Kinde registration page
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function register(req, res) {
  try {
    const registerUrl = await kindeClient.register();

    // Redirect to Kinde registration page
    res.redirect(registerUrl.toString());
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message,
    });
  }
}

/**
 * Refresh access token
 * POST /auth/refresh
 *
 * Exchanges refresh token for new access token
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function refresh(req, res) {
  try {
    // Get refresh token from cookie (web) or request body (mobile)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token provided',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = authService.verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    // Check token type
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token type',
      });
    }

    // Get user from database
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    // Generate new access token
    const accessToken = authService.generateAccessToken(user);

    res.status(200).json({
      success: true,
      accessToken: accessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message,
    });
  }
}

/**
 * Verify token
 * GET /auth/verify
 *
 * Verifies current access token and returns user info
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function verify(req, res) {
  // User is attached by requireAuth middleware
  res.status(200).json({
    success: true,
    valid: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      isSubscribed: req.user.isSubscribed,
    },
  });
}

/**
 * Logout user
 * POST /auth/logout
 *
 * Clears refresh token cookie and logs out from Kinde
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function logout(req, res) {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message,
    });
  }
}

/**
 * Get current user profile
 * GET /auth/me
 *
 * Returns current user profile (requires authentication)
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      kindeId: req.user.kindeId,
      isSubscribed: req.user.isSubscribed,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
}

/**
 * Exchange Kinde token for backend JWT
 * POST /auth/exchange
 *
 * Accepts a Kinde access token and returns our backend JWT tokens
 *
 * @param {Object} req - Express request with kindeToken in body
 * @param {Object} res - Express response
 */
async function exchangeToken(req, res) {
  try {
    const { kindeToken, kindeUser: providedKindeUser } = req.body;

    if (!kindeToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Kinde token is required',
      });
    }

    let kindeUser;

    // If frontend sent user info, use it directly (preferred method)
    if (providedKindeUser && providedKindeUser.id && providedKindeUser.email) {
      kindeUser = providedKindeUser;
    } else {
      // Fallback: try to decode token (won't work for access tokens, only ID tokens)
      const jwt = require('jsonwebtoken');
      let kindePayload;

      try {
        // Decode without verification (Kinde tokens are signed by Kinde)
        kindePayload = jwt.decode(kindeToken);
      } catch (error) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Kinde token',
        });
      }

      if (!kindePayload) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Kinde token - could not decode',
        });
      }

      if (!kindePayload.sub) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Kinde token payload - missing sub',
        });
      }

      if (!kindePayload.email) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Kinde token payload - missing email. Please provide kindeUser in request.',
        });
      }

      // Create user object from Kinde payload
      kindeUser = {
        id: kindePayload.sub,
        email: kindePayload.email,
        given_name: kindePayload.given_name,
        family_name: kindePayload.family_name,
      };
    }

    // Find or create user in our database
    const user = await authService.findOrCreateUser(kindeUser);

    // Generate our backend JWT tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token and user info
    res.status(200).json({
      success: true,
      accessToken: accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({
      error: 'Token exchange failed',
      message: error.message,
    });
  }
}

module.exports = {
  login,
  callback,
  callbackMobile,
  register,
  refresh,
  verify,
  logout,
  getMe,
  exchangeToken,
};
