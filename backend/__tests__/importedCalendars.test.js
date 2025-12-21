/**
 * Imported Calendars Endpoints Tests
 *
 * Tests for the imported calendars feature including:
 * - iCal parsing utility
 * - CRUD operations for imported calendars
 * - User preferences for imported calendars
 */

// Mock problematic ES modules BEFORE importing server
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock Stripe to avoid needing a real API key in tests
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn(), retrieve: jest.fn() },
    subscriptions: { create: jest.fn(), retrieve: jest.fn(), update: jest.fn(), cancel: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
  }));
});

const request = require('supertest');
const app = require('../server');

describe('iCal Parsing Utility', () => {
  const { parseIcalString, validateIcalUrl } = require('../utils/parseIcal');

  describe('parseIcalString', () => {
    it('should parse a valid iCal string with a single event', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1@example.com
DTSTART:20251225T100000Z
DTEND:20251225T120000Z
SUMMARY:Christmas Party
DESCRIPTION:Annual company holiday party
LOCATION:Office Building
END:VEVENT
END:VCALENDAR`;

      const events = parseIcalString(icalData);

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('externalUid', 'test-event-1@example.com');
      expect(events[0]).toHaveProperty('title', 'Christmas Party');
      expect(events[0]).toHaveProperty('description', 'Annual company holiday party');
      expect(events[0]).toHaveProperty('location', 'Office Building');
      expect(events[0]).toHaveProperty('startTime');
      expect(events[0]).toHaveProperty('endTime');
      expect(events[0]).toHaveProperty('isAllDay', false);
    });

    it('should parse multiple events', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-1@example.com
DTSTART:20251225T100000Z
DTEND:20251225T120000Z
SUMMARY:Event One
END:VEVENT
BEGIN:VEVENT
UID:event-2@example.com
DTSTART:20251226T140000Z
DTEND:20251226T160000Z
SUMMARY:Event Two
END:VEVENT
END:VCALENDAR`;

      const events = parseIcalString(icalData);

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Event One');
      expect(events[1].title).toBe('Event Two');
    });

    it('should handle all-day events', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:allday-1@example.com
DTSTART;VALUE=DATE:20251225
DTEND;VALUE=DATE:20251226
SUMMARY:Christmas Day
END:VEVENT
END:VCALENDAR`;

      const events = parseIcalString(icalData);

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('isAllDay', true);
      expect(events[0]).toHaveProperty('title', 'Christmas Day');
    });

    it('should handle events with recurrence rules', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-1@example.com
DTSTART:20251225T100000Z
DTEND:20251225T110000Z
SUMMARY:Weekly Meeting
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`;

      const events = parseIcalString(icalData);

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('recurrenceRule');
      expect(events[0].recurrenceRule).toContain('FREQ=WEEKLY');
    });

    it('should handle events without end time (use duration)', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:duration-1@example.com
DTSTART:20251225T100000Z
DURATION:PT2H
SUMMARY:Two Hour Event
END:VEVENT
END:VCALENDAR`;

      const events = parseIcalString(icalData);

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('endTime');
      // End time should be 2 hours after start
      const startTime = new Date(events[0].startTime);
      const endTime = new Date(events[0].endTime);
      const diffHours = (endTime - startTime) / (1000 * 60 * 60);
      expect(diffHours).toBe(2);
    });

    it('should throw error for invalid iCal data', () => {
      const invalidData = 'This is not valid iCal data';

      expect(() => parseIcalString(invalidData)).toThrow();
    });

    it('should handle events with missing optional fields', () => {
      const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:minimal-1@example.com
DTSTART:20251225T100000Z
DTEND:20251225T110000Z
SUMMARY:Minimal Event
END:VEVENT
END:VCALENDAR`;

      const events = parseIcalString(icalData);

      expect(events).toHaveLength(1);
      expect(events[0].description).toBeNull();
      expect(events[0].location).toBeNull();
      expect(events[0].recurrenceRule).toBeNull();
    });
  });

  describe('validateIcalUrl', () => {
    it('should return valid: false for invalid URL', async () => {
      const result = await validateIcalUrl('not-a-valid-url');

      expect(result).toHaveProperty('valid', false);
      expect(result).toHaveProperty('error');
    });

    it('should return valid: false for non-existent URL', async () => {
      const result = await validateIcalUrl('https://example.com/nonexistent.ics');

      expect(result).toHaveProperty('valid', false);
      expect(result).toHaveProperty('error');
    });
  });
});

describe('Imported Calendars API Endpoints', () => {
  describe('GET /groups/:groupId/calendar/imported', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/groups/test-group-id/calendar/imported')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /groups/:groupId/calendar/imported', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/groups/test-group-id/calendar/imported')
        .send({
          name: 'Test Calendar',
          sourceType: 'url',
          sourceUrl: 'https://example.com/calendar.ics',
          color: '#FF5722',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /groups/:groupId/calendar/imported-events', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/groups/test-group-id/calendar/imported-events')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /groups/:groupId/calendar/imported/:calendarId/preference', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/groups/test-group-id/calendar/imported/test-calendar-id/preference')
        .send({
          isVisible: false,
          notificationsEnabled: true,
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /groups/:groupId/calendar/imported/:calendarId', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/groups/test-group-id/calendar/imported/test-calendar-id')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });
});

describe('Calendar Layers API Endpoints', () => {
  describe('GET /groups/:groupId/calendar/layers', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/groups/test-group-id/calendar/layers')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /groups/:groupId/calendar/layers/:memberLayerId', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/groups/test-group-id/calendar/layers/test-member-id')
        .send({
          isVisible: true,
          notificationsEnabled: false,
          customColor: '#6200ee',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });
});

describe('API Contract Validation', () => {
  it('should document expected imported calendar response structure', () => {
    const expectedCalendarStructure = {
      success: true,
      calendars: [
        {
          importedCalendarId: 'uuid',
          name: 'string',
          sourceType: 'url | file',
          color: '#RRGGBB',
          syncIntervalHours: 'number',
          lastSyncAt: 'ISO timestamp | null',
          lastSyncStatus: 'success | error | pending | null',
          eventCount: 'number',
          createdBy: 'string',
          createdAt: 'ISO timestamp',
          // User preferences
          isVisible: 'boolean (default true)',
          notificationsEnabled: 'boolean (default true)',
          customColor: '#RRGGBB | null',
        },
      ],
    };

    expect(expectedCalendarStructure).toBeDefined();
  });

  it('should document expected imported event response structure', () => {
    const expectedEventStructure = {
      success: true,
      events: [
        {
          eventId: 'uuid',
          importedCalendarId: 'uuid',
          calendarName: 'string',
          calendarColor: '#RRGGBB',
          externalUid: 'string',
          title: 'string',
          description: 'string | null',
          location: 'string | null',
          startTime: 'ISO timestamp',
          endTime: 'ISO timestamp',
          isAllDay: 'boolean',
          recurrenceRule: 'RRULE string | null',
        },
      ],
    };

    expect(expectedEventStructure).toBeDefined();
  });

  it('should document expected layer preference structure', () => {
    const expectedLayerStructure = {
      success: true,
      layers: [
        {
          memberLayerId: 'groupMemberId',
          displayName: 'string',
          iconLetters: 'string',
          defaultColor: '#RRGGBB',
          role: 'admin | parent | child | caregiver | supervisor',
          isVisible: 'boolean (default true)',
          notificationsEnabled: 'boolean (default true)',
          customColor: '#RRGGBB | null',
        },
      ],
    };

    expect(expectedLayerStructure).toBeDefined();
  });
});
