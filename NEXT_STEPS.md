# Next Steps - Development Roadmap

**Last Updated**: 2025-10-22
**Current Phase**: Phase 2 COMPLETE ✅ - Web Admin App Fully Functional! 🎉
**Next Phase**: Phase 3 - Mobile Main App Development

---

## 🎉 WEB ADMIN APP - COMPLETE!

**Status**: Fully functional and ready for use! All core features implemented and tested.

### ✅ Frontend Pages (React + Material-UI)
1. **Login/Auth** - Kinde authentication with OAuth callback handling
2. **Dashboard** - Subscription overview, storage tracking, free trial countdown (20 days)
3. **Subscription** - Stripe integration for plan management, billing, cancellation, reactivation
4. **Account** - User profile with passwordless auth note and storage details
5. **Logs** - Audit log export requests with password-protected ZIP downloads

### ✅ Backend API Endpoints (Express.js + PostgreSQL)
1. **Auth**:
   - POST /auth/exchange - Exchange Kinde code for tokens
   - POST /auth/refresh - Refresh access token
2. **Subscriptions**:
   - GET /subscriptions/pricing - Get pricing plans
   - GET /subscriptions/current - Get user's subscription
   - POST /subscriptions/checkout - Create Stripe checkout session
   - POST /subscriptions/cancel - Cancel subscription
   - POST /subscriptions/reactivate - Reactivate subscription
   - POST /subscriptions/webhooks - Handle Stripe webhooks
3. **Groups**:
   - GET /groups - List groups where user is admin
4. **Logs**:
   - POST /logs/exports - Request password-protected export
   - GET /logs/exports - List user's export history
   - GET /logs/exports/:id/download - Download completed export as ZIP

### 📊 Features Delivered
- ✅ Free 20-day trial detection with countdown timers
- ✅ Storage tracking with additional charges ($1 AUD/2GB over 10GB base)
- ✅ Stripe subscription management (subscribe, cancel, reactivate)
- ✅ Password-protected audit log exports (ZIP files, 30-day expiration)
- ✅ File-based export storage for local development
- ✅ Kinde passwordless authentication
- ✅ Authorization middleware protecting all endpoints
- ✅ Test groups created for development
- ✅ Zero ESLint warnings
- ✅ All components properly structured
- ✅ Authentication flow working end-to-end
- ✅ API endpoints tested and verified

### 🚀 Services Running (DO NOT CHANGE THESE PORTS!)

```
Backend API:      http://localhost:3000  ✅ (Express.js)
Frontend Web App: http://localhost:3001  ✅ (React)
PostgreSQL:       localhost:5432         ✅ (Docker)
Prisma Studio:    http://localhost:5555  ✅ (Database UI)
MailHog:          http://localhost:8025  ✅ (Email testing)
```

**IMPORTANT**: These ports are configured throughout the codebase. DO NOT CHANGE THEM.
- Backend: PORT=3000 (in backend/.env and all API calls)
- Frontend: PORT=3001 (in web-admin/.env and package.json)

### 📦 Test Data Available
- **User**: test@parentinghelperapp.com
- **Groups**:
  - "Test Family Group" 👨‍👩‍👧‍👦
  - "Soccer Team Group" ⚽
- Both groups have the test user as admin
- Ready for testing log export flow

### 📝 Recent Commits
1. `8cd0f61` - fix: Restore reactivating state variable in Subscription page
2. `b3ec7cb` - fix: Resolve ESLint warnings in frontend pages
3. `7b1764b` - feat: Add groups and log export API endpoints

### 🎯 Next Step: Mobile App Development
The web admin app is production-ready. Next, build the Parenting Helper Mobile App (Product #2) with React Native + Expo.

---

## ✅ Completed Planning Tasks

### Documentation
- [x] README.md - Complete technical architecture (3 products, 1 backend)
- [x] CLAUDE.md - AI coding guidelines with KISS principle
- [x] Initial.md - Feature documentation with examples
- [x] appplan.md - Complete requirements (updated for 3-product architecture)
- [x] aiMessageToDev.md - All 22 questions answered
- [x] SETUP.md - Development environment setup guide
- [x] database/schema.sql - Complete PostgreSQL schema (23 tables)
- [x] database/README.md - Database documentation

### Configuration Files
- [x] .env.example - Environment variables template with all credentials
- [x] docker-compose.yml - Local PostgreSQL database setup
- [x] .vscode/extensions.json - Recommended VS Code extensions
- [x] .vscode/settings.json - Project-specific VS Code settings
- [x] .gitignore - Properly configured for Node.js, React Native, Terraform

### Technical Decisions Made
- [x] Database: PostgreSQL on AWS RDS
- [x] ORM: Prisma
- [x] Validation: Joi
- [x] Mobile Framework: React Native with Expo
- [x] State Management: Redux Toolkit
- [x] Web Framework: React
- [x] Payments: Stripe (web only)
- [x] Authentication: Kinde
- [x] Infrastructure: AWS (Lambda, S3, RDS)
- [x] IaC: Terraform
- [x] Development Environment: Node.js v20 LTS, npm, Docker, VS Code

### Business Requirements Clarified
- [x] All 22 pending requirements answered
- [x] Storage management rules defined
- [x] Subscription cancellation flow decided
- [x] Group deletion policy established
- [x] Approval workflow edge cases resolved
- [x] Calendar overlap prevention clarified
- [x] Finance overpayment handling decided
- [x] Message editing restrictions confirmed
- [x] PH Messenger permissions defined

### Credentials Documented
- [x] AWS Account ID: 412527729032
- [x] AWS Region: ap-southeast-2 (Sydney)
- [x] Kinde Domain: https://parentinghelper.kinde.com
- [x] Kinde Client ID: 39fa7698fc83461eb065dfc850f867ee
- [x] Stripe Live Keys: Documented in .env.example
- [x] ABN: 88 741 861 465
- [x] Email Addresses: noreply@ and support@parentinghelperapp.com
- [x] Firebase Account: zcarss@gmail.com

---

## ✅ Phase 1: Local Foundation (COMPLETED)

### Week 1: Local Infrastructure Setup ✅
- [x] Docker services (PostgreSQL + MailHog)
- [x] Express.js API server running on http://localhost:3000
- [x] Health check endpoint working
- [x] Hot reload with nodemon
- [x] Database schema with Prisma (23 tables)
- [x] Local file storage with abstraction layer
- [x] File upload endpoints

### Week 2: Authentication & Email ✅
- [x] Kinde authentication fully integrated
- [x] JWT token generation (access + refresh)
- [x] HTTP-only cookies for refresh tokens
- [x] Auth middleware (requireAuth, requireSubscription, optionalAuth)
- [x] Email service with MailHog (SMTP)
- [x] Email templates (welcome, trial reminder, log export)
- [x] API documentation (backend/API.md)
- [x] Postman collection created
- [x] All endpoints tested (35 Jest tests passing)

---

## ✅ Phase 2: Web Admin Portal (COMPLETED) 🎉

### Week 3: Web App Foundation ✅
- [x] React app created (web-admin/)
- [x] Material-UI v5 installed
- [x] React Router configured
- [x] Redux Toolkit setup
- [x] Project structure organized
- [x] All pages created (Login, Dashboard, Subscription, Account, Logs)
- [x] Protected routes with auth wrapper
- [x] AppLayout with responsive navigation
- [x] Kinde authentication integrated
- [x] AuthCallback page handling OAuth flow
- [x] API service with interceptors (token refresh)

### Week 4: Subscription Management ✅
- [x] Stripe integration (frontend + backend)
- [x] Subscription checkout flow
- [x] Stripe webhook handlers
- [x] Cancel subscription functionality
- [x] Reactivate subscription functionality
- [x] Pricing cards (Admin $8/mo, Storage $1/2GB)
- [x] Subscription status display
- [x] Storage tracking and additional charges calculation
- [x] Success/cancel redirect handling

### Week 5: Storage & Account Management ✅
- [x] Storage tracker component with progress visualization
- [x] Additional charges calculation (ceil((usedGb - 10) / 2) × $1)
- [x] Warning colors based on usage
- [x] Account page with user profile
- [x] Passwordless auth documentation
- [x] Storage details on account page
- [x] Dashboard with subscription overview
- [x] Free trial countdown (20 days)
- [x] Trial warning banners

### Week 6: Log Export Feature ✅
- [x] Log export request form
- [x] Group selection dropdown (admin groups only)
- [x] Password protection for exports (8+ characters)
- [x] Export history table
- [x] Download completed exports as ZIP
- [x] Export status tracking (pending/processing/completed)
- [x] 30-day expiration for exports
- [x] File-based storage for local development
- [x] Backend endpoints (POST, GET, GET with download)

### Web App Testing ✅
- [x] All pages functional
- [x] Authentication flow working
- [x] Subscription management tested
- [x] Storage tracking verified
- [x] Log export flow tested
- [x] Zero ESLint warnings
- [x] No compilation errors
- [x] Cross-browser compatibility (modern browsers)

**Status**: Web Admin App is PRODUCTION-READY for Phase 1! All features working locally.

---

## 📅 Phase 3-4: Mobile - Main App (Weeks 7-16) - NEXT PHASE

**All development done LOCALLY - connects to local Express.js API (http://localhost:3000)**

### Week 7-8: Mobile Foundation

#### Expo Setup
- [ ] Create Expo app
  ```bash
  npx create-expo-app mobile-main
  cd mobile-main
  npm install
  ```
- [ ] Install dependencies:
  ```bash
  npm install @reduxjs/toolkit react-redux redux-persist
  npm install @react-navigation/native @react-navigation/stack
  npm install expo-local-authentication expo-secure-store
  npm install axios
  ```
- [ ] Set up navigation (React Navigation)
- [ ] Set up Redux store with persistence
- [ ] Configure environment variables (Expo)
  - **IMPORTANT**: Point to http://localhost:3000 for API calls
  - DO NOT change backend port

#### Authentication
- [ ] Login screen (Kinde)
- [ ] Token storage (SecureStore)
- [ ] Auth context/slice
- [ ] Protected navigation

### Week 9-10: Groups & Members

#### Group Management
- [ ] Home screen (groups list)
- [ ] Create group screen
- [ ] Group settings screen
- [ ] Add/edit/remove members
- [ ] Assign roles
- [ ] Define relationships

#### UI Components
- [ ] Group card component
- [ ] Member icon component (colored circles with letters)
- [ ] Role indicator (colored dot)

### Week 11-12: Messaging

#### Message Groups
- [ ] Message groups list screen
- [ ] Create message group
- [ ] Message group settings

#### Messages Screen
- [ ] Message list (WhatsApp-like)
- [ ] Message input component
- [ ] Send text messages
- [ ] @mentions autocomplete
- [ ] Message read receipts (4-state)

#### Media Upload
- [ ] Image picker
- [ ] Video picker
- [ ] Upload to local storage (will switch to S3 in Phase 6)
- [ ] Display media in messages

### Week 13-14: Calendar

#### Calendar Views
- [ ] Calendar month view
- [ ] Calendar week view
- [ ] Calendar day view
- [ ] Swipe navigation

#### Events
- [ ] Create event
- [ ] Edit event (with approval)
- [ ] Delete event (with approval)
- [ ] Recurring events

#### Child Responsibility
- [ ] Responsibility line rendering
  - Colored lines for children
  - Paired responsibility lines
- [ ] Create responsibility event
- [ ] Edit responsibility (with approval)
- [ ] Overlap prevention validation

### Week 15-16: Finance & Approvals

#### Finance Matters
- [ ] Finance matters list
- [ ] Create finance matter
- [ ] Finance matter detail screen
- [ ] Finance description bar component
- [ ] Report payment (with receipt upload)
- [ ] Confirm payment
- [ ] Mark as settled

#### Approval System
- [ ] Approvals list screen
- [ ] Approval card component
- [ ] Vote on approval (approve/reject)
- [ ] Cancel approval
- [ ] Real-time approval status updates

#### Mobile App Testing
- [ ] Test on iOS (Expo Go or TestFlight)
- [ ] Test on Android (Expo Go or APK)
- [ ] Test all user flows
- [ ] Performance testing (large message groups, many calendar events)

---

## 📅 Phase 5: PH Messenger (Weeks 17-18)

**All development done LOCALLY - connects to local Express.js API**

### Week 17: PH Messenger Development

#### App Setup
- [ ] Create separate Expo app
  ```bash
  npx create-expo-app mobile-messenger
  ```
- [ ] Copy/share messaging components from mobile-main
- [ ] Simplified navigation (message groups → messages)

#### Biometric Authentication
- [ ] First-time Kinde login
- [ ] Store token in SecureStore
- [ ] Face ID/Touch ID for subsequent opens
- [ ] Fallback to Kinde after 3 failed attempts

### Week 18: PH Messenger Testing

- [ ] Test biometric auth on iOS
- [ ] Test biometric auth on Android
- [ ] Test message sync between main app and messenger
- [ ] Test on restricted devices (child's phone)
- [ ] Verify supervisor blocking

---

## 📅 Phase 6: AWS Deployment & Launch (Weeks 19-24)

**NOW we deploy to AWS - everything tested locally first!**

### Week 19: AWS Infrastructure Setup

#### Terraform Configuration
- [ ] Install Terraform locally
- [ ] Create Terraform modules:
  - `infrastructure/modules/networking/` - VPC, subnets, security groups
  - `infrastructure/modules/database/` - RDS PostgreSQL
  - `infrastructure/modules/storage/` - S3 buckets for media
  - `infrastructure/modules/lambda/` - Lambda execution role
  - `infrastructure/modules/api-gateway/` - API Gateway REST API
- [ ] Create environment configs:
  - `infrastructure/environments/dev/`
  - `infrastructure/environments/production/`
- [ ] Run Terraform apply for dev environment
  ```bash
  cd infrastructure/environments/dev
  terraform init
  terraform plan
  terraform apply
  ```

#### Database Migration to RDS
- [ ] Deploy RDS PostgreSQL instance
- [ ] Run Prisma migrations on RDS
- [ ] Verify all 23 tables created
- [ ] Migrate test data (if needed)

### Week 20: Lambda Conversion & API Gateway

#### Convert Express.js to Lambda
- [ ] Create Lambda wrapper for existing controllers
  ```javascript
  // Lambda handler wraps existing Express controller
  exports.handler = async (event) => {
    return await userController.getUser(event);
  };
  ```
- [ ] Package Lambda functions (zip with dependencies)
- [ ] Deploy Lambda functions
- [ ] Test each Lambda function individually

#### API Gateway Setup
- [ ] Create REST API in API Gateway
- [ ] Configure all routes (auth, users, groups, messages, calendar, finance)
- [ ] Link routes to Lambda functions
- [ ] Set up CORS for web and mobile apps
- [ ] Configure throttling (protect against abuse)
- [ ] Set up custom domain: api.parentinghelperapp.com

#### Switch from Local to S3
- [ ] Create S3 bucket for media storage
- [ ] Configure CORS on S3
- [ ] Update storage service to use S3 instead of local files
- [ ] Migrate existing test files to S3 (if any)

#### Switch from MailHog to SES
- [ ] Verify email addresses in AWS SES
  - noreply@parentinghelperapp.com
  - support@parentinghelperapp.com
- [ ] Update email service to use SES instead of MailHog
- [ ] Test email sending in production

### Week 21: Testing & Security

#### Cross-Product Testing (Production)
- [ ] Update all 3 apps to use production API
- [ ] Test subscription flow: Web → Mobile
- [ ] Test all 3 products with same account
- [ ] Test role changes propagate correctly
- [ ] Test storage calculations with S3
- [ ] Test audit logs from all 3 products

#### Security Audit
- [ ] Run security scans (OWASP)
- [ ] Penetration testing
- [ ] Review all authentication flows
- [ ] Review all permission checks
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention

#### Performance Optimization
- [ ] Database query optimization
- [ ] API response time optimization (target <500ms)
- [ ] Mobile app bundle size optimization
- [ ] Set up CloudFront for media delivery
- [ ] Lambda cold start optimization

### Week 22: Web App Deployment

#### Deploy Web App to AWS
- [ ] Build React app for production
  ```bash
  cd web-admin
  npm run build
  ```
- [ ] Create S3 bucket for web hosting
- [ ] Upload build to S3
- [ ] Configure CloudFront distribution
- [ ] Set up custom domain: parentinghelperapp.com
- [ ] Configure SSL certificate (ACM)
- [ ] Test web app in production

### Week 23: App Store Preparation

#### iOS App Store
- [ ] Purchase Apple Developer Account ($99/year)
- [ ] Create App Store Connect account
- [ ] Build production iOS apps with Expo
- [ ] Submit Parenting Helper for review
- [ ] Submit PH Messenger for review
- [ ] Prepare:
  - App screenshots
  - App description
  - Privacy policy URL
  - Terms of service URL
  - Support URL

#### Google Play Store
- [ ] Create Google Play Developer Account ($25 one-time)
- [ ] Build production Android apps with Expo
- [ ] Submit Parenting Helper for review
- [ ] Submit PH Messenger for review
- [ ] Prepare same materials as iOS

### Week 24: Launch!

#### Pre-Launch
- [ ] Set up CloudWatch alerts for errors
- [ ] Set up budget alerts for AWS costs
- [ ] Test Stripe webhooks in production
- [ ] Final end-to-end testing

#### Launch Day
- [ ] Monitor app store review process
- [ ] Fix any issues flagged by reviewers
- [ ] Publish apps when approved
- [ ] Monitor CloudWatch logs for errors
- [ ] Monitor Stripe for subscriptions
- [ ] Set up customer support email monitoring

#### Post-Launch
- [ ] Create launch announcement
- [ ] Marketing push (optional)
- [ ] Monitor performance metrics
- [ ] Be ready for user feedback!

---

## 🔄 Post-Launch (MVP2)

### High Priority Enhancements
- [ ] Push notifications (OneSignal or direct APNs/FCM)
- [ ] WebSockets for real-time messaging (replace polling)
- [ ] Offline mode improvements (queue actions when offline)
- [ ] App analytics (Mixpanel or Amplitude)
- [ ] Crash reporting (Sentry)

### Medium Priority Enhancements
- [ ] Social login (Google, Apple Sign-In)
- [ ] In-app support chat
- [ ] Advanced calendar features (reminders, notifications)
- [ ] Finance matter currency conversion
- [ ] Message editing (with "Edited" indicator)

### Low Priority / Future Versions
- [ ] Voice messages
- [ ] Video calls
- [ ] Document uploads (PDFs)
- [ ] Custom themes
- [ ] Dark mode
- [ ] Accessibility improvements

---

## 📊 Success Metrics to Track

### Technical Metrics
- API response time (p95 < 500ms)
- App crash rate (< 1%)
- Database query performance
- Storage costs per admin
- Lambda execution costs

### Business Metrics
- User registrations
- Free to paid conversion rate
- Subscription retention rate
- Average storage usage per admin
- Average message groups per user
- Average messages per day

### User Experience Metrics
- App store ratings (target 4.5+)
- User feedback from support emails
- Feature request frequency
- Bug report frequency

---

## 💰 Estimated Costs

### One-Time Costs
- Apple Developer Account: $99/year
- Google Play Developer Account: $25 (one-time)
- Domain registration: ~$10-15/year
- **Total**: ~$135/year

### Monthly Operating Costs (Estimated)
- **Weeks 1-18 (Local Development)**: $0/month AWS costs! 🎉
- **Week 19+ (AWS Deployment)**:
  - AWS (dev): ~$50-100/month
  - AWS (production): ~$100-400/month (scales with users)
  - Kinde: $25/month (up to 1,000 users)
  - Stripe: 2.9% + $0.30 per transaction
- **Total During Development**: $0/month
- **Total After Launch**: ~$175-525/month

### Break-Even Analysis
- Need ~20-60 paid admin users to break even
- At $8/month per admin subscription

---

## 🆘 Support & Resources

### Documentation
- Architecture: `README.md`
- Setup: `SETUP.md`
- Features: `appplan.md`
- Examples: `Initial.md`
- AI Guidelines: `CLAUDE.md`
- Q&A: `aiMessageToDev.md`

### External Resources
- **React**: https://react.dev/
- **React Native**: https://reactnative.dev/
- **Expo**: https://docs.expo.dev/
- **Prisma**: https://www.prisma.io/docs/
- **Stripe**: https://stripe.com/docs/
- **Kinde**: https://kinde.com/docs/
- **AWS**: https://docs.aws.amazon.com/

### Getting Help
- GitHub Issues: https://github.com/Perpaterb/patentHelper/issues
- AWS Support: https://console.aws.amazon.com/support/
- Stripe Support: https://support.stripe.com/

---

**Ready for Mobile Development?** The web admin app is complete. Next step: Create the Parenting Helper Mobile App! 🚀

**Last Updated**: 2025-10-22
**Next Review**: After completing Phase 3 (Mobile Main App)
