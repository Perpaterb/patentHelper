/**
 * Parenting Helper API Server (Local Development)
 *
 * This Express.js server provides the backend API for local development.
 * In Phase 6, controllers/services will be converted to AWS Lambda functions.
 *
 * Architecture:
 * - Express routes → Controllers → Services → Database (Prisma)
 * - Services are written to be Lambda-compatible (pure functions)
 * - Controllers handle Express request/response (will become Lambda handlers)
 */

require('dotenv').config({ path: '../.env.local' });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

// Import configuration
const { validateKindeConfig } = require('./config/auth');

// Import routes
const healthRoutes = require('./routes/health.routes');
const filesRoutes = require('./routes/files.routes');
const authRoutes = require('./routes/auth.routes');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/files', filesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Parenting Helper API Server');
  console.log('================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Services:');
  console.log(`- PostgreSQL: localhost:5432`);
  console.log(`- MailHog UI: http://localhost:8025`);
  console.log('');

  // Validate Kinde configuration
  validateKindeConfig();

  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app; // For testing
