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
- [Files](#files)
- [Audit Logs](#audit-logs)

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

**Read Receipts**: Array of members who have read the message. Empty array if no one has read it yet. Sender's own messages won't have their read receipt.

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
