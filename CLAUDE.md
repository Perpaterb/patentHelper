# Claude Code Instructions for family helper App

## 🔒 ABSOLUTE RULE: Branch-Based Development & CI/CD Deployment

**CRITICAL: All changes go through branches. CI/CD handles ALL deployments. NEVER deploy manually.**

### The Development Workflow

```
User Request → New Branch → Code Changes → Auto Tests → Commit → Manual Testing → Push to Main → CI/CD Deploys
```

### Step-by-Step Mandatory Process

#### 1. START: Create a Feature Branch
When the user requests ANY change, IMMEDIATELY create a new branch:
```bash
git checkout main
git pull origin main
git checkout -b feature/short-description
```

Branch naming conventions:
- `feature/add-queue-system` - New features
- `fix/video-call-join-bug` - Bug fixes
- `refactor/cleanup-auth` - Refactoring
- `docs/update-readme` - Documentation

#### 2. DEVELOP: Make Changes on the Branch
- Make code changes
- Commit frequently with descriptive messages
- Use conventional commit format:
  - `feat: Add new feature`
  - `fix: Bug fix`
  - `refactor: Code refactoring`
  - `docs: Documentation updates`
  - `test: Add or update tests`
  - `chore: Maintenance tasks`

#### 3. TEST: Run Automated Tests (MANDATORY before any commit)
```bash
# Backend tests
cd backend && npm test

# Web-admin tests
cd web-admin && npm test
```

**If tests fail: FIX THEM before committing. Do NOT commit broken code.**

#### 4. COMMIT: Stage and Commit Changes
```bash
git add -A
git commit -m "feat: Description of change"
```

#### 5. LOCAL TESTING: Manual Verification
- Test the feature manually in the browser/app
- Verify it works as expected
- Check for edge cases

#### 6. MERGE TO MAIN: Push to Trigger CI/CD
```bash
git checkout main
git pull origin main
git merge feature/short-description
git push origin main
```

#### 7. CI/CD: Let the Pipeline Deploy
**DO NOT manually deploy. The CI/CD pipeline will:**
- Run all tests again
- Build the applications
- Deploy backend to Lightsail
- Deploy web-admin to S3/CloudFront
- Invalidate CloudFront cache (ensures latest index.js)

#### 8. VERIFY: Check CI/CD Status
- Check GitHub Actions: https://github.com/Perpaterb/patentHelper/actions
- Wait for green checkmarks
- If pipeline fails, fix issues and push again

### 🚨 NEVER DO THESE THINGS

❌ **NEVER** deploy manually with `rsync` or `ssh`
❌ **NEVER** push directly to main without testing
❌ **NEVER** skip running `npm test`
❌ **NEVER** commit code that breaks tests
❌ **NEVER** bypass CI/CD for "quick fixes"

### Why CI/CD Only?

✅ **Consistency** - Same deployment process every time
✅ **Testing** - Tests run before every deployment
✅ **Cache invalidation** - CloudFront cache cleared automatically
✅ **Audit trail** - GitHub Actions logs all deployments
✅ **Rollback** - Easy to revert via git if issues found
✅ **No accidents** - Can't accidentally deploy broken code

### Before Asking "What's Next?"

**MANDATORY CHECKLIST:**

1. All changes committed to feature branch
2. `npm test` passes in both backend and web-admin
3. Branch merged to main
4. Pushed to origin
5. CI/CD pipeline is green (or at least running)

Only THEN ask: "Changes merged and CI/CD deploying. Ready for next task."

### Emergency Hotfix Process

If production is broken and needs immediate fix:
1. Still create a branch: `git checkout -b hotfix/critical-fix`
2. Make minimal fix
3. Run tests: `npm test`
4. Merge to main and push
5. Monitor CI/CD closely
6. **Still DO NOT deploy manually** - let CI/CD handle it

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

## 🔧 CRITICAL: All Addresses Must Be Environment Variables

**ABSOLUTE RULE: All connection addresses, URLs, and IPs MUST be environment variables.**

This ensures the same codebase works for both development and production without code changes.

### What MUST be in .env files (NEVER hardcoded):

- ✅ Database connection strings (`DATABASE_URL`)
- ✅ API base URLs (`API_BASE_URL`, `EXPO_PUBLIC_API_URL`)
- ✅ Authentication domains (`KINDE_DOMAIN`)
- ✅ S3 bucket names (`S3_BUCKET`)
- ✅ External service URLs
- ✅ Server IPs (bastion, database hosts)
- ✅ CORS origins

### Environment Files:

| Environment | Backend | Web-Admin | Mobile |
|-------------|---------|-----------|--------|
| **Development** | `backend/.env` | `web-admin/.env` | `mobile-main/.env` |
| **Production** | Lightsail `/home/ubuntu/family-helper/.env` | Built with prod values | Built with prod values |

### Before Making Changes:

1. **NEVER hardcode** URLs, IPs, or connection strings in source code
2. **ALWAYS use** `process.env.VARIABLE_NAME` or config files that read from env
3. **CHECK** that your change works in BOTH dev and prod
4. **ASK** if unsure whether something should be an env var (answer is usually YES)

### Example - WRONG vs RIGHT:

```javascript
// ❌ WRONG - Hardcoded
const dbUrl = 'postgresql://user:pass@localhost:5432/db';
const apiUrl = 'https://familyhelperapp.com';

// ✅ RIGHT - Environment variable
const dbUrl = process.env.DATABASE_URL;
const apiUrl = process.env.API_BASE_URL;
```

### Infrastructure Dependencies:

See `infrastructure/AWS_RESOURCES.md` for:
- Which AWS resources must stay running
- How to update bastion IP if it changes
- SSH tunnel configuration for database access

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
  2. **`mobile-main/`** - family helper main app (React Native with Expo, built SECOND) - Messaging, calendar, finance (NO payments)
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

### 🚨 CRITICAL: Web-Admin Authentication - DO NOT Redirect Imperatively

**This has caused infinite redirect loops multiple times. DO NOT repeat this mistake.**

The web-admin uses TWO auth systems that must work together:
1. **Kinde SDK** - Manages `isAuthenticated` state
2. **React Navigation** - Conditionally renders authenticated/unauthenticated stacks

**NEVER do this in API interceptors:**
```javascript
// ❌ WRONG - Causes infinite redirect loop!
window.location.href = '/login';
```

**ALWAYS let Kinde state drive navigation:**
```javascript
// ✅ CORRECT - Clear token, let React Navigation handle it
localStorage.removeItem('accessToken');
console.warn('[API] Token refresh failed - user will be redirected by auth state change');
```

**Why this causes loops:**
1. User on `/web-app` → API call fails with 401
2. Interceptor redirects to `/login`
3. Kinde SDK checks auth → not authenticated
4. Shows unauthenticated stack (Landing page)
5. But URL is `/login` → redirect again
6. Loop infinitely

**The architecture:**
- `App.js` has `{!isAuthenticated ? <UnauthedStack /> : <AuthedStack />}`
- When `isAuthenticated` becomes false, navigation AUTOMATICALLY shows login
- No imperative redirect needed!

**Files**: `web-admin/src/services/api.js`, `web-admin/App.js`
**Gotcha Reference**: See Initial.md Gotcha #31

---

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
  2. **family helper Mobile App** (mobile-main/) - Full features: messaging, calendar, finance (BUILT SECOND)
  3. **PH Messenger Mobile App** (mobile-messenger/) - Messaging only, biometric auth (BUILT THIRD)
* **IMPORTANT**: Mobile apps have NO payment/subscription UI - they link to web app
  * Subscribe button → Opens familyhelperapp.com/subscribe in browser
  * My Account → Shows storage usage, link to web for billing
  * NO Stripe integration in mobile apps
* **All 3 products** use same Kinde authentication
* **All 3 products** use same backend API endpoints
* **Shared backend** - No duplicate API development

### 🚨 CRITICAL: This is a WORKING Production App

**DO NOT change backend code unless absolutely necessary.**

Before modifying ANY backend code, ask yourself:
1. Is this app already working in production? **YES**
2. Is this a new bug introduced by my changes? Or existing behavior?
3. Am I seeing a warning message? **Warnings are NOT errors - ignore them**

**NEVER change code just because:**
- You see a console warning
- You think something "should" be different
- You want to "improve" something that already works

### Kinde Authentication - NO CLIENT SECRET NEEDED

**IMPORTANT:** Kinde uses PKCE flow. There is NO client secret.

The backend warning `⚠️ Missing Kinde configuration: KINDE_CLIENT_SECRET` can be **IGNORED**.
The app works without it. DO NOT try to "fix" this warning.

#### FamilyHelperAPPProd (Production)

| Setting | Value |
|---------|-------|
| Domain | https://familyhelperapp.kinde.com |
| Client ID | bfbf86777e654654b374cf92f5719c74 |
| Client Secret | NOT APPLICABLE |

**Allowed Callback URLs:**
- http://localhost:3001/auth/callback
- https://did5g5bty80vq.cloudfront.net/auth/callback
- https://familyhelperapp.com/auth/callback
- https://www.familyhelperapp.com/auth/callback

**Allowed Logout Redirect URLs:**
- http://localhost:3001
- https://did5g5bty80vq.cloudfront.net
- https://familyhelperapp.com
- https://www.familyhelperapp.com

**Homepage/Login URI:** https://familyhelperapp.com

#### FamilyHelperAPPDev (Development)

| Setting | Value |
|---------|-------|
| Domain | https://familyhelperapp.kinde.com |
| Client ID | 552e8d9d29f046418a8dfce0b7f0de1b |
| Client Secret | NOT APPLICABLE |

**Allowed Callback URLs:**
- http://localhost:8081/auth/callback

**Allowed Logout Redirect URLs:**
- http://localhost:8081

**Homepage/Login URI:** http://localhost:8081

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

## 🚀 CI/CD Pipeline & Deployment

### Current Architecture: Lightsail

**IMPORTANT:** Production runs on **AWS Lightsail**, NOT Lambda/CloudFront!

| Component | Location |
|-----------|----------|
| Backend API | Lightsail (Node.js + PM2 + nginx) |
| Web Frontend | Lightsail (nginx serves static files from `/home/ubuntu/web-admin`) |
| Database | AWS RDS PostgreSQL |
| File Storage | AWS S3 |

### Deployment Scripts

**Full Deployment (Backend + Frontend):**
```bash
./scripts/deploy-lightsail.sh
```

**Frontend Only (Web App):**
```bash
./scripts/deploy-web-frontend.sh
```

**What deploy-web-frontend.sh does:**
1. Builds web-admin for web: `npx expo export --platform web`
2. Syncs dist/ to Lightsail: `rsync` to `/home/ubuntu/web-admin/`
3. Verifies deployment by checking bundle hash

### Manual Deployment Commands

**Deploy Backend Only:**
```bash
# From project root
rsync -avz --delete \
  --exclude 'node_modules' --exclude 'uploads' --exclude '.env*' \
  -e "ssh -i ~/.ssh/lightsail-family-helper.pem" \
  ./backend/ ubuntu@52.65.37.116:/home/ubuntu/family-helper/

# On server: install deps and restart
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 << 'EOF'
cd /home/ubuntu/family-helper
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
pm2 restart family-helper
EOF
```

**Deploy Web Frontend Only:**
```bash
cd web-admin
npm install --legacy-peer-deps
npx expo export --platform web

rsync -avz --delete \
  -e "ssh -i ~/.ssh/lightsail-family-helper.pem" \
  ./dist/ ubuntu@52.65.37.116:/home/ubuntu/web-admin/

# Verify deployment
curl -s "https://familyhelperapp.com/index.html" | grep -o 'index-[a-f0-9]*\.js'
```

### Production URLs

| Service | URL |
|---------|-----|
| Web App | https://familyhelperapp.com |
| Web App (www) | https://www.familyhelperapp.com |
| API | https://familyhelperapp.com/health |

### Server Access

```bash
# SSH to Lightsail
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116

# View PM2 logs
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 "pm2 logs family-helper --lines 50"

# Restart backend
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 "pm2 restart family-helper"

# Check PM2 status
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 "pm2 status"
```

### AWS Resources

| Resource | Name/ID |
|----------|---------|
| Lightsail Instance | family-helper-prod (52.65.37.116) |
| RDS Database | family-helper-db-prod |
| S3 (User Files) | family-helper-files-prod |
| Region | ap-southeast-2 (Sydney) |

### Monitoring & Health Checks

```bash
# Health check
curl https://familyhelperapp.com/health

# Check which JS bundle is deployed
curl -s "https://familyhelperapp.com/index.html" | grep -o 'index-[a-f0-9]*\.js'

# View PM2 logs (live)
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 "pm2 logs family-helper"
```

### Rollback Procedure

```bash
# Rollback to specific git commit
git checkout <commit-hash>

# Redeploy
./scripts/deploy-lightsail.sh
```

### GitHub Actions (OUTDATED)

The GitHub Actions workflows in `.github/workflows/` deploy to Lambda/CloudFront which is no longer used.
They can still be used for running tests on PRs.

---

## 🚨 CRITICAL: Lambda Package Size & Deployment

**AWS Lambda has a 250MB uncompressed package limit. The backend Lambda MUST stay under this limit.**

### ABSOLUTE RULES - NO EXCEPTIONS

1. **NEVER install new npm packages to the backend without explicit user approval**
   - Every new dependency increases Lambda package size
   - Ask: "This requires adding package X (~YMB). Is that OK?"

2. **NEVER manually recreate the Lambda build process**
   - Use `backend/scripts/build-lambda.sh` - it exists for a reason
   - The script has careful cleanup steps to remove large packages (sharp, ffmpeg, non-Lambda Prisma engines)
   - If the script fails due to environment issues (missing `npm`, `zip`), STOP and tell the user

3. **NEVER install packages to "work around" deployment issues**
   - If `zip` isn't available, don't install `archiver`
   - If `npm` isn't in PATH, don't try alternative approaches
   - Just tell the user: "Please run this in an environment with X available"

4. **NEVER run `npm install` or `npm ci` in deployment directories**
   - The build script handles this with `--omit=dev`
   - Manual npm commands will install dev dependencies and bloat the package

### What Happened (Learn From This Mistake)

Claude once tried to build the Lambda package when the build script failed due to missing tools. Instead of stopping:
- ❌ Manually ran `npm ci` (installed ALL deps including dev)
- ❌ Installed `archiver` package to create zip files
- ❌ Created a 406MB package (way over 250MB limit)
- ❌ Modified package.json with unnecessary dependencies

**The correct response was:** "The build script requires `npm` and `zip` to be available. Please run `./scripts/build-lambda.sh` in an environment with these tools."

### Packages That Are Intentionally EXCLUDED From Lambda

These are removed by the build script - NEVER add them back:

| Package | Reason |
|---------|--------|
| `sharp` | Native bindings, ~50MB, image conversion optional |
| `@img/*` | Sharp dependencies |
| `heic-convert` | Image conversion, handled by Media Processor Lambda |
| `libheif-js` | HEIC support, handled by Media Processor Lambda |
| `fluent-ffmpeg` | Video processing, handled by Media Processor Lambda |
| `@ffmpeg-installer/*` | FFmpeg binaries, ~70MB each |
| `@ffprobe-installer/*` | FFprobe binaries |
| `typescript` | Dev only |
| `eslint` | Dev only |
| `@types/*` | TypeScript types, dev only |

### Before Adding ANY Backend Dependency

Ask yourself:
1. Is this absolutely necessary?
2. How big is this package? (Check on bundlephobia.com)
3. Does it have native bindings? (These often don't work on Lambda)
4. Can this be handled by the Media Processor Lambda instead?
5. Have I asked the user for approval?

### Media Processing is SEPARATE

Heavy media processing (video/audio conversion, HEIC conversion) is handled by a **separate Media Processor Lambda** using container deployment. This allows the main API Lambda to stay small.

- Main API Lambda: ~50-80MB (must stay under 250MB)
- Media Processor Lambda: Container-based (no size limit)

---

## 📞 When in Doubt

* **Requirements unclear?** → Check appplan.md
* **API structure unclear?** → Check README.md Section 5
* **Database schema unclear?** → Check README.md Section 4
* **Permission logic unclear?** → Check appplan.md role descriptions (lines 86-201)
* **Still unclear?** → Ask the user for clarification

---

**Remember**: This is a parenting/co-parenting app with legal and safety implications. Accuracy, security, and reliability are paramount. When in doubt, ask rather than assume.
