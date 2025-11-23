# Parenting Helper API Documentation

**Version**: 1.0
**Base URL**: `http://localhost:3000` (development)
**Authentication**: Bearer token in `Authorization` header

## ⚠️ CRITICAL RULES

1. **NEVER change endpoint response structures without updating this file first**
2. **ALWAYS update this file when adding new endpoints**
3. **Test changes against ALL 3 products** (web-admin, mobile-main, mobile-messenger)
4. **This file is the single source of truth for API contracts**

If an endpoint is missing or incorrect, **FIX THIS FILE FIRST**, then update code to match.

---

## Table of Contents

- [Authentication](#authentication)
- [Subscriptions](#subscriptions)
- [Groups](#groups)
- [Invitations](#invitations)
- [Messages](#messages)
- [Calendar](#calendar)
- [Files](#files)
- [Audit Logs](#audit-logs)
- [Wiki Documents](#wiki-documents)
- [Group Documents](#group-documents)
- [Gift Registries](#gift-registries)
- [Item Registries](#item-registries)
- [Secret Santa](#secret-santa)
- [Finance Matters](#finance-matters)

---

## Authentication

### POST /auth/exchange

Exchange Kinde authorization code for access tokens.

**Used by**: All 3 products

**Request**:
```json
{
  "code": "string"
}
```

**Response** (200):
```json
{
  "success": true,
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600,
  "user": {
    "userId": "uuid",
    "email": "string"
  }
}
```

---

## Subscriptions

### GET /subscriptions/pricing

Get subscription pricing information.

**Used by**: web-admin

**Authentication**: None (public)

**Response** (200):
```json
{
  "success": true,
  "pricing": {
    "adminSubscription": {
      "priceId": "string",
      "name": "Admin Subscription",
      "amount": 800,
      "currency": "usd",
      "interval": "month",
      "description": "string"
    },
    "additionalStorage": {
      "priceId": "string",
      "name": "Additional Storage",
      "amount": 100,
      "currency": "usd",
      "interval": "month",
      "unit": "GB",
      "description": "string"
    }
  }
}
```

**NOTE**: Amounts are in cents (800 = $8.00)

---

### GET /subscriptions/current

Get current user's subscription details.

**Used by**: web-admin, mobile-main

**Authentication**: Required

**Response** (200) - Active:
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "isSubscribed": true,
    "plan": "Pro",
    "price": 19.99,
    "interval": "month",
    "status": "active",
    "currentPeriodEnd": "2025-11-23T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "createdAt": "2025-10-21T00:00:00.000Z"
  }
}
```

**Response** (200) - Trial:
```json
{
  "success": true,
  "subscription": {
    "isActive": false,
    "isSubscribed": false,
    "plan": "Free Trial",
    "status": "trial",
    "daysRemaining": 15,
    "trialEndsAt": "2025-11-07T00:00:00.000Z",
    "createdAt": "2025-10-21T00:00:00.000Z"
  }
}
```

---

### POST /subscriptions/cancel

Cancel subscription at end of current billing period.

**Used by**: web-admin

**Authentication**: Required

**Request**: None (empty body)

**Response** (200):
```json
{
  "success": true,
  "message": "Subscription will be canceled at end of billing period",
  "cancelAt": "2025-11-23T00:00:00.000Z"
}
```

**Response** (400):
```json
{
  "error": "No active subscription",
  "message": "You don't have an active subscription to cancel"
}
```

---

### POST /subscriptions/reactivate

Reactivate a subscription that was canceled but still active until period end.

**Used by**: web-admin

**Authentication**: Required

**Request**: None (empty body)

**Response** (200):
```json
{
  "success": true,
  "message": "Subscription reactivated successfully"
}
```

**Response** (400):
```json
{
  "error": "Cannot reactivate",
  "message": "Subscription is not scheduled for cancellation"
}
```

---

### GET /subscriptions/status

Simple subscription status check.

**Used by**: All mobile apps

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "email": "user@example.com"
  }
}
```

---

## Groups

### GET /groups

Get all groups where user is a member.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "groups": [
    {
      "groupId": "uuid",
      "name": "Family Group",
      "icon": "👨‍👩‍👧‍👦",
      "backgroundColor": "#6200ee",
      "role": "admin",
      "isMuted": false
    }
  ]
}
```

---

### POST /groups

Create a new group.

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "name": "Family Group",
  "icon": "👨‍👩‍👧‍👦",
  "backgroundColor": "#6200ee"
}
```

**Response** (201):
```json
{
  "success": true,
  "group": {
    "groupId": "uuid",
    "name": "Family Group",
    "icon": "👨‍👩‍👧‍👦",
    "backgroundColor": "#6200ee",
    "members": [...]
  }
}
```

---

## Invitations

### GET /invitations

Get pending invitations for current user.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "invitations": [
    {
      "groupMemberId": "uuid",
      "groupId": "uuid",
      "groupName": "Family Group",
      "groupIcon": "👨‍👩‍👧‍👦",
      "groupBackgroundColor": "#6200ee",
      "role": "parent",
      "invitedByName": "John Doe",
      "joinedAt": "2025-10-23T00:00:00.000Z"
    }
  ]
}
```

---

### GET /invitations/count

Get count of pending invitations.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "count": 3
}
```

---

### POST /invitations/:groupMemberId/accept

Accept invitation.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "message": "Invitation accepted"
}
```

---

### POST /invitations/:groupMemberId/decline

Decline invitation.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "message": "Invitation declined"
}
```

---

## Messages

### GET /groups/:groupId/message-groups

Get all message groups for a group where user is a member.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "messageGroups": [
    {
      "messageGroupId": "uuid",
      "groupId": "uuid",
      "name": "Family Chat",
      "createdBy": "uuid",
      "lastMessageAt": "2025-10-23T12:00:00.000Z",
      "unreadCount": 5,
      "unreadMentionsCount": 2,
      "members": [
        {
          "groupMemberId": "uuid",
          "groupMember": {
            "displayName": "John Doe",
            "iconLetters": "JD",
            "iconColor": "#6200ee"
          }
        }
      ],
      "_count": {
        "messages": 42,
        "members": 3
      }
    }
  ]
}
```

---

### POST /groups/:groupId/message-groups

Create a new message group.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Request**:
```json
{
  "name": "Family Chat",
  "memberIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Message group created successfully",
  "messageGroup": {
    "messageGroupId": "uuid",
    "groupId": "uuid",
    "name": "Family Chat",
    "createdBy": "uuid",
    "members": [...]
  }
}
```

---

### GET /groups/:groupId/message-groups/:messageGroupId

Get a specific message group details.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "messageGroup": {
    "messageGroupId": "uuid",
    "groupId": "uuid",
    "name": "Family Chat",
    "createdBy": "uuid",
    "lastMessageAt": "2025-10-23T12:00:00.000Z",
    "members": [...],
    "_count": {
      "messages": 42
    }
  },
  "userRole": "admin",
  "currentGroupMemberId": "uuid"
}
```

---

### GET /groups/:groupId/message-groups/:messageGroupId/messages

Get messages for a message group with pagination.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Query Parameters**:
- `limit` (optional, default: 50): Number of messages to return
- `before` (optional): ISO timestamp - get messages before this time

**Response** (200):
```json
{
  "success": true,
  "messages": [
    {
      "messageId": "uuid",
      "messageGroupId": "uuid",
      "content": "Hello @John Doe!",
      "mentions": ["uuid"],
      "isHidden": false,
      "createdAt": "2025-10-23T12:00:00.000Z",
      "sender": {
        "groupMemberId": "uuid",
        "displayName": "Jane Doe",
        "iconLetters": "JD",
        "iconColor": "#6200ee",
        "role": "admin"
      },
      "readReceipts": [
        {
          "groupMemberId": "uuid",
          "readAt": "2025-10-23T12:05:00.000Z",
          "displayName": "John Doe",
          "iconLetters": "JD",
          "iconColor": "#ff5722"
        }
      ]
    }
  ],
  "hasMore": true
}
```

**Read Receipts Implementation:**
- Array of members who have read the message
- Empty array if no one has read it yet
- Sender's own messages won't have their read receipt
- **CRITICAL**: Only REGISTERED members (`isRegistered === true`) count toward read receipt calculations
- Unregistered members (created by admins but not yet logged in) are excluded from "read by all" calculations
- Frontend uses 4-state diamond system:
  - `◇` (1 gray) = Sending (no messageId yet)
  - `◇◇` (2 gray) = Delivered (messageId exists, no readReceipts)
  - `◆◇` (blue+gray) = Read by some registered members
  - `◆◆` (2 blue) = Read by all registered members

---

### POST /groups/:groupId/message-groups/:messageGroupId/messages

Send a message to a message group.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Request**:
```json
{
  "content": "Hello @John Doe!",
  "mentions": ["uuid"]
}
```

**Response** (201):
```json
{
  "success": true,
  "message": {
    "messageId": "uuid",
    "messageGroupId": "uuid",
    "content": "Hello @John Doe!",
    "mentions": ["uuid"],
    "createdAt": "2025-10-23T12:00:00.000Z",
    "sender": {...}
  }
}
```

**Note**: Supervisors cannot send messages (403 error)

---

### PUT /groups/:groupId/message-groups/:messageGroupId/mark-read

Mark all messages in a message group as read.

**Used by**: mobile-main, mobile-messenger

**Authentication**: Required

**Request**: None (empty body)

**Response** (200):
```json
{
  "success": true,
  "message": "Marked as read",
  "messagesRead": 15
}
```

**Behavior**:
- Creates `MessageReadReceipt` records for all unread messages
- Creates audit log entry with message IDs (for admin exports)
- Updates `lastReadAt` timestamp for the message group member
- Doesn't create read receipts for user's own messages

---

## Calendar

### GET /groups/:groupId/calendar/events

Get calendar events for a group with optional date range filtering.

**Used by**: mobile-main

**Authentication**: Required

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string (e.g., "2025-10-01T00:00:00.000Z")
- `endDate` (optional): ISO 8601 date string (e.g., "2025-10-31T23:59:59.999Z")

**Response** (200):
```json
{
  "success": true,
  "events": [
    {
      "eventId": "uuid",
      "groupId": "uuid",
      "title": "Soccer Practice",
      "description": "Weekly soccer practice at the park",
      "location": "Central Park",
      "startTime": "2025-10-25T15:00:00.000Z",
      "endTime": "2025-10-25T17:00:00.000Z",
      "allDay": false,
      "isRecurring": false,
      "recurrenceRule": null,
      "isResponsibilityEvent": false,
      "isHidden": false,
      "createdAt": "2025-10-20T10:00:00.000Z",
      "updatedAt": "2025-10-20T10:00:00.000Z",
      "createdBy": "uuid",
      "creator": {
        "groupMemberId": "uuid",
        "displayName": "Mom",
        "iconLetters": "M",
        "iconColor": "#6200ee"
      },
      "attendees": [
        {
          "groupMemberId": "uuid",
          "displayName": "John",
          "iconLetters": "J",
          "iconColor": "#03dac6"
        }
      ],
      "responsibilityEvents": []
    }
  ]
}
```

**Notes**:
- Events are sorted by `createdAt` ASC (important for layering logic)
- Includes profile merging: User global profile takes precedence
- Supervisors: No access to calendar
- Children: View only

---

### POST /groups/:groupId/calendar/events

Create a new calendar event.

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "title": "Team Meeting",
  "description": "Monthly planning meeting",
  "location": "Conference Room A",
  "startTime": "2025-10-30T14:00:00.000Z",
  "endTime": "2025-10-30T15:00:00.000Z",
  "allDay": false,
  "isRecurring": false,
  "recurrenceRule": null,
  "attendeeIds": ["uuid1", "uuid2"]
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Calendar event created successfully",
  "event": {
    "eventId": "uuid",
    "title": "Team Meeting",
    "startTime": "2025-10-30T14:00:00.000Z",
    "endTime": "2025-10-30T15:00:00.000Z",
    "createdBy": "uuid",
    "creator": {
      "displayName": "Mom"
    },
    "attendees": [...]
  }
}
```

**Permissions**:
- Supervisors: Blocked
- Children: Blocked
- Parents/Caregivers/Admins: Allowed

---

### GET /groups/:groupId/calendar/events/:eventId

Get a single calendar event by ID.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "event": {
    "eventId": "uuid",
    "title": "Soccer Practice",
    "startTime": "2025-10-25T15:00:00.000Z",
    "endTime": "2025-10-25T17:00:00.000Z",
    "creator": {...},
    "attendees": [...],
    "responsibilityEvents": [...]
  }
}
```

---

### PUT /groups/:groupId/calendar/events/:eventId

Update an existing calendar event.

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "title": "Updated Title",
  "startTime": "2025-10-30T15:00:00.000Z",
  "endTime": "2025-10-30T16:00:00.000Z",
  "attendeeIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Calendar event updated successfully",
  "event": {
    "eventId": "uuid",
    "title": "Updated Title",
    "createdAt": "2025-10-30T12:00:00.000Z",
    "updatedAt": "2025-10-30T12:00:00.000Z"
  }
}
```

**IMPORTANT - Layering System**:
- Editing an event updates the `createdAt` timestamp
- This moves the event to the top of the layer stack
- Later-created events override earlier ones in responsibility overlaps

---

### DELETE /groups/:groupId/calendar/events/:eventId

Soft delete a calendar event (sets `isHidden` flag).

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "message": "Calendar event deleted successfully"
}
```

**Behavior**:
- Soft delete: Sets `isHidden = true`
- Preserves event in database for audit trail
- Event no longer appears in GET requests
- Responsibility events: When deleted, previous layer automatically shows

---

### POST /groups/:groupId/calendar/responsibility-events

Create a child responsibility event with overlap detection.

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "childId": "uuid",
  "startResponsibleMemberId": "uuid",
  "endResponsibleMemberId": "uuid",
  "changeTime": "2025-10-27T18:00:00.000Z",
  "title": "Weekend with Mom",
  "description": "Custody weekend",
  "location": "Mom's House",
  "startTime": "2025-10-25T18:00:00.000Z",
  "endTime": "2025-10-27T18:00:00.000Z",
  "allDay": false,
  "isRecurring": false,
  "recurrenceRule": null,
  "checkOverlaps": true
}
```

**Response - No Overlaps** (201):
```json
{
  "success": true,
  "message": "Responsibility event created successfully",
  "responsibilityEvent": {
    "responsibilityEventId": "uuid",
    "eventId": "uuid",
    "event": {...},
    "child": {
      "groupMemberId": "uuid",
      "displayName": "John",
      "iconLetters": "J",
      "iconColor": "#03dac6"
    },
    "startResponsibleMember": {
      "groupMemberId": "uuid",
      "displayName": "Mom"
    },
    "endResponsibleMember": {
      "groupMemberId": "uuid",
      "displayName": "Dad"
    },
    "changeTime": "2025-10-27T18:00:00.000Z"
  }
}
```

**Response - Overlaps Detected (Warning)** (200):
```json
{
  "success": false,
  "requiresConfirmation": true,
  "message": "Overlapping responsibility events detected",
  "overlapInfo": {
    "hasOverlaps": true,
    "overlaps": [
      {
        "eventId": "uuid",
        "eventTitle": "School Week with Dad",
        "eventStartTime": "2025-10-21T18:00:00.000Z",
        "eventEndTime": "2025-10-28T18:00:00.000Z",
        "eventCreatedAt": "2025-10-15T10:00:00.000Z",
        "overlapStartTime": "2025-10-25T18:00:00.000Z",
        "overlapEndTime": "2025-10-27T18:00:00.000Z",
        "child": {
          "displayName": "John"
        },
        "startResponsibleMember": {
          "displayName": "Dad"
        },
        "endResponsibleMember": null
      }
    ],
    "warningMessage": "This event will override 1 existing responsibility event for John:\n\n1. \"School Week with Dad\"\n   Original: 10/21/2025, 6:00 PM → 10/28/2025, 6:00 PM\n   Overlap: 10/25/2025, 6:00 PM → 10/27/2025, 6:00 PM\n   Start Responsible: Dad\n\nThe new event will be layered on top and take priority during the overlapping times."
  }
}
```

**Layering System (Option A)**:
1. **First Call** with `checkOverlaps: true`:
   - Backend detects overlaps
   - Returns `requiresConfirmation: true` with warning data
   - NO event created yet

2. **User Confirms** in warning popup

3. **Second Call** with `checkOverlaps: false`:
   - Backend creates event without checking
   - Event is layered on top (by `createdAt` timestamp)
   - Returns success with created event

**Permissions**:
- Supervisors: Blocked
- Children: Blocked
- Parents/Caregivers/Admins: Allowed

**Behavior**:
- Creates both `CalendarEvent` and `ChildResponsibilityEvent`
- Sets `isResponsibilityEvent = true` on calendar event
- Audit logs all responsibility event actions
- Layering: Later-created events override earlier ones

---

## Product-Specific Usage

### Web Admin (web-admin/)
- `/auth/exchange`
- `/subscriptions/*` (all)
- `/logs/export`

### Parenting Helper (mobile-main/)
- `/auth/exchange`
- `/subscriptions/current`, `/subscriptions/status`
- `/groups/*` (all)
- `/invitations/*` (all)
- `/messages/*` (all)

### PH Messenger (mobile-messenger/)
- `/auth/exchange`
- `/groups` (read-only)
- `/messages/*` (all)

---

## Data Types

- **UUID**: v4 format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Timestamps**: ISO 8601 `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Roles**: `admin`, `parent`, `child`, `caregiver`, `supervisor`
- **Currency amounts**: In cents (100 = $1.00)

---

## Wiki Documents

### GET /groups/:groupId/wiki-documents

Get all wiki documents for a group.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "documents": [
    {
      "documentId": "uuid",
      "title": "Family Rules",
      "content": "# Rules\n\n1. Be kind...",
      "createdAt": "2025-10-23T00:00:00.000Z",
      "updatedAt": "2025-10-23T00:00:00.000Z",
      "isHidden": false,
      "creator": {
        "groupMemberId": "uuid",
        "displayName": "John Doe",
        "iconLetters": "JD",
        "iconColor": "#6200ee"
      }
    }
  ]
}
```

---

### GET /groups/:groupId/wiki-documents/search

Search wiki documents by title or content.

**Used by**: mobile-main

**Authentication**: Required

**Query Parameters**:
- `q`: Search query string

**Response** (200):
```json
{
  "success": true,
  "documents": [...]
}
```

---

### GET /groups/:groupId/wiki-documents/:documentId

Get a single wiki document with revision history.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "document": {
    "documentId": "uuid",
    "title": "Family Rules",
    "content": "# Rules\n\n1. Be kind...",
    "createdAt": "2025-10-23T00:00:00.000Z",
    "updatedAt": "2025-10-24T00:00:00.000Z",
    "creator": {...},
    "revisions": [
      {
        "revisionId": "uuid",
        "title": "Family Rules",
        "content": "# Rules (original)",
        "editedAt": "2025-10-23T00:00:00.000Z",
        "editor": {...}
      }
    ]
  }
}
```

---

### POST /groups/:groupId/wiki-documents

Create a new wiki document.

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "title": "Family Rules",
  "content": "# Rules\n\n1. Be kind to each other"
}
```

**Response** (201):
```json
{
  "success": true,
  "document": {
    "documentId": "uuid",
    "title": "Family Rules",
    "content": "...",
    "createdAt": "2025-10-23T00:00:00.000Z"
  }
}
```

---

### PUT /groups/:groupId/wiki-documents/:documentId

Update a wiki document (creates revision history).

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "title": "Family Rules (Updated)",
  "content": "# Updated Rules\n\n1. Be kind..."
}
```

**Response** (200):
```json
{
  "success": true,
  "document": {
    "documentId": "uuid",
    "title": "Family Rules (Updated)",
    "updatedAt": "2025-10-24T00:00:00.000Z"
  }
}
```

---

### DELETE /groups/:groupId/wiki-documents/:documentId

Soft delete a wiki document.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Group Documents

Secure document storage for groups. All operations are audit logged.

### GET /groups/:groupId/documents

Get all documents for a group.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "documents": [
    {
      "documentId": "uuid",
      "fileName": "custody_agreement.pdf",
      "fileId": "uuid",
      "fileSizeBytes": 245760,
      "mimeType": "application/pdf",
      "uploadedAt": "2025-10-23T00:00:00.000Z",
      "isHidden": false,
      "hiddenAt": null,
      "hiddenByName": null,
      "uploader": {
        "groupMemberId": "uuid",
        "displayName": "John Doe",
        "iconLetters": "JD",
        "iconColor": "#6200ee",
        "profilePhotoUrl": "http://..."
      }
    }
  ]
}
```

**Notes**:
- Non-admins don't see hidden documents
- Admins see all documents including hidden ones

---

### POST /groups/:groupId/documents

Upload a document record (file should already be uploaded to /files).

**Used by**: mobile-main

**Authentication**: Required

**Request**:
```json
{
  "fileName": "custody_agreement.pdf",
  "fileId": "uuid",
  "fileSizeBytes": 245760,
  "mimeType": "application/pdf"
}
```

**Response** (201):
```json
{
  "success": true,
  "document": {
    "documentId": "uuid",
    "fileName": "custody_agreement.pdf",
    "fileId": "uuid",
    "fileSizeBytes": 245760,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-10-23T00:00:00.000Z",
    "isHidden": false,
    "uploader": {...}
  }
}
```

**Notes**:
- Supervisors cannot upload documents

---

### GET /groups/:groupId/documents/:documentId

Get a single document's info for download.

**Used by**: mobile-main

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "document": {
    "documentId": "uuid",
    "fileName": "custody_agreement.pdf",
    "fileId": "uuid",
    "fileSizeBytes": 245760,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-10-23T00:00:00.000Z",
    "uploaderName": "John Doe"
  }
}
```

**Notes**:
- Creates audit log for download
- Non-admins cannot access hidden documents

---

### PUT /groups/:groupId/documents/:documentId/hide

Hide a document (admin only).

**Used by**: mobile-main

**Authentication**: Required (Admin)

**Response** (200):
```json
{
  "success": true,
  "message": "Document hidden successfully"
}
```

---

### PUT /groups/:groupId/documents/:documentId/unhide

Unhide a document (admin only).

**Used by**: mobile-main

**Authentication**: Required (Admin)

**Response** (200):
```json
{
  "success": true,
  "message": "Document unhidden successfully"
}
```

---

### DELETE /groups/:groupId/documents/:documentId

Delete a document (admin only).

**Used by**: mobile-main

**Authentication**: Required (Admin)

**Response** (200):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Gift Registries

See `backend/controllers/giftRegistry.controller.js` for full endpoint documentation.

Key endpoints:
- `GET /groups/:groupId/gift-registries` - List all registries
- `POST /groups/:groupId/gift-registries` - Create registry
- `GET /groups/:groupId/gift-registries/:registryId` - Get registry with items
- `PUT /groups/:groupId/gift-registries/:registryId` - Update registry
- `DELETE /groups/:groupId/gift-registries/:registryId` - Delete registry
- `POST /groups/:groupId/gift-registries/:registryId/items` - Add item
- `PUT /groups/:groupId/gift-registries/:registryId/items/:itemId` - Update item
- `DELETE /groups/:groupId/gift-registries/:registryId/items/:itemId` - Delete item
- `POST /groups/:groupId/gift-registries/:registryId/items/:itemId/mark-purchased` - Mark purchased

---

## Item Registries

See `backend/controllers/itemRegistry.controller.js` for full endpoint documentation.

Key endpoints:
- `GET /groups/:groupId/item-registries` - List all registries
- `POST /groups/:groupId/item-registries` - Create registry
- `GET /groups/:groupId/item-registries/:registryId` - Get registry with items
- `PUT /groups/:groupId/item-registries/:registryId` - Update registry
- `DELETE /groups/:groupId/item-registries/:registryId` - Delete registry
- `POST /groups/:groupId/item-registries/:registryId/items` - Add item
- `PUT /groups/:groupId/item-registries/:registryId/items/:itemId` - Update item
- `DELETE /groups/:groupId/item-registries/:registryId/items/:itemId` - Delete item
- `PUT /groups/:groupId/item-registries/:registryId/items/reorder` - Reorder items

---

## Secret Santa

See `backend/controllers/krisKringle.controller.js` for full endpoint documentation.

Key endpoints:
- `GET /groups/:groupId/kris-kringle` - List all events
- `POST /groups/:groupId/kris-kringle` - Create event
- `GET /groups/:groupId/kris-kringle/:eventId` - Get event details
- `POST /groups/:groupId/kris-kringle/:eventId/generate-matches` - Generate random matches
- `POST /groups/:groupId/kris-kringle/:eventId/resend-email/:participantId` - Resend assignment email
- `DELETE /groups/:groupId/kris-kringle/:eventId` - Delete event

---

## Finance Matters

See `backend/controllers/finance.controller.js` for full endpoint documentation.

Key endpoints:
- `GET /groups/:groupId/finance-matters` - List finance matters
- `POST /groups/:groupId/finance-matters` - Create finance matter
- `GET /groups/:groupId/finance-matters/:matterId` - Get matter details
- `PUT /groups/:groupId/finance-matters/:matterId/settle` - Mark as settled
- `PUT /groups/:groupId/finance-matters/:matterId/cancel` - Cancel matter
- `PUT /groups/:groupId/finance-matters/:matterId/record-payment` - Record payment
- `POST /groups/:groupId/finance-matters/:matterId/payments/:paymentId/confirm` - Confirm payment
- `POST /groups/:groupId/finance-matters/:matterId/payments/:paymentId/reject` - Reject payment
- `GET /groups/:groupId/finance-matters/:matterId/messages` - Get messages
- `POST /groups/:groupId/finance-matters/:matterId/messages` - Send message
