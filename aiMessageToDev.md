# AI to Developer - Required Information & Suggestions

**Last Updated:** 2025-10-18
**Project:** Parenting Helper App
**Status:** Planning Phase - Awaiting Developer Input

---

## 🚨 CRITICAL DECISIONS NEEDED

### 1. **Database Choice - MUST DECIDE**
**Question:** PostgreSQL on RDS or DynamoDB?

**Current Recommendation:** PostgreSQL on RDS
- ✅ Complex relationships (groups → members → approvals)
- ✅ Multi-table transactions for approval workflows
- ✅ Better for complex queries (audit logs, calendar responsibility lines)
- ✅ Easier to reason about for this use case

**DynamoDB Alternative:**
- ✅ More "serverless" (scales to zero)
- ✅ Lower costs at small scale
- ❌ Harder to model complex relationships
- ❌ No native JOIN support (requires denormalization)
- ❌ Approval voting logic would be complex

**DECISION NEEDED:** Which database should we use?

---

### 2. **ORM/Query Builder Choice**
**Options:**
1. **Prisma** (Recommended)
   - ✅ Great TypeScript/JSDoc support
   - ✅ Type-safe database access
   - ✅ Automatic migrations
   - ✅ Excellent developer experience

2. **Knex.js**
   - ✅ More flexible query builder
   - ✅ Lighter weight
   - ❌ Less type safety

3. **Raw pg (node-postgres)**
   - ✅ Maximum control
   - ❌ More boilerplate
   - ❌ No type safety

**DECISION NEEDED:** Which ORM/query builder?

---

### 3. **Validation Library**
**Options:**
1. **Joi** (Recommended for this project)
   - ✅ More expressive, easier to read
   - ✅ Better error messages
   - ✅ Mature, widely used

2. **Zod**
   - ✅ Better TypeScript integration (less relevant for JS project)
   - ✅ Lighter weight
   - ✅ Can infer types (not needed for pure JS)

**DECISION NEEDED:** Joi or Zod?

---

### 4. **Mobile App Framework**
**Question:** React Native or Capacitor?

**Current Recommendation:** React Native
- ✅ Better native performance
- ✅ Larger community, more libraries
- ✅ Better gesture support (critical for calendar swipes)
- ✅ Native navigation feels better
- ❌ Requires native build setup (Xcode, Android Studio)

**Capacitor Alternative:**
- ✅ Easier setup (web-first)
- ✅ Can use any web framework
- ❌ Performance not as good for complex UI
- ❌ Gestures not as smooth

**DECISION NEEDED:** React Native or Capacitor?

---

### 5. **State Management**
**Options:**
1. **Redux Toolkit** (Recommended for this project)
   - ✅ Handles complex state (offline sync, message caching)
   - ✅ DevTools for debugging
   - ✅ Middleware for side effects

2. **Zustand**
   - ✅ Simpler, less boilerplate
   - ✅ Good for medium complexity
   - ❌ Less tooling

3. **React Context + useReducer**
   - ✅ Built-in, no dependencies
   - ❌ Performance issues at scale
   - ❌ No DevTools

**DECISION NEEDED:** Which state management library?

---

## 📋 PENDING REQUIREMENTS CLARIFICATIONS

### Business Logic Questions

#### 1. **Subscription & Storage**
- [ ] **Q:** When storage exceeds limit, should we:
  - A) Block all new uploads immediately?
  - B) Allow a grace period (e.g., 7 days)?
  - C) Automatically charge for additional storage?
  - **Current Assumption:** Block uploads, warn at 80%

- [ ] **Q:** If an admin cancels subscription mid-month, when does access end?
  - A) Immediately
  - B) End of billing period (recommended for legal continuity)
  - **Current Assumption:** End of billing period

- [ ] **Q:** Can a group have zero admins temporarily?
  - **Context:** If only admin requests to leave and it's pending approval
  - **Current Assumption:** No, system prevents this

#### 2. **Group Deletion & Data Retention**
- [ ] **Q:** When the last admin leaves a group, what happens?
  - A) Group is soft-deleted, data preserved indefinitely
  - B) Group is marked for deletion after 30 days
  - C) Cannot remove last admin without deleting group
  - **Legal implication:** Co-parenting data may be needed for custody cases years later

- [ ] **Q:** Can ex-admins request historical log exports after leaving?
  - **Context:** They paid for storage during their admin period
  - **Current Assumption:** No access after leaving, should download logs before leaving

#### 3. **Approval Workflow Edge Cases**
- [ ] **Q:** If 3 admins, and votes are 1 approve, 1 reject, 1 no vote - what happens?
  - A) Rejection wins (safer default)
  - B) Wait for all votes
  - C) Wait for timeout (e.g., 7 days), then reject
  - **Current Assumption:** Rejection wins in tie

- [ ] **Q:** Can the requesting admin vote on their own approval?
  - **Context:** Admin A requests to add member, Admin A is part of approval pool
  - **Current Assumption:** Yes, they can vote (but can't single-handedly approve)

#### 4. **Calendar & Responsibility Tracking**
- [ ] **Q:** Can a child have overlapping responsibility events?
  - **Example:** Child at school (9-3pm) but also "with Dad" (all day)
  - A) Allow overlaps, show both
  - B) Prevent overlaps, require resolution
  - **Current Assumption:** Allow overlaps, latest event takes precedence for display

- [ ] **Q:** Timezone handling for events:
  - **Scenario:** Parent A (PST) and Parent B (EST) in same group
  - A) Events stored in UTC, displayed in user's local time
  - B) Events tied to a specific timezone
  - **Current Assumption:** UTC storage, local display

#### 5. **Finance Matters**
- [ ] **Q:** Can finance matters have multiple currencies?
  - **Example:** "Vacation expenses - $500 USD + €200 EUR"
  - A) Yes, each matter can specify currency
  - B) No, one currency per group
  - **Current Assumption:** One currency per matter (no multi-currency in MVP1)

- [ ] **Q:** What happens if someone overpays?
  - **Example:** Expected $50, paid $100
  - A) Track overpayment, show "+$50 credit"
  - B) Reject payment, must match exact amount
  - **Current Assumption:** Allow and track overpayment

#### 6. **Messaging**
- [ ] **Q:** Message edit time limit?
  - A) Can edit anytime (logged in audit)
  - B) 15 minutes after send
  - C) No edits, only delete (hide)
  - **Current Assumption:** Can edit anytime, all edits logged

- [ ] **Q:** Media retention after sender leaves group:
  - A) Media remains available
  - B) Media deleted with user
  - **Legal consideration:** Evidence preservation
  - **Current Assumption:** Media remains, user anonymized in logs

---

## 🔧 TECHNICAL SETUP REQUIREMENTS

### AWS Account Setup
- [ ] **AWS Account ID needed** (for Terraform configuration)
- [ ] **AWS Region preference:** us-east-1, us-west-2, eu-west-1? (affects latency for users)
- [ ] **AWS Budget alerts:** What monthly budget? (Estimate: $50-200/month for dev)

### Third-Party Service Accounts
- [ ] **Kinde Account:**
  - Sign up at https://kinde.com
  - Create application
  - Provide: Domain, Client ID, Client Secret

- [ ] **Stripe Account:**
  - Sign up at https://stripe.com
  - Get: Publishable Key, Secret Key, Webhook Secret
  - Set up: Products ($8/month admin, $1/2GB storage)

- [ ] **AWS SES Email:**
  - Verify sender domain or email address
  - Request production access (out of sandbox)

- [ ] **Push Notifications:**
  - **iOS:** Apple Developer Account ($99/year)
    - APNs certificate
  - **Android:** Firebase account (free)
    - FCM Server Key

### Development Environment Preferences
- [ ] **Node.js version:** v18 LTS, v20 LTS, or latest?
- [ ] **Package manager:** npm or yarn?
- [ ] **Code editor:** VS Code (recommended), WebStorm, other?
- [ ] **Local database:** Docker PostgreSQL or install locally?

---

## 🎨 DESIGN & UX DECISIONS NEEDED

### 1. **App Name - URGENT**
**Current:** "Parenting Helper App" (placeholder)
- [ ] **What is the actual app name?**
- [ ] **App icon design:** Do you have a designer or need recommendations?

### 2. **Color Scheme**
From appplan.md, role colors are defined:
- Gold = Admin
- Red = Parent
- Yellow = Caregiver
- Blue = Child
- Pink = Supervisor

- [ ] **Primary brand color?** (for buttons, headers, etc.)
- [ ] **Dark mode support in MVP1?** (adds 30% more work)
  - Recommendation: No dark mode in MVP1, add in MVP2

### 3. **Onboarding Flow**
- [ ] **First-time user experience:**
  - A) Jump straight to "Create Group" after login?
  - B) Tutorial/walkthrough screens?
  - C) Video intro?
  - **Recommendation:** Simple 3-screen tutorial in MVP1

### 4. **Calendar Default View**
- [ ] **Default calendar view:** Day, Week, or Month?
  - **Recommendation:** Week view (best for responsibility lines)

### 5. **Language & Localization**
- [ ] **MVP1 language:** English only?
- [ ] **Date format:** MM/DD/YYYY (US) or DD/MM/YYYY (International)?
- [ ] **Currency:** USD only in MVP1?

---

## 💡 SUGGESTIONS & RECOMMENDATIONS

### High-Priority Suggestions

#### 1. **Add Notification Preferences**
**Suggestion:** More granular notification settings
```
Current: On/Off for each category
Suggested:
- Immediate (push + email)
- Daily digest (email)
- Off
```
**Why:** Reduces notification fatigue, increases user retention

#### 2. **Message Draft Auto-Save**
**Suggestion:** Auto-save message drafts every 5 seconds
**Why:** Prevents data loss if app crashes, better UX

#### 3. **Offline Mode for Reading**
**Suggestion:** Cache last 50 messages per message group for offline reading
**Why:** Parents often in low-signal areas (schools, hospitals)
**Complexity:** Medium (Redux Persist + sync logic)

#### 4. **Export Finance Matters to PDF**
**Suggestion:** Allow exporting finance matter as PDF for tax purposes
**Why:** Common use case - childcare expenses for tax deductions
**Complexity:** Low (use library like pdfkit)

#### 5. **Calendar Event Templates**
**Suggestion:** Pre-defined templates for common events:
- "School pickup"
- "Doctor appointment"
- "Weekend with [parent]"
**Why:** Saves time, reduces errors
**Complexity:** Low

#### 6. **Batch Operations for Admins**
**Suggestion:** Allow admins to approve/reject multiple pending approvals at once
**Why:** With many approvals, one-by-one is tedious
**Complexity:** Medium

#### 7. **Add "Temporary Caregiver" Role**
**Suggestion:** Time-limited caregiver role (e.g., babysitter for weekend)
**Why:** Avoid cluttering member list with temporary people
**Implementation:** Add `role_expires_at` field
**Complexity:** Low

#### 8. **Smart Storage Warnings**
**Suggestion:** Warn user which groups are using most storage
**Why:** Helps identify where to clean up
**Complexity:** Low (already tracking per-group storage)

---

### Security Suggestions

#### 1. **Two-Factor Authentication for Admins**
**Suggestion:** Require 2FA for admin role (beyond email MFA for login)
**Why:** Admin actions are high-stakes (custody, finance)
**Complexity:** Medium (Kinde supports this)

#### 2. **Audit Log Access Logging**
**Suggestion:** Log who accessed/downloaded audit logs
**Why:** Meta-logging for legal compliance
**Complexity:** Low

#### 3. **Session Timeout**
**Suggestion:** Auto-logout after 30 minutes of inactivity
**Why:** Security on shared devices
**Complexity:** Low

#### 4. **Suspicious Activity Alerts**
**Suggestion:** Alert admins if:
- Many messages deleted in short time
- Bulk member removals
- Large file uploads
**Why:** Detect abuse or account compromise
**Complexity:** Medium

---

### Performance Optimizations

#### 1. **Message Pagination Strategy**
**Current plan:** 50 messages per page
**Suggestion:** Use cursor-based pagination instead of offset
**Why:** Better performance with large message groups (1000+ messages)
**Complexity:** Low

#### 2. **Calendar Pre-fetching**
**Suggestion:** Pre-fetch next/previous month when user views calendar
**Why:** Faster swipe navigation
**Complexity:** Low

#### 3. **Image Compression**
**Suggestion:** Compress images client-side before upload
- Original → stored in S3 (for audit)
- Compressed → shown in app (faster load)
**Why:** Reduce bandwidth, faster loading
**Complexity:** Medium

#### 4. **Database Indexing Strategy**
**Suggestion:** Monitor slow queries in first month, add indexes as needed
**Why:** Premature optimization vs. data-driven optimization
**Complexity:** Ongoing

---

## 📅 DEVELOPMENT TIMELINE QUESTIONS

### MVP1 Scope Confirmation
**Current plan:** 18 weeks to MVP1

- [ ] **Is this timeline acceptable?**
- [ ] **Hard deadline?** (e.g., app store launch by specific date)
- [ ] **Phased rollout?**
  - A) Private beta → Public beta → Full launch
  - B) Straight to public launch
  - **Recommendation:** Private beta with 10-20 co-parenting families first

### Feature Prioritization
**Question:** If timeline is tight, what can be moved to MVP2?

**Candidates for MVP2:**
- Finance matter tracking (complex, could be separate app)
- Recurring calendar events (complex edge cases)
- Media in messages (start with text-only)
- Supervisor role (niche use case)

**Must-have for MVP1:**
- Groups & roles
- Basic messaging
- Calendar with responsibility tracking
- Audit logging
- Subscriptions

- [ ] **Are you OK with moving features to MVP2 if needed?**

---

## 🧪 TESTING REQUIREMENTS

### Beta Testing
- [ ] **Do you have beta testers lined up?**
  - Ideal: 5-10 co-parenting families
  - Need: iOS and Android devices
  - Timeline: 4 weeks of beta testing recommended

### Test Devices
- [ ] **What devices should we test on?**
  - iPhone: Which models? (Recommend: iPhone 12+, iOS 15+)
  - Android: Which devices? (Recommend: Samsung Galaxy S21+, Pixel 6+)

### Automated Testing Coverage
- [ ] **Testing budget/priority?**
  - High: 80%+ code coverage, full E2E suite
  - Medium: 60% coverage, critical path E2E
  - Low: Unit tests only
  - **Recommendation:** Medium for MVP1

---

## 💰 COST ESTIMATES & BUDGETING

### Development Costs (Estimates)
If outsourcing development:
- **MVP1 (18 weeks):** $80,000 - $120,000
  - Mobile app: $40k - $60k
  - Backend: $30k - $40k
  - Infrastructure & DevOps: $10k - $20k

If building in-house:
- **Team needed:**
  - 1 React Native developer (18 weeks)
  - 1 Backend developer (12 weeks)
  - 0.5 DevOps engineer (6 weeks)
  - 0.5 QA engineer (8 weeks)

### Operating Costs (Monthly, Post-Launch)

**AWS Costs:**
- RDS PostgreSQL: $50-150/month (depends on size)
- Lambda: $20-50/month (first 1M requests free)
- S3 storage: $10-100/month (depends on media usage)
- CloudFront CDN: $20-80/month
- **Total AWS:** ~$100-400/month

**Third-Party Services:**
- Kinde: $25/month (Pro plan, up to 1,000 users)
- Stripe: 2.9% + $0.30 per transaction
- OneSignal (push notifications): Free up to 10k subscribers
- **Total Services:** ~$25-100/month

**Grand Total Operating:** $125-500/month (scales with usage)

- [ ] **Is this budget acceptable?**
- [ ] **Revenue model confirmed:** $8/month admin subscription?
- [ ] **Break-even analysis:** Need ~20-60 paid admin users to break even

---

## 🚀 DEPLOYMENT & LAUNCH PLANNING

### App Store Requirements

#### iOS App Store
- [ ] **Apple Developer Account** ($99/year)
- [ ] **App name available?** (check App Store)
- [ ] **Privacy Policy URL** (required)
- [ ] **Terms of Service URL** (required)
- [ ] **Support email/URL** (required)
- [ ] **App review timeline:** Plan for 1-2 weeks review time

#### Google Play Store
- [ ] **Google Play Developer Account** ($25 one-time)
- [ ] **App name available?** (check Play Store)
- [ ] **Privacy Policy URL** (required)
- [ ] **Target SDK:** Android 13+ (API level 33+)

### Legal Documents Needed
- [ ] **Privacy Policy** (GDPR compliant)
  - Covers: Data collection, storage, retention, deletion
  - Recommendation: Use a lawyer or service like iubenda.com

- [ ] **Terms of Service**
  - Covers: Liability, content ownership, disputes
  - **Important:** Custody/legal disclaimers

- [ ] **Cookie Policy** (if web version)

### Marketing & Launch
- [ ] **Landing page/website needed?**
- [ ] **Social media accounts?** (Twitter, Facebook, Instagram)
- [ ] **Launch marketing plan?**
  - Target: Co-parenting support groups, family law firms
  - Content: Blog posts, testimonials, demo videos

---

## 🎯 IMMEDIATE NEXT STEPS (Priority Order)

### Week 1: Foundation Setup
1. [ ] **Make all critical decisions** (database, ORM, framework)
2. [ ] **Set up AWS account** and create IAM users
3. [ ] **Register domain name** (if needed for app)
4. [ ] **Create Kinde account** and configure
5. [ ] **Create Stripe account** and set up products
6. [ ] **Decide on app name** (affects everything)

### Week 2: Development Environment
7. [ ] **Set up local dev environment:**
   - Node.js, Docker, PostgreSQL
   - React Native CLI, Xcode, Android Studio
   - Terraform, AWS CLI
8. [ ] **Create project structure** (follow README.md)
9. [ ] **Set up CI/CD pipeline** (GitHub Actions)
10. [ ] **Database schema migration** (Prisma or Knex)

### Week 3: Begin Development
11. [ ] **Authentication flow** (Kinde integration)
12. [ ] **Basic API framework** (Lambda + API Gateway)
13. [ ] **Mobile app shell** (navigation, screens)

---

## 📞 COMMUNICATION & PROJECT MANAGEMENT

### How Should We Work Together?
- [ ] **Preferred communication method?**
  - A) GitHub issues for all tasks
  - B) Slack/Discord for quick questions
  - C) Email for summaries
  - D) All of the above

- [ ] **Meeting cadence?**
  - A) Daily standups (15 min)
  - B) Weekly check-ins (1 hour)
  - C) Bi-weekly demos
  - **Recommendation:** Weekly check-ins + async GitHub issues

- [ ] **Code review process?**
  - A) All PRs reviewed by you
  - B) Self-review + automated tests
  - C) Pair programming sessions

### Progress Tracking
- [ ] **Use TASKS.md?** (simple markdown task list)
- [ ] **Use GitHub Projects?** (kanban board)
- [ ] **Use external tool?** (Jira, Trello, Linear)
- **Recommendation:** GitHub Projects (integrated with repo)

---

## ❓ QUESTIONS FOR YOU

### 1. **What is your technical background?**
- [ ] Professional developer
- [ ] Technical but not a developer
- [ ] Non-technical
**Why this matters:** Affects how we communicate, what I explain, tooling choices

### 2. **Are you coding this yourself or hiring developers?**
- [ ] I'm coding it myself
- [ ] Hiring contractors
- [ ] Building a team
- [ ] Still deciding

### 3. **What's your experience with the tech stack?**
- [ ] JavaScript: Beginner / Intermediate / Expert
- [ ] React/React Native: Beginner / Intermediate / Expert
- [ ] AWS: Beginner / Intermediate / Expert
- [ ] Databases: Beginner / Intermediate / Expert

### 4. **Do you have existing users/customers waiting?**
- [ ] Yes, beta testers ready
- [ ] Yes, paying customers waiting
- [ ] No, building first
**Why this matters:** Affects timeline urgency, MVP scope

### 5. **Is this a business or passion project?**
- [ ] Startup/business (revenue goal)
- [ ] Passion/side project
- [ ] Hybrid
**Why this matters:** Affects cost/benefit decisions, when to optimize vs. ship

---

## 📝 ACTION ITEMS SUMMARY

**High Priority (Answer in next 1-2 days):**
1. ⚠️ Decide on database (PostgreSQL vs DynamoDB)
2. ⚠️ Decide on mobile framework (React Native vs Capacitor)
3. ⚠️ Choose app name
4. ⚠️ AWS account setup
5. ⚠️ Your technical background & involvement level

**Medium Priority (Answer within 1 week):**
6. ORM choice (Prisma, Knex, raw pg)
7. Validation library (Joi vs Zod)
8. State management (Redux, Zustand, Context)
9. Clarify pending business logic questions
10. Set up Kinde and Stripe accounts

**Low Priority (Can decide later):**
11. Design choices (colors, dark mode)
12. Marketing & launch planning
13. Feature prioritization for MVP2
14. Beta testing strategy

---

## 📧 HOW TO RESPOND

You can respond to this document by:

1. **Creating a new file:** `devResponseToAI.md` with your answers
2. **Editing this file:** Add your answers inline under each question
3. **GitHub Issue:** Create an issue with answers to each section
4. **Chat:** Just tell me your answers conversationally and I'll update docs

**Minimum to get started:**
- Database choice
- Mobile framework choice
- App name
- Your involvement level (coding yourself vs hiring)
- AWS account info

Let's build this! 🚀

---

**Remember:** This is a co-parenting app with legal implications. We prioritize:
1. **Security** - Audit logs, permissions, data retention
2. **Reliability** - Nothing gets lost, everything is logged
3. **User Experience** - Must work for non-technical parents

Questions? Just ask! I'm here to help make this project a success.
