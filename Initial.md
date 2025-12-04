# Parenting Helper App - Initial Feature Documentation

## FEATURE:

A 3-product parenting and co-parenting coordination platform:
1. **Admin Web App** (React) - Subscription management, payments, log exports
2. **Parenting Helper Mobile App** (React Native) - Full features: messaging, calendar, finance
3. **PH Messenger Mobile App** (React Native) - Messaging only

All 3 products share the same backend (AWS Lambda, PostgreSQL, S3) and Kinde authentication.

### Core Modules:

### 1. **Messaging System**
- Multi-level message groups within family groups
- Role-based message access (Supervisors can view but not send)
- @mentions for notifications
- Image and video attachments with storage tracking
- Message read receipts with delivery status (seen by all/some/none)
- Admin oversight: all messages logged, "deleted" messages visible to admins (greyed out)
- Message groups can be created by users based on group permissions

### 2. **Calendar & Child Responsibility Tracking**
- Standard calendar events with attendees
- **Child Responsibility Events**: Visual timeline showing which child is with which caregiver at any time
  - Unique visual representation: colored lines for each child paired with responsibility lines
  - Supports "other" responsibility (school, daycare, etc.) with custom icons/colors
  - Day/Week/Month views with swipe navigation
  - Recurring events with edit options (this event, future events, all events)
- All calendar changes by admins may require approval from other admins based on permissions

### 3. **Finance Matter Tracking**
- Create finance matters (e.g., "Kids shoes - split 50/50")
- Allocate expected payments by percentage or fixed amount
- Report payments with receipt image upload
- Payment confirmation workflow (recipient must confirm)
- Track "expected" vs "currently paid" with visual bars
- Settle/unsettle finance matters
- Message-thread style communication within each matter

### 4. **Group Management & Role System**
- 5 roles: Admin (paid), Parent, Child, Caregiver, Supervisor (view-only)
- Multi-admin approval system (>50% or 100% depending on action type)
- Granular admin permissions (each admin can configure auto-approvals for other admins)
- Members can be added even if not registered (email invite sent)
- Visual member representation: colored icons with 1-3 letter abbreviations
- Relationships tracking (parent-child, grandparent-child, etc.)

### 5. **Comprehensive Audit Logging**
- Every action logged with timestamp, user, location, content
- Logs exportable as CSV with password-protected media links (valid 1 week)
- Nothing can be truly deleted - only hidden from non-admins
- Logs stored in each admin's storage allocation

### 6. **Subscription & Storage Management**
- **IMPORTANT**: All payment/subscription management happens on **Web App ONLY** (no in-app purchases)
- Mobile apps link to web app for subscription management (KISS principle)
- Free tier: Non-admin parents
- $8/month: Group admins get 10GB storage
- $1 per additional 2GB
- Auto-charge when exceeding storage limit + email notification
- Storage tracker in "My Account" with warnings at 80%
- Storage includes: group logs, images, videos (per admin, per group)
- Stripe integration on web app only

### 7. **PH Messenger - Companion App**
- Lightweight messaging-only app
- No login required on app open (biometric authentication)
- Opens directly to message groups list
- Perfect for children with restricted phones
- Full message sync with main app
- Cannot access calendar, finance, or admin features
- Same backend, same database, shared UI components

---

## EXAMPLES:

### Example 1: Child Responsibility Visual Timeline
**Location**: `examples/calendar-responsibility-visual.md`

**Scenario**: Tuesday 12pm to Wednesday 4pm custody handoff
- Child (red line) with Mum (blue line) all week
- Tuesday 12pm: responsibility changes to Dad (green line) - blue line becomes green at 12/24ths down the day
- Wednesday 4pm: responsibility returns to Mum - green line becomes blue at 16/24ths down the day

**Visual representation**:
```
Tuesday:
|-------|  (1/4 width each)
| Child | Responsibility |
|-------|----------------|
| Red   | Blue (0-12pm) |
| Red   | Green (12-24) |

Wednesday:
| Red   | Green (0-4pm) |
| Red   | Blue (4pm-24) |
```

**See appplan.md lines 286-288 for detailed explanation**

---

### Example 2: Finance Matter Workflow
**Location**: `examples/finance-matter-workflow.md`

**Scenario**: Member A buys kids shoes for $100, Member B owes 50%
1. Member A creates finance matter "Kids Shoes - $100"
2. Adds Member B, sets expected payment: A 50%, B 50%
3. Currently paid shows: A 100%, B 0%
4. Member B transfers $50 to Member A via bank
5. Member B reports payment in app, uploads transfer receipt screenshot
6. Member A receives approval notification, checks bank account, confirms payment
7. Currently paid updates to: A 50%, B 50%
8. Finance matter can now be marked as settled

**See appplan.md lines 375-376 for detailed explanation**

---

### Example 3: Multi-Admin Approval Workflow
**Location**: `examples/admin-approval-workflow.md`

**Scenario**: 3 admins in a group, Admin B wants to add a new member
1. Admin B attempts to add new caregiver "Grandma Jane"
2. System checks admin permissions matrix
3. Admin A has NOT auto-approved "add people" for Admin B
4. Admin C HAS auto-approved "add people" for Admin B
5. Approval created, requires >50% of other admins (1 out of 2 needed)
6. Admin C's vote auto-counted as "approve"
7. Approval threshold met, member added automatically
8. Audit log records: "Admin B added Grandma Jane (caregiver) - auto-approved by Admin C, pending Admin A review"

**See appplan.md lines 171-182 for permission matrix details**

---

### Example 4: Supervisor Read-Only Enforcement
**Location**: `examples/supervisor-permissions.md`

**Scenario**: Family court supervisor added to monitor communications
1. Supervisor role assigned with view-only access
2. Can see all message groups, calendar events, finance matters (if visible)
3. Message input component does not render for supervisors (appplan.md line 262)
4. Cannot create events, approve payments, or take any actions
5. Cannot leave group on their own (must be removed by admin)
6. All their viewing activity logged in audit logs

**See appplan.md line 91 for supervisor role definition**

---

### Example 6: PH Messenger Biometric Login Flow
**Location**: `examples/ph-messenger-auth.md`

**Scenario**: Child opens PH Messenger on their locked-down phone
1. First time: Logs in with parent's help (Kinde email + MFA)
2. App securely stores auth token in Expo SecureStore
3. Child closes app
4. **Next time**: Child opens PH Messenger
5. App shows Face ID prompt (or Touch ID/PIN depending on device)
6. Child authenticates with Face ID
7. App instantly shows message groups list
8. No email/password required
9. If Face ID fails 3 times: Requires Kinde re-authentication for security

**Technical flow**:
```javascript
// On app open
const storedToken = await SecureStore.getItemAsync('auth_token');
if (storedToken) {
  const biometricResult = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock PH Messenger',
    fallbackLabel: 'Use passcode'
  });

  if (biometricResult.success) {
    // Refresh token in background
    // Navigate to message groups
  } else {
    // After 3 failures, require Kinde login
  }
}
```

**See appplan.md PH Messenger section for complete spec**

---

### Example 7: Web App Subscription Flow (Cross-Product Integration)
**Location**: `examples/web-app-subscription-flow.md`

**Scenario**: User wants to become a group admin (requires subscription)
1. User opens Parenting Helper mobile app
2. Tries to create a group (admin-only action)
3. App shows: "Admin access requires subscription"
4. "Subscribe Now" button opens https://parentinghelperapp.com/subscribe in mobile browser
5. User logs in to web app (same Kinde account)
6. Sees subscription plans: $8/month for 10GB
7. Enters payment method via Stripe Elements (PCI-compliant)
8. Completes payment
9. Returns to mobile app
10. App refreshes user status → now has admin access
11. Can create group

**Key Points**:
- NO in-app purchase APIs (no Apple/Google 30% fee)
- Web handles ALL payment logic (KISS principle)
- Mobile just links to web
- All 3 products share same auth/backend

**Technical Flow**:
```javascript
// Mobile app - Subscribe button
const handleSubscribe = () => {
  Linking.openURL('https://parentinghelperapp.com/subscribe');
  // When user returns, refresh user data
};

// Web app - Subscription page
<StripeElements>
  <PaymentMethodForm onSuccess={createSubscription} />
</StripeElements>
```

---

### Example 5: Message "Deletion" and Admin Visibility
**Location**: `examples/message-deletion-admin-view.md`

**Scenario**: Parent "deletes" an inappropriate message
1. Parent sends message, then clicks delete
2. Message marked as `is_hidden: true` in database
3. Regular members no longer see the message
4. Admins see the message greyed out with a 🚫 icon
5. Audit log records: "Parent A deleted message in Message Group 'Family Chat' - content: [original message]"
6. Message remains in database forever, included in log exports

**See appplan.md line 17 for deletion policy**

---

## DOCUMENTATION:

### Official Technology Documentation
1. **React Native with Expo**: https://docs.expo.dev/
   - React Native: https://reactnative.dev/docs/getting-started
   - Navigation: https://reactnavigation.org/docs/getting-started
   - Gestures: https://docs.swmansion.com/react-native-gesture-handler/
   - Local Authentication: https://docs.expo.dev/versions/latest/sdk/local-authentication/
   - Secure Store: https://docs.expo.dev/versions/latest/sdk/securestore/
   - EAS Build: https://docs.expo.dev/build/introduction/

2. **AWS Services**:
   - Lambda: https://docs.aws.amazon.com/lambda/
   - API Gateway: https://docs.aws.amazon.com/apigateway/
   - RDS PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
   - S3: https://docs.aws.amazon.com/s3/
   - SES: https://docs.aws.amazon.com/ses/
   - EventBridge: https://docs.aws.amazon.com/eventbridge/

3. **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

4. **Kinde Authentication**: https://kinde.com/docs/
   - Email MFA: https://kinde.com/docs/authenticate/multi-factor-auth/

5. **Stripe Subscriptions**: https://stripe.com/docs/billing/subscriptions/overview
   - Usage-based billing: https://stripe.com/docs/billing/subscriptions/usage-based
   - Webhooks: https://stripe.com/docs/webhooks

6. **JSDoc**: https://jsdoc.app/
   - Type annotations: https://jsdoc.app/tags-type.html

### Testing Documentation
7. **Jest**: https://jestjs.io/docs/getting-started
8. **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
9. **Detox (E2E)**: https://wix.github.io/Detox/

### Database & ORM
10. **PostgreSQL Documentation**: https://www.postgresql.org/docs/
11. **Node-Postgres (pg)**: https://node-postgres.com/
12. **Prisma ORM** (recommended): https://www.prisma.io/docs/

### Validation Libraries
13. **Joi**: https://joi.dev/api/
14. **Zod**: https://zod.dev/

### Mobile Development Resources
15. **iOS Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
16. **Material Design (Android)**: https://m3.material.io/

### Security & Compliance
17. **OWASP Mobile Security**: https://owasp.org/www-project-mobile-security/
18. **AWS Well-Architected Framework**: https://aws.amazon.com/architecture/well-architected/
19. **GDPR Compliance**: https://gdpr.eu/ (for data retention, deletion requests)

---

## OTHER CONSIDERATIONS:

### 🚨 Critical Gotchas - AI Assistants Often Miss These:

#### 1. **Soft Deletes Only - Nothing is Ever Truly Deleted**
- ❌ **WRONG**: `DELETE FROM messages WHERE message_id = ?`
- ✅ **CORRECT**: `UPDATE messages SET is_hidden = true, hidden_at = NOW(), hidden_by = ? WHERE message_id = ?`
- **Why**: Legal/custody implications require complete audit trail (appplan.md line 17)
- **Applies to**: Messages, groups, members, finance matters, calendar events

#### 2. **Supervisors Cannot Send Messages - UI and API Enforcement**
- ❌ **WRONG**: Rendering message input for supervisors but disabling send button
- ✅ **CORRECT**: Message input component doesn't render at all for supervisors (appplan.md line 262)
- **API Enforcement**: Lambda must reject message sends from supervisor role with 403 Forbidden
- **Test this**: Create a test that attempts to send a message as supervisor and expects failure

#### 3. **Admin Actions Often Require Other Admin Approvals**
- ❌ **WRONG**: Executing admin actions immediately without checking approval requirements
- ✅ **CORRECT**: Check admin_permissions table, create approval if needed, only execute when votes meet threshold
- **Actions requiring approval**: Add/remove members, hide messages, calendar events, assign roles, etc. (appplan.md lines 171-182)
- **Threshold logic**: >50% for most actions, 100% for adding new admins (line 182)

#### 4. **Storage is Per-Admin, Per-Group - Not Per-User**
- ❌ **WRONG**: Calculating total storage per user across all groups
- ✅ **CORRECT**: Each admin's storage includes ALL media/logs for groups they admin (appplan.md line 19)
- **Implication**: If 3 admins in a group upload 1GB video, each admin's storage increases by 1GB
- **Deletion**: Admins can only delete group backups after leaving the group

#### 5. **Calendar Responsibility Lines Are Complex - Not Just Events**
- ❌ **WRONG**: Treating child responsibility as simple calendar events
- ✅ **CORRECT**: Child responsibility events create visual timelines with:
  - Separate line for each child (color-coded)
  - Paired responsibility line showing caregiver/other
  - Start and end responsibility can be "no change", "change to end state", "specific member", or "other"
- **See appplan.md lines 282-288** for visual examples
- **Rendering**: Month view has horizontal lines (left-to-right), Day/Week views have vertical lines (top-to-bottom)

#### 6. **Message Read Status Has 4 States - Not Just Read/Unread**
- ❌ **WRONG**: Simple boolean read/unread
- ✅ **CORRECT**: 4-state system (appplan.md lines 254-258):
  1. Sent but not confirmed by server (1 grey diamond)
  2. Delivered to server (2 grey diamonds)
  3. Seen by some recipients (1 blue + 1 grey diamond)
  4. Seen by all recipients (2 blue diamonds)
- **Implementation**: Requires message_read_receipts table + WebSocket or polling for real-time updates

#### 7. **Finance Matter "Paid Amount" Can Exceed Expected Amount**
- ❌ **WRONG**: Limiting paid amount to exactly expected amount
- ✅ **CORRECT**: Allow paid amount > expected (e.g., Member A overpays, system tracks it)
- **Reason**: Real-world scenarios where someone pays extra and expects reimbursement later
- **UI**: Progress bar can exceed 100%, show as "Overpaid: +$20"

#### 8. **Mentions (@member) Create Notification AND Visual Indicator**
- ❌ **WRONG**: Just sending a push notification for @mentions
- ✅ **CORRECT**:
  - Store mention in `messages.mentions` array
  - Show yellow pill with count on message group card (appplan.md line 234)
  - Add blue border to message bubble until seen (line 253)
  - Send push notification
  - Update "Only @me" notification preference logic

#### 9. **Recurring Events Edit Has 3 Modes - Handle Carefully**
- ❌ **WRONG**: Editing recurring event updates all instances unconditionally
- ✅ **CORRECT**: Prompt user for edit scope (appplan.md lines 322, 333):
  1. "This event only" - create exception, original series unchanged
  2. "This and future events" - end original series, create new series from this point
  3. "All events" - update entire series (may require approval)
- **Database**: Use `parent_event_id` to link series, store exceptions as separate events

#### 10. **Group Members Don't Require User Accounts - Email Invites**
- ❌ **WRONG**: Requiring user_id for all group members
- ✅ **CORRECT**: Members can have `user_id: NULL` with just an email address (appplan.md line 154)
- **Use case**: Adding young children, non-tech-savvy grandparents, or documenting school contacts
- **Invite flow**: Send email invite, create account on first login, link to existing group_member record
- **Display**: Show member in UI even if not registered (greyed out icon or "invited" badge)

#### 11. **Pinning Order is User-Specific and Sequential**
- ❌ **WRONG**: Global pin order across all users
- ✅ **CORRECT**: Each user has their own pin_order (appplan.md lines 110, 223)
- **Implementation**: pinned_items table with user_id + pin_order
- **Display**: Pinned items shown first, ordered by pin_order ASC, then unpinned by latest activity

#### 12. **Long Press vs Short Press - Different Actions**
- ❌ **WRONG**: Using only tap gestures for all interactions
- ✅ **CORRECT**: Long press in calendar creates events (appplan.md lines 298, 303, 306)
  - Long press hour in day/week view → highlight → open event creation with prefilled time
  - Short press day in month view → navigate to day view
  - Long press day in month view → open event creation
- **Implementation**: Use React Native Gesture Handler's `LongPressGestureHandler`

#### 13. **Swipe Gestures Must Be Direction-Locked**
- ❌ **WRONG**: Allowing diagonal swipes to trigger multiple actions
- ✅ **CORRECT**: First swipe direction locks the gesture (appplan.md line 277)
  - Start swiping down → only vertical scrolling, ignore horizontal movement
  - Start swiping left → only left/right navigation, ignore vertical movement
- **Threshold**: 40% of screen width for swipe to register (line 276)
- **Animation**: Springy animation for page transitions

#### 14. **Member Icons Display Role with Colored Dots**
- ❌ **WRONG**: Showing role name as text on every icon
- ✅ **CORRECT**: Small colored circle in top-left of icon (appplan.md line 126):
  - Gold = Admin
  - Red = Parent
  - Yellow = Caregiver
  - Blue = Child
  - Pink = Supervisor
- **Expansion**: Press icon → expand to pill shape showing full name + role text

#### 15. **Audit Logs Must Include Message Content as String**
- ❌ **WRONG**: Just logging "message sent" without content
- ✅ **CORRECT**: Store full message content in audit log, including emojis as string (appplan.md line 209)
- **Why**: Message might be "deleted" (hidden) later, but audit log must preserve it
- **Privacy**: This is intentional for legal/custody situations
- **Format**: CSV with columns: date, time, action, location, user name, user email, message content, media links

#### 16. **Media Log Links Are Generated Per Export - Multiple Links Per Media**
- ❌ **WRONG**: One permanent link per media file
- ✅ **CORRECT**: Each log export generates NEW temporary links (appplan.md line 210)
- **Lifetime**: Links valid for 1 week from export creation
- **Security**: Password-protected (password sent in log email)
- **Tracking**: Track access count per link in media_log_links table
- **Expiration**: After 1 week, links return 410 Gone, must request new export

#### 17. **Messages Cannot Be Edited - Only Deleted (Hidden)**
- ❌ **WRONG**: Allowing message editing with "edited" indicator
- ✅ **CORRECT**: No edit button, only delete (hide) button
- **Rationale**: Legal/custody contexts require immutable message history
- **Implementation**:
  - No edit functionality in message UI
  - Delete button sets `is_hidden = true`
  - Admins still see deleted messages (greyed out)
  - If user needs to correct, they send new message
- **Audit logs**: Record deletion action with original message content

#### 18. **Calendar Responsibility Events Cannot Overlap**
- ❌ **WRONG**: Allowing child to have multiple responsibility assignments at same time
- ✅ **CORRECT**: Prevent overlaps, show error and require resolution
- **Example**: Can't create "with Dad all day" if "at school 9-3pm" already exists
- **Error message**: "This conflicts with existing event [NAME] from [TIME] to [TIME]"
- **Rationale**: Clear accountability - one person responsible at any given time

#### 19. **PH Messenger Shares Local Storage with Main App**
- ❌ **WRONG**: Separate Redux Persist storage for each app
- ✅ **CORRECT**: Both apps share same local storage on device
- **Implementation**:
  - Same authentication token
  - Same message cache (offline access)
  - Audit logs track which app was used
- **Security**: Child using PH Messenger can't access admin features from main app (API enforces this)

#### 20. **Groups Require At Least One Admin**
- ❌ **WRONG**: Allowing last admin to leave group
- ✅ **CORRECT**: UI prevents last admin from leaving
- **Special case**: If last admin's subscription expires:
  - Show banner to all users: "Group will be archived on [DATE] when [ADMIN]'s subscription ends"
  - Group becomes read-only for users
  - Nothing deleted from servers
  - Resurrection via support ticket

#### 21. **Finance Payments Cannot Exceed Owed Amount**
- ❌ **WRONG**: Accepting overpayment and tracking credit
- ✅ **CORRECT**: Reject with error "Payment amount exceeds what you owe"
- **Workaround**: User creates new finance matter for refund
- **Example**: Owe $50, paid $100 by mistake → Create "Overpayment refund - $50" matter going opposite direction

#### 22. **Approval Voting: Wait for All, But >50% Threshold Passes Immediately**
- ❌ **WRONG**: Passing action as soon as first admin approves
- ✅ **CORRECT**:
  - Default: Wait for ALL admin votes
  - Exception: If action needs >50%, pass as soon as threshold reached
- **Example**: 5 admins, need >50% (3 votes)
  - 3 approve → Pass immediately, no need for remaining 2 votes
  - 2 approve, 1 reject, 2 pending → Keep waiting
- **Requester can vote**: Admin requesting action can vote on their own request

#### 23. **Trial Groups Can Only Have ONE Admin**
- ❌ **WRONG**: Allowing trial users to add multiple admins to their groups
- ✅ **CORRECT**: Groups created during 20-day free trial restricted to ONE admin only
- **Implementation**:
  - Database flag: `created_by_trial_user` boolean on groups table
  - UI check: When adding admin, if `created_by_trial_user = true`, show error
  - Error message: "Upgrade to add more admins to this group"
  - After subscription: Flag remains, but restriction lifted (check user subscription status)
- **Visibility Banner (ALL group members see this):**
  - Text: "[Admin Name] needs to subscribe in X days or this group will be deleted"
  - Colors: Yellow (days 20-6), Orange (days 5-2), Red (day 1)
  - Location: Persistent banner at top of group screen
  - Action: "Remind [Admin]" button sends notification
- **Post-trial:**
  - Admin subscribes: Banner disappears, can add multiple admins
  - Trial expires: Group archived (visible but read-only), data preserved, reactivate by subscribing
- **Rationale**: Encourages trial-to-paid conversion, prevents trial abuse

#### 24. **Phone/Video Call Recording Uses Server-Side Ghost Recorder**
- ❌ **WRONG**: Recording on client device (privacy concerns, device limitations)
- ✅ **CORRECT**: Server-side recording via Puppeteer headless Chrome "ghost" participant
- **How it works**:
  1. Call starts → Backend spawns Puppeteer with `recorder.html`
  2. Ghost recorder joins call via WebRTC (REST-based signaling)
  3. MediaRecorder captures all remote audio streams
  4. Call ends → Recording uploaded → Browser closed
- **Critical Implementation Details**:
  - **Silent local stream**: MUST use Web Audio API silent oscillator, NOT `getUserMedia`
  - Puppeteer's fake audio device produces audible click track if using `getUserMedia`
  - The silent stream satisfies WebRTC negotiation without sending audio
- **Files**: `backend/services/recorder.service.js`, `backend/public/recorder.html`
- **See**: `backend/CALL_RECORDING_SYSTEM.md` for complete technical documentation

#### 25. **Audio Players Need Platform-Specific Seek Handling**
- ❌ **WRONG**: Using `event.nativeEvent.locationX` everywhere
- ✅ **CORRECT**: Platform detection for web vs mobile
- **Mobile (iOS/Android)**: `event.nativeEvent.locationX`
- **Web (Expo Web)**: `event.nativeEvent.offsetX` or calculate from `pageX`
- **Overflow fix**: Use `transform: [{ translateX: -8 }]` not `marginLeft: -8`
- **Files**: `AudioPlayer.jsx`, `PhoneCallDetailsScreen.jsx`

#### 26. **Video Recordings Require Metadata JSON Files**
- ❌ **WRONG**: Only saving the video file (MP4) to uploads directory
- ✅ **CORRECT**: Must also create a `{fileId}.json` metadata file
- **Why**: The `/files/:fileId` endpoint uses `localStorageService.getFileMetadata()` which looks for the JSON file
- **Pattern**: Match phone call recordings - save file AND create metadata JSON
- **Metadata includes**: fileId, fileName, mimeType, size, userId, groupId, callId, durationMs
- **Files**: `videoCalls.controller.js` (uploadRecording function)

#### 27. **Video MP4 Encoding Needs Baseline Profile for Compatibility**
- ❌ **WRONG**: Just using `-vcodec libx264` without profile settings
- ✅ **CORRECT**: Add compatibility flags for universal playback
- **Required ffmpeg flags**:
  - `-profile:v baseline` - Wide compatibility (iOS, Android, web)
  - `-level 3.1` - Wide device support
  - `-pix_fmt yuv420p` - Required for QuickTime/iOS
  - `-movflags +faststart` - Enable streaming
- **Why**: Without these, videos won't play on iOS/Safari or some Android devices
- **Files**: `backend/services/videoConverter.js`

#### 28. **Expo Web Needs Native HTML Video Player**
- ❌ **WRONG**: Using expo-av Video component on all platforms including web
- ✅ **CORRECT**: Use platform detection and native HTML `<video>` on web
- **Why**: expo-av Video component doesn't work reliably on Expo Web
- **Pattern**: `Platform.OS === 'web' ? <video src={url} controls /> : <Video source={{uri: url}} />`
- **Files**: `VideoCallDetailsScreen.jsx`

---

### 🏗️ Architecture Decisions to Remember:

#### Database Choice: PostgreSQL (Not DynamoDB)
- **Why PostgreSQL**: Complex relational data (groups → members → relationships → approvals)
- **Why not DynamoDB**: Multi-table transactions, complex queries, approval voting logic
- **Trade-off**: Slightly less "serverless" but much better for this use case

#### No WebSockets in MVP1 - Use Polling
- **Why**: Simpler infrastructure, fewer moving parts for initial launch
- **Polling**: Every 5 seconds for active message groups, 30 seconds for inactive
- **MVP2**: Add WebSocket support via API Gateway WebSocket API

#### Image/Video Limits
- **Images**: Max 10MB per image
- **Videos**: Max 100MB per video
- **Why**: Balance between quality and storage costs
- **Compression**: Apply client-side compression before upload (reduce mobile data usage)

#### Timezone Handling
- **Storage**: All timestamps in UTC in database
- **Display**: Convert to user's local timezone in mobile app
- **Gotcha**: Calendar events span timezones (e.g., custody handoff at "6pm" means local time)

#### Subscription Billing Day
- **Fixed**: Same day each month as original subscription (appplan.md line 105)
- **Proration**: If upgrading storage mid-month, prorate the difference
- **Grace Period**: 3-day grace period for failed payments before access revoked

---

### 🧪 Testing Priorities:

1. **Permission Logic** (highest priority - legal implications)
   - Test every role can/cannot perform expected actions
   - Test supervisor read-only enforcement
   - Test admin approval workflows with 2, 3, 5 admins
   - Test permission matrix auto-approval logic

2. **Data Integrity** (soft deletes, audit logs)
   - Test "deleted" items remain in database
   - Test audit logs capture all actions
   - Test log export includes all historical data
   - Test media links expire after 1 week

3. **Storage Calculation**
   - Test storage increases for all admins when media uploaded
   - Test storage freed when admin leaves and deletes backup
   - Test warning at 80% capacity
   - Test upload blocked at 100% capacity

4. **Calendar Rendering**
   - Test responsibility line rendering with 1, 2, 5 children
   - Test lines change color at correct times
   - Test month view horizontal lines
   - Test overlapping events display

5. **Finance Matter Workflows**
   - Test payment reporting and confirmation
   - Test overpayment scenarios
   - Test settling with outstanding balances
   - Test multiple admins with different allocations

---

### 🔐 Security Checklist (Review Before Each PR):

- [ ] All user inputs validated (Zod/Joi schemas)
- [ ] All endpoints check authentication (JWT verification)
- [ ] All endpoints check authorization (role + group membership)
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] File uploads validated (type, size, content)
- [ ] User-generated content sanitized before display (XSS prevention)
- [ ] Sensitive data encrypted at rest (S3 SSE-KMS, RDS encryption)
- [ ] Secrets in AWS Secrets Manager (not .env in git)
- [ ] Rate limiting configured (API Gateway throttling)
- [ ] Audit logs created for all tracked actions
- [ ] Error messages don't leak sensitive info
- [ ] CORS configured correctly (whitelist mobile app domains)

---

## Project Status

**Current Phase**: Planning & Setup

**Build Order (Sequential)**:
1. **Phase 1: Foundation** (Weeks 1-2) - Infrastructure, auth, database
2. **Phase 2: Web App** (Weeks 3-6) - BUILT FIRST - Subscriptions, payments, logs
3. **Phase 3-4: Main Mobile App** (Weeks 7-16) - BUILT SECOND - Full features
4. **Phase 5: PH Messenger** (Weeks 17-18) - BUILT THIRD - Messaging only
5. **Phase 6: Testing & Launch** (Weeks 19-24) - All 3 products

**Project Structure**:
```
patentHelper/
├── web-admin/          # Admin Web App (React) - PHASE 2
├── mobile-main/        # Parenting Helper (React Native) - PHASES 3-4
├── mobile-messenger/   # PH Messenger (React Native) - PHASE 5
├── backend/            # AWS Lambda (shared by all) - PHASE 1+
├── infrastructure/     # Terraform - PHASE 1
└── shared/             # Shared components
```

**Estimated Timeline**:
- Foundation: 2 weeks
- Web app: 4 weeks
- Main mobile app: 10 weeks
- PH Messenger: 2 weeks
- Testing & launch: 6 weeks
- **Total: 24 weeks to all 3 products**

**Deployment Targets**:
- Web app: parentinghelperapp.com (AWS S3 + CloudFront)
- Main mobile app: iOS App Store + Google Play Store
- PH Messenger: iOS App Store + Google Play Store (separate listings)

**Why Build Web First?**
- Simplifies mobile development (no payment UI needed)
- KISS principle - one place for all billing/subscription logic
- No Apple/Google in-app purchase fees (30% vs Stripe ~3%)
- Easier to iterate on payment flows (no app store review delays)

---

**Last Updated**: 2025-10-18
**Maintained By**: Development Team
**Questions?** Reference appplan.md for detailed requirements, README.md for technical architecture.
