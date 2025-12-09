# Mobile Push Notifications - Production Implementation Plan

## Overview

This document outlines the implementation plan for mobile push notifications in the Family Helper app. Notifications are required for:
1. **New messages** - When someone sends a message in a message group
2. **Approval requests** - When an admin action requires approval from other admins

## Architecture Decision: Separate Service (Not Lambda)

**Why not Lambda?**
- Push notification delivery can be slow (batch processing, retries)
- Lambda has a 15-minute timeout limit
- Lambda cold starts could delay time-sensitive notifications
- Notification processing is asynchronous by nature

**Recommended Architecture: AWS ECS Fargate**
- Long-running container service
- Auto-scaling based on queue depth
- No timeout limits
- Cost-effective for continuous processing

## High-Level Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Main API       │────▶│  SQS Queue   │────▶│  Notification       │
│  (Lambda)       │     │              │     │  Service (Fargate)  │
└─────────────────┘     └──────────────┘     └─────────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │  Expo Push Service  │
                                            │  (or FCM/APNS)      │
                                            └─────────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │  Mobile Devices     │
                                            └─────────────────────┘
```

## Implementation Steps

### Phase 1: Database Schema Updates

Add device token storage to track push notification tokens.

**New Prisma Model:**

```prisma
model DeviceToken {
  tokenId      String   @id @default(uuid()) @map("token_id") @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  pushToken    String   @map("push_token") @db.VarChar(500)
  platform     String   @db.VarChar(20) // ios, android
  deviceId     String?  @map("device_id") @db.VarChar(255) // Optional unique device identifier
  appVersion   String?  @map("app_version") @db.VarChar(50)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)
  lastUsedAt   DateTime @default(now()) @map("last_used_at") @db.Timestamp(6)

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([userId, pushToken])
  @@index([userId])
  @@index([pushToken])
  @@index([isActive])
  @@map("device_tokens")
}

model NotificationQueue {
  notificationId String   @id @default(uuid()) @map("notification_id") @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  type           String   @db.VarChar(50) // message, approval_request
  title          String   @db.VarChar(255)
  body           String   @db.Text
  data           Json     @map("data") // Additional payload data
  status         String   @default("pending") @db.VarChar(20) // pending, sent, failed
  attempts       Int      @default(0)
  lastAttemptAt  DateTime? @map("last_attempt_at") @db.Timestamp(6)
  sentAt         DateTime? @map("sent_at") @db.Timestamp(6)
  errorMessage   String?  @map("error_message") @db.Text
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  @@index([status])
  @@index([userId])
  @@index([createdAt])
  @@map("notification_queue")
}
```

### Phase 2: Backend API Endpoints

Add endpoints to the main Lambda API for device token management.

**File:** `backend/controllers/notifications.controller.js`

```javascript
/**
 * POST /notifications/register-device
 * Register a device token for push notifications
 *
 * Body: { pushToken: string, platform: 'ios' | 'android', deviceId?: string, appVersion?: string }
 */
exports.registerDevice = async (req, res) => {
  // Upsert device token
};

/**
 * DELETE /notifications/unregister-device
 * Remove a device token (on logout or token refresh)
 *
 * Body: { pushToken: string }
 */
exports.unregisterDevice = async (req, res) => {
  // Mark token as inactive or delete
};

/**
 * GET /notifications/settings
 * Get user's notification preferences (from GroupMember settings)
 */
exports.getSettings = async (req, res) => {
  // Return notification preferences
};

/**
 * PUT /notifications/settings/:groupId
 * Update notification preferences for a group
 *
 * Body: { notifyAllMessages, notifyMentionMessages, notifyRequests, etc. }
 */
exports.updateSettings = async (req, res) => {
  // Update GroupMember notification settings
};
```

**File:** `backend/routes/notifications.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/register-device', requireAuth, notificationsController.registerDevice);
router.delete('/unregister-device', requireAuth, notificationsController.unregisterDevice);
router.get('/settings', requireAuth, notificationsController.getSettings);
router.put('/settings/:groupId', requireAuth, notificationsController.updateSettings);

module.exports = router;
```

### Phase 3: Notification Queue Service

When a message is sent or approval is requested, queue a notification.

**Modification to existing controllers:**

**File:** `backend/controllers/messages.controller.js` (sendMessage function)

After successfully saving a message, add:

```javascript
// Queue notifications for message group members
await queueMessageNotifications({
  messageGroupId,
  senderId: groupMembership.groupMemberId,
  senderName: groupMembership.displayName,
  messageContent: content.substring(0, 100), // Truncate for notification
  mentions,
  groupId,
});
```

**File:** `backend/controllers/approvals.controller.js` (createApproval function)

After creating an approval request, add:

```javascript
// Queue notifications for admins who need to vote
await queueApprovalNotifications({
  approvalId,
  groupId,
  approvalType,
  requestedByName: requester.displayName,
});
```

**File:** `backend/services/notification-queue.service.js`

```javascript
const prisma = require('../lib/prisma');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

/**
 * Queue message notifications for all eligible recipients
 */
async function queueMessageNotifications({ messageGroupId, senderId, senderName, messageContent, mentions, groupId }) {
  // Get all members of the message group (excluding sender)
  const members = await prisma.messageGroupMember.findMany({
    where: {
      messageGroupId,
      groupMemberId: { not: senderId },
      isMuted: false,
      groupMember: {
        isRegistered: true,
        user: {
          isNot: null,
        },
      },
    },
    include: {
      groupMember: {
        include: {
          user: true,
        },
      },
    },
  });

  for (const member of members) {
    const groupMember = member.groupMember;
    const isMentioned = mentions.includes(groupMember.groupMemberId);

    // Check notification preferences
    if (!isMentioned && !groupMember.notifyAllMessages) {
      continue; // Skip if not mentioned and not subscribed to all messages
    }
    if (isMentioned && !groupMember.notifyMentionMessages) {
      continue; // Skip if mentioned but mentions disabled
    }

    // Queue notification
    await sendToSQS({
      type: 'message',
      userId: groupMember.user.userId,
      title: isMentioned ? `${senderName} mentioned you` : `New message from ${senderName}`,
      body: messageContent,
      data: {
        type: 'message',
        groupId,
        messageGroupId,
        senderId,
      },
    });
  }
}

/**
 * Queue approval notifications for admins
 */
async function queueApprovalNotifications({ approvalId, groupId, approvalType, requestedByName }) {
  // Get all admins in the group (excluding requester)
  const admins = await prisma.groupMember.findMany({
    where: {
      groupId,
      role: 'admin',
      isRegistered: true,
      notifyRequests: true,
      user: {
        isNot: null,
      },
    },
    include: {
      user: true,
    },
  });

  const approvalTypeDisplay = formatApprovalType(approvalType);

  for (const admin of admins) {
    await sendToSQS({
      type: 'approval_request',
      userId: admin.user.userId,
      title: 'Approval Required',
      body: `${requestedByName} requested: ${approvalTypeDisplay}`,
      data: {
        type: 'approval_request',
        groupId,
        approvalId,
        approvalType,
      },
    });
  }
}

/**
 * Send notification to SQS queue
 */
async function sendToSQS(notification) {
  const command = new SendMessageCommand({
    QueueUrl: process.env.NOTIFICATION_QUEUE_URL,
    MessageBody: JSON.stringify(notification),
    MessageGroupId: notification.userId, // FIFO queue - group by user
  });

  await sqs.send(command);
}

function formatApprovalType(type) {
  const types = {
    'hide_message': 'Hide a message',
    'add_member': 'Add a group member',
    'remove_member': 'Remove a group member',
    'change_role': 'Change member role',
    'calendar_event': 'Create calendar event',
  };
  return types[type] || type;
}

module.exports = {
  queueMessageNotifications,
  queueApprovalNotifications,
};
```

### Phase 4: Notification Service (ECS Fargate)

Create a separate Node.js service that processes the notification queue.

**Directory Structure:**
```
notification-service/
├── Dockerfile
├── package.json
├── src/
│   ├── index.js           # Main entry point
│   ├── processor.js       # Queue processor
│   ├── expo-push.js       # Expo Push API client
│   └── config.js          # Configuration
└── terraform/
    └── ecs.tf             # ECS Fargate infrastructure
```

**File:** `notification-service/src/index.js`

```javascript
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { processNotification } = require('./processor');

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;

async function pollQueue() {
  while (true) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 60,
      });

      const response = await sqs.send(command);

      if (response.Messages) {
        for (const message of response.Messages) {
          try {
            const notification = JSON.parse(message.Body);
            await processNotification(notification);

            // Delete message after successful processing
            await sqs.send(new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            }));
          } catch (error) {
            console.error('Error processing notification:', error);
            // Message will become visible again after VisibilityTimeout
          }
        }
      }
    } catch (error) {
      console.error('Error polling queue:', error);
      await sleep(5000); // Wait before retrying
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Starting notification service...');
pollQueue();
```

**File:** `notification-service/src/processor.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const { sendExpoPushNotifications } = require('./expo-push');

const prisma = new PrismaClient();

async function processNotification(notification) {
  const { userId, title, body, data } = notification;

  // Get user's active device tokens
  const deviceTokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  if (deviceTokens.length === 0) {
    console.log(`No active device tokens for user ${userId}`);
    return;
  }

  // Build Expo push messages
  const messages = deviceTokens.map(token => ({
    to: token.pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: data.type === 'approval_request' ? 'approvals' : 'messages',
  }));

  // Send via Expo Push Service
  const results = await sendExpoPushNotifications(messages);

  // Handle invalid tokens (mark as inactive)
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'error') {
      if (results[i].details?.error === 'DeviceNotRegistered') {
        await prisma.deviceToken.update({
          where: { tokenId: deviceTokens[i].tokenId },
          data: { isActive: false },
        });
      }
    }
  }
}

module.exports = { processNotification };
```

**File:** `notification-service/src/expo-push.js`

```javascript
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function sendExpoPushNotifications(messages) {
  // Expo recommends chunking for large batches
  const chunks = expo.chunkPushNotifications(messages);
  const results = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      results.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
      // Return error results for this chunk
      results.push(...chunk.map(() => ({ status: 'error', message: error.message })));
    }
  }

  return results;
}

module.exports = { sendExpoPushNotifications };
```

### Phase 5: Mobile App Integration

**File:** `mobile-main/src/services/notifications.js`

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and send token to backend
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  // Configure Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6200ee',
    });

    await Notifications.setNotificationChannelAsync('approvals', {
      name: 'Approval Requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff5722',
    });
  }

  // Register token with backend
  try {
    await api.post('/notifications/register-device', {
      pushToken: token.data,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
    });
  } catch (error) {
    console.error('Failed to register device token:', error);
  }

  return token.data;
}

/**
 * Handle notification received while app is foregrounded
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification response (user tapped notification)
 */
export function addNotificationResponseReceivedListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Unregister device token (on logout)
 */
export async function unregisterPushNotifications(pushToken) {
  try {
    await api.delete('/notifications/unregister-device', {
      data: { pushToken },
    });
  } catch (error) {
    console.error('Failed to unregister device token:', error);
  }
}
```

**File:** `mobile-main/App.js` (or main navigation component)

```javascript
import { useEffect, useRef } from 'react';
import { registerForPushNotifications, addNotificationResponseReceivedListener } from './services/notifications';

export default function App() {
  const navigationRef = useRef();
  const notificationResponseListener = useRef();

  useEffect(() => {
    // Register for push notifications when app starts
    registerForPushNotifications();

    // Handle notification taps
    notificationResponseListener.current = addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      if (data.type === 'message' && data.groupId && data.messageGroupId) {
        // Navigate to the message group
        navigationRef.current?.navigate('GroupDashboard', {
          groupId: data.groupId,
          screen: 'Messages',
          params: { messageGroupId: data.messageGroupId },
        });
      } else if (data.type === 'approval_request' && data.groupId) {
        // Navigate to approvals screen
        navigationRef.current?.navigate('GroupDashboard', {
          groupId: data.groupId,
          screen: 'Approvals',
        });
      }
    });

    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
      }
    };
  }, []);

  // ... rest of App component
}
```

### Phase 6: Infrastructure (Terraform)

**File:** `infrastructure/notification-service.tf`

```hcl
# SQS Queue for notifications (FIFO for ordered delivery per user)
resource "aws_sqs_queue" "notifications" {
  name                        = "${var.project_name}-notifications.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400 # 1 day

  tags = {
    Name = "${var.project_name}-notifications"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "notifications" {
  name = "${var.project_name}-notifications"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECR Repository for notification service
resource "aws_ecr_repository" "notification_service" {
  name                 = "${var.project_name}-notification-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "notification_service" {
  family                   = "${var.project_name}-notification-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.notification_service_task.arn

  container_definitions = jsonencode([
    {
      name  = "notification-service"
      image = "${aws_ecr_repository.notification_service.repository_url}:latest"

      environment = [
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "NOTIFICATION_QUEUE_URL"
          value = aws_sqs_queue.notifications.url
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-notification-service"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "notification_service" {
  name            = "${var.project_name}-notification-service"
  cluster         = aws_ecs_cluster.notifications.id
  task_definition = aws_ecs_task_definition.notification_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.notification_service.id]
  }
}

# Security Group for notification service
resource "aws_security_group" "notification_service" {
  name        = "${var.project_name}-notification-service-sg"
  description = "Security group for notification service"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-notification-service-sg"
  }
}

# Allow notification service to connect to RDS
resource "aws_security_group_rule" "rds_from_notification_service" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.notification_service.id
}

# IAM Role for ECS Task
resource "aws_iam_role" "notification_service_task" {
  name = "${var.project_name}-notification-service-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for SQS access
resource "aws_iam_role_policy" "notification_service_sqs" {
  name = "${var.project_name}-notification-service-sqs"
  role = aws_iam_role.notification_service_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.notifications.arn
      }
    ]
  })
}

# Allow Lambda to send to SQS
resource "aws_iam_role_policy" "lambda_sqs" {
  name = "${var.project_name}-lambda-sqs-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.notifications.arn
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "notification_service" {
  name              = "/ecs/${var.project_name}-notification-service"
  retention_in_days = 14
}
```

## Notification Preferences (Already in Schema)

The `GroupMember` model already has notification preference fields:
- `notifyRequests` - Notify for approval requests (default: true)
- `notifyAllMessages` - Notify for all messages (default: true)
- `notifyMentionMessages` - Notify when mentioned (default: true)
- `notifyAllCalendar` - Notify for all calendar events (default: true)
- `notifyMentionCalendar` - Notify when mentioned in calendar (default: true)
- `notifyAllFinance` - Notify for all finance matters (default: true)
- `notifyMentionFinance` - Notify when mentioned in finance (default: true)
- `isMuted` - Mute all notifications for this group (default: false)

## Cost Estimates

| Service | Monthly Cost (Estimate) |
|---------|------------------------|
| SQS (FIFO) | ~$1-5 (based on message volume) |
| ECS Fargate (256 CPU, 512MB) | ~$10-15 |
| CloudWatch Logs | ~$1-5 |
| **Total** | **~$12-25/month** |

Note: Expo Push Notifications are free for managed workflow apps.

## Testing Plan

1. **Unit Tests**
   - Test notification queueing logic
   - Test notification preference filtering
   - Test device token registration/cleanup

2. **Integration Tests**
   - Test end-to-end message → notification flow
   - Test approval request → notification flow
   - Test notification deep linking

3. **Manual Testing**
   - Test on iOS device
   - Test on Android device
   - Test background/foreground notification handling
   - Test notification taps navigation

## Deployment Steps

1. Add Prisma migration for DeviceToken model
2. Deploy backend API changes (Lambda)
3. Build and push notification service Docker image
4. Apply Terraform changes for SQS and ECS
5. Update mobile app with notification registration
6. Test end-to-end flow

## Security Considerations

1. **Push Token Security**
   - Tokens are stored per-user, not shared
   - Invalid tokens are automatically deactivated
   - Tokens are removed on logout

2. **Notification Content**
   - Message content is truncated (100 chars)
   - No sensitive data in notification payload
   - Full content only visible after opening app

3. **Rate Limiting**
   - Consider rate limiting notifications per user
   - Batch notifications for high-volume message groups

## Future Enhancements

1. **Badge Count Management** - Track unread count per user
2. **Notification History** - Store sent notifications for debugging
3. **Analytics** - Track delivery rates, open rates
4. **Rich Notifications** - Images, action buttons
5. **Notification Scheduling** - "Do Not Disturb" hours

---

*Last Updated: December 2025*
