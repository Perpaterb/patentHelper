# Next Steps - Development Roadmap

**Last Updated**: 2025-10-20
**Current Phase**: Planning Complete → Ready for Phase 1 (Foundation)

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

## 🚀 Immediate Action Items

### Phase 0: Pre-Development (Now - Week 1)

#### Domain Registration (1-2 days)
- [ ] Register **parentinghelperapp.com** with Porkbun
  - Cost: ~$10-15/year
  - Use business details for registration
  - Enable domain privacy

#### Development Environment Setup (1-2 days)
- [ ] Install Node.js v20 LTS
  - Download: https://nodejs.org/
- [ ] Install Docker Desktop
  - Download: https://www.docker.com/products/docker-desktop/
- [ ] Install VS Code
  - Download: https://code.visualstudio.com/
  - Install recommended extensions (will prompt when you open project)
- [ ] Install AWS CLI
  - Configure with IAM user credentials
- [ ] Install Terraform
  - Needed for infrastructure setup

#### Local Environment Configuration (30 mins)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in AWS credentials
- [ ] Fill in Kinde client secret (from Kinde dashboard)
- [ ] Start local database:
  ```bash
  docker-compose up -d
  ```
- [ ] Verify database connection:
  ```bash
  docker-compose exec postgres psql -U dev_user -d parenting_helper_dev
  ```

#### Stripe Configuration (30 mins)
- [ ] Log in to Stripe Dashboard
- [ ] Create Products:
  1. "Admin Subscription" - $8 AUD/month recurring
  2. "Additional Storage" - $1 AUD per 2GB/month
- [ ] Copy Product Price IDs to `.env.local`
- [ ] Note: Webhook will be configured after backend deployment

#### AWS IAM Setup (30 mins)
- [ ] Create IAM user for Terraform
  - Permissions: PowerUserAccess (or custom policy)
  - Enable programmatic access
- [ ] Create IAM user for Lambda functions
  - Permissions: AWSLambdaFullAccess, AmazonS3FullAccess, AmazonRDSFullAccess, AmazonSESFullAccess
- [ ] Save access keys in `.env.local`

---

## 📅 Phase 1: Foundation (Weeks 1-2)

### Week 1: Infrastructure Setup

#### Day 1-2: Terraform Configuration
- [ ] Create Terraform modules:
  - `infrastructure/modules/networking/` - VPC, subnets, security groups
  - `infrastructure/modules/database/` - RDS PostgreSQL
  - `infrastructure/modules/storage/` - S3 buckets for media
  - `infrastructure/modules/lambda/` - Lambda execution role
  - `infrastructure/modules/api-gateway/` - API Gateway REST API
- [ ] Create environment configs:
  - `infrastructure/environments/dev/`
  - `infrastructure/environments/staging/`
  - `infrastructure/environments/production/`
- [ ] Run Terraform apply for dev environment
  ```bash
  cd infrastructure/environments/dev
  terraform init
  terraform plan
  terraform apply
  ```

#### Day 3-4: Database Setup
- [ ] Deploy RDS PostgreSQL instance (dev)
- [ ] Create database schema using Prisma
  ```bash
  cd backend
  npm install
  npx prisma init
  # Convert database/schema.sql to prisma/schema.prisma
  npx prisma migrate dev --name init
  ```
- [ ] Verify all 23 tables created
- [ ] Test connection from Lambda

#### Day 5: S3 & CloudFront Setup
- [ ] Create S3 bucket for media storage
  - Bucket name: `parenting-helper-media-dev`
  - Enable versioning
  - Configure CORS for web app uploads
  - Lifecycle policy: Move to Glacier after 1 year (for audit logs)
- [ ] Create CloudFront distribution for media delivery
  - Origin: S3 bucket
  - Enable HTTPS only
  - Configure caching headers

### Week 2: Authentication & API Framework

#### Day 1-2: Kinde Integration
- [ ] Set up backend Lambda for Kinde token verification
  ```bash
  cd backend/functions/auth
  # Create login.js, verify.js, refresh.js
  ```
- [ ] Test authentication flow
- [ ] Configure CORS for web and mobile apps

#### Day 3-4: API Gateway Setup
- [ ] Create REST API in API Gateway
- [ ] Configure resources and methods:
  - `/auth/*` - Authentication endpoints
  - `/users/*` - User management
  - `/groups/*` - Group endpoints
  - `/messages/*` - Messaging endpoints
  - `/calendar/*` - Calendar endpoints
  - `/finance/*` - Finance endpoints
  - `/subscriptions/*` - Subscription management (web only)
- [ ] Set up API Gateway throttling (protect against abuse)
- [ ] Configure API Gateway custom domain (api.parentinghelperapp.com)

#### Day 5: Testing & Documentation
- [ ] Write integration tests for authentication
- [ ] Write integration tests for API Gateway
- [ ] Document API endpoints in README.md
- [ ] Create Postman collection for API testing

---

## 📅 Phase 2: Web App - Admin Portal (Weeks 3-6)

### Week 3: Web App Foundation

#### React App Setup
- [ ] Create React app
  ```bash
  npx create-react-app web-admin
  cd web-admin
  npm install @reduxjs/toolkit react-redux react-router-dom
  ```
- [ ] Set up project structure (components, pages, services)
- [ ] Configure Redux store
- [ ] Set up React Router
- [ ] Install UI library (Material-UI or Chakra UI)

#### Authentication Pages
- [ ] Login page with Kinde integration
- [ ] Dashboard (skeleton)
- [ ] Protected routes (require authentication)

### Week 4: Subscription Management

#### Stripe Integration
- [ ] Install Stripe library
  ```bash
  npm install @stripe/stripe-js @stripe/react-stripe-js
  ```
- [ ] Create subscription pages:
  - Plans & Pricing
  - Payment Method form (Stripe Elements)
  - Billing History
- [ ] Backend endpoints for subscriptions:
  - `POST /subscriptions` - Create subscription
  - `GET /subscriptions/:id` - Get subscription details
  - `PUT /subscriptions/:id` - Update (upgrade storage)
  - `DELETE /subscriptions/:id` - Cancel subscription
  - `POST /subscriptions/webhook` - Handle Stripe webhooks

#### Payment Testing
- [ ] Test with Stripe test cards
- [ ] Test subscription creation
- [ ] Test storage upgrade
- [ ] Test cancellation flow

### Week 5: Storage & Account Management

#### Storage Tracker
- [ ] Create storage tracker component
  - Visual progress bar
  - Warning at 80%
  - List storage by group
- [ ] Backend endpoint:
  - `GET /users/me/storage` - Get storage breakdown

#### My Account Page
- [ ] Account settings
- [ ] Storage tracker
- [ ] Link to billing/subscription
- [ ] Logout

### Week 6: Log Export Feature

#### Log Export UI
- [ ] Log export form (select date range)
- [ ] Export history list
- [ ] Download button for previous exports

#### Backend Implementation
- [ ] Endpoint: `POST /groups/:id/logs/export`
  - Query audit_logs table
  - Generate CSV
  - Generate temporary media links (valid 1 week)
  - Send email with password-protected download
- [ ] AWS SES email template for log exports

#### Web App Testing & Deployment
- [ ] Write E2E tests (Cypress or Playwright)
- [ ] Test all subscription flows
- [ ] Test log export
- [ ] Deploy to AWS S3 + CloudFront
- [ ] Configure custom domain (parentinghelperapp.com)

---

## 📅 Phase 3-4: Mobile - Main App (Weeks 7-16)

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
- [ ] Upload to S3
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

## 📅 Phase 6: Testing & Launch (Weeks 19-24)

### Week 19-20: Cross-Product Testing

- [ ] Test subscription flow: Web → Mobile
- [ ] Test all 3 products with same user account
- [ ] Test role changes propagate correctly
- [ ] Test storage calculations across all products
- [ ] Test audit logs from all 3 products

### Week 21: Security Audit

- [ ] Run security scans (OWASP)
- [ ] Penetration testing
- [ ] Review all authentication flows
- [ ] Review all permission checks
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention

### Week 22: Performance Optimization

- [ ] Database query optimization
- [ ] API response time optimization (target <500ms)
- [ ] Mobile app bundle size optimization
- [ ] CloudFront cache configuration
- [ ] Lambda cold start optimization

### Week 23: App Store Preparation

#### iOS App Store
- [ ] Purchase Apple Developer Account ($99/year)
- [ ] Create App Store Connect account
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
- [ ] Submit Parenting Helper for review
- [ ] Submit PH Messenger for review
- [ ] Prepare same materials as iOS

### Week 24: Launch!

- [ ] Monitor app store review process
- [ ] Fix any issues flagged by reviewers
- [ ] Publish apps when approved
- [ ] Monitor CloudWatch logs for errors
- [ ] Monitor Stripe for subscriptions
- [ ] Set up customer support email monitoring
- [ ] Create launch announcement
- [ ] Marketing push (optional)

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
- AWS (dev): ~$50-100/month
- AWS (production): ~$100-400/month (scales with users)
- Kinde: $25/month (up to 1,000 users)
- Stripe: 2.9% + $0.30 per transaction
- **Total**: ~$175-525/month

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

**Ready to Start?** Follow `SETUP.md` to set up your development environment! 🚀

**Last Updated**: 2025-10-20
**Next Review**: After completing Phase 1 (Foundation)
