# AI to Developer - Required Information & Suggestions

**Last Updated:** 2025-10-18
**Project:** Parenting Helper App + PH Messenger Companion App
**Status:** Planning Phase - Awaiting Developer Input

**Note:** This project includes TWO mobile apps sharing the same backend:
- **Parenting Helper** (main app) - Full features
- **PH Messenger** (companion app) - Messaging only, biometric auth

---

## 🚨 CRITICAL DECISIONS NEEDED

### 1. **Database Choice** ✅ **DECIDED: PostgreSQL on RDS**
**Decision:** PostgreSQL on RDS

**Why PostgreSQL:**
- ✅ Complex relationships (groups → members → approvals)
- ✅ Multi-table transactions for approval workflows
- ✅ Better for complex queries (audit logs, calendar responsibility lines)
- ✅ Easier to reason about for this use case

**Database Schema:** See README.md Section 4 (23 tables fully defined)
**Schema Files:**
- Complete schema: `README.md` Section 4
- Standalone SQL: `database/schema.sql` (to be created)
- Migration scripts: Will use Prisma or Knex migrations

---

### 2. **ORM/Query Builder Choice** ✅ **DECIDED: Prisma**
**Decision:** Prisma

**Why Prisma:**
- ✅ Great JSDoc support with auto-generated types
- ✅ Type-safe database access
- ✅ Automatic migrations
- ✅ Excellent developer experience
- ✅ Best for PostgreSQL

**Setup:**
```bash
npm install -D prisma
npm install @prisma/client
npx prisma init
# Convert database/schema.sql to prisma/schema.prisma
npx prisma migrate dev --name init
```

---

### 3. **Validation Library** ✅ **DECIDED: Joi**
**Decision:** Joi

**Why Joi:**
- ✅ More expressive, easier to read
- ✅ Better error messages
- ✅ Mature, widely used
- ✅ Great for complex validation rules (approval logic, finance calculations)

**Setup:**
```bash
npm install joi
```

---

### 4. **Mobile App Framework** ✅ **DECIDED: React Native with Expo**
**Decision:** React Native using Expo framework

**Why React Native:**
- ✅ Better native performance
- ✅ Larger community, more libraries
- ✅ Better gesture support (critical for calendar swipes)
- ✅ Native navigation feels better

**Why Expo:**
- ✅ **No Xcode/Android Studio required for development!**
- ✅ Cloud builds (EAS Build) - builds iOS/Android for you
- ✅ Faster development iteration
- ✅ All needed features supported (push notifications, camera, file uploads, etc.)
- ✅ Can eject to bare React Native later if needed
- 💰 Free tier available, EAS Build ~$29/month or pay-per-build

**Setup:**
```bash
npx create-expo-app@latest mobile
cd mobile
npm install
npm start
# Scan QR code with Expo Go app to test on your phone
```

**Building for App Stores:**
```bash
# Install EAS CLI
npm install -g eas-cli
eas login
eas build:configure

# Build iOS (no Mac needed!)
eas build --platform ios

# Build Android
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

---

### 5. **State Management** ✅ **DECIDED: Redux Toolkit**
**Decision:** Redux Toolkit

**Why Redux Toolkit:**
- ✅ Handles complex state (offline sync, message caching)
- ✅ DevTools for debugging (critical for complex approval workflows)
- ✅ Middleware for side effects (API calls, storage)
- ✅ Redux Persist for offline support
- ✅ Best for apps with complex data flow (your app qualifies)

**Setup:**
```bash
npm install @reduxjs/toolkit react-redux redux-persist
```

---

## 📋 PENDING REQUIREMENTS CLARIFICATIONS

### Business Logic Questions

#### 1. **Subscription & Storage** ✅ **DECIDED**
- [✅] **Q:** When storage exceeds limit, should we:
  - **DECISION: C) Automatically charge for additional storage + send email notification**
  - Implementation: Charge $1 per 2GB, send email: "Your storage has been increased to XGB. You'll be charged $X on your next billing cycle."

- [✅] **Q:** If an admin cancels subscription mid-month, when does access end?
  - **DECISION: B) End of billing period**
  - Ensures legal continuity for co-parenting documentation

- [✅] **Q:** Can a group have zero admins temporarily?
  - **DECISION: No - Groups require at least one admin**
  - **Special case:** If only admin unsubscribes:
    - Show banner to all group members: "This group will be deleted on [DATE] because [ADMIN NAME]'s subscription ends then"
    - Nothing permanently deleted from servers
    - Resurrection possible via support ticket
    - Ex-admin can re-subscribe to restore access

#### 2. **Group Deletion & Data Retention** ✅ **DECIDED**
- [✅] **Q:** When the last admin leaves a group, what happens?
  - **DECISION: C) Cannot remove last admin without deleting group (from user perspective)**
  - **Server-side:** Nothing is ever permanently deleted
  - **Implementation:**
    - UI prevents last admin from leaving
    - If last admin's subscription expires, group becomes "archived" for users
    - All data remains on servers indefinitely
    - Resurrection available via support ticket
  - **Legal consideration:** Co-parenting data preserved for custody cases

- [✅] **Q:** Can ex-admins request historical log exports after leaving?
  - **DECISION: No - Must become admin again to access logs**
  - Recommendation: Download all logs before leaving admin role

#### 3. **Approval Workflow Edge Cases** ✅ **DECIDED**
- [✅] **Q:** If 3 admins, and votes are 1 approve, 1 reject, 1 no vote - what happens?
  - **DECISION: B) Wait for all votes**
  - **Exception:** For actions requiring >50%, as soon as >50% threshold is reached, action passes immediately (no need to wait for remaining votes)
  - **Example:** 5 admins, need >50% (3 votes)
    - 3 approve → Action passes immediately
    - 2 approve, 3 reject → Action rejected immediately
    - 2 approve, 1 reject, 2 no vote yet → Wait for more votes

- [✅] **Q:** Can the requesting admin vote on their own approval?
  - **DECISION: Yes - Requesting admin is part of the approval pool**
  - They can vote approve or reject on their own request
  - Still requires other admins to meet threshold

#### 4. **Calendar & Responsibility Tracking** ✅ **DECIDED**
- [✅] **Q:** Can a child have overlapping responsibility events?
  - **DECISION: B) Prevent overlaps, require resolution**
  - **Implementation:**
    - When creating new responsibility event, check for overlaps
    - If overlap detected, show error: "This conflicts with existing event [EVENT NAME] from [TIME] to [TIME]"
    - User must resolve (edit existing event or choose different time)
  - **Rationale:** Clear accountability - one person responsible at any given time

- [✅] **Q:** Timezone handling for events:
  - **DECISION: A) Events stored in UTC, displayed in user's local time**
  - **Implementation:**
    - Database stores all timestamps in UTC
    - Mobile app converts to device timezone for display
    - Calendar event shows: "6:00 PM (your time)" vs "9:00 PM (EST)"
  - **Example:** Custody handoff at "6pm" means 6pm in the user's local time

#### 5. **Finance Matters** ✅ **DECIDED**
- [✅] **Q:** Can finance matters have multiple currencies?
  - **DECISION: B) No, one currency per group**
  - **Rationale:** Users can do currency conversion calculations themselves
  - **Implementation:** Group settings has default currency, all finance matters in that group use same currency
  - **Future:** Could add currency converter in MVP2

- [✅] **Q:** What happens if someone overpays?
  - **DECISION: B) Reject payment, must match exact amount**
  - **Error message:** "Payment amount ($100) exceeds what you owe ($50). Please enter $50 or less."
  - **Workaround:** User can create a separate finance matter to request money back from the person they paid
  - **Example:**
    - Person A owes Person B $50
    - Person A accidentally paid $100
    - Person A creates new finance matter: "Overpayment refund - $50" where Person B owes Person A $50

#### 6. **PH Messenger Permissions** ✅ **DECIDED**
- [✅] **Q:** Can PH Messenger users create new message groups?
  - **DECISION: A) Yes, if their role allows (same rules as main app)**
  - Implementation: Check `group_settings.{role}_create_message_groups`
  - Parents & Caregivers: Default YES
  - Children: Default NO (can be changed by admin)

- [✅] **Q:** Can PH Messenger users invite others to message groups?
  - **DECISION: A) Yes, same rules as main app**
  - Can invite any member of the parent group to message group
  - May require admin approval depending on permissions matrix

- [✅] **Q:** Can supervisors use PH Messenger?
  - **DECISION: B) No, blocked**
  - Supervisors cannot send messages, so PH Messenger serves no purpose
  - If supervisor tries to open PH Messenger, show: "Supervisors cannot use PH Messenger. Please use the main Parenting Helper app for read-only access."

- [✅] **Q:** If user has both apps, do they share local data?
  - **DECISION: A) Yes, shared Redux Persist storage**
  - Same authentication token
  - Same message cache (offline access)
  - Logged actions track which app was used (audit logs)

#### 7. **Messaging** ✅ **DECIDED**
- [✅] **Q:** Message edit time limit?
  - **DECISION: C) No edits, only delete (hide)**
  - **Rationale:** Prevents message tampering in legal/custody contexts
  - **Implementation:**
    - No "Edit" button on messages
    - Only "Delete" button (which hides message, doesn't actually delete)
    - Deleted messages remain visible to admins (greyed out)
    - If user needs to correct message, they send a new one
  - **Future:** Could add "Correct this message" feature that sends new message with reference to old one

- [✅] **Q:** Media retention after sender leaves group:
  - **DECISION: A) Media remains available**
  - **Everything that happens on the app is backed up, in the logs, and tracked**
  - **Implementation:**
    - Media files stay in S3
    - URLs remain valid
    - Audit logs preserve media links
    - Sender name anonymized in UI: "[Former Member]"
  - **Legal consideration:** Evidence preservation for custody cases

---

## 🔧 TECHNICAL SETUP REQUIREMENTS

### AWS Account Setup ✅ **CONFIGURED**
- [✅] **AWS Account ID:** 412527729032
- [✅] **AWS Region:** ap-southeast-2 (Sydney, Australia)
- [✅] **AWS Budget alerts:**
  - Development: $100/month alert
  - Production: $500/month alert

### Third-Party Service Accounts

#### Kinde Account ✅ **CONFIGURED**
- [✅] **Kinde Domain:** https://parentinghelper.kinde.com
- [✅] **Client ID:** 39fa7698fc83461eb065dfc850f867ee
- [✅] **Client Secret:** [Stored in AWS Secrets Manager - DO NOT COMMIT TO GIT]

#### Stripe Account ✅ **CONFIGURED**
- [✅] **Account:** Live mode credentials provided
- [✅] **Publishable Key:** Stored in .env.local (get from Stripe Dashboard)
- [✅] **Secret Key:** Stored in .env.local (get from Stripe Dashboard)
- [✅] **Australian Business Number (ABN):** 88 741 861 465
- [✅] **Keys Location:** Stripe Dashboard > Developers > API Keys > Live mode
- [ ] **⚠️ TODO:** Create Stripe Products:
  - Product 1: "Admin Subscription" - $8/month recurring
  - Product 2: "Additional Storage" - $1 per 2GB/month
- [ ] **⚠️ TODO:** Set up Stripe Webhook for subscription events (will configure after backend deployment)

**🔒 SECURITY REMINDER:**
- These credentials should be stored in AWS Secrets Manager or .env.local (NEVER commit to git)
- Web app will use Publishable Key (client-side)
- Backend Lambda will use Secret Key (server-side)

#### AWS SES Email Configuration ✅ **DECIDED**
- [✅] **Q1:** System email address: **noreply@parentinghelperapp.com**
  - Use for: Subscription confirmations, log exports, approval notifications, storage warnings

- [✅] **Q2:** Support email address: **support@parentinghelperapp.com**
  - Use for: App store contact, in-app support links, user inquiries

- [✅] **Q3:** AWS SES Setup: **Yes, set up with guidance**
  - **Action Items:**
    1. Register domain (parentinghelperapp.com) with Porkbun
    2. Verify domain in AWS SES (ap-southeast-2 region)
    3. Request production access (move out of sandbox mode)
    4. Configure DKIM/SPF/DMARC records
    5. Verify both email addresses
  - **Timeline:** During Phase 2 (Web App development) before testing subscription emails

#### Push Notifications ✅ **DECIDED**
- [✅] **Q4:** Push notification setup: **Post-launch (MVP2)**
  - **Decision:** Use polling for messages in MVP1
    - Poll every 5 seconds for active message groups
    - Poll every 30 seconds for inactive groups
    - Simpler initial architecture (KISS principle)
  - **Benefit:** Launch faster, add push later based on user feedback
  - **Note:** Can implement OneSignal or direct APNs/FCM in MVP2

- [✅] **iOS Push (APNs):**
  - [✅] **Q5:** Apple Developer Account: **Not yet, wait until needed**
  - **Timeline:** Purchase ($99/year) before App Store submission (Phase 6)
  - **Action Items:** Create account 2-3 weeks before app store launch

- [✅] **Android Push (FCM):**
  - [✅] **Q6:** Firebase account: **Yes, zcarss@gmail.com**
  - **Timeline:** Set up during Phase 6 (pre-launch) if adding basic FCM
  - **Action Item:** Create Firebase project when ready for Android push

- [✅] **Q7:** OneSignal: **Skip for now, revisit later**
  - Will use polling for MVP1
  - Can add OneSignal or direct push in MVP2

### Domain & DNS ✅ **PLANNED**
- [✅] **Domain:** parentinghelperapp.com (to be registered with Porkbun)
- [✅] **Q8:** DNS Records will be provided after domain registration
  - **Action Items (Phase 1):**
    1. Register domain with Porkbun
    2. I'll provide exact DNS records for:
       - Web app hosting (CloudFront distribution)
       - Email verification (AWS SES TXT records)
       - Security (DKIM/SPF/DMARC records)
    3. You add records to Porkbun DNS settings
    4. Wait 24-48 hours for propagation

### Development Environment Preferences ✅ **DECIDED**
- [✅] **Q9:** Node.js version: **v20 LTS**
  - Latest long-term support release
  - Best compatibility with all dependencies
  - Download: https://nodejs.org/

- [✅] **Q10:** Package manager: **npm**
  - Comes with Node.js
  - Standard, widely supported
  - Simpler than yarn for this project

- [✅] **Q11:** Code editor: **VS Code**
  - Free, best React Native + Expo support
  - **I'll provide recommended extensions list**
  - Download: https://code.visualstudio.com/

- [✅] **Q12:** Local database: **Docker PostgreSQL**
  - Clean, isolated development environment
  - Matches production exactly (PostgreSQL 15)
  - **I'll provide docker-compose.yml**
  - Requires Docker Desktop: https://www.docker.com/products/docker-desktop/

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

#### 0. **PH Messenger Companion App** ✅ **CONFIRMED FEATURE**
**Feature:** Lightweight messaging-only app for children and non-technical users
**Benefits:**
- Children with restricted phones can message family safely
- Parents monitor via audit logs in main app
- No complex navigation - just messages
- Biometric auth for quick access
**Implementation:**
- Same backend (no additional infrastructure)
- Shared React Native components
- 2 weeks additional development time
- Separate App Store listings
**See:** appplan.md "PH Messenger - Companion App" section

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

#### iOS App Store (Both Apps)
- [ ] **Apple Developer Account** ($99/year)
- [ ] **Parenting Helper** app name available?
- [ ] **PH Messenger** app name available?
- [ ] **Privacy Policy URL** (required, same for both)
- [ ] **Terms of Service URL** (required, same for both)
- [ ] **Support email/URL** (required)
- [ ] **App review timeline:** Plan for 1-2 weeks review time PER APP

#### Google Play Store (Both Apps)
- [ ] **Google Play Developer Account** ($25 one-time)
- [ ] **Parenting Helper** app name available?
- [ ] **PH Messenger** app name available?
- [ ] **Privacy Policy URL** (required, same for both)
- [ ] **Target SDK:** Android 13+ (API level 33+)

**Note:** You'll need to submit TWO separate apps to each store. Can stagger launches (e.g., PH Messenger first as MVP).

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
1. [✅] **Make all critical decisions** (PostgreSQL, Prisma, Joi, React Native + Expo, Redux)
2. [ ] **Set up AWS account** and create IAM users
3. [ ] **Register domain name** (if needed for app)
4. [ ] **Create Kinde account** and configure
5. [ ] **Create Stripe account** and set up products
6. [ ] **Decide on app names** (Parenting Helper + PH Messenger)
7. [ ] **Check App Store availability** for both app names

### Week 2: Development Environment
8. [ ] **Set up local dev environment:**
   - Node.js, Docker, PostgreSQL
   - Expo CLI (no Xcode/Android Studio needed!)
   - Terraform, AWS CLI
9. [ ] **Create project structure:**
   - `mobile-main/` (Parenting Helper)
   - `mobile-messenger/` (PH Messenger)
   - `backend/` (Lambda functions)
   - `shared/` (Shared components)
   - `infrastructure/` (Terraform)
10. [ ] **Set up CI/CD pipeline** (GitHub Actions for both apps)
11. [ ] **Database schema migration** (Prisma)

### Week 3: Begin Development
12. [ ] **Authentication flows:**
    - Kinde integration for both apps
    - Biometric auth for PH Messenger (Expo Local Authentication)
13. [ ] **Basic API framework** (Lambda + API Gateway)
14. [ ] **Main app shell** (navigation, screens)
15. [ ] **Shared messaging components** (used by both apps)
16. [ ] **PH Messenger shell** (minimal navigation, just message groups + messages)

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
1. [✅] Decide on database (PostgreSQL)
2. [✅] Decide on mobile framework (React Native + Expo)
3. [ ] ⚠️ Choose app names (both apps)
4. [ ] ⚠️ AWS account setup
5. [ ] ⚠️ Your technical background & involvement level
6. [ ] ⚠️ PH Messenger clarifications (see questions below)

**Medium Priority (Answer within 1 week):**
7. [✅] ORM choice (Prisma)
8. [✅] Validation library (Joi)
9. [✅] State management (Redux Toolkit)
10. [ ] Clarify pending business logic questions
11. [ ] Set up Kinde and Stripe accounts
12. [ ] PH Messenger feature permissions (can they create message groups? invite others?)

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
