# Push Notifications Setup Guide

This document describes how to set up push notifications for the Family Helper app.

## Overview

The app uses **Expo Push Notification Service** which is:
- Free (600 notifications/second limit)
- Works with both iOS and Android
- No separate push notification server needed

## Prerequisites

Before push notifications will work, you need:

1. **Expo Account** - Create at https://expo.dev
2. **Expo Project** - Create in Expo dashboard
3. **Physical Device** - Push notifications don't work on emulators/simulators

## Setup Steps

### 1. Create Expo Account

1. Go to https://expo.dev
2. Sign up for a free account
3. Verify your email

### 2. Create Expo Project

1. Log in to https://expo.dev
2. Click "Create Project"
3. Name it "family-helper-main" (or similar)
4. Copy the **Project ID** (UUID format like `abc12345-1234-5678-abcd-1234567890ab`)

### 3. Configure Environment Variables

Add the Expo Project ID to your environment:

**For local development** (`mobile-main/.env`):
```
EXPO_PUBLIC_PROJECT_ID=your-project-id-here
```

**For production** (add to CI/CD secrets or app build configuration)

### 4. Configure Platform-Specific Push Credentials

#### For Android (FCM - Firebase Cloud Messaging)

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package name: `com.parentinghelper.app`
3. Download `google-services.json`
4. In Expo dashboard, go to your project > Credentials > Android
5. Upload the FCM Server Key (from Firebase Console > Project Settings > Cloud Messaging)

#### For iOS (APNs - Apple Push Notification service)

1. Requires Apple Developer account ($99/year)
2. In Expo dashboard, go to your project > Credentials > iOS
3. Let Expo handle APNs certificate generation (recommended)
4. Or upload your own APNs key from Apple Developer portal

### 5. Build the App

Push notifications require a **production build** (not Expo Go):

```bash
# For Android
npx eas build --platform android

# For iOS
npx eas build --platform ios
```

## Testing Push Notifications

### Test from the App

1. Log in to the app on a physical device
2. The app will automatically request notification permissions
3. Once permissions granted, a device token is registered with the backend
4. Use the test notification endpoint:

```bash
curl -X POST https://your-api-url/notifications/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test from Expo Dashboard

1. Go to your project in Expo dashboard
2. Navigate to Push Notifications
3. Enter the Expo push token (visible in device logs)
4. Send a test notification

## Notification Triggers

The app sends push notifications for:

| Event | Notification Type | Recipients |
|-------|------------------|------------|
| New message | `message` or `mention` | Message group members (respects preferences) |
| Calendar event created | `calendar` | Event attendees only |
| Finance matter created | `finance` | Finance matter members |
| Approval request | `request` | Other group admins |

## Notification Preferences

Users can control which notifications they receive per group via:
- `notifyAllMessages` - All new messages
- `notifyMentionMessages` - Only when mentioned
- `notifyAllCalendar` - All calendar events
- `notifyMentionCalendar` - Only when invited to event
- `notifyAllFinance` - All finance matters
- `notifyMentionFinance` - Only when included in finance matter
- `notifyRequests` - Approval requests (admin only)

These are stored in the `group_members` table and can be updated via:
`PUT /notifications/preferences/:groupId`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications/register-token` | POST | Register device push token |
| `/notifications/unregister-token` | POST | Unregister token (on logout) |
| `/notifications/devices` | GET | List user's registered devices |
| `/notifications/preferences/:groupId` | GET | Get notification preferences |
| `/notifications/preferences/:groupId` | PUT | Update notification preferences |
| `/notifications/test` | POST | Send test notification to self |

## Future Improvements

### Calendar Event Reminders

Currently NOT implemented. Would require:
1. Adding `reminderMinutes` field to CalendarEvent schema
2. Creating a scheduled job service (cron) to check for upcoming events
3. Sending notifications X minutes before event start time

### Rich Notifications

Could add:
- Images in notifications
- Action buttons (Reply, Mark as Read)
- Grouped notifications

## Troubleshooting

### "Must use physical device"
Push notifications only work on real devices, not emulators.

### Token not registering
- Check that `EXPO_PUBLIC_PROJECT_ID` is set correctly
- Check device logs for permission errors
- Ensure app has notification permission in device settings

### Notifications not arriving
- Verify device token is registered (check `GET /notifications/devices`)
- Check notification preferences for the group
- For Android: Ensure FCM is configured in Expo
- For iOS: Ensure APNs is configured in Expo

### Invalid token errors
The system automatically marks invalid tokens as inactive. This happens when:
- User uninstalls the app
- User disables notifications
- Token expires (rare)
