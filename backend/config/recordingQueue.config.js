/**
 * Recording Queue Configuration
 *
 * ============================================================
 * IMPORTANT: EASILY CONFIGURABLE RECORDING LIMITS
 * ============================================================
 *
 * This file controls how many simultaneous recorded calls the server can handle.
 *
 * CURRENT SERVER: 2GB Lightsail instance
 * - Each recorded call uses ~150-280MB RAM + 30-50% CPU (Chromium browser)
 * - Safe capacity: 4-6 simultaneous recordings
 * - Current limit set to: 5 (conservative to ensure stability)
 *
 * TO CHANGE THE LIMIT:
 * 1. Edit MAX_CONCURRENT_RECORDINGS below
 * 2. Restart the backend server
 *
 * WHEN TO INCREASE:
 * - Upgraded to larger Lightsail instance (4GB+ RAM)
 * - Moved recording to dedicated server
 * - Using cloud-based recording service
 *
 * MONITORING:
 * - Check server RAM usage during peak times
 * - If RAM > 80%, reduce the limit
 * - If RAM < 50% during peak, can increase limit
 *
 * ============================================================
 */

module.exports = {
  /**
   * Maximum number of simultaneous recorded calls allowed
   *
   * This is the PRIMARY setting to adjust as infrastructure scales.
   *
   * Recommended values by server size:
   * - 2GB RAM (current): 5
   * - 4GB RAM: 10-12
   * - 8GB RAM: 20-25
   * - Dedicated recording server: 50+
   */
  MAX_CONCURRENT_RECORDINGS: parseInt(process.env.MAX_CONCURRENT_RECORDINGS, 10) || 5,

  /**
   * Email address to notify when users enter the queue
   * Support team is alerted so they can monitor capacity
   */
  QUEUE_ALERT_EMAIL: process.env.QUEUE_ALERT_EMAIL || 'zcarss@gmail.com',

  /**
   * How often to send queue alert emails (in milliseconds)
   * Prevents email flooding - only sends one alert per this interval
   * Default: 5 minutes (300000ms)
   */
  QUEUE_ALERT_COOLDOWN_MS: parseInt(process.env.QUEUE_ALERT_COOLDOWN_MS, 10) || 300000,

  /**
   * Maximum time a user can stay in queue (in milliseconds)
   * After this time, they're automatically removed
   * Default: 10 minutes (600000ms)
   */
  QUEUE_TIMEOUT_MS: parseInt(process.env.QUEUE_TIMEOUT_MS, 10) || 600000,

  /**
   * How often to check for queue timeouts (in milliseconds)
   * Default: 30 seconds (30000ms)
   */
  QUEUE_CLEANUP_INTERVAL_MS: parseInt(process.env.QUEUE_CLEANUP_INTERVAL_MS, 10) || 30000,
};
