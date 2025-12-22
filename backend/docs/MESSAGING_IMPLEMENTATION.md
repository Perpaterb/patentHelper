# Messaging System Implementation Guide

**CRITICAL**: This document contains implementation details for the messaging system. Read this BEFORE modifying any messaging code.

## Message Read Receipts System

### 4-State Diamond Indicator System

The app uses a WhatsApp-style read receipt system with 4 states represented by diamond symbols:

1. **Sending** (`◇`) - 1 gray diamond
   - Message sent from client but not yet confirmed by server
   - No `messageId` from server yet

2. **Delivered** (`◇◇`) - 2 gray diamonds
   - Message confirmed by server (`messageId` exists)
   - No `readReceipts` yet

3. **Read by Some** (`◆◇`) - 1 blue diamond + 1 gray diamond
   - Some registered members have read the message
   - `readReceipts.length < registeredMembersExcludingSender`

4. **Read by All** (`◆◆`) - 2 blue diamonds
   - All registered members have read the message
   - `readReceipts.length >= registeredMembersExcludingSender`

### Implementation in MessagesScreen.jsx

```javascript
const getReadReceiptStatus = (message) => {
  if (!message.messageId) {
    return 'sending';
  }

  if (!message.readReceipts || message.readReceipts.length === 0) {
    return 'delivered';
  }

  // CRITICAL: Only count REGISTERED members (isRegistered === true)
  // Members created by admins who haven't logged in don't count
  const registeredMembersExcludingSender = members.filter(
    m => m.groupMemberId !== message.sender?.groupMemberId && m.isRegistered === true
  ).length;

  const readCount = message.readReceipts.length;

  if (readCount >= registeredMembersExcludingSender && registeredMembersExcludingSender > 0) {
    return 'read-all';
  }

  return 'read-some';
};
```

### CRITICAL GOTCHA - Member Filtering

- **ONLY count members where `isRegistered === true`**
- Admins can create placeholder members who haven't logged in yet
- These unregistered members should NOT affect read receipt calculations
- Exclude the message sender from the count (they don't need to read their own message)

---

## Message Alignment Logic

Messages are aligned based on comparing the sender's `groupMemberId` with the current user's `groupMemberId`.

```javascript
const isMyMessage = item.sender?.groupMemberId === currentUserMemberId;
```

### Where currentUserMemberId comes from

- Backend endpoint: `GET /groups/:groupId/message-groups/:messageGroupId`
- Response field: `currentGroupMemberId`
- Set in frontend state: `setCurrentUserMemberId(response.data.currentGroupMemberId)`
- Used in `renderMessage` function to determine alignment

### Styling
- My messages: Blue background (`#e3f2fd`), aligned right
- Other messages: White background (`#fff`), aligned left

### Common Bug

If `currentUserMemberId` is `null`, ALL messages will align to the left because:
```javascript
null === "some-uuid" // always false
```

This usually means the backend endpoint failed to return `currentGroupMemberId`.

---

## Backend API Structure

### GET /groups/:groupId/message-groups/:messageGroupId/messages

Response includes:
```javascript
{
  success: true,
  messages: [
    {
      messageId: "uuid",
      content: "Hello @John!",
      mentions: ["uuid"],
      createdAt: "ISO timestamp",
      isHidden: false,
      sender: {
        groupMemberId: "uuid",
        displayName: "Jane Doe",  // Merged from User profile
        iconLetters: "JD",        // Merged from User profile
        iconColor: "#6200ee",     // Merged from User profile
        role: "admin"
      },
      readReceipts: [
        {
          groupMemberId: "uuid",
          readAt: "ISO timestamp",
          displayName: "John Doe",   // Merged from User profile
          iconLetters: "JD",         // Merged from User profile
          iconColor: "#ff5722"       // Merged from User profile
        }
      ]
    }
  ],
  hasMore: true
}
```

### Profile Merging Pattern

All messaging endpoints merge User profile data with GroupMember data:

```javascript
// Priority: User profile > GroupMember profile
displayName: message.sender.user?.displayName || message.sender.displayName,
iconLetters: message.sender.user?.memberIcon || message.sender.iconLetters,
iconColor: message.sender.user?.iconColor || message.sender.iconColor,
```

This ensures that if a user updates their global profile, it shows in all groups immediately.

---

## Mark as Read Implementation

**Endpoint:** `PUT /groups/:groupId/message-groups/:messageGroupId/mark-read`

**What it does:**

1. Finds all unread messages (messages created after `lastReadAt` that user hasn't read)
2. Creates `MessageReadReceipt` records for each unread message
3. Updates `MessageGroupMember.lastReadAt` timestamp
4. Creates audit log entry with message IDs

### CRITICAL Implementation Details

- Does NOT create read receipts for user's own messages (`senderId !== currentUserId`)
- Skips duplicates with `skipDuplicates: true`
- Uses `findMany` with `readReceipts: { none: { groupMemberId } }` to avoid duplicate reads
- Creates audit log for compliance/admin exports

**Backend code (messages.controller.js):**

```javascript
const unreadMessages = await prisma.message.findMany({
  where: {
    messageGroupId: messageGroupId,
    isHidden: false,
    senderId: {
      not: groupMembership.groupMemberId, // Don't mark own messages as read
    },
    createdAt: {
      gt: messageGroupMember?.lastReadAt || new Date(0),
    },
    readReceipts: {
      none: {
        groupMemberId: groupMembership.groupMemberId, // Avoid duplicates
      },
    },
  },
});
```

---

## Common Field Name Gotchas

**CRITICAL: Use the correct field names!**

**WRONG:**
```javascript
inviteStatus: true  // This field does NOT exist
fullName: true      // This field does NOT exist
```

**CORRECT:**
```javascript
isRegistered: true  // Boolean field on GroupMember
displayName: true   // String field on both User and GroupMember
```

### Schema reference

```prisma
model GroupMember {
  groupMemberId  String   @id @default(uuid())
  displayName    String   // GroupMember-specific display name
  iconLetters    String
  iconColor      String
  role           Role
  isRegistered   Boolean  @default(false)  // Use this, NOT inviteStatus
  user           User?    @relation(...)
}

model User {
  userId       String  @id @default(uuid())
  displayName  String  // User's global display name (NOT fullName)
  memberIcon   String  // User's global icon letters
  iconColor    String  // User's global icon color
}
```

**If you get a Prisma error about "Unknown field":**

1. Check the schema in `backend/prisma/schema.prisma`
2. Search for BOTH the User and GroupMember models
3. Use the EXACT field names from the schema
4. Remember: `isRegistered` (boolean) NOT `inviteStatus`

---

## Members Array Structure

**CRITICAL: Preserve groupMemberId when mapping members**

When fetching message group members, you receive:

```javascript
messageGroup.members = [
  {
    groupMemberId: "uuid",  // From MessageGroupMember table
    groupMember: {          // Nested GroupMember data
      groupMemberId: "uuid",
      displayName: "John",
      iconLetters: "JD",
      iconColor: "#6200ee",
      isRegistered: true,
      user: { ... }
    }
  }
]
```

**When mapping for state, preserve BOTH:**

```javascript
// CORRECT - Preserves both groupMemberId and groupMember properties
setMembers(messageGroup.members.map(m => ({
  ...m.groupMember,
  groupMemberId: m.groupMemberId
})));

// WRONG - Loses groupMemberId
setMembers(messageGroup.members.map(m => m.groupMember));
```

**Why this matters:**

- Read receipt calculations need `groupMemberId` to match against `message.sender.groupMemberId`
- Member filtering needs `isRegistered` boolean
- Both must be in the same object for the filter to work

---

## Debugging Message Alignment Issues

**If messages are all aligned left (or all aligned right):**

1. **Check `currentUserMemberId`** - Add temporary console.log:
   ```javascript
   console.log('currentUserMemberId:', currentUserMemberId);
   console.log('sender.groupMemberId:', item.sender?.groupMemberId);
   ```

2. **Common causes:**
   - `currentUserMemberId` is `null` → Backend endpoint failed
   - `item.sender?.groupMemberId` is `undefined` → Backend not returning sender info
   - Field name mismatch → Using wrong property names

3. **Check backend response:**
   - Endpoint: `GET /groups/:groupId/message-groups/:messageGroupId`
   - Should return `currentGroupMemberId` in response
   - Check for Prisma errors in backend logs

---

## Audit Logs for Messages

**All message reads are logged:**

```javascript
await prisma.auditLog.create({
  data: {
    groupId: groupId,
    action: 'read_messages',
    performedBy: groupMembership.groupMemberId,
    performedByName: groupMembership.displayName,
    performedByEmail: groupMembership.email || 'N/A',
    actionLocation: 'messages',
    messageContent: `Read 5 messages. Message IDs: uuid1, uuid2, uuid3, uuid4, uuid5`,
  },
});
```

**Why this is important:**

- Admins can export audit logs (web app feature)
- Logs show WHO read WHICH messages and WHEN
- Can't be deleted (compliance requirement)
- Useful for resolving disputes ("did they read my message?")
