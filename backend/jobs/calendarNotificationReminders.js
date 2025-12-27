/**
 * Calendar Notification Reminder Job
 *
 * Sends push notifications for calendar events at the scheduled reminder time.
 * For example, if an event is at 3:00 PM with notificationMinutes=15,
 * this job will send the reminder at 2:45 PM.
 *
 * Runs every minute to check for events that need reminders.
 */

const cron = require('node-cron');
const { prisma } = require('../config/database');
const pushNotificationService = require('../services/pushNotification.service');

/**
 * Format a date for display in notifications
 */
function formatEventTime(date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get human-readable reminder text
 */
function getReminderText(notificationMinutes) {
  if (notificationMinutes === 0) return 'now';
  if (notificationMinutes < 60) return `in ${notificationMinutes} minutes`;
  if (notificationMinutes === 60) return 'in 1 hour';
  if (notificationMinutes < 1440) return `in ${Math.round(notificationMinutes / 60)} hours`;
  if (notificationMinutes === 1440) return 'tomorrow';
  return `in ${Math.round(notificationMinutes / 1440)} days`;
}

/**
 * Process a single event and send reminders to attendees
 */
async function processEventReminder(event) {
  try {
    // Get attendees for this event who haven't been reminded yet
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        eventId: event.eventId,
      },
      include: {
        groupMember: {
          include: {
            user: true,
          },
        },
      },
    });

    // Filter to attendees who:
    // 1. Have a registered user account
    // 2. Haven't been reminded yet
    // 3. Have calendar notifications enabled
    const attendeesToNotify = [];

    for (const attendee of attendees) {
      if (!attendee.groupMember.userId) continue; // Placeholder member
      if (attendee.groupMember.isMuted) continue; // Muted the group
      if (!attendee.groupMember.notifyAllCalendar) continue; // Disabled calendar notifications

      // Check if already reminded
      const existingReminder = await prisma.calendarEventReminder.findUnique({
        where: {
          eventId_userId: {
            eventId: event.eventId,
            userId: attendee.groupMember.userId,
          },
        },
      });

      if (!existingReminder) {
        attendeesToNotify.push(attendee.groupMember);
      }
    }

    if (attendeesToNotify.length === 0) {
      return { sent: 0 };
    }

    // Send notifications
    const userIds = attendeesToNotify.map(m => m.userId);
    const reminderText = getReminderText(event.notificationMinutes || 15);

    await pushNotificationService.sendToUsers(
      userIds,
      `📅 ${event.title}`,
      `Starting ${reminderText} - ${formatEventTime(event.startTime)}`,
      {
        type: 'calendar_reminder',
        eventId: event.eventId,
        groupId: event.groupId,
      }
    );

    // Create reminder records to prevent duplicate notifications
    await prisma.calendarEventReminder.createMany({
      data: userIds.map(userId => ({
        eventId: event.eventId,
        userId: userId,
      })),
      skipDuplicates: true,
    });

    console.log(`[CalendarReminder] Sent reminders for "${event.title}" to ${userIds.length} users`);
    return { sent: userIds.length };

  } catch (error) {
    console.error(`[CalendarReminder] Error processing event ${event.eventId}:`, error.message);
    return { sent: 0, error: error.message };
  }
}

/**
 * Main job function - finds and processes events due for reminders
 */
async function runReminderJob() {
  const now = new Date();

  try {
    // Find events that:
    // 1. Start in the future (haven't happened yet)
    // 2. Have a notification time that has passed
    // 3. Are not hidden/deleted
    const events = await prisma.calendarEvent.findMany({
      where: {
        startTime: { gt: now }, // Event hasn't started yet
        isHidden: false,
        notificationMinutes: { not: null, gt: 0 }, // Has reminder set
      },
      include: {
        group: {
          select: { name: true },
        },
      },
    });

    // Filter to events where notification time has arrived
    const eventsToProcess = events.filter(event => {
      const notifyMinutes = event.notificationMinutes || 15;
      const notifyTime = new Date(event.startTime.getTime() - notifyMinutes * 60 * 1000);
      return now >= notifyTime;
    });

    if (eventsToProcess.length === 0) {
      return; // No events need reminders
    }

    console.log(`[CalendarReminder] Processing ${eventsToProcess.length} events for reminders`);

    let totalSent = 0;
    for (const event of eventsToProcess) {
      const result = await processEventReminder(event);
      totalSent += result.sent;
    }

    if (totalSent > 0) {
      console.log(`[CalendarReminder] Completed: sent ${totalSent} reminders`);
    }

  } catch (error) {
    console.error('[CalendarReminder] Critical error in reminder job:', error);
  }
}

/**
 * Initialize the calendar reminder job
 * Runs every minute to check for events needing reminders
 */
function initCalendarReminderJob() {
  // Run every minute
  cron.schedule('* * * * *', () => {
    runReminderJob().catch(error => {
      console.error('[CalendarReminder] Unhandled error:', error);
    });
  });

  console.log('[CalendarReminder] Calendar notification reminder job initialized (runs every minute)');

  // Run once on startup after a short delay
  setTimeout(() => {
    console.log('[CalendarReminder] Running initial reminder check...');
    runReminderJob().catch(error => {
      console.error('[CalendarReminder] Initial check error:', error);
    });
  }, 5000); // 5 second delay
}

module.exports = {
  initCalendarReminderJob,
  runReminderJob,
};
