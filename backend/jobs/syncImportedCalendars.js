/**
 * Background Sync Job for Imported Calendars
 *
 * Periodically syncs URL-based imported calendars by:
 * 1. Finding calendars that need syncing (based on syncIntervalHours)
 * 2. Fetching fresh iCal data from the source URL
 * 3. Updating events (delete old, insert new)
 * 4. Recording sync status and errors
 */

const cron = require('node-cron');
const { prisma } = require('../config/database');
const { parseIcalUrl } = require('../utils/parseIcal');

/**
 * Sync a single imported calendar
 * @param {Object} calendar - The imported calendar record
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function syncSingleCalendar(calendar) {
  const startTime = Date.now();

  try {
    // Only URL-based calendars can be synced
    if (calendar.sourceType !== 'url' || !calendar.sourceUrl) {
      return { success: false, error: 'Calendar has no URL source' };
    }

    // Fetch and parse events from URL
    const events = await parseIcalUrl(calendar.sourceUrl);

    // Update calendar in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing events for this calendar
      await tx.importedCalendarEvent.deleteMany({
        where: { importedCalendarId: calendar.importedCalendarId },
      });

      // Insert new events
      if (events.length > 0) {
        await tx.importedCalendarEvent.createMany({
          data: events.map((event) => ({
            importedCalendarId: calendar.importedCalendarId,
            externalUid: event.externalUid,
            title: event.title,
            description: event.description,
            location: event.location,
            startTime: event.startTime,
            endTime: event.endTime,
            isAllDay: event.isAllDay,
            recurrenceRule: event.recurrenceRule,
          })),
        });
      }

      // Update sync status
      await tx.importedCalendar.update({
        where: { importedCalendarId: calendar.importedCalendarId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        },
      });
    });

    const duration = Date.now() - startTime;
    console.log(
      `[SyncJob] Synced calendar "${calendar.name}" (${calendar.importedCalendarId}): ${events.length} events in ${duration}ms`
    );

    return { success: true };
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';

    // Record the error
    await prisma.importedCalendar.update({
      where: { importedCalendarId: calendar.importedCalendarId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'error',
        lastSyncError: errorMessage.substring(0, 1000), // Truncate long errors
      },
    });

    console.error(
      `[SyncJob] Failed to sync calendar "${calendar.name}" (${calendar.importedCalendarId}): ${errorMessage}`
    );

    return { success: false, error: errorMessage };
  }
}

/**
 * Run the sync job - finds and syncs all calendars due for sync
 */
async function runSyncJob() {
  console.log(`[SyncJob] Starting imported calendar sync check at ${new Date().toISOString()}`);

  try {
    // Find all active URL-based calendars that need syncing
    const now = new Date();

    const calendarsToSync = await prisma.importedCalendar.findMany({
      where: {
        isActive: true,
        sourceType: 'url',
        sourceUrl: { not: null },
        OR: [
          // Never synced
          { lastSyncAt: null },
          // Due for sync based on interval
          // We compare lastSyncAt + syncIntervalHours < now
        ],
      },
    });

    // Filter to only calendars that are actually due
    const dueCalendars = calendarsToSync.filter((cal) => {
      if (!cal.lastSyncAt) return true; // Never synced
      const nextSyncAt = new Date(cal.lastSyncAt.getTime() + cal.syncIntervalHours * 60 * 60 * 1000);
      return nextSyncAt <= now;
    });

    if (dueCalendars.length === 0) {
      console.log('[SyncJob] No calendars need syncing');
      return;
    }

    console.log(`[SyncJob] Found ${dueCalendars.length} calendars to sync`);

    // Sync each calendar (sequentially to avoid overwhelming external servers)
    let successCount = 0;
    let errorCount = 0;

    for (const calendar of dueCalendars) {
      const result = await syncSingleCalendar(calendar);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`[SyncJob] Completed: ${successCount} succeeded, ${errorCount} failed`);
  } catch (error) {
    console.error('[SyncJob] Critical error in sync job:', error);
  }
}

/**
 * Initialize the background sync job
 * Runs every hour at minute 0
 */
function initSyncJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    runSyncJob().catch((error) => {
      console.error('[SyncJob] Unhandled error:', error);
    });
  });

  console.log('[SyncJob] Imported calendar sync job initialized (runs hourly)');

  // Also run once on startup after a short delay
  setTimeout(() => {
    console.log('[SyncJob] Running initial sync check...');
    runSyncJob().catch((error) => {
      console.error('[SyncJob] Initial sync error:', error);
    });
  }, 10000); // 10 second delay to let server fully start
}

module.exports = {
  initSyncJob,
  runSyncJob,
  syncSingleCalendar,
};
