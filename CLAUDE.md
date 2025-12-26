# Claude Code Instructions for Family Helper App

## Quick Start - READ THESE DOCS FIRST

| Doc | Purpose |
|-----|---------|
| `docs/STATUS.md` | Current state, bugs, priorities |
| `docs/ARCHITECTURE.md` | How the system works |
| `docs/DEVELOPMENT.md` | How to develop, test, deploy |
| `backend/API.md` | API reference |
| `backend/prisma/schema.prisma` | Database schema |

---

## ABSOLUTE RULES

### 1. Branch-Based Development

**All changes go through branches. Never push directly to main.**

```
1. Create branch    → git checkout -b feature/short-description
2. Make changes     → Code, test locally
3. Run tests        → npm test (in backend/ AND web-admin/)
4. Commit           → Conventional commits (feat:, fix:, docs:)
5. Push branch      → git push -u origin feature/short-description
6. STOP & INFORM    → Tell user: "Branch ready for testing"
7. WAIT             → User tests the changes
8. Merge            → Only after user approval
9. CI/CD            → GitHub Actions deploys automatically
```

**NEVER:**
- Deploy manually with rsync or ssh
- Push directly to main
- Skip running tests
- Merge without user approval

### 2. Update Documentation

**After completing work, update relevant docs:**

| What Changed | Update This |
|--------------|-------------|
| Bug fixed or feature added | `docs/STATUS.md` |
| Architecture changed | `docs/ARCHITECTURE.md` |
| New dev process | `docs/DEVELOPMENT.md` |
| API changed | `backend/API.md` |

**Before asking "what's next?":**
1. Run `git status`
2. Commit and push any changes
3. Update docs if needed
4. Tell user: "Changes committed. Docs updated. Ready for next task."

### 3. KISS - Keep It Simple

- Build the simplest solution that works
- No premature optimization
- No unnecessary abstraction
- Ask the user if unsure

---

## Project Overview

**2 Products Live, 1 Backend:**

| Product | Location | Notes |
|---------|----------|-------|
| **Web Admin** | `web-admin/` | Imports screens from mobile-main. Full app + admin features. |
| **Mobile Main** | `mobile-main/` | React Native app. Screens shared with web-admin. |
| **FH Messenger** | `mobile-messenger/` | NOT IN MVP1 - Future messaging-only app |

**Key Insight:** Web Admin and Mobile Main share the SAME screens. Web-admin imports from `mobile-main/src/screens/`.

---

## Code Rules

### File Size Limits
- Files: Max 500 lines
- React components: Max 300 lines
- Controllers: Max 200 lines (extract to services)

### Naming Conventions
- Components: `PascalCase.jsx`
- Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case`

### API Changes

**Before changing ANY endpoint:**
1. Run `backend/scripts/check-endpoint-usage.sh "/endpoint/path"`
2. Update `backend/API.md` FIRST
3. Make the change
4. Update tests
5. Check both apps (web-admin, mobile-main)

---

## Security

- **Never commit secrets** - Use .env files
- **Validate all input** - Use Joi schemas
- **Check permissions** - Before every action
- **Audit logging** - All group actions logged
- **Soft deletes only** - Never hard delete data

---

## Process Control

**Claude NEVER controls running processes.**

- Never run `npm start` via Bash
- Never stop/restart backend or Expo
- Ask user to restart if needed

**OK to run:** `npm test`, `npx prisma migrate`, `git` commands

---

## SSH Access (Production)

```bash
ssh -i ~/.ssh/lightsail-family-helper.pem -p 2847 ubuntu@52.65.37.116
```

Port 2847, not 22.

---

## When Confused

1. Read `docs/ARCHITECTURE.md` - How things work
2. Read `docs/STATUS.md` - Current state
3. Check `backend/API.md` - API structure
4. Check `backend/prisma/schema.prisma` - Database
5. **Ask the user** - When still unclear

---

## Archive

Old documentation moved to `docs/archive/`. Reference if needed but don't update.

---

**Remember:** This is a parenting/co-parenting app with legal and safety implications. Accuracy, security, and reliability are paramount.
