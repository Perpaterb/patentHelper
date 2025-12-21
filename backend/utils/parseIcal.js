/**
 * iCal Parsing Utility
 *
 * Parses iCal (.ics) files and URLs to extract calendar events.
 * Uses ical.js (Mozilla's iCal library) for RFC 5545 compliance.
 */

const ICAL = require('ical.js');

/**
 * Parse iCal data from a string
 * @param {string} icalData - Raw iCal data string
 * @returns {Object[]} Array of parsed events
 */
function parseIcalString(icalData) {
  try {
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // Get UID (required for tracking changes)
      const uid = event.uid || `generated-${Date.now()}-${Math.random()}`;

      // Get title
      const title = event.summary || 'Untitled Event';

      // Get description
      const description = event.description || null;

      // Get location
      const location = event.location || null;

      // Get start and end times
      let startTime, endTime;
      let isAllDay = false;

      if (event.startDate) {
        isAllDay = event.startDate.isDate;
        startTime = event.startDate.toJSDate();
      }

      if (event.endDate) {
        endTime = event.endDate.toJSDate();
      } else if (event.duration && startTime) {
        // Calculate end time from duration
        const durationMs = event.duration.toSeconds() * 1000;
        endTime = new Date(startTime.getTime() + durationMs);
      } else if (startTime) {
        // Default to 1 hour duration
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      }

      // Skip events without valid dates
      if (!startTime || !endTime) {
        console.warn(`Skipping event "${title}" - missing dates`);
        continue;
      }

      // Get recurrence rule if present
      let recurrenceRule = null;
      const rruleProp = vevent.getFirstProperty('rrule');
      if (rruleProp) {
        recurrenceRule = rruleProp.toICALString();
      }

      events.push({
        externalUid: uid,
        title,
        description,
        location,
        startTime,
        endTime,
        isAllDay,
        recurrenceRule,
      });
    }

    return events;
  } catch (error) {
    console.error('Error parsing iCal data:', error);
    throw new Error(`Failed to parse iCal data: ${error.message}`);
  }
}

/**
 * Fetch and parse iCal data from a URL
 * @param {string} url - iCal URL
 * @returns {Promise<Object[]>} Array of parsed events
 */
async function parseIcalUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/calendar, application/calendar+xml, application/ics',
        'User-Agent': 'FamilyHelper/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal URL: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();
    return parseIcalString(icalData);
  } catch (error) {
    console.error('Error fetching iCal URL:', error);
    throw error;
  }
}

/**
 * Validate an iCal URL by attempting to fetch and parse it
 * @param {string} url - iCal URL to validate
 * @returns {Promise<{valid: boolean, eventCount: number, error?: string}>}
 */
async function validateIcalUrl(url) {
  try {
    const events = await parseIcalUrl(url);
    return {
      valid: true,
      eventCount: events.length,
    };
  } catch (error) {
    return {
      valid: false,
      eventCount: 0,
      error: error.message,
    };
  }
}

module.exports = {
  parseIcalString,
  parseIcalUrl,
  validateIcalUrl,
};
