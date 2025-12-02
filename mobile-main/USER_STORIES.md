# Parenting Helper Mobile App - User Stories & Test Planning

**Version**: 1.1
**Last Updated**: 2025-12-02
**App**: mobile-main (Family Helper - Full-featured mobile app)
**Tech Stack**: React Native with Expo

## Overview

This document outlines comprehensive user stories for the Parenting Helper mobile app (mobile-main). Each story includes acceptance criteria, edge cases, error scenarios, and role-based variations.

**Key Roles**:
- Admin (A) - Group administrator with subscription requirement
- Parent (P) - Standard parent role
- Child (C) - Child in the family
- Caregiver (CG) - Caregiver for children
- Supervisor (S) - Read-only access to observe family interactions

---

## 1. Authentication & Account Management

### US-AUTH-001: User Login via Kinde OAuth
**As a** new or returning user  
**I want to** log in securely using email authentication  
**So that** I can access my groups and family data

**Acceptance Criteria**:
- User sees Kinde OAuth login screen on app start
- User enters email and receives MFA code via email
- User enters MFA code to complete login
- On success: App redirects to Groups List screen
- On failure: User sees error message and can retry

**Error Cases**:
- Invalid email format → Show validation error
- MFA code expired → Prompt to request new code
- MFA code incorrect (3+ attempts) → Lock account briefly with cooldown
- Network error → Show offline message with retry button

**Variations by Role**:
- All roles use same login flow (authentication is user-level, roles are group-specific)

---

### US-AUTH-002: Session Management & Token Refresh
**As a** logged-in user  
**I want to** maintain my session automatically  
**So that** I don't need to log in repeatedly

**Acceptance Criteria**:
- Access token automatically refreshes before expiration
- Session persists across app restarts (if device isn't locked)
- Token refresh happens silently in background
- If refresh fails, user is logged out with message

**Technical Details**:
- Access token: 15-minute expiration
- Refresh token: 7-day expiration
- Stored in secure device storage (Expo SecureStore)

---

### US-AUTH-003: User Logout
**As a** logged-in user  
**I want to** log out securely  
**So that** my account is protected when I share the device

**Acceptance Criteria**:
- User taps logout button in Home screen
- Confirmation dialog appears: "Log out? You'll need to log in again."
- On confirmation:
  - Tokens are cleared from device storage
  - Redux state is reset
  - User redirected to login screen
- On cancellation: No action taken

---

### US-AUTH-004: My Account - Profile & Settings
**As a** any logged-in user  
**I want to** view and manage my profile information  
**So that** I can keep my details current

**Acceptance Criteria**:
- Screen shows: Display name, email, role icon
- Shows storage usage (Admin role only)
- Shows current subscription status (Admin role only)
- Link to web app for subscription management: "Manage Subscription"
- Button to update profile (future feature)
- All fields read-only until edit mode activated

**Variations by Role**:
- Admin: Shows subscription status & storage usage
- Parent/Child/Caregiver/Supervisor: Shows minimal profile info, no subscription UI

---

### US-AUTH-005: Personal Gift Registries
**As a** any logged-in user  
**I want to** create and manage personal gift registries  
**So that** I can share gift ideas with family and friends

**Acceptance Criteria**:
- User can create personal registry (name required)
- Each registry has sharing option:
  - Public link (e.g., parentinghelperapp.com/registry/abc123)
  - Passcode-protected (6-digit PIN)
  - Group-only (only group members can see)
- User can add unlimited gifts with:
  - Title (required)
  - Link (optional)
  - Photo (optional)
  - Cost (optional)
  - Description (optional, max 500 chars)
- User can edit/delete own registries
- User can view other group members' registries

**Error Cases**:
- Empty title → Show validation error
- Image too large → Show size limit error (10MB max)
- Invalid URL → Show validation error

---

### US-AUTH-006: Personal Item Registries
**As a** any logged-in user  
**I want to** create and manage personal item registries (e.g., books, tools)  
**So that** I can track items I own or want to borrow

**Acceptance Criteria**:
- Similar to gift registries but for reusable items
- Items have category (e.g., "Books", "Tools", "Sports Equipment")
- Items can be marked as "available to borrow"
- Search functionality to find items by name
- User can see item details: borrowed by, borrowed date, return date

---

## 2. Group Management

### US-GROUP-001: View Groups List
**As a** logged-in user  
**I want to** see all groups I'm a member of  
**So that** I can quickly access family information

**Acceptance Criteria**:
- Groups list shows all groups user is member of
- Each group displays:
  - Group name
  - Group icon/emoji
  - Group color
  - Member icons (all members)
  - Last activity time (relative: "2h ago", "1d ago")
- Groups sorted by: Pinned first, then by latest activity
- Tapping group → Opens Group Dashboard

**Variations by Role**:
- Admin: Sees all groups they created or manage
- Parent/Child/Caregiver: Sees only groups they joined
- Supervisor: Sees only groups invited to

---

### US-GROUP-002: Create New Group
**As an** admin user  
**I want to** create a new family group  
**So that** I can set up communication with family members

**Acceptance Criteria**:
- Only admin role can create groups
- Form fields:
  - Group name (required, 1-255 chars)
  - Group icon (emoji picker, optional)
  - Background color (color picker, optional)
- On submit:
  - Group created in database
  - Current user added as admin
  - User redirected to Group Settings to add members

**Error Cases**:
- Empty name → Validation error
- Name too long → Truncate at 255 chars
- Network error → Show error, prompt to retry

---

### US-GROUP-003: Edit Group Settings
**As an** admin  
**I want to** modify group name, icon, and color  
**So that** I can keep group information current

**Acceptance Criteria**:
- Admin can access from Group Dashboard (gear icon)
- Can edit: Name, icon, background color
- Changes save immediately
- Audit log entry created: "Admin changed group name from X to Y"

**Error Cases**:
- Network error → Revert changes, show error message

---

### US-GROUP-004: Pin/Unpin Groups
**As any** user  
**I want to** pin frequently-accessed groups to the top  
**So that** I can access them quickly

**Acceptance Criteria**:
- Pin button on group card (star icon)
- Pinned groups appear at top of list
- Pinned groups maintain order by pin date
- Unpinned groups sorted by latest activity below pinned groups

---

### US-GROUP-005: Group Member Management
**As an** admin  
**I want to** add, edit, and remove group members  
**So that** I can control who has access to family information

**Acceptance Criteria**:

**Adding Members**:
- Form with fields:
  - Email (optional) or Display name (required)
  - Role (admin, parent, child, caregiver, supervisor)
  - Icon letters (auto-populated from name, editable)
  - Icon color (color picker)
- If email provided and registered user:
  - Creates invitation (isRegistered: false)
  - Invitation sent to user
  - User sees pending invitation on Groups List
  - User can Accept/Decline invitation
- If email provided but NOT registered:
  - Creates placeholder member (isRegistered: true)
  - Shows immediately in group
  - Can be any role EXCEPT admin
- If only display name provided:
  - Creates placeholder member (isRegistered: true)
  - Shows immediately in group

**Editing Members**:
- Admin can change: Display name, icon letters, icon color, role
- Cannot change role from admin to other (requires special approval)
- Changes may require approval from other admins (depends on settings)

**Removing Members**:
- Soft delete only (sets isRegistered: false, marks as left)
- Member no longer sees group in their list
- Admin can see removed members (greyed out)
- Audit log records removal: "Admin removed [name]"

---

### US-GROUP-006: Accept/Decline Group Invitations
**As a** user invited to a group  
**I want to** accept or decline the invitation  
**So that** I can choose which groups to join

**Acceptance Criteria**:
- Invitations appear in two places:
  1. Dedicated Invites Screen
  2. Badge on Groups List ("3 invites")
- Each invitation shows:
  - Group name
  - Group icon
  - Inviter name
  - Role being offered
- Accept button:
  - Sets isRegistered: true
  - Group added to user's list
  - Audit log: "[User] accepted invitation to [Group]"
- Decline button:
  - Removes invitation
  - Audit log: "[User] declined invitation to [Group]"
  - User can request invite again

---

### US-GROUP-007: View Group Dashboard (Overview)
**As any** group member  
**I want to** see group overview with quick access to features  
**So that** I can navigate to different sections

**Acceptance Criteria**:
- Shows group name and icon at top
- Shows all group members with icons
- Large buttons for main features:
  - Approvals (admin only, shows badge with count)
  - Messages
  - Calendar
  - Finance (visibility controlled by admin settings)
  - Gift Registry (feature toggle)
  - Item Registry (feature toggle)
  - Secret Santa (feature toggle)
  - Wiki (feature toggle)
  - Documents (feature toggle)
- Settings button (gear icon) → Opens Group Settings

**Feature Visibility**:
- Admins control which features appear for each role
- Hidden features don't show in dashboard
- Supervisors never see: Approvals, Finance details

---

### US-GROUP-008: Group Settings - Role-Based Permissions
**As an** admin  
**I want to** configure which roles can access which features  
**So that** I control information flow in my family

**Acceptance Criteria**:

**Core Settings**:
- Parents can create message groups (toggle)
- Children can create message groups (toggle)
- Caregivers can create message groups (toggle)
- Finance visibility settings:
  - Visible to parents (toggle)
  - Can be created by parents (toggle)
  - Visible to caregivers (toggle)
  - Can be created by caregivers (toggle)
  - Visible to children (toggle)
  - Can be created by children (toggle)
- Date format (MM/DD/YYYY, DD/MM/YYYY, etc.)
- Currency (USD, EUR, GBP, etc.)

**Feature Visibility Settings**:
- For Adults (Parents, Caregivers, Supervisors):
  - Allow seeing Messages (toggle)
  - Allow seeing Calendar (toggle)
  - Allow seeing Finance (toggle, cascades with above)
  - Allow seeing Gift Registry (toggle)
  - Allow seeing Item Registry (toggle)
  - Allow seeing Secret Santa (toggle)
  - Allow seeing Wiki (toggle)
  - Allow seeing Documents (toggle)
- For Children:
  - Same feature toggles as Adults
- Approvals section: Always hidden from non-admins

**Admin Auto-Approval Settings**:
- For each other admin in group, allow auto-approval of:
  - Hide messages without approval
  - Add members without approval
  - Remove members without approval
  - Assign roles without approval
  - Change roles without approval
  - Assign relationships without approval
  - Change relationships without approval
  - Create calendar events without approval
  - Assign children to events without approval
  - Assign caregivers to events without approval

**Notification Settings** (all roles):
- Mute notifications for this group (toggle)
- Notify on requests (toggle)
- Notify on all messages (toggle)
- Notify on @mentions only (toggle)
- Notify on all calendar events (toggle)
- Notify on @mentions in calendar (toggle)
- Notify on all finance matters (toggle)
- Notify on @mentions in finance (toggle)

---

### US-GROUP-009: Leave/Request to Leave Group
**As any** group member  
**I want to** leave a group  
**So that** I can exit families where I'm no longer involved

**Acceptance Criteria**:

**Non-Admin Members**:
- Can leave immediately
- Confirmation dialog: "Leave [Group]? You'll lose access to all messages and calendar."
- On confirm: Removed from group, redirected to Groups List
- Audit log: "[User] left group"

**Admin Members** (with other admins):
- Leave request goes to approval system
- Other admins receive notification
- If >50% approve: Admin removed
- If rejected: Status quo maintained

**Last Admin in Group**:
- Cannot leave
- Shows alert: "You're the only admin. Delete the group or add another admin first."

---

### US-GROUP-010: Mute/Unmute Group
**As any** group member  
**I want to** mute notifications for a group  
**So that** I can reduce distractions

**Acceptance Criteria**:
- Toggle in Group Settings: "Mute group notifications"
- When muted:
  - No notifications received
  - Group still appears in Groups List
  - Badge count hidden (unread messages still exist)
- Audit log: "[User] muted/unmuted notifications"

---

## 3. Messaging & Message Groups

### US-MSG-001: View Message Groups List
**As any** group member  
**I want to** see all message groups I'm part of  
**So that** I can quickly find conversations

**Acceptance Criteria**:
- Shows all message groups user is member of
- Each card displays:
  - Message group name
  - Member icons (all members)
  - Unread count (red badge)
  - @mention count (yellow badge)
  - Last message time (relative: "2h ago")
- Sorted by: Pinned first, then by last activity
- Tapping card → Opens Messages screen
- Admin can see all message groups (even if not member)

**Variations by Role**:
- Supervisor: Can view but not participate
- Others: Can view and send messages

---

### US-MSG-002: Create Message Group
**As a** user with message group creation permission  
**I want to** create a new message group  
**So that** I can start conversations with specific family members

**Acceptance Criteria**:
- Form with fields:
  - Group name (required, 1-255 chars)
  - Select members (checkboxes, required at least 2 members)
  - Current user automatically included
- On submit:
  - Message group created
  - All selected members added
  - User redirected to Messages screen
  - Audit log: "[User] created message group [name]"

**Permission Checks**:
- Parents can create if allowed by admin setting
- Children can create if allowed by admin setting
- Caregivers can create if allowed by admin setting
- Supervisors CANNOT create

**Error Cases**:
- Empty name → Validation error
- No members selected → Validation error
- Network error → Show error, prompt to retry

---

### US-MSG-003: Send Message with Text
**As a** message group member  
**I want to** send text messages to the group  
**So that** I can communicate with family

**Acceptance Criteria**:
- Message input field at bottom of screen
- Can type up to 10,000 characters
- Text wraps across multiple lines
- Can @mention members by typing @ (shows member list)
- Send button sends message
- On success:
  - Message appears in chat immediately (optimistic update)
  - Timestamp shows creation time
  - Diamond indicator (◇) shows "sending"
- Once server confirms:
  - Message ID assigned
  - Diamond indicator (◇◇) shows "delivered"
- Read receipts tracked when members read

**Variations by Role**:
- Supervisors: CANNOT send messages (UI hides input field)
- All others: Can send

**Error Cases**:
- Empty message → Disable send button
- Network error → Show error, keep message in draft
- User removed from group → Show error: "You're no longer in this group"

---

### US-MSG-004: Send Message with Media
**As a** message group member  
**I want to** share images and videos  
**So that** I can share visual information with family

**Acceptance Criteria**:
- Media button (+ icon) in message input area
- Options:
  - Take photo/video (camera)
  - Choose from gallery
- Can select multiple files (up to 10 per message)
- Preview thumbnails before sending
- On send:
  - Files uploaded to storage
  - Message created with media links
  - File size counted against user's storage quota
  - Audit log: "[User] sent message with N media files"

**Validation**:
- Images: Max 10MB
- Videos: Max 100MB
- Total message files: Max 10 per message
- Unsupported types: Show error

**Storage Handling**:
- If storage quota exceeded: Show error: "Storage limit reached. Delete files or upgrade storage."
- Stored in Google Drive (user's account)

---

### US-MSG-005: Message Read Receipts (Diamond Indicator)
**As a** sender  
**I want to** see who has read my messages  
**So that** I know if my message was seen

**Acceptance Criteria**:
- 4-state diamond indicator on each message:
  1. ◇ (gray) = Sending (no messageId yet)
  2. ◇◇ (gray) = Delivered (messageId exists, no reads)
  3. ◆◇ (blue+gray) = Read by some registered members
  4. ◆◆ (blue) = Read by all registered members

**Implementation Details**:
- Only REGISTERED members (isRegistered: true) count toward read receipts
- Unregistered placeholder members don't count
- Sender's own messages don't create read receipts
- Long-press message to see "Read by: [names]"

**Critical Logic**:
```
registeredMembersCount = members.filter(m => m.isRegistered === true && m.groupMemberId !== sender.groupMemberId).length
readCount = message.readReceipts.length
if readCount >= registeredMembersCount: return "◆◆"
if readCount > 0: return "◆◇"
if messageId: return "◇◇"
else: return "◇"
```

---

### US-MSG-006: Mark Messages as Read
**As a** message group member  
**I want to** mark messages as read  
**So that** others know I've seen them

**Acceptance Criteria**:
- Automatic: When user opens message group, all visible messages marked as read
- Manual: Tapping group in list marks as read
- Read receipt creation:
  - Creates MessageReadReceipt records
  - Updates MessageGroupMember.lastReadAt
  - Creates audit log entry: "User read X messages"
- Badge count cleared when marked read

---

### US-MSG-007: Message Alignment & Styling
**As a** user  
**I want to** clearly distinguish my messages from others  
**So that** I can follow conversation flow

**Acceptance Criteria**:
- My messages: Right-aligned with blue background (#e3f2fd)
- Other messages: Left-aligned with white/gray background
- All messages: Show sender name and icon
- All messages: Show timestamp (HH:MM format)
- **Note**: Supervisors are READ-ONLY and CANNOT send messages

---

### US-MSG-008: Delete (Hide) Message
**As a** sender or admin  
**I want to** delete my message or remove inappropriate content  
**So that** I can correct mistakes or maintain group standards

**Acceptance Criteria**:

**Message Owner**:
- Long-press message → "Delete" option appears
- Confirmation: "Delete this message? It can't be undone."
- On confirm: Message hidden (isHidden: true)
- Message shows as "🗑️ Deleted" to all users
- Admins can still see original content (greyed out)

**Admin**:
- Can delete any message in group
- Same hide mechanism (isHidden: true)
- Audit log: "Admin deleted message from [user]: [content]"

**Error Cases**:
- Network error → Revert deletion, show error

---

### US-MSG-009: Edit Message Text (CRITICAL: NOT ALLOWED)
**As a** sender  
**I want to** edit my message if I made a mistake  
**So that** I can correct typos

**Acceptance Criteria**:
- ❌ EDITING NOT ALLOWED in this app
- Reason: Legal/custody context - all messages immutable for audit trail
- Workaround: Delete message and send new one
- No edit button appears on messages
- If user tries to edit via API: 403 Forbidden error

---

### US-MSG-010: @ Mentions
**As a** sender  
**I want to** mention specific members to get their attention  
**So that** important messages stand out

**Acceptance Criteria**:
- Type @ in message → Shows member picker
- Select member → @Name inserted in text
- On send:
  - Mentioned members get notification
  - Message appears in their @mentions badge (yellow)
  - They see notification: "You were mentioned in [Group]"
- Mentions tracked in database for audit logs

---

### US-MSG-011: Pin/Unpin Message Groups
**As a** user  
**I want to** pin frequently-used message groups  
**So that** I can access them quickly

**Acceptance Criteria**:
- Pin button on message group card (star icon)
- Pinned groups appear at top of list
- Can pin unlimited groups
- Tapping again unpins

---

### US-MSG-012: Message Group Settings
**As an** admin  
**I want to** configure message group settings  
**So that** I can manage group permissions

**Acceptance Criteria**:
- Can rename message group
- Can add/remove members
- Can configure who can post
- Settings button (gear icon) in Messages screen
- Non-admins see limited options (mute, leave)

---

## 4. Calendar & Events

### US-CAL-001: View Calendar
**As any** group member  
**I want to** see family calendar with events  
**So that** I can track schedules and responsibilities

**Acceptance Criteria**:
- Default view: Week view (current week)
- Can switch between: Day, Week, Month views
- Swipe left/right to navigate
- Tapping date shows all events for that day
- Events show:
  - Title
  - Time (HH:MM - HH:MM)
  - Attendees (icons)
  - Color-coded by event type

**Variations by Role**:
- Supervisors: Cannot access calendar (shows error)
- Children: View-only (cannot create events)
- Parents/Caregivers/Admins: Can create/edit/delete

---

### US-CAL-002: Child Responsibility Lines
**As a** parent or caregiver  
**I want to** see colored lines showing child responsibilities  
**So that** I know who is responsible for each child at any time

**Acceptance Criteria**:
- On left side of each day: Colored lines for each child
- Each child has 2 lines:
  - First line: Child's icon color
  - Second line: Responsible adult's icon color
- Lines show throughout the day
- Responsibility changes show as color transitions
- Long-press line → Popup shows child name, responsible adult, time range

**Example**:
```
Child Red → Mom Blue all week
Tuesday 12pm: Dad Green takes over
Wednesday 4pm: Mom Blue resumes responsibility
```

---

### US-CAL-003: Create Calendar Event
**As a** parent/caregiver/admin  
**I want to** create calendar events  
**So that** I can schedule family activities

**Acceptance Criteria**:
- Form fields:
  - Title (required)
  - Description (optional)
  - Location (optional)
  - Start date/time (required)
  - End date/time (required, must be after start)
  - Attendees (optional, multi-select)
  - Repeat options (daily, weekly, monthly, yearly)
  - Repeat until date (optional)
- On submit:
  - Event created in database
  - Attendees notified
  - Audit log: "[User] created event [title]"
- Validation:
  - Empty title → Error
  - End time before start time → Error
  - Invalid date → Error

---

### US-CAL-004: Create Child Responsibility Event
**As a** parent/caregiver/admin  
**I want to** track who is responsible for each child at specific times  
**So that** custody and caregiving responsibilities are clear

**Acceptance Criteria**:
- Form fields:
  - Select child/children (checkboxes, required)
  - Title (e.g., "Weekend with Mom")
  - Start date/time (required)
  - End date/time (required)
  - Start responsibility (auto-detect from calendar or select)
  - End responsibility (auto-detect from calendar or select)
  - Repeat options (optional)
- Responsibility options:
  - No change (child stays with current responsible person)
  - Change to existing calendar responsibility
  - Select from available members
  - Select "Other" (not a group member)

**Overlap Detection** (CRITICAL):
- On submit, check for overlapping responsibility events for same child
- If overlaps found: Show warning popup with conflict details
- User can:
  - Confirm anyway (new event layers on top)
  - Cancel and edit existing event
  - Cancel creation
- Audit log records overlap confirmation

---

### US-CAL-005: Edit Calendar Event
**As a** parent/caregiver/admin  
**I want to** modify event details  
**So that** I can correct mistakes or update schedules

**Acceptance Criteria**:
- Same form as create
- Pre-populated with current values
- On submit:
  - If event is part of series: Option to update:
    - "This event only"
    - "This and future events"
    - "All events in series"
  - Changes require approval (if setting configured)
  - Audit log: "[User] updated event [title]"

**Important**: Editing updates createdAt timestamp (affects layering for responsibility conflicts)

---

### US-CAL-006: Delete Calendar Event
**As a** admin  
**I want to** remove events from calendar  
**So that** I can clean up scheduling errors

**Acceptance Criteria**:
- Long-press event → "Delete" option
- Confirmation dialog
- On confirm:
  - Event soft-deleted (isHidden: true)
  - Removed from calendar views
  - Admins see greyed out
  - Audit log: "[User] deleted event [title]"
- If recurring event:
  - Option: "This event only" or "All future events"

---

### US-CAL-007: Recurring Events
**As a** parent/caregiver  
**I want to** create recurring events (weekly, monthly, etc.)  
**So that** I don't need to recreate regular activities

**Acceptance Criteria**:
- Repeat options: Daily, Weekly, Monthly, Yearly
- Can specify: Repeat every X [period]
- Repeat until: Optional end date
- On submit: Creates parent event + child instances
- Editing recurring event:
  - Option to update "This only" or "All future"
  - Creates new series if "Future"

---

### US-CAL-008: All-Day Events
**As a** parent  
**I want to** create all-day events like birthdays or holidays  
**So that** they appear in calendar without time constraints

**Acceptance Criteria**:
- Toggle: "All-day event"
- When enabled:
  - Time fields disappear
  - Event spans full day
  - No start/end time shows in calendar

---

## 5. Finance Matters

### US-FIN-001: View Finance Matters List
**As a** user with finance access  
**I want to** see all finance matters in my group  
**So that** I can track money and payments

**Acceptance Criteria**:
- Shows two sections:
  - Unsettled matters (active)
  - Settled matters (completed)
- Each matter card shows:
  - Matter name
  - Total amount with currency
  - Member icons
  - Due date (if set)
  - Status indicators
- Tapping card → Opens Finance Matter Details
- Pin button to favorite matters

**Variations by Role**:
- Admin: Sees all matters
- Parent: Sees if allowed by admin setting
- Caregiver: Sees if allowed by admin setting
- Child: Sees if allowed by admin setting
- Supervisor: Cannot see (even if finance visible setting on)

---

### US-FIN-002: Create Finance Matter
**As a** user with finance creation permission  
**I want to** create a finance matter to track shared costs  
**So that** group members know what's owed

**Acceptance Criteria**:
- Form fields:
  - Matter name (required, e.g., "School Fees")
  - Description (optional)
  - Total amount (required, decimal)
  - Currency (auto-populated from group setting)
  - Add members: Select members and their share
    - Per member: Expected amount OR percentage
  - Due date (optional)
- Member allocation:
  - Can mix amounts and percentages
  - Total must equal 100% if using percentages
  - Can be more than 100% (over-allocation allowed)
- On submit:
  - Matter created
  - Selected members notified
  - Audit log: "[User] created finance matter [name]"

**Error Cases**:
- Empty name → Validation error
- Invalid amount → Validation error
- No members selected → Validation error
- Percentages don't add to 100% → Warning (allow to proceed)

---

### US-FIN-003: Finance Matter Details & Status
**As any** group member  
**I want to** see breakdown of expected vs. paid amounts  
**So that** I know who owes what

**Acceptance Criteria**:
- Shows matter name and description at top
- Total amount with currency
- Due date (if set)
- Member breakdown:
  - For each member: Icon, name, expected amount, paid amount
  - Progress bar showing: Paid / Expected
  - Example: "Jane: $50 expected, $30 paid (60%)"
- Overall progress: "Total: $500 expected, $300 paid (60%)"
- Status buttons:
  - "Report Payment" (tapping member or button)
  - "Mark as Settled" (admin or creator)
  - "Edit Matter" (creator or admin, may require approval)

---

### US-FIN-004: Report Payment
**As a** member who paid money  
**I want to** report that I've paid my share  
**So that** others can confirm receipt and settle up

**Acceptance Criteria**:
- Button: "Report Payment"
- Form:
  - Select "Paid to:" (member receiving payment)
  - Amount (required, decimal, max = amount owed)
  - Receipt image (optional)
- On submit:
  - Payment recorded
  - Message posted: "@[Payer] reported paying $50 to @[Recipient]"
  - Receipt image attached to message
  - Recipient notified: "Payment received"
  - Approval goes to recipient to confirm receipt
- Validation:
  - Amount cannot exceed owed amount
  - Show error: "Cannot pay more than owed ($X)"

---

### US-FIN-005: Confirm Payment Receipt
**As a** member receiving payment  
**I want to** confirm I received the payment  
**So that** the finance matter updates correctly

**Acceptance Criteria**:
- Notification: "Payment confirmation needed from @[User]"
- In finance matter details: "Confirm" button on pending payment
- On confirmation:
  - Message posted: "@[Recipient] confirmed receiving $50 from @[Payer]"
  - Paid amount updates for that member
  - Progress bar updates

---

### US-FIN-006: Reject Payment
**As a** member who disputes a payment  
**I want to** reject a reported payment  
**So that** it can be corrected

**Acceptance Criteria**:
- "Reject" button on payment confirmation prompt
- Can add rejection reason
- On reject:
  - Payment removed from matter
  - Message posted: "@[Recipient] rejected $50 payment from @[Payer]"
  - Payer notified to resubmit

---

### US-FIN-007: Edit Finance Matter
**As a** creator or admin  
**I want to** modify finance matter details  
**So that** I can correct mistakes

**Acceptance Criteria**:
- Edit form opens with current values
- Can change: Name, description, total amount, members, due date
- Changes may require >50% admin approval (if setting configured)
- On submit:
  - Matter updated
  - Members notified of changes
  - Audit log: "[User] updated finance matter"

---

### US-FIN-008: Mark Finance Matter as Settled
**As a** creator or admin  
**I want to** mark a finance matter as complete  
**So that** it moves to settled section

**Acceptance Criteria**:
- Button: "Mark as Settled"
- Confirmation: "All payments confirmed? This can't be undone from here."
- If creator marks: Settled immediately
- If other admin marks: Requires approval from creator
- On settle:
  - Matter moved to "Settled" section
  - Message posted: "@[User] settled [Matter]"
  - Audit log: "[User] settled [Matter]"

---

### US-FIN-009: Unsettle Finance Matter
**As a** creator or admin  
**I want to** reopen a settled finance matter  
**So that** I can correct mistakes

**Acceptance Criteria**:
- In settled matters: "Reopen" button
- Only creator or admin can reopen
- Confirmation required
- On reopen: Matter moves back to unsettled section

---

### US-FIN-010: Finance Matter Messaging Thread
**As any** member  
**I want to** discuss finance matters in a dedicated thread  
**So that** communication stays organized

**Acceptance Criteria**:
- Each finance matter has message thread
- Messages specific to that matter
- Can mention members: @[name]
- Payment confirmations, rejections posted as messages
- Similar to message groups but matter-specific

---

## 6. Approvals & Admin Workflow

### US-APPR-001: View Approvals List
**As an** admin  
**I want to** see pending approval requests  
**So that** I can manage group decisions

**Acceptance Criteria**:
- Tab 1: "Awaiting your action" (admin hasn't voted yet)
  - Shows approval requests for current user
  - "Approve" and "Reject" buttons
- Tab 2: "Awaiting others" (user voted, waiting for others)
  - Shows own approval requests
  - Shows current vote count
  - "Cancel" button to withdraw request
- Tab 3: "Completed" (decided)
  - Shows approved, rejected, cancelled approvals
  - Read-only, no actions
- Each card shows:
  - Approval type (e.g., "Add member", "Hide message")
  - Requester name
  - Details (who/what/why)
  - Required votes: "2 of 3 admins approve"

---

### US-APPR-002: Vote on Approval
**As an** admin  
**I want to** vote on pending approvals  
**So that** I participate in group decisions

**Acceptance Criteria**:
- Approval card shows details
- "Approve" button: Sets vote to approve
- "Reject" button: Sets vote to reject
- On vote:
  - Vote recorded
  - Vote count updated: "1 of 3 admins approve"
  - If threshold met (>50% or 100%):
    - Approval marked as "Approved"
    - Action executed automatically
    - All admins notified
  - If rejected (>50% vote no):
    - Approval marked as "Rejected"
    - Action cancelled

---

### US-APPR-003: Cancel Approval Request
**As a** requester  
**I want to** cancel an approval request  
**So that** I can change my mind

**Acceptance Criteria**:
- In "Awaiting others" tab: "Cancel" button
- Confirmation: "Cancel this request? It can't be restored."
- On confirm:
  - Request marked as cancelled
  - Other admins notified
  - No action taken

---

### US-APPR-004: Auto-Approval Settings
**As an** admin  
**I want to** grant other admins auto-approval for certain actions  
**So that** we don't need to vote on routine changes

**Acceptance Criteria**:
- In Group Settings → "Admin Permissions"
- For each other admin, can enable auto-approval for:
  - Hide messages
  - Add members
  - Remove members
  - Assign roles
  - Change roles
  - Assign relationships
  - Change relationships
  - Create calendar events
  - Assign children to events
  - Assign caregivers to events
- When enabled: That admin's actions don't require approval from others

---

## 7. Group Relationships

### US-REL-001: Add Member Relationships
**As an** admin  
**I want to** define relationships between members  
**So that** calendar and finance features understand family structure

**Acceptance Criteria**:
- In Group Settings → "Relationships"
- Add relationship form:
  - Member 1: Select (e.g., "John")
  - Relationship type: Dropdown (e.g., "Parent-Child", "Sibling", "Grandparent-Child", "Caregiver-Child", "Mentor-Student")
  - Member 2: Select (e.g., "Sarah")
- On submit:
  - Relationship recorded bidirectionally
  - Used for calendar responsibility tracking
  - Audit log: "Admin added relationship: John [Parent] - Sarah [Child]"

**Relationship Types**:
- Parent-Child
- Sibling
- Grandparent-Child
- Caregiver-Child
- Mentor-Student
- Spouse/Partner

---

## 8. Gift Registry

### US-GR-001: View Group Gift Registries
**As a** group member (if feature enabled)  
**I want to** see all gift registries in the group  
**So that** I can see what people want

**Acceptance Criteria**:
- Shows list of all registries (same format as personal registries)
- Can filter by creator
- Can search by registry name or item
- Each card shows:
  - Creator name
  - Registry name
  - Number of items
  - Sharing type (Public/Passcode/Group-only)

---

### US-GR-002: Create Group Gift Registry
**As a** group member (if allowed)  
**I want to** create a group registry for holidays or events  
**So that** family can coordinate gift-giving

**Acceptance Criteria**:
- Same as personal registries but for group
- Creator controls editing
- All group members can view (if feature enabled)
- Sharing options: Public, Passcode, Group-only

---

### US-GR-003: View Group Registry Details
**As a** group member  
**I want to** see registry items and details  
**So that** I can see what to buy

**Acceptance Criteria**:
- Shows all items in registry
- Each item has checkbox "Mark as purchased"
- Only non-owner can mark as purchased
- Purchased items show with strikethrough
- Shows: Title, link, photo, cost, description

---

## 9. Item Registry

### US-IR-001: Create Personal Item Registry
**As any** user  
**I want to** create a registry of items I own or have  
**So that** I can track what's available to borrow

**Acceptance Criteria**:
- Registry types: "Books", "Tools", "Sports Equipment", "Toys", "Household", "Other"
- Add items:
  - Name (required)
  - Category (required)
  - Description (optional)
  - Available to borrow (toggle)
  - Photo (optional)
- Other members can see and request to borrow

---

### US-IR-002: Group Item Registry
**As a** group member  
**I want to** share group items (tools, books, equipment)  
**So that** we can manage shared resources

**Acceptance Criteria**:
- Group item registry with same item management
- Any member can add items (if allowed by admin)
- Items show who owns them
- Borrowing mechanism:
  - "Request to borrow" → Creates notification for owner
  - Owner confirms → Item marked as "borrowed by [member]"
  - "Return" button to mark as returned

---

## 10. Secret Santa / Kris Kringle

### US-SK-001: Create Secret Santa Event
**As an** admin  
**I want to** create a secret gift exchange event  
**So that** family members can participate in gift exchange

**Acceptance Criteria**:
- Form:
  - Event name (e.g., "Christmas 2025")
  - Event date (optional)
  - Select participants (checkboxes)
  - Budget limit (optional)
  - Include gift registries in assignment (toggle)
  - Assignment method: "Random" or "Manual"
- On submit:
  - Event created
  - If random: Auto-generates assignments
  - Assignments sent via email to participants
  - Audit log: "Admin created Secret Santa event"

---

### US-SK-002: View Secret Santa Assignments
**As a** participant  
**I want to** see my Secret Santa assignment  
**So that** I know who to buy for

**Acceptance Criteria**:
- Email sent with assignment
- In app: "Secret Santa" section shows my assignment
- Shows:
  - Recipient name (hidden from others)
  - Their gift registry (if included)
  - Budget limit
  - Ideas/notes from recipient
- Cannot be viewed by anyone else in app
- "Reveal" only after event date passes

---

### US-SK-003: Reveal Secret Santa Results
**As a** participant (after event date)  
**I want to** reveal who my Secret Santa was  
**So that** we can celebrate

**Acceptance Criteria**:
- Before event date: Assignment stays secret
- After event date: "Reveal" button appears
- Tapping reveal shows: "You are [Secret Santa]'s Secret Santa"
- All participants can then see who was whose Secret Santa
- Group message: "Secret Santa assignments revealed!"

---

## 11. Wiki Documents

### US-WIKI-001: Create Wiki Document
**As a** group member (if allowed)  
**I want to** create group wiki documents  
**So that** we can share knowledge (family rules, schedules, recipes)

**Acceptance Criteria**:
- Form:
  - Title (required)
  - Content (markdown editor)
- On submit:
  - Document created
  - All group members can view
  - Creator and admins can edit
  - Audit log: "[User] created wiki document [title]"

---

### US-WIKI-002: Edit Wiki Document
**As** creator or admin  
**I want to** modify wiki content  
**So that** I can keep information current

**Acceptance Criteria**:
- Edit form with current content
- Changes create revision history
- Revision shows: Author, date, content changes
- Can view previous versions
- Audit log: "[User] edited wiki: [title]"

---

### US-WIKI-003: Search Wiki Documents
**As a** group member  
**I want to** search wiki content  
**So that** I can quickly find information

**Acceptance Criteria**:
- Search box searches: Title and content
- Shows matching documents with highlights
- Tapping result opens document

---

### US-WIKI-004: Delete Wiki Document
**As** creator or admin  
**I want to** remove outdated wiki documents  
**So that** we keep wiki clean

**Acceptance Criteria**:
- Soft delete (isHidden: true)
- Admin can still see (greyed out)
- Audit log: "[User] deleted wiki: [title]"

---

## 12. Secure Documents

### US-DOC-001: Upload Group Document
**As any** group member  
**I want to** upload important documents (PDFs, contracts, agreements)  
**So that** we can store and share legal/financial documents

**Acceptance Criteria**:
- Upload button in Documents screen
- Select file from device
- Max size: 100MB
- Allowed types: PDF, DOC, DOCX, JPG, PNG
- File stored in user's Google Drive
- Document tracked in app with metadata:
  - File name
  - Uploader name
  - Upload date
  - File size
- Supervisors cannot upload

---

### US-DOC-002: View Documents List
**As a** group member  
**I want to** see all shared documents  
**So that** I can access important files

**Acceptance Criteria**:
- Shows all non-hidden documents
- Each document shows:
  - File name
  - Uploader name
  - Upload date
  - File size
  - File type icon
- Non-admins don't see hidden documents
- Admins see all (hidden marked as greyed out)

---

### US-DOC-003: Download Document
**As a** group member  
**I want to** download a document  
**So that** I can read or save it locally

**Acceptance Criteria**:
- Tapping document initiates download
- File opens in appropriate app (PDF viewer, etc.)
- Audit log: "[User] downloaded [filename]"
- Non-admins cannot access hidden documents

---

### US-DOC-004: Hide/Unhide Document
**As an** admin  
**I want to** hide sensitive documents from non-admins  
**So that** I can control information access

**Acceptance Criteria**:
- Long-press document → "Hide" option
- Confirmation dialog
- Hidden documents don't appear to non-admins
- Admins see as greyed out with "Hidden" label
- "Unhide" option available to admins
- Audit log: "[Admin] hidden/unhidden [filename]"

---

### US-DOC-005: Delete Document
**As an** admin  
**I want to** remove documents from group  
**So that** outdated information doesn't clutter storage

**Acceptance Criteria**:
- Soft delete only (file remains in storage for audit)
- Document no longer appears in list
- Audit log: "[Admin] deleted [filename]"
- Storage usage recalculated

---

## 13. Subscription & Storage

### US-SUB-001: Check Subscription Status
**As an** admin  
**I want to** see my subscription status  
**So that** I know if my subscription is active

**Acceptance Criteria**:
- In My Account screen:
  - Current plan (Free Trial / Pro / Upgraded)
  - Days remaining (trial) or renewal date (paid)
  - Cancel status (if cancellation pending)
  - Storage usage
- "Manage Subscription" button → Opens web app

---

### US-SUB-002: View Storage Usage
**As an** admin  
**I want to** see how much storage I'm using  
**So that** I can manage my quota

**Acceptance Criteria**:
- In My Account:
  - Total storage used: "2.3 GB of 10 GB"
  - Progress bar showing usage
  - Breakdown by group (if multiple)
  - Warning at 80%: "You're approaching storage limit"
  - Cost calculator: "Base: $3 + Overage: $0.10 = $3.10/month"

---

### US-SUB-003: View Subscription Banner (Trial)
**As a** group member  
**I want to** know when admin's trial is expiring  
**So that** I can help them subscribe

**Acceptance Criteria**:
- Banner appears at top of group dashboard:
  - Text: "[Admin] needs to subscribe in X days or this group will be archived"
  - Color: Yellow (6-20 days), Orange (2-5 days), Red (1 day)
  - "Remind Admin" button → Sends notification
- Banner disappears after admin subscribes or trial expires

---

## 14. Error Handling & Edge Cases

### US-ERR-001: Network Errors
**Acceptance Criteria**:
- No internet → "No connection" banner at top
- API timeout → "Server not responding" with retry button
- Server error (500) → "Something went wrong" with retry
- Permission denied (403) → "You don't have permission to do this"
- Not found (404) → "This item no longer exists"

---

### US-ERR-002: Offline Operation
**Acceptance Criteria**:
- Messages: Stored locally, synced when online
- Calendar: Read-only, last loaded data shown
- Finance: Read-only, last loaded data shown
- Approvals: Cannot vote offline, queued for sync

---

### US-ERR-003: Storage Quota Exceeded
**Acceptance Criteria**:
- Cannot upload new media
- Error: "Storage limit reached. Delete files or upgrade."
- Link to web app storage management
- Can delete existing files to free space

---

### US-ERR-004: User Removed from Group
**Acceptance Criteria**:
- If user removed while in group:
  - Shows notification: "You've been removed from [Group]"
  - Redirects to Groups List
  - Group no longer appears in list
  - Cannot access messages, calendar, finance

---

### US-ERR-005: Group Archived (Trial Expired)
**Acceptance Criteria**:
- If admin's trial expires:
  - Group becomes read-only
  - Banner: "This group is archived. [Admin] can reactivate by subscribing."
  - Cannot create new messages, events, finance matters
  - Can view existing content

---

## 15. Accessibility & Performance

### US-ACC-001: Screen Reader Support
**Acceptance Criteria**:
- All buttons labeled with alt text
- Form fields have labels
- Lists have proper role attributes
- Color not sole indicator of status (icons + text)

---

### US-PERF-001: Large Message Groups
**Acceptance Criteria**:
- 1000+ messages load without lag
- Pagination: 50 messages per load
- Lazy loading as user scrolls
- Response time: < 500ms for API calls

---

### US-PERF-002: Large Calendar Loads
**Acceptance Criteria**:
- 500+ events render smoothly
- Month view: < 1000ms to render
- Week view: < 500ms to render
- Smooth scrolling with proper animation

---

## 16. Data Validation & Constraints

### US-VAL-001: Required Field Validation
- All forms validate required fields before submit
- Show error message: "[Field] is required"

### US-VAL-002: Data Type Validation
- Email: Valid email format
- Amounts: Valid decimals (2 places max)
- URLs: Valid URL format
- Dates: Valid date/time format

### US-VAL-003: Business Logic Validation
- Message group: At least 2 members
- Finance matter: Amount owed ≤ amount owed by payer
- Event: End time after start time
- Responsibility event: No overlaps for same child
- Percentages: Add up to 100% (if using percentages)

---

## 17. Audit Logging (CRITICAL - Comprehensive)

**IMPORTANT**: Every user action (except navigation) MUST be logged. Admins must be able to audit everything for legal/custody compliance.

---

### US-AUDIT-001: Message Audit Logging
**As an** admin
**I want** all message activities logged
**So that** I can audit communication for legal/custody purposes

**Acceptance Criteria - MUST LOG**:

**Sending Messages**:
- Log: "User [name] sent message in [message group]: [content preview]"
- Include: messageId, groupMemberId, timestamp, media count, mentions

**Reading Messages**:
- Log: "User [name] read X messages in [message group]. Message IDs: [list]"
- Include: Each message ID that was marked as read
- Timestamp of when read occurred

**Deleting/Hiding Messages**:
- Log: "User [name] deleted message: [full content]"
- Include: Original content preserved in log

**Test Cases**:
- [ ] Verify audit log created when message sent
- [ ] Verify audit log created when messages marked as read
- [ ] Verify message content preserved in audit log even after deletion
- [ ] Verify read receipt includes all message IDs

---

### US-AUDIT-002: Calendar Event Audit Logging
**As an** admin
**I want** all calendar activities logged
**So that** I can track schedule changes for custody/care coordination

**Acceptance Criteria - MUST LOG**:

**Creating Events**:
- Log: "User [name] created event: [title] on [date/time]"
- Include: Event details, participants, recurrence rules

**Editing Events**:
- Log: "User [name] edited event: [title]. Changes: [before] → [after]"
- Include: What specific fields changed

**Deleting Events**:
- Log: "User [name] deleted event: [title] on [date/time]"
- Include: Full event details preserved

**Responsibility Events**:
- Log: "User [name] created responsibility event: [child] with [caregiver] from [start] to [end]"
- Include: Overlap detection results if any

**Test Cases**:
- [ ] Verify audit log on event creation
- [ ] Verify audit log captures field-level changes on edit
- [ ] Verify deleted event details preserved in log
- [ ] Verify responsibility event logs include child/caregiver assignment

---

### US-AUDIT-003: Finance Matter Audit Logging
**As an** admin
**I want** all financial activities logged
**So that** I can track money matters for legal/tax purposes

**Acceptance Criteria - MUST LOG**:

**Creating Finance Matters**:
- Log: "User [name] created finance matter: [description] for $[amount]"
- Include: All member allocations, due date

**Reporting Payments**:
- Log: "User [name] reported payment of $[amount] to [recipient]"
- Include: Payment method, notes

**Confirming Payments**:
- Log: "User [name] confirmed receipt of $[amount] from [payer]"

**Rejecting Payments**:
- Log: "User [name] rejected payment of $[amount] from [payer]. Reason: [reason]"

**Settling Matters**:
- Log: "User [name] settled finance matter: [description]"

**Sending Finance Messages**:
- Log: "User [name] sent message in finance matter [id]: [content]"

**Test Cases**:
- [ ] Verify all financial transactions logged with amounts
- [ ] Verify payment confirmation/rejection logged
- [ ] Verify settlement logged
- [ ] Verify finance messages logged like regular messages

---

### US-AUDIT-004: Gift/Item Registry Audit Logging
**As an** admin
**I want** all registry activities logged
**So that** I can track gift purchases and item management

**Acceptance Criteria - MUST LOG**:

**Registry Operations**:
- Create: "User [name] created [gift/item] registry: [name]"
- Update: "User [name] updated registry: [name]"
- Delete: "User [name] deleted registry: [name]"
- Link: "User [name] linked personal registry [name] to group"
- Unlink: "User [name] unlinked registry [name] from group"

**Item Operations**:
- Add: "User [name] added item to registry: [item name] - $[price]"
- Update: "User [name] updated item: [item name]"
- Delete: "User [name] deleted item: [item name]"
- Purchase: "User [name] marked item [item name] as purchased"

**Test Cases**:
- [ ] Verify registry CRUD operations logged
- [ ] Verify item CRUD operations logged
- [ ] Verify purchase marking logged with purchaser identity

---

### US-AUDIT-005: Secret Santa Audit Logging
**As an** admin
**I want** Secret Santa activities logged
**So that** I can track event management

**Acceptance Criteria - MUST LOG**:
- Create: "User [name] created Secret Santa event: [name]"
- Update: "User [name] updated Secret Santa: [name]"
- Delete: "User [name] deleted Secret Santa: [name]"
- Draw: "User [name] performed Secret Santa drawing for [name]"
- Resend: "User [name] resent Secret Santa email to [participant]"

**Test Cases**:
- [ ] Verify Secret Santa CRUD logged
- [ ] Verify drawing logged (but NOT assignments - keep them secret!)
- [ ] Verify resend emails logged

---

### US-AUDIT-006: Wiki & Document Audit Logging
**As an** admin
**I want** all document activities logged
**So that** I can track information management

**Acceptance Criteria - MUST LOG**:

**Wiki Documents**:
- Create: "User [name] created wiki document: [title]"
- Update: "User [name] updated wiki document: [title]"
- Delete: "User [name] deleted wiki document: [title]"

**Secure Documents**:
- Upload: "User [name] uploaded document: [filename] ([size])"
- Download: "User [name] downloaded document: [filename]"
- Hide: "Admin [name] hid document: [filename]"
- Unhide: "Admin [name] unhid document: [filename]"
- Delete: "Admin [name] deleted document: [filename]"

**Test Cases**:
- [ ] Verify wiki CRUD logged
- [ ] Verify document upload/download logged
- [ ] Verify hide/unhide logged with admin identity

---

### US-AUDIT-007: Group Management Audit Logging
**As an** admin
**I want** group changes logged
**So that** I can track membership and permission changes

**Acceptance Criteria - MUST LOG**:

**Member Operations**:
- Invite: "Admin [name] invited [email] as [role]"
- Accept: "User [name] accepted invitation to [group]"
- Decline: "User [name] declined invitation to [group]"
- Remove: "Admin [name] removed [member] from group"
- Leave: "User [name] left group"
- Role change: "Admin [name] changed [member] role from [old] to [new]"

**Group Settings**:
- Update: "Admin [name] updated group settings: [what changed]"
- Feature visibility: "Admin [name] changed [feature] visibility for [role]"

**Test Cases**:
- [ ] Verify all member lifecycle events logged
- [ ] Verify role changes logged with old/new values
- [ ] Verify permission changes logged

---

### US-AUDIT-008: Approval Workflow Audit Logging
**As an** admin
**I want** all approval activities logged
**So that** I can track who approved what

**Acceptance Criteria - MUST LOG**:
- Request: "User [name] requested approval for: [action description]"
- Vote: "Admin [name] voted [approve/reject] on: [action description]"
- Execute: "Approval executed: [action]. Votes: X approve, Y reject"
- Cancel: "User [name] cancelled approval request: [action]"
- Auto-approve: "Action auto-approved by [admin] setting"

**Test Cases**:
- [ ] Verify approval request creation logged
- [ ] Verify each vote logged individually
- [ ] Verify final execution logged with vote tally
- [ ] Verify auto-approval bypass logged

---

### US-AUDIT-009: Audit Log Export
**As an** admin
**I want to** export audit logs
**So that** I can review activities for legal/compliance purposes

**Acceptance Criteria**:
- Export via web app (Admin Web App feature)
- Filter by: date range, action type, user, entity
- Format: CSV or PDF
- Password-protected file
- Download link sent via email
- Link expires after 24 hours

**Test Cases**:
- [ ] Verify export generates correct data
- [ ] Verify filters work correctly
- [ ] Verify password protection
- [ ] Verify link expiration

---

## 18. Approval Workflows (CRITICAL - >50% Admin Approval)

**IMPORTANT**: Many admin actions require approval from >50% of admins to prevent unilateral decisions.

---

### US-APPROVE-001: Actions Requiring Approval
**As a** group system
**I want** certain actions to require multi-admin approval
**So that** no single admin can make unilateral decisions

**Actions Requiring >50% Admin Approval**:

1. **Remove Admin** - Cannot remove another admin without approval
2. **Change Admin to Non-Admin** - Demoting admin requires approval
3. **Delete Group** - Permanent action requires approval
4. **Remove Member** - Removing any member requires approval
5. **Change Group Settings** - Major setting changes need approval
6. **Archive Group** - Archiving active group needs approval

**Actions NOT Requiring Approval** (Single Admin Can Do):
- Invite new members
- Create events/messages/finance matters
- Update group name/icon
- Change non-admin roles
- Manage their own auto-approval settings

**Test Cases**:
- [ ] Verify remove admin creates approval request
- [ ] Verify demote admin creates approval request
- [ ] Verify delete group creates approval request
- [ ] Verify invite member does NOT create approval

---

### US-APPROVE-002: Approval Voting Process
**As an** admin
**I want to** vote on pending approvals
**So that** the group can make collective decisions

**Acceptance Criteria**:

**Voting**:
- See pending approvals in Approvals screen
- Tap to view details: who requested, what action, current votes
- Vote: Approve or Reject
- Cannot change vote once cast
- Cannot vote on own request

**Threshold Calculation**:
- >50% of admins must approve
- Example: 3 admins → need 2 approvals
- Example: 4 admins → need 3 approvals
- Example: 5 admins → need 3 approvals

**Execution**:
- When threshold met → Action executed automatically
- If majority reject → Request cancelled
- Audit log created for final result

**Test Cases**:
- [ ] Verify correct threshold calculation (2 of 3, 3 of 4, etc.)
- [ ] Verify action executes when threshold met
- [ ] Verify action cancelled when majority reject
- [ ] Verify cannot vote on own request
- [ ] Verify cannot change vote

---

### US-APPROVE-003: Auto-Approval Settings
**As an** admin
**I want to** configure auto-approval
**So that** my votes are cast automatically

**Acceptance Criteria**:
- Each admin can set auto-approval per action type
- Options: "Always Approve", "Always Reject", "Ask Me"
- When "Always Approve": Vote cast automatically when request created
- When "Always Reject": Vote cast automatically
- Audit log: "Auto-approved by [admin] setting"

**Auto-Approval Cascading**:
- If all admins have auto-approve on an action → Executes immediately
- If threshold met by auto-votes → Executes without manual voting

**Test Cases**:
- [ ] Verify auto-approval votes cast automatically
- [ ] Verify immediate execution if all admins auto-approve
- [ ] Verify audit log notes auto-approval
- [ ] Verify admin can still override via Approvals screen

---

### US-APPROVE-004: Cancel Approval Request
**As the** requester
**I want to** cancel my pending approval request
**So that** I can withdraw an action I no longer want

**Acceptance Criteria**:
- Only requester can cancel
- Cancel removes pending approval
- Any votes already cast are discarded
- Audit log: "User [name] cancelled approval for: [action]"

**Test Cases**:
- [ ] Verify only requester can cancel
- [ ] Verify cancellation removes request
- [ ] Verify audit log created

---

### US-APPROVE-005: Approval Notifications
**As an** admin
**I want to** be notified of pending approvals
**So that** I don't miss important decisions

**Acceptance Criteria**:
- Push notification when new approval created
- Badge on Approvals tab showing pending count
- Email notification for high-priority approvals
- Reminder after 24 hours if no vote

**Test Cases**:
- [ ] Verify push notification sent
- [ ] Verify badge count accurate
- [ ] Verify reminder sent after 24h

---

### US-APPROVE-006: Single Admin Group (No Approval Needed)
**As the** only admin in a group
**I want** actions to execute immediately
**So that** I'm not blocked waiting for myself

**Acceptance Criteria**:
- If only 1 admin → No approval workflow
- Actions execute immediately
- Still audit logged: "Executed by single admin [name]"

**Test Cases**:
- [ ] Verify no approval created when single admin
- [ ] Verify action executes immediately
- [ ] Verify audit log still created

---

## Testing Strategy by Feature Area

### Authentication Testing
- Test 1: Valid login
- Test 2: Invalid credentials
- Test 3: MFA timeout
- Test 4: Token refresh
- Test 5: Session timeout

### Messaging Testing
- Test 1: Send text message
- Test 2: Send with media (images & videos)
- Test 3: @ mentions notification
- Test 4: Read receipts (4 states)
- Test 5: Message deletion by sender
- Test 6: Message deletion by admin
- Test 7: Message to removed member
- Test 8: Large message load (1000+)

### Calendar Testing
- Test 1: Create event with recurrence
- Test 2: Create responsibility event with overlap detection
- Test 3: Edit recurring event (this/future/all)
- Test 4: Delete event
- Test 5: Render calendar with 500+ events
- Test 6: Swap month view

### Finance Testing
- Test 1: Create matter with mixed allocations
- Test 2: Report payment (valid amount)
- Test 3: Report overpayment (should fail)
- Test 4: Confirm payment
- Test 5: Settle matter
- Test 6: Unsettle matter

### Approval Testing
- Test 1: Vote approve (threshold not met)
- Test 2: Vote approve (threshold met → auto-execute)
- Test 3: Vote reject
- Test 4: Auto-approval bypass voting
- Test 5: Cancel approval request

### Permissions Testing
- Test 1: Admin creates group
- Test 2: Non-admin tries to create (should fail)
- Test 3: Admin grants message creation to parent
- Test 4: Parent creates message group (allowed)
- Test 5: Supervisor tries to send message (should fail)
- Test 6: Non-admin tries to access auto-approval (should fail)

---

## 19. App Version Management

### US-VER-001: Force App Update Check
**As a** user opening the app
**I want to** be informed if my app version is outdated
**So that** I always use a compatible version

**Acceptance Criteria**:
- On app startup, version check runs against backend `/health/app-version`
- If app version < minimum required version:
  - Non-dismissible modal appears blocking all app usage
  - Modal shows: "Update Required" title
  - Shows current version vs required version
  - "Update Now" button opens appropriate app store
- If version check fails (network error):
  - Allow app to continue (fail open)
  - Log error for debugging

**Technical Details**:
- Version comparison: Semantic versioning (major.minor.patch)
- Backend configurable via environment variables:
  - `MIN_VERSION_MOBILE_MAIN`
  - `MIN_VERSION_MOBILE_MESSENGER`
  - `APP_STORE_URL_MAIN_IOS` / `APP_STORE_URL_MAIN_ANDROID`
- Hook: `useVersionCheck('mobile-main')` in App.js
- Component: `ForceUpdateModal.jsx`

**Test Cases**:
- [ ] Verify modal appears when version is below minimum
- [ ] Verify modal is non-dismissible (no back button, no tap outside)
- [ ] Verify "Update Now" opens correct app store for platform
- [ ] Verify app works normally when version meets requirement
- [ ] Verify app works when version check fails (network error)

---

### US-VER-002: App Store Deep Links
**As a** user who needs to update
**I want to** be taken directly to the app store
**So that** I can quickly update my app

**Acceptance Criteria**:
- iOS: Opens App Store to correct app page
- Android: Opens Google Play Store to correct app page
- Web: Opens iOS App Store link in new tab

**Test Cases**:
- [ ] Verify iOS deep link opens App Store
- [ ] Verify Android deep link opens Play Store
- [ ] Verify web platform handles gracefully

---

## 20. Media Viewing (Web Platform)

### US-MEDIA-001: Fullscreen Image/Video Viewer on Web
**As a** web user viewing media
**I want to** see images and videos in fullscreen
**So that** I can view media without the phone simulator constraints

**Acceptance Criteria**:
- Images display at 90% of browser window dimensions
- Videos display at 90% of browser window dimensions
- Viewer resizes with browser window
- Pinch-to-zoom still works on touch devices
- Close button (X) in top-right corner
- Download button in top-left corner

**Technical Details**:
- Uses `window.innerWidth` and `window.innerHeight` on web
- Resize listener updates dimensions dynamically
- Both ImageViewer.jsx and VideoPlayer.jsx support this

**Test Cases**:
- [ ] Verify fullscreen dimensions on web
- [ ] Verify resize updates viewer size
- [ ] Verify close button works
- [ ] Verify download button works

---

### US-MEDIA-002: Download Media on Web
**As a** web user
**I want to** download images and videos
**So that** I can save them to my computer

**Acceptance Criteria**:
- Download button available on both images and videos
- Click triggers browser download
- Downloaded file has correct extension (.jpg for images, .mp4 for videos)
- No "Permission Required" error on web (uses `<a>` element, not MediaLibrary)

**Technical Details**:
- Web: Uses `<a>` element with `download` attribute
- Native: Uses expo-media-library for saving to photo library
- File extension added if missing from URL

**Test Cases**:
- [ ] Verify image download on web has .jpg extension
- [ ] Verify video download on web has .mp4 extension
- [ ] Verify no permission errors on web
- [ ] Verify native platform still uses MediaLibrary

---

## 21. HEIC Image Support

### US-HEIC-001: Upload HEIC Images
**As a** user with an iPhone
**I want to** upload HEIC format images
**So that** I can share photos without manual conversion

**Acceptance Criteria**:
- HEIC images detected by magic bytes (not just file extension)
- HEIC automatically converted to JPEG on upload
- Converted image maintains quality (0.9 JPEG quality)
- Original filename preserved with .jpg extension

**Technical Details**:
- Uses `heic-convert` package (Sharp doesn't support HEIC natively)
- Magic byte detection: looks for 'ftyp' at offset 4, brand at offset 8
- HEIC brands: heic, heix, hevc, hevx, mif1, msf1, avif

**Test Cases**:
- [ ] Verify HEIC detection by magic bytes
- [ ] Verify HEIC converted to JPEG successfully
- [ ] Verify converted image quality is acceptable
- [ ] Verify non-HEIC images not affected

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-24 | Claude Code | Initial comprehensive user stories document |
| 1.1 | 2025-12-02 | Claude Code | Added: Force app update, web media viewer, HEIC support |

---

**Document Status**: COMPLETE - Ready for testing & development
**Next Steps**: Use these stories for test case creation and development sprint planning
