/**
 * Recording Queue Service
 *
 * Manages a queue system for recorded calls to prevent server overload.
 * Users who want to make recorded calls must wait in queue if the server
 * is at capacity.
 *
 * Features:
 * - Tracks active recordings count
 * - Queues users when at capacity
 * - Notifies support via email when users enter queue
 * - Auto-removes users after timeout
 * - Provides queue position to users
 */

const config = require('../config/recordingQueue.config');
const { emailService } = require('./email');

/**
 * Queue entry structure
 * @typedef {Object} QueueEntry
 * @property {string} odqueueId - Unique queue ID
 * @property {string} oduserId - User ID
 * @property {string} odgroupId - Group ID
 * @property {string} odcallType - 'video' or 'phone'
 * @property {string[]} participantIds - Intended call participants
 * @property {string} userDisplayName - Display name for notifications
 * @property {number} joinedAt - Timestamp when joined queue
 * @property {number} position - Position in queue (1-indexed)
 */

// In-memory queue (ordered array)
const recordingQueue = [];

// Track active recording count
let activeRecordingCount = 0;

// Last alert email timestamp (to prevent flooding)
let lastAlertEmailTime = 0;

// Cleanup interval handle
let cleanupIntervalHandle = null;

/**
 * Initialize the queue service
 * Sets up periodic cleanup of stale queue entries
 */
function initialize() {
  if (cleanupIntervalHandle) {
    clearInterval(cleanupIntervalHandle);
  }

  cleanupIntervalHandle = setInterval(() => {
    cleanupStaleEntries();
  }, config.QUEUE_CLEANUP_INTERVAL_MS);

  console.log(`[RecordingQueue] Initialized. Max concurrent recordings: ${config.MAX_CONCURRENT_RECORDINGS}`);
}

/**
 * Clean up entries that have been in queue too long
 */
function cleanupStaleEntries() {
  const now = Date.now();
  const cutoff = now - config.QUEUE_TIMEOUT_MS;

  const staleEntries = recordingQueue.filter(entry => entry.joinedAt < cutoff);

  if (staleEntries.length > 0) {
    console.log(`[RecordingQueue] Removing ${staleEntries.length} stale queue entries`);

    for (const entry of staleEntries) {
      const index = recordingQueue.findIndex(e => e.queueId === entry.queueId);
      if (index !== -1) {
        recordingQueue.splice(index, 1);
      }
    }

    // Update positions for remaining entries
    updatePositions();
  }
}

/**
 * Update position numbers for all queue entries
 */
function updatePositions() {
  recordingQueue.forEach((entry, index) => {
    entry.position = index + 1;
  });
}

/**
 * Get current queue status
 * @returns {Object} Queue status information
 */
function getQueueStatus() {
  return {
    activeRecordings: activeRecordingCount,
    maxConcurrent: config.MAX_CONCURRENT_RECORDINGS,
    queueLength: recordingQueue.length,
    availableSlots: Math.max(0, config.MAX_CONCURRENT_RECORDINGS - activeRecordingCount),
    isAtCapacity: activeRecordingCount >= config.MAX_CONCURRENT_RECORDINGS,
  };
}

/**
 * Check if a user needs to queue for a recorded call
 * @param {string} callType - 'video' or 'phone'
 * @returns {boolean} True if user needs to queue
 */
function needsToQueue(callType) {
  // Only recorded calls need to queue
  return activeRecordingCount >= config.MAX_CONCURRENT_RECORDINGS;
}

/**
 * Add a user to the recording queue
 * @param {Object} options - Queue entry options
 * @param {string} options.userId - User ID
 * @param {string} options.groupId - Group ID
 * @param {string} options.callType - 'video' or 'phone'
 * @param {string[]} options.participantIds - Intended call participants
 * @param {string} options.userDisplayName - Display name for notifications
 * @param {string} options.userEmail - User's email address
 * @returns {Object} Queue entry with position
 */
async function joinQueue({ userId, groupId, callType, participantIds, userDisplayName, userEmail }) {
  // Check if user is already in queue
  const existingEntry = recordingQueue.find(
    e => e.userId === userId && e.callType === callType
  );

  if (existingEntry) {
    return {
      success: true,
      queueId: existingEntry.queueId,
      position: existingEntry.position,
      totalInQueue: recordingQueue.length,
      message: 'Already in queue',
    };
  }

  const queueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const entry = {
    queueId,
    userId,
    groupId,
    callType,
    participantIds,
    userDisplayName,
    userEmail,
    joinedAt: Date.now(),
    position: recordingQueue.length + 1,
  };

  recordingQueue.push(entry);

  console.log(`[RecordingQueue] User ${userDisplayName} joined queue. Position: ${entry.position}. Queue length: ${recordingQueue.length}`);

  // Send alert email (throttled)
  await sendQueueAlertEmail(entry);

  return {
    success: true,
    queueId: entry.queueId,
    position: entry.position,
    totalInQueue: recordingQueue.length,
    estimatedWaitMinutes: estimateWaitTime(entry.position),
  };
}

/**
 * Remove a user from the queue
 * @param {string} queueId - Queue entry ID
 * @returns {Object} Result
 */
function leaveQueue(queueId) {
  const index = recordingQueue.findIndex(e => e.queueId === queueId);

  if (index === -1) {
    return { success: false, message: 'Queue entry not found' };
  }

  const entry = recordingQueue[index];
  recordingQueue.splice(index, 1);

  // Update positions for remaining entries
  updatePositions();

  console.log(`[RecordingQueue] User ${entry.userDisplayName} left queue. Remaining: ${recordingQueue.length}`);

  return { success: true, message: 'Removed from queue' };
}

/**
 * Leave queue by user ID (for when user navigates away)
 * @param {string} userId - User ID
 * @param {string} callType - 'video' or 'phone'
 * @returns {Object} Result
 */
function leaveQueueByUser(userId, callType) {
  const entry = recordingQueue.find(
    e => e.userId === userId && e.callType === callType
  );

  if (!entry) {
    return { success: false, message: 'Not in queue' };
  }

  return leaveQueue(entry.queueId);
}

/**
 * Get a user's queue position
 * @param {string} queueId - Queue entry ID
 * @returns {Object|null} Queue status or null if not found
 */
function getQueuePosition(queueId) {
  const entry = recordingQueue.find(e => e.queueId === queueId);

  if (!entry) {
    return null;
  }

  return {
    queueId: entry.queueId,
    position: entry.position,
    totalInQueue: recordingQueue.length,
    joinedAt: entry.joinedAt,
    estimatedWaitMinutes: estimateWaitTime(entry.position),
    activeRecordings: activeRecordingCount,
    maxConcurrent: config.MAX_CONCURRENT_RECORDINGS,
  };
}

/**
 * Get queue entry by user
 * @param {string} userId - User ID
 * @param {string} callType - 'video' or 'phone'
 * @returns {Object|null} Queue entry or null
 */
function getQueueEntryByUser(userId, callType) {
  return recordingQueue.find(
    e => e.userId === userId && e.callType === callType
  ) || null;
}

/**
 * Check if it's the user's turn (first in queue and slot available)
 * @param {string} queueId - Queue entry ID
 * @returns {Object} Turn status
 */
function checkTurn(queueId) {
  const entry = recordingQueue.find(e => e.queueId === queueId);

  if (!entry) {
    return { isYourTurn: false, error: 'Not in queue' };
  }

  const isFirstInQueue = entry.position === 1;
  const hasAvailableSlot = activeRecordingCount < config.MAX_CONCURRENT_RECORDINGS;

  return {
    isYourTurn: isFirstInQueue && hasAvailableSlot,
    position: entry.position,
    totalInQueue: recordingQueue.length,
    activeRecordings: activeRecordingCount,
    maxConcurrent: config.MAX_CONCURRENT_RECORDINGS,
  };
}

/**
 * Called when a recorded call starts - increment active count
 * Also removes the user from queue if they were in it
 * @param {string} userId - User ID (optional, to remove from queue)
 * @param {string} callType - 'video' or 'phone'
 */
function recordingStarted(userId, callType) {
  activeRecordingCount++;
  console.log(`[RecordingQueue] Recording started. Active: ${activeRecordingCount}/${config.MAX_CONCURRENT_RECORDINGS}`);

  // Remove user from queue if they were in it
  if (userId) {
    leaveQueueByUser(userId, callType);
  }
}

/**
 * Called when a recorded call ends - decrement active count
 */
function recordingEnded() {
  activeRecordingCount = Math.max(0, activeRecordingCount - 1);
  console.log(`[RecordingQueue] Recording ended. Active: ${activeRecordingCount}/${config.MAX_CONCURRENT_RECORDINGS}`);
}

/**
 * Sync active recording count with actual puppeteer sessions
 * Call this on server startup and periodically
 * @param {number} actualCount - Actual number of active recordings
 */
function syncActiveCount(actualCount) {
  const previousCount = activeRecordingCount;
  activeRecordingCount = actualCount;

  if (previousCount !== actualCount) {
    console.log(`[RecordingQueue] Synced active count: ${previousCount} -> ${actualCount}`);
  }
}

/**
 * Estimate wait time based on queue position
 * @param {number} position - Position in queue
 * @returns {number} Estimated minutes to wait
 */
function estimateWaitTime(position) {
  // Rough estimate: assume average call duration of 10 minutes
  // and that slots become available as calls end
  const averageCallMinutes = 10;
  const slotsAvailable = config.MAX_CONCURRENT_RECORDINGS;

  // Simplified estimate: (position / slots) * average call duration
  return Math.ceil((position / slotsAvailable) * averageCallMinutes);
}

/**
 * Send alert email when someone enters the queue
 * @param {Object} entry - Queue entry
 */
async function sendQueueAlertEmail(entry) {
  const now = Date.now();

  // Check cooldown to prevent email flooding
  if (now - lastAlertEmailTime < config.QUEUE_ALERT_COOLDOWN_MS) {
    console.log('[RecordingQueue] Skipping alert email (cooldown active)');
    return;
  }

  lastAlertEmailTime = now;

  const status = getQueueStatus();

  try {
    await emailService.sendEmail({
      to: config.QUEUE_ALERT_EMAIL,
      subject: `[Family Helper] Recording Queue Alert - ${recordingQueue.length} user(s) waiting`,
      text: `
Recording Queue Alert
=====================

A user has entered the recording queue.

User: ${entry.userDisplayName}
Email: ${entry.userEmail || 'N/A'}
Call Type: ${entry.callType}
Position: ${entry.position}

Current Server Status:
- Active recordings: ${status.activeRecordings}/${status.maxConcurrent}
- Users in queue: ${status.queueLength}

This alert is logged and support has been informed.

---
To increase capacity:
1. Upgrade to larger Lightsail instance
2. Or increase MAX_CONCURRENT_RECORDINGS in config/recordingQueue.config.js
   (only if current RAM usage is below 60% during peak)

Current setting: ${config.MAX_CONCURRENT_RECORDINGS} concurrent recordings
      `.trim(),
      html: `
<h2>Recording Queue Alert</h2>
<p>A user has entered the recording queue.</p>

<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>User</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${entry.userDisplayName}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${entry.userEmail || 'N/A'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Call Type</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${entry.callType}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Position</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">#${entry.position}</td>
  </tr>
</table>

<h3>Current Server Status</h3>
<ul>
  <li>Active recordings: <strong>${status.activeRecordings}/${status.maxConcurrent}</strong></li>
  <li>Users in queue: <strong>${status.queueLength}</strong></li>
</ul>

<p style="color: #666; font-size: 12px;">
  This alert is logged and support has been informed.
</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">

<p style="color: #999; font-size: 11px;">
  To increase capacity: Upgrade to larger Lightsail instance or increase MAX_CONCURRENT_RECORDINGS in config.<br>
  Current setting: ${config.MAX_CONCURRENT_RECORDINGS} concurrent recordings
</p>
      `.trim(),
    });

    console.log(`[RecordingQueue] Alert email sent to ${config.QUEUE_ALERT_EMAIL}`);
  } catch (error) {
    console.error('[RecordingQueue] Failed to send alert email:', error.message);
  }
}

/**
 * Get full queue info (for admin/debugging)
 * @returns {Object} Full queue state
 */
function getFullQueueInfo() {
  return {
    config: {
      maxConcurrent: config.MAX_CONCURRENT_RECORDINGS,
      alertEmail: config.QUEUE_ALERT_EMAIL,
      timeoutMs: config.QUEUE_TIMEOUT_MS,
    },
    status: getQueueStatus(),
    queue: recordingQueue.map(e => ({
      queueId: e.queueId,
      position: e.position,
      callType: e.callType,
      userDisplayName: e.userDisplayName,
      joinedAt: e.joinedAt,
      waitingMs: Date.now() - e.joinedAt,
    })),
  };
}

// Initialize on module load
initialize();

module.exports = {
  getQueueStatus,
  needsToQueue,
  joinQueue,
  leaveQueue,
  leaveQueueByUser,
  getQueuePosition,
  getQueueEntryByUser,
  checkTurn,
  recordingStarted,
  recordingEnded,
  syncActiveCount,
  getFullQueueInfo,
  initialize,
};
