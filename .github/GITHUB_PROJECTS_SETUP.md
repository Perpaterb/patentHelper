# GitHub Projects Setup Guide

Complete guide to setting up GitHub Projects for tracking Family Helper development.

---

## 🎯 Step-by-Step Setup

### Step 1: Create Project

1. Go to your repository: https://github.com/Perpaterb/patentHelper
2. Click **"Projects"** tab at the top
3. Click **"New project"**
4. Choose **"Board"** view
5. Name it: **"Family Helper - MVP1 Development"**
6. Click **"Create"**

### Step 2: Configure Columns

GitHub Projects will create default columns. Modify them:

1. **Rename/Create these columns** (drag to reorder):
   - `📋 Backlog` - Tasks not yet prioritized
   - `🎯 Ready` - Prioritized, ready to work on
   - `🚧 In Progress` - Currently working on
   - `🧪 Testing` - Code complete, needs testing
   - `✅ Done` - Completed and merged

2. **To rename a column:**
   - Click the `...` menu on the column header
   - Select "Rename"

3. **To add a column:**
   - Click `+` button on the right side
   - Name it and choose a preset (or none)

### Step 3: Add Labels to Repository

Go to your repository → **Issues** → **Labels** → **New label**

Create these labels:

| Label | Color | Description |
|-------|-------|-------------|
| `web-app` | `#0E8A16` (green) | Admin web app features |
| `mobile-main` | `#1D76DB` (blue) | Family Helper mobile app |
| `mobile-messenger` | `#5319E7` (purple) | PH Messenger app |
| `backend` | `#FBCA04` (yellow) | API/Lambda functions |
| `infrastructure` | `#D93F0B` (orange) | AWS/Terraform |
| `bug` | `#D73A4A` (red) | Bug fixes |
| `documentation` | `#0075CA` (blue) | Documentation updates |
| `high-priority` | `#B60205` (dark red) | Urgent/blocking |
| `enhancement` | `#A2EEEF` (light blue) | Nice-to-have improvements |

### Step 4: Create Initial Issues

Create issues for Phase 1 tasks:

#### Infrastructure Issues

**Issue 1: Terraform AWS Infrastructure Setup**
```
Title: [TASK] Set up Terraform AWS infrastructure for dev environment
Labels: infrastructure, high-priority

Task:
- [ ] Create VPC and subnets
- [ ] Set up RDS PostgreSQL instance
- [ ] Create S3 buckets (media, logs)
- [ ] Configure Lambda execution roles
- [ ] Set up API Gateway
- [ ] Configure security groups

Phase: 1 (Foundation)
```

**Issue 2: Database Schema Migration**
```
Title: [TASK] Create database schema with Prisma
Labels: backend, infrastructure, high-priority

Task:
- [ ] Convert database/schema.sql to Prisma schema
- [ ] Run initial migration
- [ ] Verify all 23 tables created
- [ ] Test connections from Lambda

Phase: 1 (Foundation)
```

#### Backend Issues

**Issue 3: Kinde Authentication Integration**
```
Title: [FEATURE] Integrate Kinde authentication
Labels: backend, high-priority

Task:
- [ ] Create auth Lambda functions
- [ ] Implement JWT verification
- [ ] Create token refresh endpoint
- [ ] Test login flow
- [ ] Document API endpoints

Phase: 1 (Foundation)
```

#### Web App Issues

**Issue 4: Web App - Subscription Management**
```
Title: [FEATURE] Build subscription management UI
Labels: web-app, high-priority

Task:
- [ ] Create subscription plans page
- [ ] Integrate Stripe Elements
- [ ] Add payment method form
- [ ] Implement 20-day free trial logic
- [ ] Add trial countdown banners
- [ ] Test subscription flow

Phase: 2 (Web App)
```

### Step 5: Link Issues to Project

1. Open an issue
2. Click **"Projects"** in the right sidebar
3. Select your project
4. The issue will appear in the first column

### Step 6: Automate Workflow (Optional)

Go to your project → **"..."** menu → **"Workflows"**

Enable these automations:
- **Item added to project** → Set status to "Backlog"
- **Item closed** → Set status to "Done"
- **Pull request merged** → Set status to "Done"

---

## 📋 Using the Board

### Moving Cards

**Drag and drop** cards between columns as you work:
- New task → Starts in **Backlog**
- Ready to code → Move to **Ready**
- Start working → Move to **In Progress**
- Code complete → Move to **Testing**
- Tested and merged → Move to **Done**

### Viewing Issues

Click any card to see full issue details, comments, and links.

### Filtering

Use the **Filter** button to show:
- Only `web-app` issues
- Only `high-priority` issues
- Issues assigned to you
- etc.

### Adding Notes

You can add **draft cards** (notes without creating full issues):
1. Click **"+"** button in any column
2. Type a quick note
3. Later, convert to a full issue if needed

---

## 🎯 Recommended Workflow

### Daily
1. Check **In Progress** column - finish what you started
2. Pick next task from **Ready** column
3. Update card status as you progress

### Weekly
1. Review **Backlog** - prioritize for next week
2. Move prioritized tasks to **Ready**
3. Review **Done** - celebrate progress!

### When Creating Issues
1. Use templates (Bug, Feature, Task)
2. Add appropriate labels
3. Link to project (appears in sidebar)
4. Add to **Backlog** column

---

## 💡 Tips

### Break Down Large Features
Instead of one huge "Build messaging" issue, create smaller issues:
- `[TASK] Create message database queries`
- `[TASK] Build message list UI component`
- `[TASK] Implement message sending`
- `[TASK] Add message read receipts`

### Use Milestones
Create milestones for each Phase:
- **Milestone: Phase 1 - Foundation** (2 weeks)
- **Milestone: Phase 2 - Web App** (4 weeks)
- etc.

Assign issues to milestones to track phase progress.

### Reference Issues in Commits
When committing, reference the issue:
```bash
git commit -m "feat: Add Stripe subscription form (#4)"
```

The `#4` links the commit to issue #4.

### Use Templates
The `.github/ISSUE_TEMPLATE/` folder has templates for:
- Features
- Bugs
- Tasks

When creating a new issue, choose the appropriate template.

---

## 📊 Example Board State

After Phase 1 setup, your board might look like:

**📋 Backlog** (30 cards)
- All Phase 2-6 features
- Future enhancements

**🎯 Ready** (5 cards)
- Next week's tasks
- Prioritized by importance

**🚧 In Progress** (2-3 cards)
- Currently coding
- Don't have too many here - focus!

**🧪 Testing** (1 card)
- Code written, testing locally

**✅ Done** (10 cards)
- Completed Phase 1 tasks
- Recent wins

---

## 🆘 Troubleshooting

**Can't see Projects tab?**
- Make sure you're on the repository page
- Check repo settings → Features → Projects is enabled

**Cards not showing up?**
- Make sure issue is linked to project (check issue sidebar)
- Refresh the page

**Want to use a different view?**
- Click **"Table"** or **"Roadmap"** view at the top
- Board view is usually best for development

---

## 📚 Resources

- **GitHub Projects Docs**: https://docs.github.com/en/issues/planning-and-tracking-with-projects
- **GitHub Issues Guide**: https://docs.github.com/en/issues/tracking-your-work-with-issues
- **Markdown Guide**: https://guides.github.com/features/mastering-markdown/

---

**Need help?** Just ask in a Claude Code session and I'll guide you through it!

**Ready to start?** Follow Step 1 above and let's get your project board set up! 🚀
