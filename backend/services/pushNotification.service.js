/**
 * Push Notification Service
 *
 * Uses Expo Push Notification Service to send push notifications.
 * Free tier: 600 notifications/second (more than enough for our scale)
 *
 * Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const { prisma } = require('../config/database');

// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications to multiple Expo push tokens
 *
 * @param {Array<Object>} messages - Array of notification messages
 * @param {string} messages[].to - Expo push token (ExponentPushToken[xxx])
 * @param {string} messages[].title - Notification title
 * @param {string} messages[].body - Notification body
 * @param {Object} [messages[].data] - Custom data payload
 * @param {string} [messages[].sound] - Sound to play ('default' or null)
 * @param {number} [messages[].badge] - Badge count for iOS
 * @param {string} [messages[].channelId] - Android notification channel
 * @returns {Promise<Object>} Result with tickets for each notification
 */
async function sendPushNotifications(messages) {
  if (!messages || messages.length === 0) {
    return { success: true, tickets: [] };
  }

  // Filter out invalid tokens
  const validMessages = messages.filter(m =>
    m.to && typeof m.to === 'string' && m.to.startsWith('ExponentPushToken[')
  );

  if (validMessages.length === 0) {
    console.log('[PushNotification] No valid Expo push tokens to send to');
    return { success: true, tickets: [] };
  }

  // Format messages for Expo Push API
  const formattedMessages = validMessages.map(msg => ({
    to: msg.to,
    title: msg.title,
    body: msg.body,
    data: msg.data || {},
    sound: msg.sound || 'default',
    badge: msg.badge,
    channelId: msg.channelId || 'default',
    priority: 'high',
  }));

  try {
    // Expo recommends sending in batches of 100
    const BATCH_SIZE = 100;
    const allTickets = [];

    for (let i = 0; i < formattedMessages.length; i += BATCH_SIZE) {
      const batch = formattedMessages.slice(i, i + BATCH_SIZE);

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();

      if (result.data) {
        allTickets.push(...result.data);
      }

      // Log any errors
      if (result.errors) {
        console.error('[PushNotification] Expo API errors:', result.errors);
      }
    }

    // Process tickets to identify failed tokens
    await processTickets(allTickets, validMessages);

    console.log(`[PushNotification] Sent ${allTickets.length} notifications`);
    return { success: true, tickets: allTickets };

  } catch (error) {
    console.error('[PushNotification] Failed to send notifications:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process notification tickets and mark invalid tokens
 *
 * @param {Array} tickets - Ticket responses from Expo
 * @param {Array} messages - Original messages sent
 */
async function processTickets(tickets, messages) {
  const invalidTokens = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status === 'error') {
      const token = messages[index]?.to;

      // DeviceNotRegistered means the token is no longer valid
      if (ticket.details?.error === 'DeviceNotRegistered') {
        console.log(`[PushNotification] Token no longer valid: ${token}`);
        invalidTokens.push(token);
      } else {
        console.error(`[PushNotification] Error for token ${token}:`, ticket.message);
      }
    }
  });

  // Mark invalid tokens as inactive in database
  if (invalidTokens.length > 0) {
    try {
      await prisma.deviceToken.updateMany({
        where: {
          expoPushToken: { in: invalidTokens },
        },
        data: {
          isActive: false,
        },
      });
      console.log(`[PushNotification] Marked ${invalidTokens.length} tokens as inactive`);
    } catch (error) {
      console.error('[PushNotification] Failed to update invalid tokens:', error.message);
    }
  }
}

/**
 * Send notification to a specific user (all their devices)
 *
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [data] - Custom data payload
 * @returns {Promise<Object>} Result
 */
async function sendToUser(userId, title, body, data = {}) {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      expoPushToken: true,
    },
  });

  if (tokens.length === 0) {
    console.log(`[PushNotification] No active tokens for user ${userId}`);
    return { success: true, sent: 0 };
  }

  const messages = tokens.map(t => ({
    to: t.expoPushToken,
    title,
    body,
    data,
  }));

  const result = await sendPushNotifications(messages);
  return { ...result, sent: tokens.length };
}

/**
 * Send notification to multiple users
 *
 * @param {Array<string>} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [data] - Custom data payload
 * @returns {Promise<Object>} Result
 */
async function sendToUsers(userIds, title, body, data = {}) {
  if (!userIds || userIds.length === 0) {
    return { success: true, sent: 0 };
  }

  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId: { in: userIds },
      isActive: true,
    },
    select: {
      expoPushToken: true,
    },
  });

  if (tokens.length === 0) {
    console.log(`[PushNotification] No active tokens for users`);
    return { success: true, sent: 0 };
  }

  const messages = tokens.map(t => ({
    to: t.expoPushToken,
    title,
    body,
    data,
  }));

  const result = await sendPushNotifications(messages);
  return { ...result, sent: tokens.length };
}

/**
 * Send notification to all members of a group (except sender)
 *
 * @param {string} groupId - Group ID
 * @param {string} excludeUserId - User ID to exclude (usually the sender)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [data] - Custom data payload
 * @returns {Promise<Object>} Result
 */
async function sendToGroupMembers(groupId, excludeUserId, title, body, data = {}) {
  // Get all registered group members with their user IDs
  const members = await prisma.groupMember.findMany({
    where: {
      groupId,
      isRegistered: true,
      isHidden: false,
      userId: {
        not: null,
      },
    },
    select: {
      userId: true,
    },
  });

  // Filter out the excluded user and get unique user IDs
  const userIds = members
    .filter(m => m.userId !== excludeUserId)
    .map(m => m.userId);

  if (userIds.length === 0) {
    return { success: true, sent: 0 };
  }

  return sendToUsers(userIds, title, body, data);
}

/**
 * Send notification to specific group members by their groupMemberIds
 * Respects notification preferences
 *
 * @param {Array<string>} groupMemberIds - Array of group member IDs
 * @param {string} notificationType - Type: 'message', 'mention', 'calendar', 'finance', 'request'
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [data] - Custom data payload
 * @returns {Promise<Object>} Result
 */
async function sendToGroupMembersWithPreferences(groupMemberIds, notificationType, title, body, data = {}) {
  if (!groupMemberIds || groupMemberIds.length === 0) {
    return { success: true, sent: 0 };
  }

  // Build the preference filter based on notification type
  let preferenceFilter = {};
  switch (notificationType) {
    case 'message':
      preferenceFilter = { notifyAllMessages: true };
      break;
    case 'mention':
      preferenceFilter = { notifyMentionMessages: true };
      break;
    case 'calendar':
      preferenceFilter = { notifyAllCalendar: true };
      break;
    case 'calendar_mention':
      preferenceFilter = { notifyMentionCalendar: true };
      break;
    case 'finance':
      preferenceFilter = { notifyAllFinance: true };
      break;
    case 'finance_mention':
      preferenceFilter = { notifyMentionFinance: true };
      break;
    case 'request':
      preferenceFilter = { notifyRequests: true };
      break;
    default:
      // No preference filter, send to all
      break;
  }

  // Get members who have the notification preference enabled
  const members = await prisma.groupMember.findMany({
    where: {
      groupMemberId: { in: groupMemberIds },
      isRegistered: true,
      userId: { not: null },
      ...preferenceFilter,
    },
    select: {
      userId: true,
    },
  });

  const userIds = members.map(m => m.userId).filter(Boolean);

  if (userIds.length === 0) {
    console.log(`[PushNotification] No members with ${notificationType} notifications enabled`);
    return { success: true, sent: 0 };
  }

  return sendToUsers(userIds, title, body, data);
}

/**
 * Register or update a device token for a user
 *
 * @param {string} userId - User ID
 * @param {string} expoPushToken - Expo push token
 * @param {string} platform - 'ios', 'android', or 'web'
 * @param {string} [deviceName] - Optional device name
 * @returns {Promise<Object>} The created/updated token record
 */
async function registerToken(userId, expoPushToken, platform, deviceName = null) {
  // Validate token format
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    throw new Error('Invalid Expo push token format');
  }

  // Upsert the token
  const token = await prisma.deviceToken.upsert({
    where: {
      userId_expoPushToken: {
        userId,
        expoPushToken,
      },
    },
    update: {
      isActive: true,
      lastUsedAt: new Date(),
      platform,
      deviceName,
    },
    create: {
      userId,
      expoPushToken,
      platform,
      deviceName,
      isActive: true,
    },
  });

  console.log(`[PushNotification] Registered token for user ${userId} on ${platform}`);
  return token;
}

/**
 * Unregister a device token
 *
 * @param {string} userId - User ID
 * @param {string} expoPushToken - Expo push token to remove
 * @returns {Promise<boolean>} True if deleted
 */
async function unregisterToken(userId, expoPushToken) {
  try {
    await prisma.deviceToken.delete({
      where: {
        userId_expoPushToken: {
          userId,
          expoPushToken,
        },
      },
    });
    console.log(`[PushNotification] Unregistered token for user ${userId}`);
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      // Record not found, already deleted
      return false;
    }
    throw error;
  }
}

/**
 * Get all active tokens for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of token records
 */
async function getUserTokens(userId) {
  return prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
  });
}

/**
 * Send notification to admins about a pending approval request
 *
 * @param {string} groupId - Group ID
 * @param {string} excludeAdminId - Admin ID to exclude (the requester)
 * @param {string} approvalType - Type of approval (add_member, remove_member, etc.)
 * @param {string} description - Human-readable description of what needs approval
 * @param {string} approvalId - The approval record ID
 * @returns {Promise<Object>} Result
 */
async function sendApprovalNotification(groupId, excludeAdminId, approvalType, description, approvalId) {
  try {
    // Get all admins in the group except the requester
    const admins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
        isRegistered: true,
        isHidden: false,
        groupMemberId: { not: excludeAdminId },
        userId: { not: null },
      },
      select: {
        userId: true,
      },
    });

    const adminUserIds = admins.map(a => a.userId).filter(Boolean);

    if (adminUserIds.length === 0) {
      return { success: true, sent: 0 };
    }

    // Get group name
    const group = await prisma.group.findUnique({
      where: { groupId },
      select: { name: true },
    });

    return sendToUsers(
      adminUserIds,
      `Approval Needed: ${group?.name || 'Group'}`,
      description,
      {
        type: 'approval_request',
        approvalType: approvalType,
        groupId: groupId,
        approvalId: approvalId,
      }
    );
  } catch (error) {
    console.error('[PushNotification] Failed to send approval notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotifications,
  sendToUser,
  sendToUsers,
  sendToGroupMembers,
  sendToGroupMembersWithPreferences,
  sendApprovalNotification,
  registerToken,
  unregisterToken,
  getUserTokens,
};
