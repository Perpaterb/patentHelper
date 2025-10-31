/**
 * Calendar Controller
 *
 * Handles calendar event operations within groups.
 * Supports two types of events:
 * 1. Regular events - Normal calendar events (meetings, appointments, etc.)
 * 2. Child responsibility events - Track which parent/caregiver is responsible for a child
 *
 * IMPORTANT: Child responsibility events use a layering system where later-created
 * events override earlier-created events in overlapping time ranges.
 */

const { prisma } = require('../config/database');

/**
 * Get calendar events for a group
 * GET /groups/:groupId/calendar/events
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getCalendarEvents(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { startDate, endDate, includeResponsibility = 'true' } = req.query;

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

    // Supervisors cannot access calendar
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors do not have access to the calendar',
      });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.OR = [];

      if (startDate && endDate) {
        // Events that overlap with the date range
        dateFilter.OR.push({
          AND: [
            { startTime: { lte: new Date(endDate) } },
            { endTime: { gte: new Date(startDate) } },
          ],
        });
      } else if (startDate) {
        dateFilter.endTime = { gte: new Date(startDate) };
      } else if (endDate) {
        dateFilter.startTime = { lte: new Date(endDate) };
      }
    }

    // Get all calendar events for this group
    const events = await prisma.calendarEvent.findMany({
      where: {
        groupId: groupId,
        ...dateFilter,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        attendees: {
          include: {
            groupMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        },
        responsibilityEvents: includeResponsibility === 'true' ? {
          include: {
            child: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
            startResponsibleMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
            endResponsibleMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        } : false,
      },
      orderBy: {
        createdAt: 'asc', // Important for layering logic
      },
    });

    // Merge user profile data with group member data
    const eventsWithProfiles = events.map(event => ({
      ...event,
      creator: {
        ...event.creator,
        displayName: event.creator.user?.displayName || event.creator.displayName,
        iconLetters: event.creator.user?.memberIcon || event.creator.iconLetters,
        iconColor: event.creator.user?.iconColor || event.creator.iconColor,
        user: undefined, // Remove nested user object
      },
      attendees: event.attendees.map(attendee => ({
        ...attendee,
        member: {
          ...attendee.member,
          displayName: attendee.groupMember.user?.displayName || attendee.groupMember.displayName,
          iconLetters: attendee.groupMember.user?.memberIcon || attendee.groupMember.iconLetters,
          iconColor: attendee.groupMember.user?.iconColor || attendee.groupMember.iconColor,
          user: undefined,
        },
      })),
      responsibilityEvents: event.responsibilityEvents?.map(re => ({
        ...re,
        child: {
          ...re.child,
          displayName: re.child.user?.displayName || re.child.displayName,
          iconLetters: re.child.user?.memberIcon || re.child.iconLetters,
          iconColor: re.child.user?.iconColor || re.child.iconColor,
          user: undefined,
        },
        startResponsibleMember: {
          ...re.startResponsibleMember,
          displayName: re.startResponsibleMember.user?.displayName || re.startResponsibleMember.displayName,
          iconLetters: re.startResponsibleMember.user?.memberIcon || re.startResponsibleMember.iconLetters,
          iconColor: re.startResponsibleMember.user?.iconColor || re.startResponsibleMember.iconColor,
          user: undefined,
        },
        endResponsibleMember: {
          ...re.endResponsibleMember,
          displayName: re.endResponsibleMember.user?.displayName || re.endResponsibleMember.displayName,
          iconLetters: re.endResponsibleMember.user?.memberIcon || re.endResponsibleMember.iconLetters,
          iconColor: re.endResponsibleMember.user?.iconColor || re.endResponsibleMember.iconColor,
          user: undefined,
        },
      })),
    }));

    return res.status(200).json({
      success: true,
      events: eventsWithProfiles,
    });
  } catch (err) {
    console.error('Get calendar events error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get calendar events',
      error: err.message,
    });
  }
}

/**
 * Create a calendar event
 * POST /groups/:groupId/calendar/events
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createCalendarEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const {
      title,
      description,
      location,
      startTime,
      endTime,
      allDay = false,
      isRecurring = false,
      recurrenceRule,
      attendeeIds = [],
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and end time are required',
      });
    }

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
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

    // Supervisors and children cannot create events
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors cannot create calendar events',
      });
    }

    if (membership.role === 'child') {
      return res.status(403).json({
        success: false,
        message: 'Children cannot create calendar events',
      });
    }

    // TODO: Check auto-approval settings and create approval if needed
    // For now, directly create the event

    // Create the calendar event
    const event = await prisma.calendarEvent.create({
      data: {
        groupId: groupId,
        title: title,
        notes: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isRecurring: isRecurring,
        recurrencePattern: recurrenceRule || null,
        createdBy: membership.groupMemberId,
        attendees: {
          create: attendeeIds.map(attendeeId => ({
            groupMemberId: attendeeId,
          })),
        },
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
          },
        },
        attendees: {
          include: {
            groupMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'create_calendar_event',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        actionLocation: 'calendar',
        messageContent: `Created event "${title}" from ${startTime} to ${endTime}`,
      },
    });

    return res.status(201).json({
      success: true,
      event: event,
    });
  } catch (err) {
    console.error('Create calendar event error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create calendar event',
      error: err.message,
    });
  }
}

/**
 * Get a single calendar event by ID
 * GET /groups/:groupId/calendar/events/:eventId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getCalendarEventById(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, eventId } = req.params;

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

    // Supervisors cannot access calendar
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors do not have access to the calendar',
      });
    }

    // Get the event
    const event = await prisma.calendarEvent.findUnique({
      where: {
        eventId: eventId,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        attendees: {
          include: {
            groupMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
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
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
            startResponsibleMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
            endResponsibleMember: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!event || event.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Merge user profile data
    const eventWithProfiles = {
      ...event,
      creator: {
        ...event.creator,
        displayName: event.creator.user?.displayName || event.creator.displayName,
        iconLetters: event.creator.user?.memberIcon || event.creator.iconLetters,
        iconColor: event.creator.user?.iconColor || event.creator.iconColor,
        user: undefined,
      },
      attendees: event.attendees.map(attendee => ({
        ...attendee,
        member: {
          ...attendee.member,
          displayName: attendee.groupMember.user?.displayName || attendee.groupMember.displayName,
          iconLetters: attendee.groupMember.user?.memberIcon || attendee.groupMember.iconLetters,
          iconColor: attendee.groupMember.user?.iconColor || attendee.groupMember.iconColor,
          user: undefined,
        },
      })),
      responsibilityEvents: event.responsibilityEvents?.map(re => ({
        ...re,
        child: {
          ...re.child,
          displayName: re.child.user?.displayName || re.child.displayName,
          iconLetters: re.child.user?.memberIcon || re.child.iconLetters,
          iconColor: re.child.user?.iconColor || re.child.iconColor,
          user: undefined,
        },
        startResponsibleMember: {
          ...re.startResponsibleMember,
          displayName: re.startResponsibleMember.user?.displayName || re.startResponsibleMember.displayName,
          iconLetters: re.startResponsibleMember.user?.memberIcon || re.startResponsibleMember.iconLetters,
          iconColor: re.startResponsibleMember.user?.iconColor || re.startResponsibleMember.iconColor,
          user: undefined,
        },
        endResponsibleMember: {
          ...re.endResponsibleMember,
          displayName: re.endResponsibleMember.user?.displayName || re.endResponsibleMember.displayName,
          iconLetters: re.endResponsibleMember.user?.memberIcon || re.endResponsibleMember.iconLetters,
          iconColor: re.endResponsibleMember.user?.iconColor || re.endResponsibleMember.iconColor,
          user: undefined,
        },
      })),
    };

    return res.status(200).json({
      success: true,
      event: eventWithProfiles,
    });
  } catch (err) {
    console.error('Get calendar event by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get calendar event',
      error: err.message,
    });
  }
}

/**
 * Update a calendar event
 * PUT /groups/:groupId/calendar/events/:eventId
 *
 * IMPORTANT: Updating an event updates its createdAt timestamp, moving it to the top
 * of the layering stack for responsibility events (as per user requirements)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function updateCalendarEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, eventId } = req.params;
    const {
      title,
      description,
      location,
      startTime,
      endTime,
      allDay,
      isRecurring,
      recurrenceRule,
      attendeeIds = [],
    } = req.body;

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

    // Supervisors and children cannot edit events
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors cannot edit calendar events',
      });
    }

    if (membership.role === 'child') {
      return res.status(403).json({
        success: false,
        message: 'Children cannot edit calendar events',
      });
    }

    // Get existing event
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { eventId: eventId },
    });

    if (!existingEvent || existingEvent.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Validate time range if provided
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time',
        });
      }
    }

    // TODO: Check if editing requires approval based on settings

    // Update the event
    // IMPORTANT: Update createdAt to current time (moves to top of layer stack)
    const updatedEvent = await prisma.calendarEvent.update({
      where: { eventId: eventId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(allDay !== undefined && { allDay }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurrenceRule !== undefined && { recurrenceRule }),
        createdAt: new Date(), // Update timestamp to move to top of layer stack
        attendees: attendeeIds.length > 0 ? {
          deleteMany: {},
          create: attendeeIds.map(attendeeId => ({
            groupMemberId: attendeeId,
          })),
        } : undefined,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
          },
        },
        attendees: {
          include: {
            member: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'update_calendar_event',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        actionLocation: 'calendar',
        messageContent: `Updated event "${updatedEvent.title}" (${eventId})`,
      },
    });

    return res.status(200).json({
      success: true,
      event: updatedEvent,
    });
  } catch (err) {
    console.error('Update calendar event error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update calendar event',
      error: err.message,
    });
  }
}

/**
 * Delete a calendar event (soft delete)
 * DELETE /groups/:groupId/calendar/events/:eventId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteCalendarEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, eventId } = req.params;

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

    // Supervisors and children cannot delete events
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors cannot delete calendar events',
      });
    }

    if (membership.role === 'child') {
      return res.status(403).json({
        success: false,
        message: 'Children cannot delete calendar events',
      });
    }

    // Get existing event
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { eventId: eventId },
    });

    if (!existingEvent || existingEvent.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Hard delete the event (calendar events don't support soft delete)
    await prisma.calendarEvent.delete({
      where: { eventId: eventId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'delete_calendar_event',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        actionLocation: 'calendar',
        messageContent: `Deleted event "${existingEvent.title}" (${eventId})`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (err) {
    console.error('Delete calendar event error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete calendar event',
      error: err.message,
    });
  }
}

/**
 * Detect overlapping responsibility events for a child in a given time range
 *
 * This utility implements the layering system where later-created events override earlier ones.
 * It returns information about what existing events will be overridden by a new event.
 *
 * @param {string} groupId - The group ID
 * @param {string} childId - The child's groupMemberId
 * @param {Date} newStartTime - Start time of the new event
 * @param {Date} newEndTime - End time of the new event
 * @param {string} [excludeEventId] - Optional event ID to exclude (for updates)
 * @returns {Promise<Object>} Object with overlaps array and warning message
 */
async function detectResponsibilityOverlaps(groupId, childId, newStartTime, newEndTime, excludeEventId = null) {
  try {
    // Query all existing responsibility events for this child in the overlapping time range
    const existingEvents = await prisma.childResponsibilityEvent.findMany({
      where: {
        childId: childId,
        event: {
          groupId: groupId,
          ...(excludeEventId ? { eventId: { not: excludeEventId } } : {}),
          OR: [
            // Event starts before new event ends AND ends after new event starts
            {
              AND: [
                { startTime: { lt: newEndTime } },
                { endTime: { gt: newStartTime } },
              ],
            },
          ],
        },
      },
      include: {
        event: true,
        child: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        startResponsibleMember: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        endResponsibleMember: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          createdAt: 'asc', // Sort by creation time (layering order)
        },
      },
    });

    if (existingEvents.length === 0) {
      return {
        hasOverlaps: false,
        overlaps: [],
        warningMessage: null,
      };
    }

    // Calculate overlap details for warning popup
    const overlaps = existingEvents.map((respEvent) => {
      const event = respEvent.event;

      // Calculate the overlapping time range
      const overlapStart = new Date(Math.max(new Date(event.startTime).getTime(), newStartTime.getTime()));
      const overlapEnd = new Date(Math.min(new Date(event.endTime).getTime(), newEndTime.getTime()));

      // Profile merging for child
      const childDisplayName = respEvent.child.user?.displayName || respEvent.child.displayName;
      const childIconLetters = respEvent.child.user?.memberIcon || respEvent.child.iconLetters;
      const childIconColor = respEvent.child.user?.iconColor || respEvent.child.iconColor;

      // Profile merging for responsible members
      const startResponsibleDisplayName = respEvent.startResponsibleMember.user?.displayName || respEvent.startResponsibleMember.displayName;
      const endResponsibleDisplayName = respEvent.endResponsibleMember?.user?.displayName || respEvent.endResponsibleMember?.displayName;

      return {
        eventId: event.eventId,
        eventTitle: event.title,
        eventStartTime: event.startTime,
        eventEndTime: event.endTime,
        eventCreatedAt: event.createdAt,
        overlapStartTime: overlapStart,
        overlapEndTime: overlapEnd,
        child: {
          groupMemberId: respEvent.child.groupMemberId,
          displayName: childDisplayName,
          iconLetters: childIconLetters,
          iconColor: childIconColor,
        },
        startResponsibleMember: {
          groupMemberId: respEvent.startResponsibleMember.groupMemberId,
          displayName: startResponsibleDisplayName,
        },
        endResponsibleMember: respEvent.endResponsibleMember ? {
          groupMemberId: respEvent.endResponsibleMember.groupMemberId,
          displayName: endResponsibleDisplayName,
        } : null,
      };
    });

    // Generate warning message for popup
    const childName = overlaps[0].child.displayName;
    const overlapCount = overlaps.length;

    let warningMessage = `This event will override ${overlapCount} existing responsibility event${overlapCount > 1 ? 's' : ''} for ${childName}:\n\n`;

    overlaps.forEach((overlap, index) => {
      const startTime = new Date(overlap.eventStartTime).toLocaleString();
      const endTime = new Date(overlap.eventEndTime).toLocaleString();
      const overlapStartTime = new Date(overlap.overlapStartTime).toLocaleString();
      const overlapEndTime = new Date(overlap.overlapEndTime).toLocaleString();

      warningMessage += `${index + 1}. "${overlap.eventTitle}"\n`;
      warningMessage += `   Original: ${startTime} → ${endTime}\n`;
      warningMessage += `   Overlap: ${overlapStartTime} → ${overlapEndTime}\n`;
      warningMessage += `   Start Responsible: ${overlap.startResponsibleMember.displayName}\n`;
      if (overlap.endResponsibleMember) {
        warningMessage += `   End Responsible: ${overlap.endResponsibleMember.displayName}\n`;
      }
      warningMessage += '\n';
    });

    warningMessage += 'The new event will be layered on top and take priority during the overlapping times.';

    return {
      hasOverlaps: true,
      overlaps: overlaps,
      warningMessage: warningMessage,
    };

  } catch (err) {
    console.error('Detect responsibility overlaps error:', err);
    throw err;
  }
}

/**
 * Create a child responsibility event
 * POST /groups/:groupId/calendar/responsibility-events
 *
 * Creates a responsibility event for a child with optional overlap detection warning.
 * Implements layering system where newer events override older ones.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createResponsibilityEvent(req, res) {
  try {
    const { groupId } = req.params;
    const {
      childId,
      startResponsibleMemberId,
      endResponsibleMemberId,
      changeTime,
      title,
      description,
      location,
      startTime,
      endTime,
      allDay,
      isRecurring,
      recurrenceRule,
      checkOverlaps = true, // Option to skip overlap check (frontend handles warning)
    } = req.body;

    // Validate required fields
    if (!childId || !startResponsibleMemberId || !title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: childId, startResponsibleMemberId, title, startTime, endTime',
      });
    }

    // Get current user's group membership
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Permission check: Supervisors and children cannot create responsibility events
    if (membership.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors cannot create responsibility events',
      });
    }

    if (membership.role === 'child') {
      return res.status(403).json({
        success: false,
        message: 'Children cannot create responsibility events',
      });
    }

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
    }

    // Validate that child exists in group
    const childMember = await prisma.groupMember.findUnique({
      where: { groupMemberId: childId },
    });

    if (!childMember || childMember.groupId !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Child does not exist in this group',
      });
    }

    // Validate that start responsible member exists in group
    const startResponsibleMember = await prisma.groupMember.findUnique({
      where: { groupMemberId: startResponsibleMemberId },
    });

    if (!startResponsibleMember || startResponsibleMember.groupId !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Start responsible member does not exist in this group',
      });
    }

    // Validate end responsible member if provided
    if (endResponsibleMemberId) {
      const endResponsibleMember = await prisma.groupMember.findUnique({
        where: { groupMemberId: endResponsibleMemberId },
      });

      if (!endResponsibleMember || endResponsibleMember.groupId !== groupId) {
        return res.status(400).json({
          success: false,
          message: 'End responsible member does not exist in this group',
        });
      }
    }

    // Check for overlaps if requested (Option A: warning popup)
    let overlapInfo = null;
    if (checkOverlaps) {
      overlapInfo = await detectResponsibilityOverlaps(groupId, childId, start, end);

      // If overlaps exist, return warning data to frontend for popup
      if (overlapInfo.hasOverlaps) {
        return res.status(200).json({
          success: false,
          requiresConfirmation: true,
          message: 'Overlapping responsibility events detected',
          overlapInfo: overlapInfo,
        });
      }
    }

    // Create the calendar event and responsibility event in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the calendar event
      const event = await tx.calendarEvent.create({
        data: {
          groupId: groupId,
          title: title,
          description: description || null,
          location: location || null,
          startTime: start,
          endTime: end,
          allDay: allDay || false,
          isRecurring: isRecurring || false,
          recurrenceRule: recurrenceRule || null,
          isResponsibilityEvent: true,
          createdBy: membership.groupMemberId,
        },
      });

      // Create the responsibility event
      const responsibilityEvent = await tx.childResponsibilityEvent.create({
        data: {
          eventId: event.eventId,
          childId: childId,
          startResponsibleMemberId: startResponsibleMemberId,
          endResponsibleMemberId: endResponsibleMemberId || null,
          changeTime: changeTime ? new Date(changeTime) : null,
        },
        include: {
          event: true,
          child: {
            select: {
              groupMemberId: true,
              displayName: true,
              iconLetters: true,
              iconColor: true,
              user: {
                select: {
                  displayName: true,
                  memberIcon: true,
                  iconColor: true,
                },
              },
            },
          },
          startResponsibleMember: {
            select: {
              groupMemberId: true,
              displayName: true,
              iconLetters: true,
              iconColor: true,
              user: {
                select: {
                  displayName: true,
                  memberIcon: true,
                  iconColor: true,
                },
              },
            },
          },
          endResponsibleMember: endResponsibleMemberId ? {
            select: {
              groupMemberId: true,
              displayName: true,
              iconLetters: true,
              iconColor: true,
              user: {
                select: {
                  displayName: true,
                  memberIcon: true,
                  iconColor: true,
                },
              },
            },
          } : undefined,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          groupId: groupId,
          action: 'create_responsibility_event',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: membership.email || 'N/A',
          actionLocation: 'calendar',
          messageContent: `Created responsibility event "${title}" for child ${childMember.displayName} from ${startTime} to ${endTime}. Start responsible: ${startResponsibleMember.displayName}${endResponsibleMemberId ? `, End responsible: ${(await tx.groupMember.findUnique({ where: { groupMemberId: endResponsibleMemberId } })).displayName}` : ''}`,
        },
      });

      return responsibilityEvent;
    });

    // Profile merging for response
    const childDisplayName = result.child.user?.displayName || result.child.displayName;
    const childIconLetters = result.child.user?.memberIcon || result.child.iconLetters;
    const childIconColor = result.child.user?.iconColor || result.child.iconColor;

    const startResponsibleDisplayName = result.startResponsibleMember.user?.displayName || result.startResponsibleMember.displayName;
    const startResponsibleIconLetters = result.startResponsibleMember.user?.memberIcon || result.startResponsibleMember.iconLetters;
    const startResponsibleIconColor = result.startResponsibleMember.user?.iconColor || result.startResponsibleMember.iconColor;

    const endResponsibleDisplayName = result.endResponsibleMember?.user?.displayName || result.endResponsibleMember?.displayName;
    const endResponsibleIconLetters = result.endResponsibleMember?.user?.memberIcon || result.endResponsibleMember?.iconLetters;
    const endResponsibleIconColor = result.endResponsibleMember?.user?.iconColor || result.endResponsibleMember?.iconColor;

    return res.status(201).json({
      success: true,
      message: 'Responsibility event created successfully',
      responsibilityEvent: {
        responsibilityEventId: result.responsibilityEventId,
        eventId: result.eventId,
        event: result.event,
        child: {
          groupMemberId: result.child.groupMemberId,
          displayName: childDisplayName,
          iconLetters: childIconLetters,
          iconColor: childIconColor,
        },
        startResponsibleMember: {
          groupMemberId: result.startResponsibleMember.groupMemberId,
          displayName: startResponsibleDisplayName,
          iconLetters: startResponsibleIconLetters,
          iconColor: startResponsibleIconColor,
        },
        endResponsibleMember: result.endResponsibleMember ? {
          groupMemberId: result.endResponsibleMember.groupMemberId,
          displayName: endResponsibleDisplayName,
          iconLetters: endResponsibleIconLetters,
          iconColor: endResponsibleIconColor,
        } : null,
        changeTime: result.changeTime,
      },
    });

  } catch (err) {
    console.error('Create responsibility event error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create responsibility event',
      error: err.message,
    });
  }
}

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  getCalendarEventById,
  updateCalendarEvent,
  deleteCalendarEvent,
  createResponsibilityEvent,
  detectResponsibilityOverlaps, // Export for testing
};
