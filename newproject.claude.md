# Claude Code Instructions Template

**Copy this file to CLAUDE.md in your new project and customize for your needs.**

This template captures best practices learned from real-world projects. Delete this header section after copying.

---

# Claude Code Instructions for [PROJECT NAME]

## 🔒 Development Workflow

**All changes go through branches. CI/CD handles deployments.**

### Workflow

```
User Request → New Branch → Code Changes → Tests Pass → Commit → User Testing → Merge to Main → CI/CD Deploys
```

### Step-by-Step

1. **CREATE BRANCH**: `git checkout -b feature/short-description`
   - Naming: `feature/`, `fix/`, `docs/`, `refactor/`
2. **DEVELOP**: Commit frequently with conventional commits
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation
   - `refactor:` - Code refactoring
   - `test:` - Tests
   - `chore:` - Maintenance
3. **TEST**: Run tests BEFORE every commit - MANDATORY
4. **PUSH BRANCH**: Push and inform user - DO NOT merge yet
5. **WAIT FOR USER**: User tests the feature
6. **MERGE TO MAIN**: Only after user approval
7. **CI/CD**: Let automation handle deployment

### Never Do These

- Never deploy manually (let CI/CD handle it)
- Never push directly to main without testing
- Never skip running tests
- Never merge without user approval

---

## 🎯 Core Principle: KISS (Keep It Simple, Stupid)

- Build the simplest solution that works
- No premature optimization
- No unnecessary abstraction
- No feature creep - stick to requirements
- Ask the user if there's a simpler way before building something complex

---

## 🔧 Environment Variables

**All URLs, IPs, and connection strings MUST be environment variables - NEVER hardcoded.**

```javascript
// WRONG
const apiUrl = 'https://myapp.com/api';
const dbUrl = 'postgresql://user:pass@localhost:5432/db';

// CORRECT
const apiUrl = process.env.API_URL;
const dbUrl = process.env.DATABASE_URL;
```

### What Must Be Environment Variables

- Database connection strings
- API base URLs
- Authentication domains/secrets
- S3 bucket names
- External service URLs
- Server IPs
- CORS origins

---

## 🧱 Code Structure

### File Size Limits

| Type | Max Lines | Action |
|------|-----------|--------|
| Any file | 500 | Split into modules |
| React components | 300 | Split into sub-components |
| Controllers/handlers | 200 | Extract to services |

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.jsx` |
| Hooks | camelCase with `use` prefix | `useAuth.js` |
| Utils | camelCase | `formatDate.js` |
| Variables | camelCase | `userId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Database columns | snake_case | `created_at` |

### Import Order

1. External libraries (React, Express, etc.)
2. Internal absolute imports
3. Relative imports

---

## 🧪 Testing

- Create tests for new features
- Run tests before every commit
- Mock external services
- Test edge cases and error states
- Aim for 80%+ coverage on business logic

---

## 🔒 Security Best Practices

### Input Validation

```javascript
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required()
});

const { error, value } = schema.validate(requestBody);
if (error) {
  return res.status(400).json({ error: error.details });
}
```

### General Security

- Never commit secrets to git
- Validate/sanitize all user input
- Check user permissions before actions
- Use parameterized queries (prevent SQL injection)
- Use HTTPS for all API communication
- Log security events (failed logins, unauthorized access)

---

## ✅ Task Management

### Before Asking "What's Next?"

**MANDATORY**: Before asking for the next task:

1. Run `git status`
2. If uncommitted changes exist:
   - Run tests
   - `git add -A`
   - `git commit -m "descriptive message"`
   - `git push`
3. Inform user: "Changes committed and pushed. Ready for next task."

**Why**: Enables point-in-time recovery and prevents data loss.

### After Completing Features

Update documentation:

1. **CHANGELOG.md or NEXT_STEPS.md** - Mark completed tasks
2. **README.md** - If dependencies/setup/API changed
3. **API docs** - If endpoints changed

---

## 🚨 Process Management

**Claude NEVER controls running processes. USER has complete control.**

- Never run `npm start`, `npm run dev`, or similar via Bash
- Never stop/restart servers or databases
- Always ask user to restart if needed

**Exception**: One-time commands are OK:
- `npm test` (runs and exits)
- `npx prisma migrate` (runs and exits)
- `git` commands
- File operations

---

## 🚀 Deployment

### Document Your Setup Here

| Component | Location | Notes |
|-----------|----------|-------|
| Backend API | [Describe] | |
| Frontend | [Describe] | |
| Database | [Describe] | |
| File Storage | [Describe] | |

### SSH Access (if applicable)

```bash
# Template - customize for your server
ssh -i ~/.ssh/your-key.pem user@your-server-ip
```

### CI/CD

Document your CI/CD pipeline here:
- What triggers deployments?
- What tests run?
- Where does it deploy to?

---

## 🧠 AI Behavior Rules

### Do

- Ask questions if uncertain about requirements
- Confirm file paths exist before referencing
- Check existing code before inventing new patterns
- Comment out code and ask before deleting

### Don't

- Hallucinate packages - only use known npm packages
- Invent API endpoints - check existing code
- Assume missing context - ask questions
- Make changes "just because" something seems wrong

---

## 📋 Project-Specific Rules

**Add your project-specific rules here:**

### Business Logic

- [Document critical business rules]
- [Document approval workflows]
- [Document role permissions]

### Data Policies

- [Soft delete vs hard delete policy]
- [Audit logging requirements]
- [Data retention policies]

### Feature-Specific Documentation

For complex features, create separate docs:
- `docs/FEATURE_NAME.md`

---

## 📞 When in Doubt

- **Requirements unclear?** → Check project planning docs
- **API structure?** → Check API documentation
- **Database schema?** → Check schema files
- **Still unclear?** → Ask the user

---

## Customization Checklist

When setting up this file for a new project, update:

- [ ] Project name in title
- [ ] Test commands for your stack
- [ ] Deployment architecture
- [ ] SSH/server access details
- [ ] CI/CD pipeline info
- [ ] Project-specific business rules
- [ ] Role permissions
- [ ] Data policies
- [ ] Feature documentation links

---

**Delete everything above the first `---` line when you copy this to your project.**
