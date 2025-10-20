# Complete Decisions Summary

**Project:** Parenting Helper App
**Date:** 2025-10-20
**Status:** ✅ ALL PLANNING COMPLETE - Ready for Phase 1 Development

This document contains every decision made during the planning phase. Use this as the source of truth for project direction.

---

## 🏗️ ARCHITECTURE (3 Products, 1 Backend)

### Product Structure
- [✅] **3 separate products** sharing one backend (KISS principle)
  1. **Admin Web App** (parentinghelperapp.com) - React - BUILT FIRST
  2. **Parenting Helper Mobile** - React Native - BUILT SECOND
  3. **PH Messenger Mobile** - React Native - BUILT THIRD

### Key Architectural Decision
- [✅] **NO in-app purchases** - All billing via web app
- [✅] Mobile apps link to web for subscription management
- [✅] Avoids Apple/Google 30% fees
- [✅] Simpler codebase (KISS principle)

---

## 💻 TECHNOLOGY STACK

### Frontend
- [✅] **Web App:** React
- [✅] **Mobile Apps:** React Native with Expo
- [✅] **State Management:** Redux Toolkit
- [✅] **UI Library (Web):** Material-UI or Chakra UI
- [✅] **UI Library (Mobile):** React Native Paper or Native Base
- [✅] **Navigation (Mobile):** React Navigation
- [✅] **Language:** JavaScript with JSDoc (NOT TypeScript)

### Backend
- [✅] **Server:** AWS Lambda (serverless)
- [✅] **API:** API Gateway (REST)
- [✅] **Database:** PostgreSQL on AWS RDS
- [✅] **ORM:** Prisma
- [✅] **Validation:** Joi
- [✅] **Storage:** AWS S3 (media files)
- [✅] **Email:** AWS SES

### Infrastructure
- [✅] **IaC:** Terraform
- [✅] **Authentication:** Kinde (OAuth/OIDC)
- [✅] **Payments:** Stripe (web app only)
- [✅] **Region:** ap-southeast-2 (Sydney, Australia)

### Development Environment
- [✅] **Node.js:** v20 LTS
- [✅] **Package Manager:** npm
- [✅] **Code Editor:** VS Code
- [✅] **Local Database:** Docker PostgreSQL
- [✅] **Version Control:** Git + GitHub

---

## 🎨 DESIGN & UX

### App Names
- [✅] **Main App:** "Parenting Helper"
- [✅] **Messenger App:** "PH Messenger"

### App Icons
- [✅] **Provided:** PFicon600x600.jpg and PFMicon600x600.jpg
- [✅] **TODO:** Convert to PNG with multiple sizes for app stores

### Color Scheme
- [✅] **Primary Color:** #D9EDF8 (Pastel Blue)
- [✅] **Palette:** Pastel colors throughout
- [✅] **Role Colors:**
  - Gold = Admin
  - Red = Parent
  - Yellow = Caregiver
  - Blue = Child
  - Pink = Supervisor

### Features
- [✅] **Dark Mode:** Required in MVP1 (user toggle in settings)
- [✅] **Calendar Default View:** Week view
- [✅] **Date Format:** DD-MMM-YYYY (e.g., 01-May-2025)
  - MVP2: Add user preference toggle
- [✅] **Language:** English only for MVP1
- [✅] **Currency:** Multi-currency (admin selects per group)
  - Subscription always in AUD
- [✅] **Timezone:** Always show user's local time (stored as UTC)

### Onboarding
- [✅] **Main App:**
  - If admin OR has invites → Show home screen
  - If non-admin AND no invites → Redirect to web to become admin
- [✅] **Messenger App:**
  - If no groups → Show "You are not a member of any groups"
  - No tutorial screens (KISS)

### Platform Support
- [✅] **Phone:** iOS 15+ and Android API 26+
- [✅] **Tablets:** iPad and Android tablets REQUIRED
  - Responsive layouts for larger screens
  - Adds ~10-15% development time

---

## 💰 PRICING & BUSINESS MODEL

### Revenue Model
- [✅] **Base Subscription:** $8 AUD/month (10GB storage)
- [✅] **Additional Storage:** $1 AUD per 2GB/month
- [✅] **Free Tier:** Non-admin parents (no payment required)
- [✅] **Market Position:** Competitors charge $16/month

### 20-Day Free Trial ✨
- [✅] **Trigger:** Automatic when user signs up AND age > 16
- [✅] **Age Collection:** Required during signup
- [✅] **No Payment Method:** Not required until trial ends
- [✅] **Notifications:**
  - Banner: "X days left in trial"
  - Email: Day 15 (5 days left), Day 19 (trial ends tomorrow)
  - In-app: Link to web for subscription
- [✅] **Post-Trial:** Prompt to add payment method

### Operating Costs
- [✅] **Monthly Budget:** $125-500/month acceptable
  - AWS: $100-400/month
  - Kinde: $25/month
  - Stripe: 2.9% + $0.30 per transaction
- [✅] **Break-Even:** 20-60 paying admin users

---

## 🔐 CREDENTIALS & ACCOUNTS

### AWS
- [✅] **Account ID:** 412527729032
- [✅] **Region:** ap-southeast-2 (Sydney)
- [✅] **Budget Alerts:** $100 dev, $500 production

### Kinde Authentication
- [✅] **Domain:** https://parentinghelper.kinde.com
- [✅] **Client ID:** 39fa7698fc83461eb065dfc850f867ee

### Stripe
- [✅] **Live Keys:** Stored in CREDENTIALS_SECURE.md (local only)
- [✅] **ABN:** 88 741 861 465
- [✅] **Products to Create:**
  - Admin Subscription ($8 AUD/month)
  - Additional Storage ($1 per 2GB/month)

### Email
- [✅] **System Email:** noreply@parentinghelperapp.com
- [✅] **Support Email:** support@parentinghelperapp.com

### Domain
- [✅] **Domain:** parentinghelperapp.com (to register with Porkbun)

### Firebase
- [✅] **Account:** zcarss@gmail.com (for future Android push)

### Push Notifications
- [✅] **MVP1:** Using polling (no push)
  - 5 seconds for active groups
  - 30 seconds for inactive groups
- [✅] **MVP2:** Add push notifications post-launch

---

## 📅 TIMELINE & TESTING

### Development Timeline
- [✅] **Total:** 24 weeks (flexible, no hard deadline)
  - Phase 1: Foundation (2 weeks)
  - Phase 2: Web App (4 weeks)
  - Phase 3-4: Mobile Main App (10 weeks)
  - Phase 5: PH Messenger (2 weeks)
  - Phase 6: Testing & Launch (6 weeks)
- [✅] **Additional Time:** +2-3 weeks for high test coverage

### Launch Strategy
- [✅] **Phased Rollout:**
  1. Private Beta (10-20 families, 4+ weeks)
  2. Public Beta (TestFlight + Play Store Beta)
  3. Full Launch (App stores)
- [✅] **Emphasis:** Extensive testing before going live

### Feature Scope
- [✅] **MVP1:** All features in appplan.md included
- [✅] **No pressure:** Quality over speed
- [✅] **Flexible:** Can adjust timeline as needed

### Testing
- [✅] **Coverage:** High (80%+ code coverage)
  - Full E2E test suite
  - Unit tests for all business logic
  - Integration tests for APIs
- [✅] **Test Devices:**
  - iPhone 12+, iPhone SE
  - iPad (tablet support required)
  - Samsung Galaxy S21+, Google Pixel 6+
  - Budget Android device
  - Android tablets

### Beta Testing
- [✅] **Testers:** Will recruit during Phases 3-4 (weeks 7-16)
- [✅] **Target:** 5-10 co-parenting families
- [✅] **Mix:** iOS and Android users, various family structures

---

## 👤 DEVELOPER PROFILE

### Technical Background
- [✅] **Role:** Full-stack developer
- [✅] **Approach:** Solo developer with Claude's help
- [✅] **Experience:**
  - JavaScript: Intermediate+ (strongest)
  - React/React Native: Intermediate
  - AWS: Intermediate
  - PostgreSQL: Intermediate

### Communication
- [✅] **Primary:** Claude Code sessions
- [✅] **Documentation:** Everything in markdown files
- [✅] **Issues:** GitHub Issues for specific bugs/features

### Progress Tracking
- [✅] **Tool:** GitHub Projects (kanban board)
- [✅] **Columns:** Backlog → Ready → In Progress → Testing → Done
- [✅] **Setup Guide:** `.github/GITHUB_PROJECTS_SETUP.md`

---

## 🎯 PROJECT GOALS

### Business Goals
- [✅] **Type:** Startup/Business (revenue goal)
- [✅] **Target:** Profitability with subscription model
- [✅] **Market:** Co-parenting families (competitors charge $16/month)
- [✅] **Differentiation:** Better UX, comprehensive features, legal compliance

### User Acquisition
- [✅] **Current:** No users waiting (building first)
- [✅] **Beta:** Recruit during development (weeks 7-16)
- [✅] **Launch:** Strategy TBD after beta feedback
- [✅] **Marketing:** No plan yet (focus on product quality first)

---

## 📋 LEGAL & COMPLIANCE

### Privacy & Terms
- [✅] **Privacy Policy:** Standard template (iubenda.com or similar)
- [✅] **Terms of Service:** Standard template with custody disclaimers
- [✅] **Todo:** Draft during Phase 2 (Web App)
- [✅] **Host:** parentinghelperapp.com/privacy and /terms
- [✅] **Requirements:**
  - Data retention (7+ years, nothing deleted)
  - GDPR compliance
  - Child data protections (users under 16)
  - "Not legal advice" disclaimers

### App Store Requirements
- [✅] **Apple Developer Account:** Purchase before Phase 6 ($99/year)
- [✅] **Google Play Account:** Purchase before Phase 6 ($25 one-time)
- [✅] **App Names:** Check availability for both apps
- [✅] **Review Time:** Plan 1-2 weeks per app

---

## 🚀 IMMEDIATE NEXT STEPS

### Before Starting Development

1. **Register Domain** (15 mins, $10-15/year)
   - [ ] Go to Porkbun.com
   - [ ] Register parentinghelperapp.com

2. **Install Software** (1-2 hours)
   - [ ] Node.js v20 LTS
   - [ ] Docker Desktop
   - [ ] VS Code (install recommended extensions)
   - [ ] AWS CLI
   - [ ] Terraform

3. **Configure Environment** (30 mins)
   - [ ] Copy `.env.example` to `.env.local`
   - [ ] Fill in real credentials
   - [ ] Start local database: `docker-compose up -d`

4. **Stripe Setup** (30 mins)
   - [ ] Create products in Stripe Dashboard
   - [ ] Copy Price IDs to `.env.local`

5. **AWS Setup** (30 mins)
   - [ ] Create IAM users (Terraform + Lambda)
   - [ ] Save access keys in `.env.local`

6. **GitHub Projects** (15 mins)
   - [ ] Follow `.github/GITHUB_PROJECTS_SETUP.md`
   - [ ] Create project board
   - [ ] Add labels

### Start Phase 1: Foundation (Weeks 1-2)

7. **Week 1: Infrastructure**
   - [ ] Create Terraform modules
   - [ ] Deploy RDS PostgreSQL
   - [ ] Set up S3 buckets
   - [ ] Configure Lambda roles
   - [ ] Set up API Gateway

8. **Week 2: Database & Auth**
   - [ ] Convert schema to Prisma
   - [ ] Run migrations
   - [ ] Integrate Kinde authentication
   - [ ] Test Lambda → RDS connection

---

## 📚 KEY DOCUMENTS

### Planning Documents
- `README.md` - Complete technical architecture
- `appplan.md` - Feature requirements
- `Initial.md` - Feature examples and gotchas
- `CLAUDE.md` - AI coding guidelines (KISS principle)
- `aiMessageToDev.md` - All questions answered (this session)
- `DECISIONS_SUMMARY.md` - This document

### Setup Guides
- `SETUP.md` - Development environment setup
- `NEXT_STEPS.md` - 24-week development roadmap
- `.github/GITHUB_PROJECTS_SETUP.md` - Project board setup

### Configuration
- `.env.example` - Environment variables template
- `docker-compose.yml` - Local database setup
- `CREDENTIALS_SECURE.md` - Real credentials (gitignored)

### Database
- `database/schema.sql` - Complete PostgreSQL schema (23 tables)
- `database/README.md` - Database documentation

---

## ✅ STATUS: PLANNING COMPLETE

**All major decisions made:** ✅
**Documentation complete:** ✅
**Ready to start coding:** ✅

**Next Action:** Follow `SETUP.md` to install development environment, then start Phase 1 (Foundation)!

---

**Last Updated:** 2025-10-20
**By:** Development Team + Claude Code
**Ready to Build:** 🚀
