/**
 * Health Check Routes
 *
 * Simple health check endpoints to verify server is running.
 * Used by monitoring tools and load balancers.
 */

const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'parenting-helper-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /health/ready
 * Readiness check - returns 200 if server can handle requests
 * In future, this will check database connectivity, etc.
 */
router.get('/ready', async (req, res) => {
  try {
    // TODO: Add database connectivity check
    // TODO: Add external service checks (Kinde, etc.)

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'not_implemented', // Will add with Prisma
        storage: 'ok',
        email: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
