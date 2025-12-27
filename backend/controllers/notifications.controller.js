/**
 * Notifications Controller
 *
 * Handles device token registration and notification management.
 */

const { prisma } = require('../config/database');
const pushNotificationService = require('../services/pushNotification.service');

/**
 * Register a device token for push notifications
 * POST /notifications/register-token
 */
async function registerToken(req, res) {
  try {
    const userId = req.user.userId;
    const { expoPushToken, platform, deviceName } = req.body;

    // Validate required fields
    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'expoPushToken is required',
      });
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'platform must be ios, android, or web',
      });
    }

    const token = await pushNotificationService.registerToken(
      userId,
      expoPushToken,
      platform,
      deviceName
    );

    res.json({
      success: true,
      message: 'Device token registered successfully',
      token: {
        tokenId: token.tokenId,
        platform: token.platform,
        deviceName: token.deviceName,
      },
    });
  } catch (error) {
    console.error('[Notifications] Register token error:', error);

    if (error.message === 'Invalid Expo push token format') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register device token',
    });
  }
}

/**
 * Unregister a device token
 * POST /notifications/unregister-token
 */
async function unregisterToken(req, res) {
  try {
    const userId = req.user.userId;
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'expoPushToken is required',
      });
    }

    const deleted = await pushNotificationService.unregisterToken(userId, expoPushToken);

    res.json({
      success: true,
      message: deleted ? 'Device token unregistered' : 'Token was already unregistered',
    });
  } catch (error) {
    console.error('[Notifications] Unregister token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister device token',
    });
  }
}

/**
 * Get user's registered devices
 * GET /notifications/devices
 */
async function getDevices(req, res) {
  try {
    const userId = req.user.userId;

    const tokens = await pushNotificationService.getUserTokens(userId);

    res.json({
      success: true,
      devices: tokens.map(t => ({
        tokenId: t.tokenId,
        platform: t.platform,
        deviceName: t.deviceName,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Notifications] Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get devices',
    });
  }
}

/**
 * Update notification preferences for a group membership
 * PUT /notifications/preferences/:groupId
 */
async function updatePreferences(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;
    const {
      notifyRequests,
      notifyAllMessages,
      notifyMentionMessages,
      notifyAllCalendar,
      notifyMentionCalendar,
      notifyAllFinance,
      notifyMentionFinance,
    } = req.body;

    // Find user's membership in this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        isHidden: false,
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (typeof notifyRequests === 'boolean') updateData.notifyRequests = notifyRequests;
    if (typeof notifyAllMessages === 'boolean') updateData.notifyAllMessages = notifyAllMessages;
    if (typeof notifyMentionMessages === 'boolean') updateData.notifyMentionMessages = notifyMentionMessages;
    if (typeof notifyAllCalendar === 'boolean') updateData.notifyAllCalendar = notifyAllCalendar;
    if (typeof notifyMentionCalendar === 'boolean') updateData.notifyMentionCalendar = notifyMentionCalendar;
    if (typeof notifyAllFinance === 'boolean') updateData.notifyAllFinance = notifyAllFinance;
    if (typeof notifyMentionFinance === 'boolean') updateData.notifyMentionFinance = notifyMentionFinance;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid preferences provided',
      });
    }

    const updated = await prisma.groupMember.update({
      where: {
        groupMemberId: membership.groupMemberId,
      },
      data: updateData,
      select: {
        groupMemberId: true,
        notifyRequests: true,
        notifyAllMessages: true,
        notifyMentionMessages: true,
        notifyAllCalendar: true,
        notifyMentionCalendar: true,
        notifyAllFinance: true,
        notifyMentionFinance: true,
      },
    });

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: updated,
    });
  } catch (error) {
    console.error('[Notifications] Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
    });
  }
}

/**
 * Get notification preferences for a group membership
 * GET /notifications/preferences/:groupId
 */
async function getPreferences(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        isHidden: false,
      },
      select: {
        groupMemberId: true,
        notifyRequests: true,
        notifyAllMessages: true,
        notifyMentionMessages: true,
        notifyAllCalendar: true,
        notifyMentionCalendar: true,
        notifyAllFinance: true,
        notifyMentionFinance: true,
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    res.json({
      success: true,
      preferences: membership,
    });
  } catch (error) {
    console.error('[Notifications] Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
    });
  }
}

/**
 * Get total badge count across all groups for app icon badge
 * GET /notifications/badge-count
 *
 * Returns the sum of all notification counts across all non-muted groups.
 * This is used to set the app icon badge number.
 */
async function getTotalBadgeCount(req, res) {
  try {
    const userId = req.user.userId;

    // Get all groups user is a member of (non-hidden, registered)
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: userId,
        isHidden: false,
        isRegistered: true,
      },
      select: {
        groupMemberId: true,
        groupId: true,
        role: true,
        isMuted: true,
        notifyAllCalendar: true,
        lastCalendarViewedAt: true,
        group: {
          select: {
            groupId: true,
            createdByUserId: true,
          },
        },
      },
    });

    // Get user subscription status for trial check
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { isSubscribed: true, createdAt: true },
    });
    const daysSinceCreation = user ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
    const isOnTrial = user && !user.isSubscribed && daysSinceCreation <= 20;

    let totalBadgeCount = 0;

    for (const membership of memberships) {
      // Skip muted groups
      if (membership.isMuted) continue;

      const groupId = membership.groupId;
      const userCreatedThisGroup = membership.group.createdByUserId === userId;
      const effectiveRole = (isOnTrial && userCreatedThisGroup) ? 'admin' : membership.role;

      // Count unread messages from message groups
      const messageGroups = await prisma.messageGroup.findMany({
        where: {
          groupId: groupId,
          isHidden: false,
        },
        include: {
          members: {
            where: { groupMemberId: membership.groupMemberId },
            select: { isMuted: true, lastReadAt: true },
          },
        },
      });

      for (const messageGroup of messageGroups) {
        const userMembership = messageGroup.members[0];
        if (!userMembership || userMembership.isMuted) continue;

        const unreadCount = await prisma.message.count({
          where: {
            messageGroupId: messageGroup.messageGroupId,
            isHidden: false,
            senderId: { not: membership.groupMemberId },
            createdAt: { gt: userMembership.lastReadAt || new Date(0) },
          },
        });
        totalBadgeCount += unreadCount;
      }

      // Count pending approvals (admins only)
      if (effectiveRole === 'admin') {
        const approvals = await prisma.approval.findMany({
          where: {
            groupId: groupId,
            status: 'pending',
          },
          include: {
            votes: {
              where: { adminId: membership.groupMemberId },
            },
          },
        });
        totalBadgeCount += approvals.filter(a => a.votes.length === 0).length;
      }

      // Count pending finance matters
      const financeMatters = await prisma.financeMatter.findMany({
        where: {
          groupId: groupId,
          isSettled: false,
          isCanceled: false,
        },
        include: {
          members: {
            where: { groupMemberId: membership.groupMemberId },
            select: { paidAmount: true, expectedAmount: true },
          },
        },
      });

      for (const fm of financeMatters) {
        const userMember = fm.members[0];
        if (userMember) {
          const paidAmount = parseFloat(userMember.paidAmount) || 0;
          const expectedAmount = parseFloat(userMember.expectedAmount) || 0;
          if (paidAmount < expectedAmount) totalBadgeCount++;
        }
      }

      // Count pending calendar events (if notifications enabled)
      if (membership.notifyAllCalendar) {
        const calendarCount = await prisma.calendarEvent.count({
          where: {
            groupId: groupId,
            createdBy: { not: membership.groupMemberId },
            createdAt: { gt: membership.lastCalendarViewedAt || new Date(0) },
          },
        });
        totalBadgeCount += calendarCount;
      }
    }

    res.json({
      success: true,
      badgeCount: totalBadgeCount,
    });
  } catch (error) {
    console.error('[Notifications] Get total badge count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get badge count',
    });
  }
}

/**
 * Send a test notification to the current user
 * POST /notifications/test
 */
async function sendTestNotification(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pushNotificationService.sendToUser(
      userId,
      'Test Notification',
      'If you see this, push notifications are working!',
      { type: 'test' }
    );

    if (result.sent === 0) {
      return res.json({
        success: true,
        message: 'No registered devices found. Please ensure the app has notification permissions.',
        sent: 0,
      });
    }

    res.json({
      success: true,
      message: `Test notification sent to ${result.sent} device(s)`,
      sent: result.sent,
    });
  } catch (error) {
    console.error('[Notifications] Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
    });
  }
}

module.exports = {
  registerToken,
  unregisterToken,
  getDevices,
  updatePreferences,
  getPreferences,
  getTotalBadgeCount,
  sendTestNotification,
};
