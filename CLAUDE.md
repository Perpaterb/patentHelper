# Claude Code Instructions for Parenting Helper App

## 🔒 ABSOLUTE RULE: Git Commits for EVERY Change

**CRITICAL: GitHub must be a perfect mirror of ALL work done by Claude.**

### The Iron-Clad Rule

**EVERY SINGLE CHANGE must be committed and pushed to GitHub IMMEDIATELY.**

This includes:
- ✅ Editing a single line of code
- ✅ Updating any documentation file
- ✅ Creating a new file
- ✅ Deleting a file
- ✅ Renaming a file
- ✅ Changing a configuration
- ✅ **EVERYTHING - No exceptions**

### Mandatory Workflow (EVERY TIME)

After making ANY change:

1. **Check status**: `git status` - verify what changed
2. **Stage all**: `git add -A` - stage all changes
3. **Commit**: `git commit -m "descriptive message"` - use conventional commits format
4. **Push**: `git push` - push to GitHub immediately
5. **ONLY THEN** can you ask the user a question or report what you did

### Conventional Commit Format

- `feat: Add new feature`
- `fix: Bug fix`
- `refactor: Code refactoring`
- `docs: Documentation updates`
- `test: Add or update tests`
- `chore: Maintenance tasks`

### Why This is CRITICAL

✅ **Point-in-time recovery** - User can `git reset --hard <commit-hash>` to any point
✅ **Prevents data loss** - If Claude breaks something, easy rollback
✅ **Clear checkpoints** - Each change is a discrete commit
✅ **Complete audit trail** - Perfect history of all work

### Before Asking "What's Next?"

**MANDATORY SAFETY CHECKPOINT:**

Before asking the user "What would you like to work on next?" or any similar prompt, you MUST:

1. Run `git status` to check for uncommitted changes
2. If there are uncommitted changes:
   - Run `npm test` to ensure tests pass
   - Stage all changes: `git add -A`
   - Commit with descriptive message
   - Push to remote: `git push`
3. Inform the user: "Changes committed and pushed to [commit message]. Ready for next task."

**Exception:** If there are NO uncommitted changes (clean working tree), you can skip the commit step.

### NEVER Do This

❌ **NEVER** ask a question without committing first
❌ **NEVER** batch multiple changes into one commit
❌ **NEVER** skip pushing to remote
❌ **NEVER** assume "this is too small to commit"

**Remember**: GitHub is the safety net. Commit EVERYTHING.

---

## 🎯 Core Guiding Principle: KISS / KASS

**KISS: Keep It Simple, Stupid**
**KASS: Keep Architecture Super Simple**

This principle must guide ALL development decisions:
- **NO over-engineering** - Build the simplest solution that works
- **NO premature optimization** - Solve actual problems, not theoretical ones
- **NO unnecessary abstraction** - Don't add layers unless absolutely needed
- **NO feature creep** - Stick to requirements, resist adding "nice to haves"

**Examples of KISS in this project:**
- ✅ Web app handles ALL payments (no in-app purchases complexity)
- ✅ Mobile apps link to web for subscriptions (simple redirect)
- ✅ 3 products share 1 backend (no duplicated APIs)
- ✅ PostgreSQL for all data (no mixing databases)
- ✅ Soft deletes only (simple is_hidden flag)

**Before implementing ANY feature, ask:**
1. Is this the simplest solution?
2. Can I remove any complexity?
3. Am I solving a real problem or an imagined one?

If you're about to build something complex, STOP and ask the user if there's a simpler way.

---

## 🚨 CRITICAL: Changing Backend API Endpoints

**MANDATORY PROCESS - NO EXCEPTIONS**

Before changing ANY backend endpoint, you MUST follow this exact process:

1. **Read `backend/ENDPOINT_CHANGE_CHECKLIST.md`** - This is mandatory
2. **Run `backend/scripts/check-endpoint-usage.sh "/endpoint/path"`** - Find ALL consumers
3. **Update `backend/API.md` FIRST** - Documentation before code
4. **Make the change** - Only after completing steps 1-3
5. **Update tests** - Make tests match API.md
6. **Run `npm test`** - Tests must pass
7. **Ask yourself**: "Did I check all 3 apps?" (web-admin, mobile-main, mobile-messenger)

**Why this is CRITICAL:**
- 3 products share 1 backend
- Breaking an endpoint breaks multiple apps
- Tests only catch what they're designed to catch
- You MUST manually verify you didn't break other apps

**Safe changes:**
- ✅ Adding new fields (existing apps ignore them)
- ✅ Adding new endpoints

**Dangerous changes:**
- ❌ Removing fields (apps may still use them)
- ❌ Renaming fields (breaks all consumers)
- ❌ Changing field types (breaks parsing)

**If you're unsure, ASK THE USER before making the change.**

---

## 👥 CRITICAL: Group Member Addition - Placeholders vs Invitations

**This is a CRITICAL business logic rule. DO NOT change this behavior without explicit user approval.**

### Two Types of Group Members

When an admin adds someone to a group, the system handles it differently based on whether the email is registered:

#### 1. **Placeholder Members** (Unregistered Email)
**Use Case:** Adding someone who will NEVER log in (e.g., "Granny" for calendar/finance tracking)

**Behavior:**
- Email does NOT match any existing user
- Creates GroupMember with `isRegistered: true`, `userId: null`
- **Appears immediately in the group** - no invitation needed
- Used for calendar events, finance tracking, etc.
- Can be any role EXCEPT admin

**Example:** Admin adds granny@example.com as caregiver. Granny never logs in, but her name appears in calendar events and finance records.

#### 2. **Registered User Invitations** (Registered Email)
**Use Case:** Adding someone who HAS an account and should accept the invitation

**Behavior:**
- Email MATCHES an existing user in the database
- Creates GroupMember with `isRegistered: false`, links to `userId`
- **Creates pending invitation** - user must accept via InvitesScreen
- User sees invitation in top-right "Invites" button on Groups landing page
- User can Accept (joins group) or Decline (invitation deleted)
- Only becomes active member after accepting

**Example:** Admin adds granddad@example.com. Granddad has an account, sees invitation in app, clicks Accept, then joins group.

### Admin Role Restrictions

**CRITICAL:** Admin role has special requirements:

- ❌ **CANNOT add placeholder as admin** - Admins must be registered users
- ❌ **CANNOT add unregistered email as admin** - Returns error
- ✅ **Can ONLY add registered users with active subscription/trial as admin**

**Validation Logic:**
```javascript
if (role === 'admin') {
  if (!targetUser) {
    return error: "Cannot add non-registered users as admin"
  }
  if (!hasActiveSubscription) {
    return error: "User must have active subscription to be admin"
  }
}
```

**Reason:** Admins need to approve actions, manage members, etc. Placeholder members cannot log in, so they cannot perform admin duties.

### Implementation Reference

See `backend/controllers/groups.controller.js` - `POST /groups/:groupId/members` endpoint (lines 489-512)

**DO NOT modify this logic without understanding both use cases!**

---

## 🔄 Project Awareness & Context

* Always read README.md at the start of a new conversation to understand the project's architecture, tech stack, database schema, API design, and implementation phases.
* Check appplan.md to understand the complete feature requirements, user flows, and business logic.
* Use consistent naming conventions, file structure, and architecture patterns as described in README.md.
* The project has **3 products** built in sequence, sharing 1 backend:
  1. **`web-admin/`** - Admin Web App (React, built FIRST) - Subscriptions, payments, log exports
  2. **`mobile-main/`** - Parenting Helper main app (React Native with Expo, built SECOND) - Messaging, calendar, finance (NO payments)
  3. **`mobile-messenger/`** - PH Messenger companion app (React Native with Expo, built THIRD) - Messaging only
* Supporting infrastructure:
  * `backend/` - AWS Lambda functions (JavaScript/Node.js with JSDoc) - Shared by all 3 products
  * `infrastructure/` - Terraform IaC configurations
  * `shared/` - Shared components and utilities between mobile apps

### ⚠️ CRITICAL: App Navigation Hierarchies

**ALWAYS check `mobile-main/NAVIGATION.md` before implementing mobile features!**

**Full App (mobile-main) Navigation:**
```
Login → Groups List → Group Dashboard → [Messages/Calendar/Finance Sections]
                           ↓
                    [Each section has its own sub-navigation]
```

**PH Messenger (mobile-messenger) Navigation:**
```
Login → Groups List → Message Groups List → Individual Message Group
```

**KEY DIFFERENCES:**
- **Full app**: Groups List → **Group Dashboard** (with tabs for Messages, Calendar, Finance)
- **Messenger app**: Groups List → **Directly to Message Groups** (no Group Dashboard)

**DO NOT MIX THESE TWO STRUCTURES!** They are intentionally different apps.

See `README.md` section 1.5 and `mobile-main/NAVIGATION.md` for complete navigation hierarchies.

---

## 🧱 Code Structure & Modularity

### File Size Limits
* Never create a file longer than 500 lines of code. If a file approaches this limit, refactor by splitting it into modules or helper files.
* For React components: Split into smaller sub-components if exceeding 300 lines
* For Lambda functions: Extract business logic into separate service files if exceeding 200 lines

### Component Organization (Mobile)
* Organize React components by feature in `mobile/src/components/`:
  * Each component should have its own folder if it includes styles, tests, or sub-components
  * Example structure:
    ```
    components/
      messaging/
        MessageBubble/
          MessageBubble.jsx
          MessageBubble.test.js
          MessageBubble.styles.js
          index.js
    ```
* Keep components focused on a single responsibility
* Extract reusable logic into custom hooks in `mobile/src/hooks/`

### Lambda Function Organization (Backend)
* Each Lambda function should be organized as:
  * `handler.js` - Main Lambda handler (entry point)
  * `service.js` - Business logic (testable, no AWS SDK dependencies)
  * `schemas.js` - Validation schemas (using Joi or Zod)
  * Use JSDoc comments to document parameter types and return values
* Shared code goes in `backend/layers/common/`

### Import Conventions
* Use absolute imports with path aliases configured in babel/metro config:
  * Mobile: `@/components`, `@/services`, `@/schemas`, `@/utils`
  * Backend: `@/common`, `@/schemas`, `@/utils`
* Group imports in this order:
  1. External libraries (React, AWS SDK, etc.)
  2. Internal absolute imports
  3. Relative imports
* Use destructuring for clarity: `const { validateUser } = require('@/utils/validators');`

### Environment Variables
* Use `.env` files for local development (never commit to git)
* Reference environment variables through a centralized config file:
  * Mobile: `mobile/src/config/env.js`
  * Backend: `backend/layers/common/config/env.js`
* Use AWS Systems Manager Parameter Store or Secrets Manager for production secrets

---

## 🧪 Testing & Reliability

### Unit Testing Requirements
* Always create tests for new features (components, functions, services, API endpoints)
* After updating any logic, check whether existing tests need to be updated. If so, update them.
* Use Jest for both frontend and backend testing

### Mobile Testing (React Native)
* Tests should live in `mobile/src/__tests__/` or colocated with components as `ComponentName.test.js`
* Use React Testing Library for component tests
* Include at least:
  * 1 test for expected rendering/behavior
  * 1 test for user interactions (button clicks, form submissions)
  * 1 test for edge cases (empty states, error states)
  * 1 test for permission-based rendering (role-based access)
* Mock navigation and external services
* Test custom hooks separately

### Backend Testing (Lambda Functions)
* Tests should live in `backend/functions/__tests__/` mirroring the function structure
* Separate unit tests (service layer) from integration tests (handler + database)
* Include at least:
  * 1 test for expected success case
  * 1 test for authorization/permission failure
  * 1 test for validation failure (invalid input)
  * 1 test for database error handling
* Mock AWS SDK services (DynamoDB, S3, SES) using aws-sdk-mock or similar
* Use in-memory SQLite or test database for integration tests

### Test Coverage Goals
* Aim for 80%+ code coverage on business logic
* 100% coverage on permission/authorization logic
* 100% coverage on data validation logic

---

## ✅ Task Management & Workflow

### Before Starting Work
* Check if there's a task tracking file. If not, create `TASKS.md` to track ongoing work.
* Add new tasks with:
  * Brief description
  * Status (TODO, IN_PROGRESS, DONE)
  * Date added
  * Related files/components

### During Development
* Use the TodoWrite tool to track multi-step tasks
* Mark completed tasks immediately after finishing them
* Add newly discovered sub-tasks or TODOs under a "Discovered During Work" section

### 🔒 CRITICAL: Before Asking User for Next Task

**MANDATORY SAFETY CHECKPOINT** - This prevents data loss and enables point-in-time recovery:

Before asking the user "What would you like to work on next?" or any similar prompt, you MUST:

1. **Check git status**: Run `git status` to see uncommitted changes
2. **If there are uncommitted changes**:
   - Run `npm test` to ensure tests pass
   - Stage all changes: `git add -A`
   - Commit with descriptive message following conventional commits format
   - Push to remote: `git push`
3. **Inform the user**: Tell them "Changes committed and pushed. Ready for next task."

**Why this is critical:**
- Enables point-in-time recovery to any previous state
- Prevents data loss if Claude makes mistakes (like accidentally deleting files)
- Creates clear checkpoints between different pieces of work
- Allows easy rollback with `git reset --hard <commit-hash>`

**Example workflow:**
```
User: "Fix the calendar date picker"
Claude: [completes work, updates docs, runs tests]
Claude: [runs git status, sees changes]
Claude: [commits and pushes]
Claude: "Calendar date picker fixed. Changes committed and pushed to main. What would you like to work on next?"
```

**Exception:** If there are NO uncommitted changes (clean working tree), you can skip the commit step.

### After Completing Features

**CRITICAL**: Documentation must ALWAYS be updated immediately after completing any work. This is MANDATORY, not optional.

#### Documentation Update Requirements (ALWAYS DO THIS):

1. **Update NEXT_STEPS.md** (REQUIRED after every task):
   - Mark completed tasks with [x] checkbox
   - Add implementation notes and any deviations from the plan
   - Add completion date/timestamp
   - Update the "Current Status" section

2. **Update README.md** (REQUIRED if applicable):
   - New dependencies were added → Update dependencies section
   - Setup/installation steps changed → Update setup section
   - New environment variables are required → Update environment variables section
   - API endpoints were added/modified → Update API documentation section
   - Database schema changed → Update database schema section
   - Architecture patterns changed → Update architecture section

3. **Update appplan.md** (REQUIRED if applicable):
   - Requirements evolved during implementation
   - New features were discovered
   - Business logic changed from original plan
   - User flows were modified

**Before moving to the next task**: Verify all relevant documentation files are updated and committed.

---

## 📎 Style & Conventions

### JavaScript with JSDoc
* Use JavaScript (ES6+) for all new code (mobile and backend)
* Use JSDoc comments for type hints and documentation
* Validate all inputs/outputs using Joi or Zod schemas
* Example JSDoc annotation:
  ```javascript
  /**
   * @typedef {Object} User
   * @property {string} userId - The user's unique ID
   * @property {string} email - The user's email address
   * @property {boolean} isSubscribed - Whether user has active subscription
   */

  /**
   * Fetches user by ID
   * @param {string} userId - The user ID to fetch
   * @returns {Promise<User>} The user object
   * @throws {NotFoundError} If user doesn't exist
   */
  async function getUserById(userId) {
    // Implementation
  }
  ```

### Code Formatting
* Use ESLint + Prettier for consistent formatting
* Run `npm run lint` and `npm run format` before committing
* Configure VSCode/IDE to format on save

### React (Web App) Conventions
* Use functional components with hooks (no class components)
* Document component props with JSDoc (same as React Native)
* Use React Router for navigation
* Integrate Stripe Elements for payment forms (never handle raw card data)
* Use Material-UI or Chakra UI components for consistent admin UI
* Web app pages:
  * Login
  * Dashboard (overview of subscription, storage)
  * Subscription management (plans, payment method, billing history)
  * My Account (storage tracker, account settings)
  * Log Export (request logs, download previous exports)

### React Native (Mobile Apps) Conventions
* Use functional components with hooks (no class components)
* Document component props with JSDoc:
  ```javascript
  /**
   * MessageBubble component displays a single message
   * @param {Object} props
   * @param {string} props.messageId - The message ID
   * @param {string} props.content - Message text content
   * @param {string} props.senderName - Name of message sender
   * @param {boolean} [props.isHidden] - Whether message is hidden (admin view)
   * @returns {JSX.Element}
   */
  const MessageBubble = ({ messageId, content, senderName, isHidden = false }) => {
    // Implementation
  };
  ```
* Use custom hooks for complex state logic
* Follow React Native naming: `ComponentName.jsx`, `useCustomHook.js`
* Use React Native StyleSheet (consistent within project)

### Backend Conventions
* Lambda handlers should follow this pattern:
  ```javascript
  /**
   * Lambda handler for user login
   * @param {Object} event - API Gateway event
   * @param {Object} context - Lambda context
   * @returns {Promise<Object>} API Gateway response
   */
  exports.handler = async (event, context) => {
    // Implementation
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  };
  ```
* Use early returns for validation failures
* Always return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
* Use structured logging (JSON format) for CloudWatch
* Include correlation IDs in logs for tracing

### Naming Conventions
* **Files**:
  * Components: PascalCase (`MessageBubble.jsx`)
  * Hooks: camelCase with 'use' prefix (`useAuth.js`)
  * Utils: camelCase (`formatDate.js`)
  * Schemas: camelCase with '.schema' suffix (`user.schema.js`)
* **Variables**: camelCase (`userId`, `messageGroup`)
* **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`, `API_BASE_URL`)
* **Functions**: camelCase (`getUserById`, `validateMessage`)
* **Classes** (if used): PascalCase (`DatabaseConnection`, `ApiClient`)

### Database Conventions
* Use parameterized queries (never string concatenation)
* Use transactions for multi-table operations
* Follow snake_case for database columns (user_id, created_at)
* Always include `created_at` and `updated_at` timestamps
* Use UUIDs for primary keys (not auto-increment integers)

---

## 🔒 Security Best Practices

* **Never** commit secrets, API keys, or credentials to git
* **Always** validate and sanitize user input (use Joi or Zod schemas)
* **Always** check user permissions before allowing actions
* Implement role-based access control (RBAC) checks in every protected endpoint
* Use prepared statements/parameterized queries to prevent SQL injection
* Sanitize user-generated content to prevent XSS
* Validate file uploads (type, size, content) before storing
* Use HTTPS/TLS for all API communication
* Implement rate limiting on all public endpoints
* Log security events (failed logins, unauthorized access attempts)

### Input Validation Example
```javascript
const Joi = require('joi');

const createGroupSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  icon: Joi.string().optional(),
  backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
});

// In handler
const { error, value } = createGroupSchema.validate(requestBody);
if (error) {
  return { statusCode: 400, body: JSON.stringify({ error: error.details }) };
}
```

---

## 📚 Documentation & Explainability

### Code Documentation
* Write JSDoc comments for all exported functions, components, and complex logic:
  ```javascript
  /**
   * Sends a message to a message group with optional media attachments.
   *
   * @param {string} messageGroupId - The UUID of the message group
   * @param {string} content - The message text content
   * @param {string[]} [mentions] - Array of member UUIDs to mention
   * @param {File[]} [media] - Optional array of media files to attach
   * @returns {Promise<Object>} Promise resolving to the created message
   * @throws {ValidationError} If content is empty or mentions are invalid
   * @throws {PermissionError} If user doesn't have access to message group
   */
  async function sendMessage(messageGroupId, content, mentions = [], media = []) {
    // Implementation
  }

  module.exports = { sendMessage };
  ```

### Inline Comments
* Comment non-obvious code and business logic
* When writing complex logic, add a `// Reason:` or `// Note:` comment explaining the why, not just the what
* Example:
  ```javascript
  // Reason: Supervisors can view but never send messages per requirements in appplan.md line 262
  if (userRole === 'supervisor') {
    throw new PermissionError('Supervisors cannot send messages');
  }
  ```

### README Updates
* Update README.md when:
  * New features are added
  * Dependencies change
  * Setup steps are modified
  * Environment variables are added
  * API endpoints change
* Keep the README sections synchronized with actual implementation

### API Documentation
* Document all API endpoints with:
  * Description
  * Required headers (Authorization)
  * Request body schema
  * Response schema
  * Possible error codes
  * Example request/response
* Use OpenAPI/Swagger specification for API documentation (generate from code if possible)

---

## 🧠 AI Behavior Rules

### Asking Questions
* **Never assume missing context.** Ask questions if uncertain about:
  * Business logic or requirements
  * User permissions for a feature
  * Which approval workflow applies
  * Data retention policies
  * Security requirements

### Avoiding Hallucinations
* Never hallucinate libraries or packages – only use known, verified npm packages
* Always confirm file paths and module names exist before referencing them
* Don't invent API endpoints – check README.md or existing code
* Don't guess at database schema – refer to README.md section 4
* Don't invent JSDoc types – use simple, standard JavaScript types (string, number, boolean, Object, Array, Promise)

### Safe Code Modifications
* Never delete or overwrite existing code unless:
  * Explicitly instructed by the user
  * Part of a refactoring task with clear scope
  * Fixing a bug with a clear solution
* When refactoring, preserve existing functionality and tests
* When uncertain about removing code, comment it out instead and ask for confirmation

### Implementation Verification
* After implementing a feature, verify:
  * All acceptance criteria from appplan.md are met
  * Role-based permissions are correctly enforced
  * Audit logs are created for tracked actions
  * Error handling covers edge cases
  * Tests are written and passing
  * No security vulnerabilities introduced

---

## 💬 Messaging System Implementation Guide

**CRITICAL**: This section contains implementation details for the messaging system. Read this BEFORE modifying any messaging code.

### Message Read Receipts System

**4-State Diamond Indicator System:**

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

**Implementation in MessagesScreen.jsx (lines 286-351):**

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

**CRITICAL GOTCHA - Member Filtering:**

- **ONLY count members where `isRegistered === true`**
- Admins can create placeholder members who haven't logged in yet
- These unregistered members should NOT affect read receipt calculations
- Exclude the message sender from the count (they don't need to read their own message)

### Message Alignment Logic

**How it works:**

Messages are aligned based on comparing the sender's `groupMemberId` with the current user's `groupMemberId`.

```javascript
const isMyMessage = item.sender?.groupMemberId === currentUserMemberId;
```

**CRITICAL: Where currentUserMemberId comes from:**

- Backend endpoint: `GET /groups/:groupId/message-groups/:messageGroupId`
- Response field: `currentGroupMemberId`
- Set in frontend state: `setCurrentUserMemberId(response.data.currentGroupMemberId)`
- Used in `renderMessage` function to determine alignment

**Styling:**
- My messages: Blue background (`#e3f2fd`), aligned right
- Other messages: White background (`#fff`), aligned left

**Common Bug:**

If `currentUserMemberId` is `null`, ALL messages will align to the left because:
```javascript
null === "some-uuid" // always false
```

This usually means the backend endpoint failed to return `currentGroupMemberId`.

### Backend API Structure

**GET /groups/:groupId/message-groups/:messageGroupId/messages**

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

**Profile Merging Pattern:**

All messaging endpoints merge User profile data with GroupMember data:

```javascript
// Priority: User profile > GroupMember profile
displayName: message.sender.user?.displayName || message.sender.displayName,
iconLetters: message.sender.user?.memberIcon || message.sender.iconLetters,
iconColor: message.sender.user?.iconColor || message.sender.iconColor,
```

This ensures that if a user updates their global profile, it shows in all groups immediately.

### Mark as Read Implementation

**Endpoint:** `PUT /groups/:groupId/message-groups/:messageGroupId/mark-read`

**What it does:**

1. Finds all unread messages (messages created after `lastReadAt` that user hasn't read)
2. Creates `MessageReadReceipt` records for each unread message
3. Updates `MessageGroupMember.lastReadAt` timestamp
4. Creates audit log entry with message IDs

**CRITICAL Implementation Details:**

- Does NOT create read receipts for user's own messages (`senderId !== currentUserId`)
- Skips duplicates with `skipDuplicates: true`
- Uses `findMany` with `readReceipts: { none: { groupMemberId } }` to avoid duplicate reads
- Creates audit log for compliance/admin exports

**Backend code (messages.controller.js:443-564):**

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

### Common Field Name Gotchas

**CRITICAL: Use the correct field names!**

❌ **WRONG:**
```javascript
inviteStatus: true  // This field does NOT exist
fullName: true      // This field does NOT exist
```

✅ **CORRECT:**
```javascript
isRegistered: true  // Boolean field on GroupMember
displayName: true   // String field on both User and GroupMember
```

**Schema reference (GroupMember model):**

```prisma
model GroupMember {
  groupMemberId  String   @id @default(uuid())
  displayName    String   // GroupMember-specific display name
  iconLetters    String
  iconColor      String
  role           Role
  isRegistered   Boolean  @default(false)  // ← Use this, NOT inviteStatus
  user           User?    @relation(...)
  // ...
}

model User {
  userId       String  @id @default(uuid())
  displayName  String  // User's global display name (NOT fullName)
  memberIcon   String  // User's global icon letters (maps to iconLetters in GroupMember)
  iconColor    String  // User's global icon color
  // ...
}
```

**If you get a Prisma error about "Unknown field":**

1. Check the schema in `backend/prisma/schema.prisma`
2. Search for BOTH the User and GroupMember models
3. Use the EXACT field names from the schema
4. Remember: `isRegistered` (boolean) NOT `inviteStatus`

### Members Array Structure

**CRITICAL: Preserve groupMemberId when mapping members**

When fetching message group members, you receive:

```javascript
messageGroup.members = [
  {
    groupMemberId: "uuid",  // ← From MessageGroupMember table
    groupMember: {          // ← Nested GroupMember data
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
// ✅ CORRECT - Preserves both groupMemberId and groupMember properties
setMembers(messageGroup.members.map(m => ({
  ...m.groupMember,           // Spread all groupMember properties
  groupMemberId: m.groupMemberId  // Explicitly preserve the top-level groupMemberId
})));

// ❌ WRONG - Loses groupMemberId
setMembers(messageGroup.members.map(m => m.groupMember));
```

**Why this matters:**

- Read receipt calculations need `groupMemberId` to match against `message.sender.groupMemberId`
- Member filtering needs `isRegistered` boolean
- Both must be in the same object for the filter to work

### Debugging Message Alignment Issues

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

4. **Check Prisma query:**
   - Backend might have wrong field name (e.g., `inviteStatus` instead of `isRegistered`)
   - This causes 500 error, preventing `currentGroupMemberId` from being set

### Audit Logs for Messages

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

---

## 📋 Project-Specific Rules

### 3-Product Architecture
* **Always** remember there are THREE products sharing the same backend:
  1. **Admin Web App** (web-admin/) - Subscriptions, payments, log exports (BUILT FIRST)
  2. **Parenting Helper Mobile App** (mobile-main/) - Full features: messaging, calendar, finance (BUILT SECOND)
  3. **PH Messenger Mobile App** (mobile-messenger/) - Messaging only, biometric auth (BUILT THIRD)
* **IMPORTANT**: Mobile apps have NO payment/subscription UI - they link to web app
  * Subscribe button → Opens parentinghelperapp.com/subscribe in browser
  * My Account → Shows storage usage, link to web for billing
  * NO Stripe integration in mobile apps
* **All 3 products** use same Kinde authentication
* **All 3 products** use same backend API endpoints
* **Shared backend** - No duplicate API development

### PH Messenger Companion App
* **Messaging-only** subset of main mobile app
* **Shared components** live in `shared/components/messaging/`
  * Both apps import from this folder
  * Changes to shared components affect both apps
  * Test in both apps when modifying shared code
* **Backend is identical** - PH Messenger uses same API endpoints, just a subset
* **Authentication difference**:
  * Main app: Kinde login every time
  * PH Messenger: Biometric after first Kinde login
* **Supervisors CANNOT use PH Messenger** (they can't send messages)

### Role-Based Access Control
* **Always** check user role before allowing actions
* Reference appplan.md for role permissions:
  * Admin (line 87): Full access, requires subscription
  * Parent (line 88): Standard access
  * Child (line 89): Limited access
  * Caregiver (line 90): Care-related access
  * Supervisor (line 91): Read-only access
* Implement permission checks in both frontend (UI hiding) and backend (enforcement)

### Audit Logging
* **All** group actions must be logged to audit_logs table (appplan.md line 203)
* Include: date, time, action, location, user name, user email, content, media links
* Never allow logs to be deleted (appplan.md line 17)
* Hidden messages remain visible to admins (appplan.md line 17)

### Approval Workflows
* Many admin actions require approval from other admins (appplan.md lines 140-182)
* Implement approval logic:
  * Create approval record
  * Notify relevant admins
  * Track votes
  * Execute action when threshold met (>50% or 100% depending on action)
* Never execute actions that require approval without proper votes

### Data Deletion Policy
* **Never hard delete** groups, messages, or members (appplan.md line 17)
* Implement soft deletes with `is_hidden` or `deleted_at` flags
* Hidden content remains in database and audit logs
* Only admins can see hidden content

### Storage Tracking
* Track storage usage per admin per group (appplan.md lines 1, 19)
* Update storage_usage table when media is uploaded
* Warn users at 80% storage capacity
* Prevent uploads when storage limit exceeded
* Calculate storage: logs + images + videos for groups where user is admin

### Subscription Requirements
* Admin role requires active subscription (appplan.md line 87)
* Check subscription status before allowing admin actions
* Handle subscription cancellation gracefully (appplan.md line 184)
* Access removed at end of billing period, not immediately

---

## 🚀 Development Workflow

### Local Development Setup

**Development Order (match build order):**
1. **Web App (FIRST)**: `cd web-admin && npm install && npm start`
   - Runs on http://localhost:3000
   - Test subscription flows, Stripe integration, log exports
2. **Backend**: `cd backend && npm install && docker-compose up` (for local AWS emulation)
3. **Main Mobile App (SECOND)**: `cd mobile-main && npm install && npm start`
   - Install Expo Go on your phone
   - Test linking to web app for subscriptions
4. **PH Messenger (THIRD)**: `cd mobile-messenger && npm install && npm start`
5. **Infrastructure**: `cd infrastructure && terraform init`

**Testing Multiple Products:**
- Web app runs in browser (Chrome/Safari)
- Both mobile apps can run simultaneously on same device (Expo Go)
- Use different Expo accounts or development builds to test side-by-side
- Test cross-product flow: Subscribe on web → Access features on mobile

### 🚨 CRITICAL: Process Management During Development

**ABSOLUTE RULE: Claude NEVER controls running processes. USER has complete control.**

**USER-MANAGED PROCESSES** (Claude must NEVER touch these):

1. **Backend Server** (`npm start` in backend/)
   - ❌ **NEVER** run `npm start` via Bash tool
   - ❌ **NEVER** stop, kill, or restart the backend process
   - ❌ **NEVER** check if backend is running
   - ✅ **ALWAYS** ask user to restart if needed

2. **Expo Dev Server** (`npm start` in mobile-main/)
   - ❌ **NEVER** run `npm start` or `expo start` via Bash tool
   - ❌ **NEVER** stop, kill, or restart Expo
   - ❌ **NEVER** check if Expo is running
   - ✅ **ALWAYS** ask user to restart if needed

3. **Database** (Docker Compose)
   - ❌ **NEVER** run `docker-compose up` or `docker-compose down`
   - ❌ **NEVER** restart database containers
   - ✅ **ALWAYS** ask user if database changes are needed

**Why this is CRITICAL:**
- ✅ User sees real-time logs in their terminals (essential for debugging)
- ✅ User controls when processes restart (e.g., after code changes)
- ✅ Prevents Claude from interfering with running development servers
- ✅ Avoids process conflicts and port binding issues
- ✅ User manages multiple terminals efficiently

**How Claude Should Communicate:**

✅ **CORRECT Examples:**
- "Please restart the backend server (`npm start` in backend/) to apply these changes."
- "These mobile app changes require restarting Expo. Please restart the Expo dev server."
- "I've updated the Prisma schema. Please run `npx prisma migrate dev` to apply database changes."

❌ **WRONG Examples:**
- Running `npm start` via Bash tool
- Running `pkill -f "node"` or similar process killers
- Running `expo start` via Bash tool
- Attempting to check if processes are running with `ps` or `lsof`

**Exception:** Claude CAN run one-time commands like:
- `npm test` (runs and exits)
- `npx prisma migrate dev` (applies migrations and exits)
- `git` commands (not processes)
- File operations (read, write, edit)

**The Rule:** If it starts a **persistent process** (server, dev server, watcher), USER controls it, not Claude.

### Before Committing

**MANDATORY CHECKLIST** - Complete ALL items before committing:

- [ ] **Documentation Updated** (CRITICAL - see "After Completing Features" section):
  - [ ] NEXT_STEPS.md updated with completed tasks marked [x]
  - [ ] README.md updated if API/dependencies/setup changed
  - [ ] appplan.md updated if requirements evolved
- [ ] **Code Quality**:
  - [ ] Run `npm run lint` in changed directories
  - [ ] Run `npm test` to ensure all tests pass
  - [ ] Run `npm run format` to format code
- [ ] **Test Coverage**:
  - [ ] Update tests if logic changed
  - [ ] Add new tests for new features
- [ ] **Security**:
  - [ ] Verify no secrets or .env files are staged
  - [ ] No hardcoded credentials in code

**If documentation is not updated, DO NOT commit. This is non-negotiable.**

### Git Commit Messages
* Use conventional commits format:
  * `feat: Add message group creation`
  * `fix: Resolve permission check for supervisors`
  * `test: Add tests for calendar event creation`
  * `docs: Update API endpoint documentation`
  * `refactor: Extract message validation logic`
  * `chore: Update dependencies`

---

## 📞 When in Doubt

* **Requirements unclear?** → Check appplan.md
* **API structure unclear?** → Check README.md Section 5
* **Database schema unclear?** → Check README.md Section 4
* **Permission logic unclear?** → Check appplan.md role descriptions (lines 86-201)
* **Still unclear?** → Ask the user for clarification

---

**Remember**: This is a parenting/co-parenting app with legal and safety implications. Accuracy, security, and reliability are paramount. When in doubt, ask rather than assume.
