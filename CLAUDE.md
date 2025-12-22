# Claude Code Instructions for Family Helper App

## 🔒 ABSOLUTE RULE: Branch-Based Development & CI/CD Deployment

**CRITICAL: All changes go through branches. CI/CD handles ALL deployments. NEVER deploy manually.**

### The Development Workflow

```
User Request → New Branch → Code Changes → Tests Pass → Commit → User Testing → Merge to Main → CI/CD Deploys
```

### Step-by-Step Process

1. **CREATE BRANCH**: `git checkout -b feature/short-description`
2. **DEVELOP**: Make changes, commit frequently with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
3. **TEST**: Run `npm test` in both `backend/` and `web-admin/` - MANDATORY before commits
4. **PUSH BRANCH**: `git push -u origin feature/short-description` - STOP here and inform user
5. **WAIT FOR USER**: Do NOT merge until user confirms testing is complete
6. **MERGE TO MAIN**: Only after user approval: `git checkout main && git merge feature/... && git push`
7. **CI/CD DEPLOYS**: Let GitHub Actions handle deployment automatically

### Never Do These

- Never deploy manually with `rsync` or `ssh`
- Never push directly to main without testing
- Never skip running `npm test`
- Never merge without user approval

---

## 🎯 Core Principle: KISS (Keep It Simple, Stupid)

- Build the simplest solution that works
- No premature optimization
- No unnecessary abstraction
- Ask the user if there's a simpler way before building something complex

---

## 🔧 Environment Variables

**All URLs, IPs, and connection strings MUST be environment variables - NEVER hardcoded.**

| Environment | Backend | Web-Admin | Mobile |
|-------------|---------|-----------|--------|
| Development | `backend/.env` | `web-admin/.env` | `mobile-main/.env` |
| Production | Lightsail `/home/ubuntu/family-helper/.env` | Built with prod values | Built with prod values |

See `infrastructure/AWS_RESOURCES.md` for infrastructure details and troubleshooting.

---

## 🚨 Changing Backend API Endpoints

**Before changing ANY endpoint:**

1. Read `backend/ENDPOINT_CHANGE_CHECKLIST.md`
2. Run `backend/scripts/check-endpoint-usage.sh "/endpoint/path"` - Find ALL consumers
3. Update `backend/API.md` FIRST
4. Make the change
5. Update tests and run `npm test`
6. Verify you checked all 3 apps (web-admin, mobile-main, mobile-messenger)

**Safe**: Adding new fields/endpoints | **Dangerous**: Removing/renaming fields

---

## 👥 Group Member Addition - Placeholders vs Invitations

### Placeholder Members (Unregistered Email)
- Email does NOT match any existing user
- Appears immediately in group (no invitation)
- Used for people who will never log in (e.g., "Granny" for calendar tracking)
- Can be any role EXCEPT admin

### Registered User Invitations (Registered Email)
- Email MATCHES an existing user
- Creates pending invitation - user must accept
- Only becomes active after accepting

### Admin Role Restrictions
- Cannot add placeholder as admin
- Can only add registered users with active subscription as admin

See `backend/controllers/groups.controller.js` - `POST /groups/:groupId/members` for implementation.

---

## 🔄 Project Architecture

### 3 Products, 1 Backend

| Product | Location | Purpose |
|---------|----------|---------|
| Admin Web App | `web-admin/` | Subscriptions, payments, log exports |
| Family Helper Mobile | `mobile-main/` | Messaging, calendar, finance (NO payments) |
| PH Messenger | `mobile-messenger/` | Messaging only, biometric auth |

- All products share the same backend API
- Mobile apps link to web for subscription/payment (no in-app purchases)
- See `mobile-main/NAVIGATION.md` for mobile navigation structure

### Authentication

Uses Kinde with PKCE flow (no client secret needed). The warning `Missing Kinde configuration: KINDE_CLIENT_SECRET` can be ignored.

---

## 🧱 Code Structure

### File Size Limits
- Files: Max 500 lines
- React components: Max 300 lines
- Backend controllers: Max 200 lines - extract to services

### Naming Conventions
- Components: `PascalCase.jsx`
- Hooks: `useHookName.js`
- Utils: `camelCase.js`
- Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case`

### Database
- Use parameterized queries (prevent SQL injection)
- Use transactions for multi-table operations
- Always include `created_at` and `updated_at`
- Use UUIDs for primary keys

---

## 🧪 Testing

- Always create tests for new features
- Run `npm test` before every commit
- Mock navigation and external services in tests
- Aim for 80%+ coverage on business logic, 100% on auth/validation

---

## 🔒 Security Best Practices

### Web-Admin Authentication - DO NOT Redirect Imperatively

**NEVER do this in API interceptors:**
```javascript
// WRONG - Causes infinite redirect loop!
window.location.href = '/login';
```

**ALWAYS let Kinde state drive navigation:**
```javascript
// CORRECT
localStorage.removeItem('accessToken');
// React Navigation handles redirect automatically via isAuthenticated state
```

See Initial.md Gotcha #31.

### General Security
- Never commit secrets to git
- Validate/sanitize all user input (use Joi schemas)
- Check user permissions before actions
- Use HTTPS for all API communication
- Log security events

---

## ✅ Task Management

### Before Asking "What's Next?"

**MANDATORY**: Before asking for the next task:
1. Run `git status`
2. If uncommitted changes: `npm test`, `git add -A`, `git commit`, `git push`
3. Inform user: "Changes committed and pushed. Ready for next task."

### After Completing Features

Update documentation:
1. **NEXT_STEPS.md** - Mark completed tasks, add notes
2. **README.md** - If dependencies/setup/API changed
3. **appplan.md** - If requirements evolved

---

## 💬 Messaging System

For detailed messaging implementation (read receipts, alignment, API structure), see:
**`backend/docs/MESSAGING_IMPLEMENTATION.md`**

---

## 📋 Project-Specific Rules

### This is a WORKING Production App

Before modifying backend code:
1. Is this already working in production? **YES**
2. Is this a new bug or existing behavior?
3. Warnings are NOT errors - ignore them

### Role-Based Access Control

See `appplan.md` for role permissions:
- Admin: Full access, requires subscription
- Parent: Standard access
- Child: Limited access
- Caregiver: Care-related access
- Supervisor: Read-only access

### Data Policies

- **Never hard delete** - Use soft deletes (`is_hidden` flag)
- **Audit logging** - All group actions logged
- **Storage tracking** - Track per admin per group

---

## 🚨 Process Management

**Claude NEVER controls running processes. USER has complete control.**

- Never run `npm start` via Bash tool
- Never stop/restart backend, Expo, or database
- Always ask user to restart if needed

**Exception**: One-time commands are OK (`npm test`, `npx prisma migrate`, `git` commands)

---

## 🚀 Deployment

### Current Architecture

| Component | Location |
|-----------|----------|
| Backend API | Lightsail (Node.js + PM2 + nginx) |
| Web Frontend | Lightsail (nginx static files) |
| Database | AWS RDS PostgreSQL |
| File Storage | AWS S3 |

### SSH Access

**SSH uses non-standard port 2847 for security.**

```bash
# SSH to Lightsail
ssh -i ~/.ssh/lightsail-family-helper.pem -p 2847 ubuntu@52.65.37.116

# View logs
ssh -i ~/.ssh/lightsail-family-helper.pem -p 2847 ubuntu@52.65.37.116 "pm2 logs family-helper --lines 50"

# Restart backend
ssh -i ~/.ssh/lightsail-family-helper.pem -p 2847 ubuntu@52.65.37.116 "pm2 restart family-helper"
```

### Deployment Scripts

- **Full deployment**: `./scripts/deploy-lightsail.sh`
- **Web frontend only**: `./scripts/deploy-web-frontend.sh`

### CI/CD Pipeline

GitHub Actions (`.github/workflows/ci-cd.yml`) handles:
1. Run tests (backend + web-admin)
2. If tests pass: Deploy to Lightsail via rsync
3. Restart PM2 process

### Production URLs

| Service | URL |
|---------|-----|
| Web App | https://familyhelperapp.com |
| API Health | https://familyhelperapp.com/health |

---

## 🧠 AI Behavior Rules

- Ask questions if uncertain about requirements
- Never hallucinate packages - use known npm packages
- Confirm file paths exist before referencing
- Don't invent API endpoints - check existing code
- When uncertain about removing code, comment it out and ask

---

## 📞 When in Doubt

- **Requirements unclear?** → Check `appplan.md`
- **API structure?** → Check `backend/API.md`
- **Database schema?** → Check `backend/prisma/schema.prisma`
- **Still unclear?** → Ask the user

---

**Remember**: This is a parenting/co-parenting app with legal and safety implications. Accuracy, security, and reliability are paramount.
