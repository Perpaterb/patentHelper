# Claude Code Instructions for Parenting Helper App

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

### After Completing Features
* Update README.md if:
  * New dependencies were added
  * Setup/installation steps changed
  * New environment variables are required
  * API endpoints were added/modified
* Update appplan.md if requirements evolved during implementation

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

### Before Committing
- [ ] Run `npm run lint` in changed directories
- [ ] Run `npm test` to ensure all tests pass
- [ ] Run `npm run format` to format code
- [ ] Update tests if logic changed
- [ ] Update documentation if API/features changed
- [ ] Verify no secrets or .env files are staged

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
