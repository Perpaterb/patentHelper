/**
 * Imported Calendars Controller
 *
 * Manages external calendars imported via iCal URL or file upload.
 * Supports periodic syncing for URL-based calendars.
 */

const { prisma } = require('../config/database');
const { parseIcalString, parseIcalUrl, validateIcalUrl } = require('../utils/parseIcal');

/**
 * Get all imported calendars for a group with user preferences
 * GET /groups/:groupId/calendar/imported
 */
async function getImportedCalendars(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get imported calendars
    const calendars = await prisma.importedCalendar.findMany({
      where: {
        groupId,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get user preferences
    const preferences = await prisma.importedCalendarPreference.findMany({
      where: {
        userId,
        importedCalendarId: {
          in: calendars.map(c => c.importedCalendarId),
        },
      },
    });

    const prefMap = new Map();
    for (const pref of preferences) {
      prefMap.set(pref.importedCalendarId, pref);
    }

    // Build response
    const result = calendars.map(calendar => {
      const pref = prefMap.get(calendar.importedCalendarId);
      return {
        importedCalendarId: calendar.importedCalendarId,
        name: calendar.name,
        sourceType: calendar.sourceType,
        color: calendar.color,
        syncIntervalHours: calendar.syncIntervalHours,
        lastSyncAt: calendar.lastSyncAt,
        lastSyncStatus: calendar.lastSyncStatus,
        eventCount: calendar._count.events,
        createdBy: calendar.creator?.displayName || 'Unknown',
        createdAt: calendar.createdAt,
        // User preferences (defaults if not set)
        isVisible: pref?.isVisible ?? true,
        notificationsEnabled: pref?.notificationsEnabled ?? true,
        customColor: pref?.customColor ?? null,
      };
    });

    return res.status(200).json({
      success: true,
      calendars: result,
    });
  } catch (error) {
    console.error('Error getting imported calendars:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get imported calendars',
      error: error.message,
    });
  }
}

/**
 * Import a new calendar
 * POST /groups/:groupId/calendar/imported
 */
async function importCalendar(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { name, sourceType, sourceUrl, icalData, color, syncIntervalHours } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Calendar name is required',
      });
    }

    if (!sourceType || !['url', 'file'].includes(sourceType)) {
      return res.status(400).json({
        success: false,
        message: 'Source type must be "url" or "file"',
      });
    }

    if (sourceType === 'url' && !sourceUrl) {
      return res.status(400).json({
        success: false,
        message: 'Source URL is required for URL imports',
      });
    }

    if (sourceType === 'file' && !icalData) {
      return res.status(400).json({
        success: false,
        message: 'iCal data is required for file imports',
      });
    }

    // Validate color
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!color || !hexColorRegex.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Valid hex color is required (e.g., #FF5733)',
      });
    }

    // Check membership (admin or parent can import)
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    if (!['admin', 'parent'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and parents can import calendars',
      });
    }

    // Parse events
    let events;
    try {
      if (sourceType === 'url') {
        events = await parseIcalUrl(sourceUrl);
      } else {
        events = parseIcalString(icalData);
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: `Failed to parse calendar: ${parseError.message}`,
      });
    }

    // Create calendar and events in transaction
    const calendar = await prisma.$transaction(async (tx) => {
      // Create calendar
      const newCalendar = await tx.importedCalendar.create({
        data: {
          groupId,
          createdBy: userId,
          name: name.trim(),
          sourceType,
          sourceUrl: sourceType === 'url' ? sourceUrl : null,
          color,
          syncIntervalHours: syncIntervalHours || 6,
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
        },
      });

      // Create events
      if (events.length > 0) {
        await tx.importedCalendarEvent.createMany({
          data: events.map(event => ({
            importedCalendarId: newCalendar.importedCalendarId,
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

      return newCalendar;
    });

    return res.status(201).json({
      success: true,
      message: `Calendar imported with ${events.length} events`,
      calendar: {
        importedCalendarId: calendar.importedCalendarId,
        name: calendar.name,
        eventCount: events.length,
      },
    });
  } catch (error) {
    console.error('Error importing calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to import calendar',
      error: error.message,
    });
  }
}

/**
 * Update calendar settings
 * PUT /groups/:groupId/calendar/imported/:calendarId
 */
async function updateCalendar(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, calendarId } = req.params;
    const { name, color, syncIntervalHours } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get calendar
    const calendar = await prisma.importedCalendar.findFirst({
      where: {
        importedCalendarId: calendarId,
        groupId,
      },
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendar not found',
      });
    }

    // Only creator or admin can update
    if (calendar.createdBy !== userId && membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or admins can update this calendar',
      });
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColorRegex.test(color)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid color format',
        });
      }
      updateData.color = color;
    }
    if (syncIntervalHours !== undefined) {
      updateData.syncIntervalHours = Math.max(1, Math.min(168, syncIntervalHours));
    }

    // Update
    const updated = await prisma.importedCalendar.update({
      where: { importedCalendarId: calendarId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      calendar: {
        importedCalendarId: updated.importedCalendarId,
        name: updated.name,
        color: updated.color,
        syncIntervalHours: updated.syncIntervalHours,
      },
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update calendar',
      error: error.message,
    });
  }
}

/**
 * Delete an imported calendar
 * DELETE /groups/:groupId/calendar/imported/:calendarId
 */
async function deleteCalendar(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, calendarId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get calendar
    const calendar = await prisma.importedCalendar.findFirst({
      where: {
        importedCalendarId: calendarId,
        groupId,
      },
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendar not found',
      });
    }

    // Only creator or admin can delete
    if (calendar.createdBy !== userId && membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or admins can delete this calendar',
      });
    }

    // Soft delete (set isActive to false)
    await prisma.importedCalendar.update({
      where: { importedCalendarId: calendarId },
      data: { isActive: false },
    });

    return res.status(200).json({
      success: true,
      message: 'Calendar deleted',
    });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete calendar',
      error: error.message,
    });
  }
}

/**
 * Trigger manual sync for a calendar
 * POST /groups/:groupId/calendar/imported/:calendarId/sync
 */
async function syncCalendar(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, calendarId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get calendar
    const calendar = await prisma.importedCalendar.findFirst({
      where: {
        importedCalendarId: calendarId,
        groupId,
        isActive: true,
      },
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendar not found',
      });
    }

    if (calendar.sourceType !== 'url') {
      return res.status(400).json({
        success: false,
        message: 'Only URL-based calendars can be synced',
      });
    }

    // Sync
    try {
      const events = await parseIcalUrl(calendar.sourceUrl);

      await prisma.$transaction(async (tx) => {
        // Delete existing events
        await tx.importedCalendarEvent.deleteMany({
          where: { importedCalendarId: calendarId },
        });

        // Create new events
        if (events.length > 0) {
          await tx.importedCalendarEvent.createMany({
            data: events.map(event => ({
              importedCalendarId: calendarId,
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
          where: { importedCalendarId: calendarId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            lastSyncError: null,
          },
        });
      });

      return res.status(200).json({
        success: true,
        message: `Synced ${events.length} events`,
        eventCount: events.length,
      });
    } catch (syncError) {
      // Update sync status with error
      await prisma.importedCalendar.update({
        where: { importedCalendarId: calendarId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'error',
          lastSyncError: syncError.message,
        },
      });

      return res.status(400).json({
        success: false,
        message: `Sync failed: ${syncError.message}`,
      });
    }
  } catch (error) {
    console.error('Error syncing calendar:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync calendar',
      error: error.message,
    });
  }
}

/**
 * Update user preference for an imported calendar
 * PUT /groups/:groupId/calendar/imported/:calendarId/preference
 */
async function updatePreference(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, calendarId } = req.params;
    const { isVisible, notificationsEnabled, customColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Check calendar exists
    const calendar = await prisma.importedCalendar.findFirst({
      where: {
        importedCalendarId: calendarId,
        groupId,
        isActive: true,
      },
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendar not found',
      });
    }

    // Validate customColor if provided
    if (customColor !== undefined && customColor !== null) {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColorRegex.test(customColor)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid color format',
        });
      }
    }

    // Build update data
    const updateData = {};
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (customColor !== undefined) updateData.customColor = customColor;

    // Upsert preference
    const preference = await prisma.importedCalendarPreference.upsert({
      where: {
        userId_importedCalendarId: {
          userId,
          importedCalendarId: calendarId,
        },
      },
      create: {
        userId,
        importedCalendarId: calendarId,
        isVisible: isVisible ?? true,
        notificationsEnabled: notificationsEnabled ?? true,
        customColor: customColor ?? null,
      },
      update: updateData,
    });

    return res.status(200).json({
      success: true,
      preference: {
        importedCalendarId: preference.importedCalendarId,
        isVisible: preference.isVisible,
        notificationsEnabled: preference.notificationsEnabled,
        customColor: preference.customColor,
      },
    });
  } catch (error) {
    console.error('Error updating preference:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update preference',
      error: error.message,
    });
  }
}

/**
 * Get events from an imported calendar
 * GET /groups/:groupId/calendar/imported/:calendarId/events
 */
async function getCalendarEvents(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, calendarId } = req.params;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Build query
    const where = {
      importedCalendarId: calendarId,
      importedCalendar: {
        groupId,
        isActive: true,
      },
    };

    // Add date filters if provided
    if (startDate || endDate) {
      where.OR = [
        {
          startTime: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
        {
          endTime: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      ];
    }

    const events = await prisma.importedCalendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error getting calendar events:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get calendar events',
      error: error.message,
    });
  }
}

/**
 * Get all imported calendar events for a group (for calendar view)
 * GET /groups/:groupId/calendar/imported-events
 */
async function getAllImportedEvents(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get user preferences
    const preferences = await prisma.importedCalendarPreference.findMany({
      where: { userId },
    });
    const prefMap = new Map();
    for (const pref of preferences) {
      prefMap.set(pref.importedCalendarId, pref);
    }

    // Get active calendars for this group
    const calendars = await prisma.importedCalendar.findMany({
      where: {
        groupId,
        isActive: true,
      },
      include: {
        events: true,
      },
    });

    // Build events with calendar info and preferences
    const events = [];
    for (const calendar of calendars) {
      const pref = prefMap.get(calendar.importedCalendarId);

      for (const event of calendar.events) {
        events.push({
          ...event,
          importedCalendarName: calendar.name,
          importedCalendarColor: pref?.customColor || calendar.color,
          isVisible: pref?.isVisible ?? true,
          notificationsEnabled: pref?.notificationsEnabled ?? true,
          isImportedEvent: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error getting imported events:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get imported events',
      error: error.message,
    });
  }
}

module.exports = {
  getImportedCalendars,
  importCalendar,
  updateCalendar,
  deleteCalendar,
  syncCalendar,
  updatePreference,
  getCalendarEvents,
  getAllImportedEvents,
};
