/**
 * Recording Queue Controller
 *
 * Handles queue operations for recorded calls.
 * Users must check/join queue before initiating recorded calls
 * when the server is at capacity.
 */

const { prisma } = require('../config/database');
const recordingQueue = require('../services/recordingQueue.service');

/**
 * Get recording queue status
 * GET /recording-queue/status
 *
 * Returns current queue status and whether user needs to queue
 */
async function getStatus(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const status = recordingQueue.getQueueStatus();

    // Check if user is already in queue
    const videoQueueEntry = recordingQueue.getQueueEntryByUser(userId, 'video');
    const phoneQueueEntry = recordingQueue.getQueueEntryByUser(userId, 'phone');

    return res.json({
      success: true,
      ...status,
      userInVideoQueue: videoQueueEntry ? {
        queueId: videoQueueEntry.queueId,
        position: videoQueueEntry.position,
        joinedAt: videoQueueEntry.joinedAt,
      } : null,
      userInPhoneQueue: phoneQueueEntry ? {
        queueId: phoneQueueEntry.queueId,
        position: phoneQueueEntry.position,
        joinedAt: phoneQueueEntry.joinedAt,
      } : null,
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get queue status',
      error: error.message,
    });
  }
}

/**
 * Join the recording queue
 * POST /recording-queue/join
 *
 * Body: { groupId, callType, participantIds }
 */
async function joinQueue(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callType, participantIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!groupId || !callType) {
      return res.status(400).json({
        success: false,
        message: 'groupId and callType are required',
      });
    }

    if (!['video', 'phone'].includes(callType)) {
      return res.status(400).json({
        success: false,
        message: 'callType must be "video" or "phone"',
      });
    }

    // Get user info for notifications
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { displayName: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if queue is needed
    const status = recordingQueue.getQueueStatus();
    if (!status.isAtCapacity) {
      // No queue needed, can proceed directly
      return res.json({
        success: true,
        needsQueue: false,
        message: 'Recording capacity available, no queue needed',
        ...status,
      });
    }

    // Join the queue
    const result = await recordingQueue.joinQueue({
      userId,
      groupId,
      callType,
      participantIds: participantIds || [],
      userDisplayName: user.displayName,
      userEmail: user.email,
    });

    return res.json({
      success: true,
      needsQueue: true,
      ...result,
      message: `Added to queue at position ${result.position}`,
    });
  } catch (error) {
    console.error('Join queue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to join queue',
      error: error.message,
    });
  }
}

/**
 * Leave the recording queue
 * POST /recording-queue/leave
 *
 * Body: { queueId } or { callType }
 */
async function leaveQueue(req, res) {
  try {
    const userId = req.user?.userId;
    const { queueId, callType } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    let result;

    if (queueId) {
      result = recordingQueue.leaveQueue(queueId);
    } else if (callType) {
      result = recordingQueue.leaveQueueByUser(userId, callType);
    } else {
      return res.status(400).json({
        success: false,
        message: 'queueId or callType is required',
      });
    }

    return res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('Leave queue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave queue',
      error: error.message,
    });
  }
}

/**
 * Get queue position
 * GET /recording-queue/position/:queueId
 */
async function getPosition(req, res) {
  try {
    const userId = req.user?.userId;
    const { queueId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const position = recordingQueue.getQueuePosition(queueId);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found',
      });
    }

    return res.json({
      success: true,
      ...position,
    });
  } catch (error) {
    console.error('Get position error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get queue position',
      error: error.message,
    });
  }
}

/**
 * Check if it's user's turn
 * GET /recording-queue/check-turn/:queueId
 */
async function checkTurn(req, res) {
  try {
    const userId = req.user?.userId;
    const { queueId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const turnStatus = recordingQueue.checkTurn(queueId);

    return res.json({
      success: true,
      ...turnStatus,
    });
  } catch (error) {
    console.error('Check turn error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check turn',
      error: error.message,
    });
  }
}

/**
 * Get full queue info (admin only)
 * GET /recording-queue/admin/info
 */
async function getAdminInfo(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check if user is an admin in any group (simple check)
    const adminMembership = await prisma.groupMember.findFirst({
      where: {
        userId,
        role: 'admin',
        isRegistered: true,
      },
    });

    if (!adminMembership) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const info = recordingQueue.getFullQueueInfo();

    return res.json({
      success: true,
      ...info,
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get admin info',
      error: error.message,
    });
  }
}

module.exports = {
  getStatus,
  joinQueue,
  leaveQueue,
  getPosition,
  checkTurn,
  getAdminInfo,
};
