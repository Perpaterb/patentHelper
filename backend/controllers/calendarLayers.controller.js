/**
 * Calendar Layers Controller
 *
 * Manages user-specific calendar layer preferences.
 * Each user can customize visibility, notifications, and colors
 * for each group member's events.
 */

const { prisma } = require('../config/database');

/**
 * Get calendar layers for a group
 * GET /groups/:groupId/calendar/layers
 *
 * Returns all group members with the current user's layer preferences.
 * If no preference exists for a member, defaults are used.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getLayers(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get all group members
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
      },
      select: {
        groupMemberId: true,
        displayName: true,
        iconLetters: true,
        iconColor: true,
        role: true,
      },
      orderBy: [
        { role: 'asc' },
        { displayName: 'asc' },
      ],
    });

    // Get user's layer preferences for this group
    const userPreferences = await prisma.calendarLayerPreference.findMany({
      where: {
        userId: userId,
        groupId: groupId,
      },
    });

    // Create a map for quick lookup
    const prefMap = new Map();
    for (const pref of userPreferences) {
      prefMap.set(pref.memberLayerId, pref);
    }

    // Build layers response with preferences (or defaults)
    const layers = groupMembers.map((member) => {
      const pref = prefMap.get(member.groupMemberId);

      return {
        memberLayerId: member.groupMemberId,
        displayName: member.displayName,
        iconLetters: member.iconLetters,
        defaultColor: member.iconColor,
        role: member.role,
        // Preference values (defaults if no preference exists)
        isVisible: pref?.isVisible ?? true,
        notificationsEnabled: pref?.notificationsEnabled ?? true,
        customColor: pref?.customColor ?? null,
      };
    });

    return res.status(200).json({
      success: true,
      layers,
    });
  } catch (error) {
    console.error('Error getting calendar layers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get calendar layers',
      error: error.message,
    });
  }
}

/**
 * Update a calendar layer preference
 * PUT /groups/:groupId/calendar/layers/:memberLayerId
 *
 * Upserts a layer preference for a specific member.
 * Only updates fields that are provided in the request body.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function updateLayerPreference(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, memberLayerId } = req.params;
    const { isVisible, notificationsEnabled, customColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Check if the target member exists in this group
    const targetMember = await prisma.groupMember.findFirst({
      where: {
        groupMemberId: memberLayerId,
        groupId: groupId,
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this group',
      });
    }

    // Validate customColor if provided
    if (customColor !== undefined && customColor !== null) {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColorRegex.test(customColor)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid color format. Must be a hex color (e.g., #FF5733)',
        });
      }
    }

    // Build update data (only include fields that are provided)
    const updateData = {};
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (customColor !== undefined) updateData.customColor = customColor;

    // Upsert the preference
    const preference = await prisma.calendarLayerPreference.upsert({
      where: {
        userId_groupId_memberLayerId: {
          userId: userId,
          groupId: groupId,
          memberLayerId: memberLayerId,
        },
      },
      create: {
        userId: userId,
        groupId: groupId,
        memberLayerId: memberLayerId,
        isVisible: isVisible ?? true,
        notificationsEnabled: notificationsEnabled ?? true,
        customColor: customColor ?? null,
      },
      update: updateData,
    });

    return res.status(200).json({
      success: true,
      preference: {
        memberLayerId: preference.memberLayerId,
        isVisible: preference.isVisible,
        notificationsEnabled: preference.notificationsEnabled,
        customColor: preference.customColor,
      },
    });
  } catch (error) {
    console.error('Error updating calendar layer preference:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update calendar layer preference',
      error: error.message,
    });
  }
}

/**
 * Check for calendar events that need reminders
 * GET /groups/:groupId/calendar/check-reminders
 *
 * Returns upcoming events where:
 * - User is an attendee (or responsible adult for child events)
 * - User has notifications enabled for that layer
 * - Event starts within the reminder window (default: 30 minutes)
 * - User hasn't been reminded for this event yet
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function checkCalendarReminders(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const reminderWindowMinutes = parseInt(req.query.window) || 30;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get user's layer preferences
    const layerPrefs = await prisma.calendarLayerPreference.findMany({
      where: {
        userId: userId,
        groupId: groupId,
      },
    });

    // Create a map for quick lookup
    const prefMap = new Map();
    for (const pref of layerPrefs) {
      prefMap.set(pref.memberLayerId, pref);
    }

    // Calculate reminder window
    const now = new Date();
    const windowEnd = new Date(now.getTime() + reminderWindowMinutes * 60 * 1000);

    // Get upcoming events in the reminder window
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        groupId: groupId,
        startTime: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        attendees: {
          include: {
            groupMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
              },
            },
          },
        },
        responsibilityEvents: {
          include: {
            child: {
              select: {
                groupMemberId: true,
                displayName: true,
              },
            },
            startResponsibleMember: {
              select: {
                groupMemberId: true,
                displayName: true,
              },
            },
            endResponsibleMember: {
              select: {
                groupMemberId: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Get events the user has already been reminded about
    const remindedEvents = await prisma.calendarEventReminder.findMany({
      where: {
        userId: userId,
        eventId: {
          in: upcomingEvents.map(e => e.eventId),
        },
      },
    });
    const remindedEventIds = new Set(remindedEvents.map(r => r.eventId));

    // Filter events that need reminders
    const eventsNeedingReminders = [];

    for (const event of upcomingEvents) {
      // Skip if already reminded
      if (remindedEventIds.has(event.eventId)) {
        continue;
      }

      // Check if user should be notified for this event
      let shouldNotify = false;

      // Check attendees
      if (event.attendees && event.attendees.length > 0) {
        for (const attendee of event.attendees) {
          const pref = prefMap.get(attendee.groupMemberId);
          // User is an attendee or notifications enabled for this layer (default: true)
          if (attendee.groupMember?.groupMemberId === membership.groupMemberId) {
            // User is directly an attendee - check their own layer preference
            const myPref = prefMap.get(membership.groupMemberId);
            if (!myPref || myPref.notificationsEnabled) {
              shouldNotify = true;
              break;
            }
          } else if (!pref || pref.notificationsEnabled) {
            shouldNotify = true;
            break;
          }
        }
      }

      // Check responsibility events (child events)
      if (!shouldNotify && event.responsibilityEvents && event.responsibilityEvents.length > 0) {
        for (const re of event.responsibilityEvents) {
          // Check if user is a responsible adult
          if (re.startResponsibleMember?.groupMemberId === membership.groupMemberId ||
              re.endResponsibleMember?.groupMemberId === membership.groupMemberId) {
            const pref = prefMap.get(membership.groupMemberId);
            if (!pref || pref.notificationsEnabled) {
              shouldNotify = true;
              break;
            }
          }

          // Check if child's layer has notifications enabled
          if (re.child) {
            const childPref = prefMap.get(re.child.groupMemberId);
            if (!childPref || childPref.notificationsEnabled) {
              shouldNotify = true;
              break;
            }
          }
        }
      }

      if (shouldNotify) {
        eventsNeedingReminders.push({
          eventId: event.eventId,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          isResponsibilityEvent: event.responsibilityEvents && event.responsibilityEvents.length > 0,
        });
      }
    }

    return res.status(200).json({
      success: true,
      events: eventsNeedingReminders,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error checking calendar reminders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check calendar reminders',
      error: error.message,
    });
  }
}

/**
 * Mark events as reminded
 * POST /groups/:groupId/calendar/mark-reminded
 *
 * Records that the user has been reminded about specific events.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function markEventsReminded(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { eventIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'eventIds array is required',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Create reminder records (skip duplicates)
    await prisma.calendarEventReminder.createMany({
      data: eventIds.map(eventId => ({
        eventId,
        userId,
      })),
      skipDuplicates: true,
    });

    return res.status(200).json({
      success: true,
      message: `Marked ${eventIds.length} events as reminded`,
    });
  } catch (error) {
    console.error('Error marking events as reminded:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark events as reminded',
      error: error.message,
    });
  }
}

module.exports = {
  getLayers,
  updateLayerPreference,
  checkCalendarReminders,
  markEventsReminded,
};
