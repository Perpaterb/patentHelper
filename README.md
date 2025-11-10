# Parenting Helper App - Technical Planning Document


## 1. Overview

A cross-platform parenting and co-parenting helper application designed to facilitate communication, scheduling, and financial coordination between parents, children, caregivers, and supervisors. The app provides three core functionalities: messaging, calendar management, and financial tracking, with comprehensive logging and approval systems for administrative oversight.

**Key Features:**
- Role-based group management (Admin, Parent, Child, Caregiver, Supervisor)
- Secure messaging with administrative oversight and audit trails
- Visual calendar with child responsibility tracking
- Financial matter tracking with payment reporting and approval workflows
- Complete audit logging of all actions (non-deletable, admin-accessible)
- Multi-tenancy with group isolation

**Business Model:**
- 100% FREE - No subscriptions, no ads, no in-app purchases
- Optional donations to keep servers running (Stripe, PayPal)
- Storage: Each user's own Google Drive (app-created files only)
- Privacy-focused: You own your data in your Google Drive, not on our servers

**Target Platforms:**
- Web (React) - Full app experience in browser
- iOS (React Native) - Full app on iPhone/iPad
- Android (React Native) - Full app on Android devices

**3 Products, 1 Backend Architecture (KISS Principle):**
1. **Parenting Helper Web App** (parentinghelperapp.com) - Full features: messaging, calendar, finance, gift registry, etc.
2. **Parenting Helper Mobile App** - Full features (same as web, optimized for mobile)
3. **PH Messenger Mobile App** - Messaging only, biometric auth, for children/restricted devices

**Key Architecture Decisions:**
- **100% FREE** - No subscriptions, no payments needed
- **Dual Authentication**: Kinde (identity) + Google OAuth (storage)
- Storage in each user's own Google Drive (app-created files only, private from personal files)
- Optional donations via landing page (parentinghelperapp.com/donate)
- All 3 products share same backend API/database
- Web app and mobile apps have identical features (just different UI frameworks)
- Files stored in hidden `.parentinghelper/` folder in user's Drive (15GB free per user)

---

## 1.5. App Navigation Hierarchies

### Parenting Helper Web App - `web-app/`

**IMPORTANT**: Full-featured web application with ALL features (Messages, Calendar, Finance, Gift Registry, etc.).

```
Login Screen (Kinde + Google Drive)
    ↓
Home / Groups List (LANDING SCREEN)
    ↓
Individual Group (Group Dashboard/Overview)
    ├── Group Settings
    ├── Approvals List
    ├── Messages Section
    │      ↓
    │   Message Groups List
    │      ↓
    │   Individual Message Group
    │      ├── Message Group Settings
    │      └── Messages (Chat Interface)
    ├── Calendar Section
    │      ├── Calendar Settings
    │      └── Calendar View
    ├── Finance Section
    │      ↓
    │   Finance Matters List
    │      ↓
    │   Individual Finance Matter
    ├── Gift Registry Section
    │      ↓
    │   Wish Lists
    │      ↓
    │   Individual Wish List
    └── Kris Kringle Section
           ↓
        Kris Kringle Events
           ↓
        Individual Event
```

**Key Points:**
- Identical features to mobile app (just different UI framework)
- React web app with responsive design
- Can be used on desktop/laptop browsers
- Same navigation hierarchy as mobile app

### Parenting Helper (Full Mobile App) - `mobile-main/`

**IMPORTANT**: This is the FULL app with ALL features (Messages, Calendar, Finance).

```
Login Screen
    ↓
Home / Groups List (LANDING SCREEN)
    ↓
Individual Group (Group Dashboard/Overview)
    ├── Group Settings
    ├── Approvals List
    ├── Messages Section
    │      ↓
    │   Message Groups List
    │      ↓
    │   Individual Message Group
    │      ├── Message Group Settings
    │      └── Messages (Chat Interface)
    ├── Calendar Section
    │      ├── Calendar Settings
    │      └── Calendar View
    └── Finance Section
           ↓
        Finance Matters List
           ↓
        Individual Finance Matter
```

**Key Points:**
- Landing screen = Groups List (NOT message groups)
- Clicking a group opens Group Dashboard/Overview (NOT messages directly)
- From Group Dashboard, user navigates to Messages, Calendar, or Finance
- Messages section has its own Message Groups List
- Each feature (Messages/Calendar/Finance) is a separate section within a Group

### PH Messenger (Messaging-Only App) - `mobile-messenger/`

**IMPORTANT**: This is the SIMPLIFIED messaging-only app.

```
Login Screen
    ↓
Home / Groups List (LANDING SCREEN)
    ↓
Individual Group
    ↓
Message Groups List
    ↓
Individual Message Group
    ├── Message Group Settings
    └── Messages (Chat Interface)
```

**Key Points:**
- Landing screen = Groups List (same as full app)
- Clicking a group goes DIRECTLY to Message Groups List (no Group Dashboard)
- NO Calendar, NO Finance, NO Group Settings, NO Approvals
- Focused ONLY on messaging functionality
- Uses biometric auth after first login

### Google Drive Connection Flow

**IMPORTANT**: All users must connect Google Drive for storage.

```
Login Screen (Kinde)
    ↓
Check: user.googleDriveConnected?
    ↓
If false:
    Google Drive Connect Screen
    → Google OAuth Consent
    → Create .parentinghelper/ folder
    → Save encrypted refresh token
    ↓
If true:
    Home / Groups List
```

**Key Points:**
- Google Drive connection required for app usage
- Uses OAuth scope: `drive.file` (app-created files only)
- Files stored in hidden `.parentinghelper/` folder
- User can disconnect anytime (makes their uploads unavailable)
- Each user gets 15GB free from Google (not from us)

---

## 2. Tech Stack

### Frontend

#### Web App (Full-Featured) - `web-app/`
- **React 18+**
  - **Justification**: Industry standard, large ecosystem, identical component structure to React Native
- **React Router v6**
  - **Justification**: Standard routing for single-page applications
- **State Management**: Redux Toolkit
  - **Justification**: Consistent state management across all 3 products
- **UI Components**: Material-UI or Chakra UI
  - **Justification**: Professional UI, accessible components, responsive design, theme support
- **Google OAuth**: `@react-oauth/google`
  - **Justification**: Handle Google Drive OAuth flow in browser
- **File Uploads**: React Dropzone
  - **Justification**: Drag-and-drop file uploads, previews

#### Mobile Apps (2 Apps)
- **React Native with Expo**
  - **Justification**: Cross-platform development, single codebase for iOS/Android, cloud builds (no Xcode/Android Studio required), large ecosystem, excellent for MVP development speed
  - **Two Apps**: Main app (Parenting Helper) + Companion app (PH Messenger)
- **React Navigation**
  - **Justification**: Standard routing solution for React Native apps with native gestures support
- **State Management**: Redux Toolkit
  - **Justification**: Handles complex state (offline sync, message caching), DevTools for debugging, middleware for side effects
- **UI Components**: React Native Paper / Native Base
  - **Justification**: Pre-built, accessible components that speed up development
- **Biometric Auth**: Expo Local Authentication
  - **Justification**: Face ID/Touch ID for PH Messenger quick access
- **Google OAuth**: `@react-native-google-signin/google-signin`
  - **Justification**: Handle Google Drive OAuth flow on mobile

### Backend

**Development Approach: Local-First, Deploy Later**
- **Local Development** (Phases 1-5): Express.js API server with local PostgreSQL, file storage, and email
- **Production** (Phase 6): Convert to AWS Lambda + API Gateway
- **Benefit**: Zero AWS costs during development, faster iteration, easier debugging

#### Production Stack (Phase 6 Deployment)
- **AWS Lambda**
  - **Justification**: Serverless, pay-per-use, auto-scaling, fits "serverless infrastructure" requirement
  - **Development**: Functions written to work with both Express.js (local) and Lambda (production)
- **API Gateway**
  - **Justification**: RESTful API management, integrates with Lambda, handles authentication
  - **Development**: Express.js routes locally, API Gateway routes in production
- **Amazon RDS (PostgreSQL)**
  - **Justification**: PostgreSQL chosen for complex relational queries (groups, messages, approvals) and audit requirements
  - **Development**: Docker PostgreSQL locally, AWS RDS in production (same Prisma schema)
- **Google Drive API**
  - **Justification**: Each user stores files in their own Google Drive (15GB free per user), eliminates S3 costs, better privacy
  - **Development**: Google Drive API locally and in production (same implementation)
  - **Scope**: `drive.file` (app-created files only, cannot see user's personal files)
  - **Storage**: Hidden `.parentinghelper/` folder in user's Drive

### Authentication & Authorization
- **Kinde** (Identity Provider)
  - **Justification**: Email MFA, user management, OAuth support
  - **Purpose**: Who you are in the app (identity, roles, permissions)
- **Google OAuth 2.0** (Storage Provider)
  - **Justification**: Required for Google Drive API access
  - **Purpose**: Where your files live (storage, file access)
  - **Tokens**: Encrypted refresh tokens stored in database

### Infrastructure as Code (IaC)
- **Terraform**
  - **Justification**: Specified in requirements, cloud-agnostic, version-controlled infrastructure, supports AWS resources

### Development Environment
- **Docker & Docker Compose**
  - **Justification**: Run PostgreSQL and MailHog locally, consistent dev environment
  - **Services**: PostgreSQL database, MailHog email testing
- **Express.js**
  - **Justification**: Local API server during development, converts to Lambda in Phase 6
  - **Benefit**: Faster development, no AWS costs until production

### Additional Services
- **Amazon SES**
  - **Justification**: Email delivery for notifications, approval alerts
  - **Development**: MailHog (local email preview tool) during development
- **Amazon EventBridge**
  - **Justification**: Event-driven architecture for approval workflows, notifications
- **Amazon CloudWatch**
  - **Justification**: Logging, monitoring, alerting for Lambda functions
- **Google Cloud Console**
  - **Justification**: Manage Google Drive API credentials, OAuth consent screen, API quotas
- **Stripe Checkout** (Optional donations)
  - **Justification**: One-time donation processing (no recurring subscriptions)

### Development Tools
- **JavaScript (ES6+)** with **JSDoc**
  - **Justification**: Faster development, no compilation step, JSDoc provides type hints and IDE support
- **ESLint + Prettier**
  - **Justification**: Code quality, consistent formatting
- **Joi** or **Zod**
  - **Justification**: Runtime validation for API inputs/outputs, compensates for lack of compile-time type checking
- **Jest + React Testing Library**
  - **Justification**: Unit and integration testing
- **Detox** or **Appium**
  - **Justification**: E2E testing for mobile apps

---

## 3. Directory Structure

```
patentHelper/
├── web-admin/                       # Admin Web App (React) - BUILT FIRST
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Generic components (buttons, cards, etc.)
│   │   │   ├── subscription/
│   │   │   │   ├── SubscriptionPlans.jsx
│   │   │   │   ├── PaymentMethod.jsx
│   │   │   │   ├── StorageUpgrade.jsx
│   │   │   │   └── SubscriptionStatus.jsx
│   │   │   ├── account/
│   │   │   │   ├── StorageTracker.jsx
│   │   │   │   ├── BillingHistory.jsx
│   │   │   │   └── AccountSettings.jsx
│   │   │   └── logs/
│   │   │       ├── LogExportForm.jsx
│   │   │       └── LogHistory.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Subscription.jsx
│   │   │   ├── MyAccount.jsx
│   │   │   └── LogExport.jsx
│   │   ├── services/                # API services
│   │   │   ├── api.js
│   │   │   ├── auth.service.js
│   │   │   ├── subscription.service.js
│   │   │   └── logs.service.js
│   │   ├── store/                   # State management
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   └── subscriptionSlice.js
│   │   │   └── store.js
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── useAuth.js
│   │   ├── utils/                   # Utility functions
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   ├── schemas/                 # Validation schemas (Joi)
│   │   │   └── subscription.schema.js
│   │   └── constants/               # App constants
│   │       └── plans.js
│   ├── .eslintrc.js
│   ├── .prettierrc.js
│   ├── package.json
│   └── README.md
│
├── mobile-main/                     # Parenting Helper (Main App) - BUILT SECOND
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Generic components (buttons, inputs, etc.)
│   │   │   ├── group/               # Group-related components
│   │   │   │   ├── GroupCard.jsx
│   │   │   │   ├── MemberIcon.jsx
│   │   │   │   └── CreateGroup.jsx
│   │   │   ├── messaging/           # Message components
│   │   │   │   ├── MessageBubble.jsx
│   │   │   │   ├── MessageInput.jsx
│   │   │   │   └── MessageGroupCard.jsx
│   │   │   ├── calendar/            # Calendar components
│   │   │   │   ├── CalendarDayView.jsx
│   │   │   │   ├── CalendarWeekView.jsx
│   │   │   │   ├── CalendarMonthView.jsx
│   │   │   │   ├── ResponsibilityLine.jsx
│   │   │   │   └── CreateEvent.jsx
│   │   │   └── finance/             # Finance components
│   │   │       ├── FinanceMatterCard.jsx
│   │   │       ├── FinanceDescriptionBar.jsx
│   │   │       └── ReportPayment.jsx
│   │   ├── screens/                 # Screen components
│   │   │   ├── auth/
│   │   │   │   └── LoginScreen.jsx
│   │   │   ├── home/
│   │   │   │   ├── HomeScreen.jsx
│   │   │   │   ├── AppSettings.jsx
│   │   │   │   └── MyAccount.jsx
│   │   │   ├── groups/
│   │   │   │   ├── GroupsListScreen.jsx
│   │   │   │   ├── GroupMainScreen.jsx
│   │   │   │   └── GroupSettingsScreen.jsx
│   │   │   ├── messages/
│   │   │   │   ├── MessageGroupsListScreen.jsx
│   │   │   │   └── MessagesScreen.jsx
│   │   │   ├── calendar/
│   │   │   │   └── CalendarScreen.jsx
│   │   │   └── finance/
│   │   │       ├── FinanceListScreen.jsx
│   │   │       └── FinanceMatterScreen.jsx
│   │   ├── navigation/              # Navigation configuration
│   │   │   └── AppNavigator.jsx
│   │   ├── services/                # API services
│   │   │   ├── api.js               # Base API configuration
│   │   │   ├── auth.service.js
│   │   │   ├── groups.service.js
│   │   │   ├── messages.service.js
│   │   │   ├── calendar.service.js
│   │   │   ├── finance.service.js
│   │   │   └── storage.service.js
│   │   ├── store/                   # State management
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── groupsSlice.js
│   │   │   │   └── messagesSlice.js
│   │   │   └── store.js
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useGroups.js
│   │   │   └── useNotifications.js
│   │   ├── utils/                   # Utility functions
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   └── permissions.js
│   │   ├── schemas/                 # Validation schemas (Joi/Zod)
│   │   │   ├── user.schema.js
│   │   │   ├── group.schema.js
│   │   │   ├── message.schema.js
│   │   │   ├── calendar.schema.js
│   │   │   └── finance.schema.js
│   │   └── constants/               # App constants
│   │       ├── roles.js
│   │       └── colors.js
│   ├── assets/                      # Images, fonts, etc.
│   ├── android/                     # Android native code
│   ├── ios/                         # iOS native code
│   ├── app.json                     # Expo config
│   ├── eas.json                     # EAS Build config
│   ├── .eslintrc.js
│   ├── .prettierrc.js
│   └── package.json
│
├── mobile-messenger/                # PH Messenger (Companion App) - BUILT THIRD
│   ├── src/
│   │   ├── components/              # Shared messaging components
│   │   │   └── messaging/           # Message components (reused from main app)
│   │   ├── screens/
│   │   │   ├── MessageGroupsListScreen.jsx
│   │   │   └── MessagesScreen.jsx
│   │   ├── services/                # API services (messaging only)
│   │   │   ├── api.js
│   │   │   ├── auth.service.js
│   │   │   └── messages.service.js
│   │   ├── store/                   # Redux (messages only)
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   └── messagesSlice.js
│   │   │   └── store.js
│   │   ├── hooks/
│   │   │   └── useMessages.js
│   │   └── constants/
│   │       └── colors.js
│   ├── assets/
│   ├── App.jsx
│   ├── app.json
│   └── package.json
│
├── backend/                         # Serverless backend
│   ├── functions/                   # Lambda functions
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   └── verify-mfa.js
│   │   ├── users/
│   │   │   ├── get-user.js
│   │   │   ├── update-user.js
│   │   │   └── get-storage-usage.js
│   │   ├── groups/
│   │   │   ├── create-group.js
│   │   │   ├── get-groups.js
│   │   │   ├── update-group.js
│   │   │   ├── add-member.js
│   │   │   ├── remove-member.js
│   │   │   └── get-members.js
│   │   ├── messages/
│   │   │   ├── create-message-group.js
│   │   │   ├── send-message.js
│   │   │   ├── get-messages.js
│   │   │   ├── hide-message.js
│   │   │   └── upload-media.js
│   │   ├── calendar/
│   │   │   ├── create-event.js
│   │   │   ├── update-event.js
│   │   │   ├── get-events.js
│   │   │   └── create-responsibility-event.js
│   │   ├── finance/
│   │   │   ├── create-finance-matter.js
│   │   │   ├── update-finance-matter.js
│   │   │   ├── report-payment.js
│   │   │   ├── confirm-payment.js
│   │   │   └── mark-settled.js
│   │   ├── approvals/
│   │   │   ├── create-approval.js
│   │   │   ├── process-approval.js
│   │   │   └── get-approvals.js
│   │   ├── logs/
│   │   │   ├── create-log.js
│   │   │   ├── export-logs.js
│   │   │   └── generate-media-links.js
│   │   └── subscriptions/
│   │       ├── create-subscription.js
│   │       ├── update-subscription.js
│   │       ├── cancel-subscription.js
│   │       └── webhook.js
│   ├── layers/                      # Lambda layers (shared code)
│   │   └── common/
│   │       ├── db/
│   │       │   └── database.js
│   │       ├── utils/
│   │       │   ├── validators.js
│   │       │   ├── permissions.js
│   │       │   └── logger.js
│   │       └── schemas/
│   │           └── index.js
│   ├── .eslintrc.js
│   ├── .prettierrc.js
│   └── package.json
│
├── infrastructure/                  # Terraform IaC
│   ├── modules/
│   │   ├── api-gateway/
│   │   ├── lambda/
│   │   ├── database/
│   │   ├── storage/
│   │   └── auth/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   └── variables.tf
│   │   ├── staging/
│   │   └── production/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
│
├── shared/                          # Shared code between apps
│   ├── components/                  # Shared React Native components
│   │   └── messaging/               # Message components used by both apps
│   ├── schemas/
│   │   └── api.schema.js
│   ├── constants/
│   │   └── constants.js
│   └── utils/
│       └── messageUtils.js
│
├── docs/                            # Documentation
│   ├── api.md
│   ├── architecture.md
│   └── deployment.md
│
├── .github/                         # GitHub Actions CI/CD
│   └── workflows/
│       ├── mobile-ci.yml
│       ├── backend-ci.yml
│       └── deploy.yml
│
├── docker-compose.yml               # Local development
├── .gitignore
├── appplan.md                       # Original requirements
└── README.md                        # This file
```

---

## 3.5. Development Workflow

### Running the Application Locally

**Prerequisites:**
- Node.js v20+
- PostgreSQL (via Docker recommended)
- Expo CLI (for mobile development)

**Process Management During Development:**

During active development sessions, the developer manages these processes manually:

1. **Backend Server** - `cd backend && npm start`
   - Developer monitors backend logs in their terminal
   - See real-time API requests, errors, and database queries
   - Claude should **ASK** for restart if needed, never attempt to manage this process

2. **Mobile App** - `cd mobile-main && npm start`
   - Developer monitors Expo dev server in their terminal
   - Hot reload enabled for React Native changes
   - Claude should **ASK** for restart if needed, never attempt to manage this process

3. **Web App** (when needed) - `cd web-app && npm start`
   - Developer monitors React dev server
   - Runs on http://localhost:3001 (backend uses 3000)

**Why Manual Process Management:**
- Developer sees real-time logs for debugging
- Developer controls when to restart after code changes
- Prevents automated tools from killing/restarting critical processes
- Allows developer to manage multiple terminals efficiently

**Typical Development Session:**
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Mobile App
cd mobile-main
npm start

# Terminal 3: Database
docker-compose up postgres

# Terminal 4: Claude Code (this session)
# Developer works with Claude here while monitoring logs in other terminals
```

---

## 4. Database Schema

### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    kinde_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    member_icon VARCHAR(3),  -- Global icon letters
    icon_color VARCHAR(7),   -- Global icon color
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,

    -- Google Drive Integration (NEW)
    google_account_email VARCHAR(255),
    google_refresh_token TEXT,  -- Encrypted!
    google_token_expiry TIMESTAMP,
    google_drive_connected BOOLEAN DEFAULT FALSE,
    google_drive_app_folder_id VARCHAR(255),
    google_drive_connected_at TIMESTAMP,
    google_drive_last_sync_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_kinde_id ON users(kinde_id);
CREATE INDEX idx_users_google_email ON users(google_account_email);
```

### Groups Table
```sql
CREATE TABLE groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    background_image_url TEXT,
    background_color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_hidden BOOLEAN DEFAULT FALSE,
    date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
    currency VARCHAR(3) DEFAULT 'USD'
);

CREATE INDEX idx_groups_created_at ON groups(created_at);
```

### Group Members Table
```sql
CREATE TABLE group_members (
    group_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'parent', 'child', 'caregiver', 'supervisor'
    display_name VARCHAR(255) NOT NULL,
    icon_letters VARCHAR(3) NOT NULL,
    icon_color VARCHAR(7) NOT NULL,
    email VARCHAR(255), -- For invited but not registered users
    is_registered BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_muted BOOLEAN DEFAULT FALSE,

    -- Notification preferences
    notify_requests BOOLEAN DEFAULT TRUE,
    notify_all_messages BOOLEAN DEFAULT TRUE,
    notify_mention_messages BOOLEAN DEFAULT TRUE,
    notify_all_calendar BOOLEAN DEFAULT TRUE,
    notify_mention_calendar BOOLEAN DEFAULT TRUE,
    notify_all_finance BOOLEAN DEFAULT TRUE,
    notify_mention_finance BOOLEAN DEFAULT TRUE,

    UNIQUE(group_id, user_id),
    CHECK (role IN ('admin', 'parent', 'child', 'caregiver', 'supervisor'))
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(group_id, role);
```

### Relationships Table
```sql
CREATE TABLE relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    member_id_1 UUID NOT NULL REFERENCES group_members(group_member_id),
    member_id_2 UUID NOT NULL REFERENCES group_members(group_member_id),
    relationship_type VARCHAR(100) NOT NULL, -- 'parent-child', 'grandparent-child', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(group_id, member_id_1, member_id_2)
);

CREATE INDEX idx_relationships_group ON relationships(group_id);
```

### Group Settings Table
```sql
CREATE TABLE group_settings (
    group_id UUID PRIMARY KEY REFERENCES groups(group_id) ON DELETE CASCADE,
    parents_create_message_groups BOOLEAN DEFAULT TRUE,
    children_create_message_groups BOOLEAN DEFAULT FALSE,
    caregivers_create_message_groups BOOLEAN DEFAULT TRUE,
    finance_visible_to_parents BOOLEAN DEFAULT TRUE,
    finance_creatable_by_parents BOOLEAN DEFAULT TRUE,
    finance_visible_to_caregivers BOOLEAN DEFAULT FALSE,
    finance_creatable_by_caregivers BOOLEAN DEFAULT FALSE,
    finance_visible_to_children BOOLEAN DEFAULT FALSE,
    finance_creatable_by_children BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Admin Permissions Table
```sql
CREATE TABLE admin_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    granting_admin_id UUID NOT NULL REFERENCES group_members(group_member_id),
    receiving_admin_id UUID NOT NULL REFERENCES group_members(group_member_id),

    auto_approve_hide_messages BOOLEAN DEFAULT FALSE,
    auto_approve_add_people BOOLEAN DEFAULT FALSE,
    auto_approve_remove_people BOOLEAN DEFAULT FALSE,
    auto_approve_assign_roles BOOLEAN DEFAULT FALSE,
    auto_approve_change_roles BOOLEAN DEFAULT FALSE,
    auto_approve_assign_relationships BOOLEAN DEFAULT FALSE,
    auto_approve_change_relationships BOOLEAN DEFAULT FALSE,
    auto_approve_calendar_entries BOOLEAN DEFAULT FALSE,
    auto_approve_assign_children_to_events BOOLEAN DEFAULT FALSE,
    auto_approve_assign_caregivers_to_events BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(group_id, granting_admin_id, receiving_admin_id)
);
```

### Message Groups Table
```sql
CREATE TABLE message_groups (
    message_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES group_members(group_member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP
);

CREATE INDEX idx_message_groups_group ON message_groups(group_id);
CREATE INDEX idx_message_groups_last_message ON message_groups(last_message_at);
```

### Message Group Members Table
```sql
CREATE TABLE message_group_members (
    message_group_id UUID NOT NULL REFERENCES message_groups(message_group_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP,

    PRIMARY KEY (message_group_id, group_member_id)
);

CREATE INDEX idx_msg_group_members_member ON message_group_members(group_member_id);
```

### Messages Table
```sql
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_group_id UUID NOT NULL REFERENCES message_groups(message_group_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES group_members(group_member_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    is_hidden BOOLEAN DEFAULT FALSE,
    hidden_at TIMESTAMP,
    hidden_by UUID REFERENCES group_members(group_member_id),

    -- Message status tracking
    sent_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'

    -- Mentions
    mentions UUID[] DEFAULT ARRAY[]::UUID[]
);

CREATE INDEX idx_messages_group ON messages(message_group_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_mentions ON messages USING GIN(mentions);
```

### Message Media Table
```sql
CREATE TABLE message_media (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL, -- 'image', 'video'
    s3_key VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size_bytes BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (media_type IN ('image', 'video'))
);

CREATE INDEX idx_message_media_message ON message_media(message_id);
```

### Message Read Receipts Table
```sql
CREATE TABLE message_read_receipts (
    message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (message_id, group_member_id)
);

CREATE INDEX idx_read_receipts_member ON message_read_receipts(group_member_id);
```

### Calendar Events Table
```sql
CREATE TABLE calendar_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES group_members(group_member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_interval INTEGER, -- every X days/weeks/months/years
    recurrence_end_date TIMESTAMP,
    parent_event_id UUID REFERENCES calendar_events(event_id),

    -- Event type
    is_responsibility_event BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_calendar_events_group ON calendar_events(group_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_recurring ON calendar_events(is_recurring, parent_event_id);
```

### Event Attendees Table
```sql
CREATE TABLE event_attendees (
    event_id UUID NOT NULL REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),

    PRIMARY KEY (event_id, group_member_id)
);

CREATE INDEX idx_event_attendees_member ON event_attendees(group_member_id);
```

### Child Responsibility Events Table
```sql
CREATE TABLE child_responsibility_events (
    responsibility_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES group_members(group_member_id),

    -- Responsibility at start
    start_responsibility_type VARCHAR(20) NOT NULL, -- 'no_change', 'change_to_end', 'member', 'other'
    start_responsible_member_id UUID REFERENCES group_members(group_member_id),
    start_responsible_other_name VARCHAR(255),
    start_responsible_other_icon_letters VARCHAR(3),
    start_responsible_other_color VARCHAR(7),

    -- Responsibility at end
    end_responsibility_type VARCHAR(20) NOT NULL,
    end_responsible_member_id UUID REFERENCES group_members(group_member_id),
    end_responsible_other_name VARCHAR(255),
    end_responsible_other_icon_letters VARCHAR(3),
    end_responsible_other_color VARCHAR(7),

    CHECK (start_responsibility_type IN ('no_change', 'change_to_end', 'member', 'other')),
    CHECK (end_responsibility_type IN ('no_change', 'change_to_end', 'member', 'other'))
);

CREATE INDEX idx_responsibility_events_event ON child_responsibility_events(event_id);
CREATE INDEX idx_responsibility_events_child ON child_responsibility_events(child_id);
```

### Finance Matters Table
```sql
CREATE TABLE finance_matters (
    finance_matter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    due_date TIMESTAMP,
    created_by UUID NOT NULL REFERENCES group_members(group_member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMP,
    settled_by UUID REFERENCES group_members(group_member_id)
);

CREATE INDEX idx_finance_matters_group ON finance_matters(group_id);
CREATE INDEX idx_finance_matters_settled ON finance_matters(is_settled);
```

### Finance Matter Members Table
```sql
CREATE TABLE finance_matter_members (
    finance_matter_id UUID NOT NULL REFERENCES finance_matters(finance_matter_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    expected_amount DECIMAL(12, 2) NOT NULL,
    expected_percentage DECIMAL(5, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,

    PRIMARY KEY (finance_matter_id, group_member_id)
);

CREATE INDEX idx_finance_members_member ON finance_matter_members(group_member_id);
```

### Finance Payments Table
```sql
CREATE TABLE finance_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finance_matter_id UUID NOT NULL REFERENCES finance_matters(finance_matter_id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    to_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    amount DECIMAL(12, 2) NOT NULL,
    receipt_image_url TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    is_confirmed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_finance_payments_matter ON finance_payments(finance_matter_id);
CREATE INDEX idx_finance_payments_members ON finance_payments(from_member_id, to_member_id);
```

### Approvals Table
```sql
CREATE TABLE approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    approval_type VARCHAR(50) NOT NULL, -- 'add_member', 'remove_member', 'hide_message', 'calendar_event', 'finance_update', etc.
    requested_by UUID NOT NULL REFERENCES group_members(group_member_id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    completed_at TIMESTAMP,

    -- Related entity IDs
    related_entity_type VARCHAR(50), -- 'message', 'event', 'finance_matter', 'member', etc.
    related_entity_id UUID,

    -- Approval data (JSON for flexibility)
    approval_data JSONB NOT NULL,

    -- Voting requirements
    requires_all_admins BOOLEAN DEFAULT FALSE,
    required_approval_percentage DECIMAL(5, 2) DEFAULT 50.00,

    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE INDEX idx_approvals_group ON approvals(group_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_requester ON approvals(requested_by);
```

### Approval Votes Table
```sql
CREATE TABLE approval_votes (
    approval_id UUID NOT NULL REFERENCES approvals(approval_id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES group_members(group_member_id),
    vote VARCHAR(10) NOT NULL, -- 'approve', 'reject'
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (approval_id, admin_id),
    CHECK (vote IN ('approve', 'reject'))
);

CREATE INDEX idx_approval_votes_admin ON approval_votes(admin_id);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    action_location VARCHAR(255),
    performed_by UUID REFERENCES group_members(group_member_id),
    performed_by_name VARCHAR(255),
    performed_by_email VARCHAR(255),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Message-specific fields
    message_content TEXT,
    media_links TEXT[],

    -- Additional context (JSON for flexibility)
    log_data JSONB
);

CREATE INDEX idx_audit_logs_group ON audit_logs(group_id);
CREATE INDEX idx_audit_logs_performed_at ON audit_logs(group_id, performed_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
```

### Media Log Links Table
```sql
CREATE TABLE media_log_links (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_export_id UUID NOT NULL,
    media_id UUID NOT NULL REFERENCES message_media(media_id),
    access_token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL, -- 1 week from creation
    accessed_count INTEGER DEFAULT 0
);

CREATE INDEX idx_media_log_links_export ON media_log_links(log_export_id);
CREATE INDEX idx_media_log_links_expires ON media_log_links(expires_at);
```

### Storage Usage Table
```sql
CREATE TABLE storage_usage (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL, -- 'image', 'video', 'log'
    file_count INTEGER DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, group_id, media_type)
);

CREATE INDEX idx_storage_usage_user ON storage_usage(user_id);
CREATE INDEX idx_storage_usage_group ON storage_usage(group_id);
```

### Pinned Items Table
```sql
CREATE TABLE pinned_items (
    pin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'group', 'message_group', 'finance_matter'
    item_id UUID NOT NULL,
    pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pin_order INTEGER NOT NULL,

    UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_pinned_items_user ON pinned_items(user_id, item_type, pin_order);
```

---

## 5. API Endpoints

### Authentication API

**Implementation Status**: ✅ **IMPLEMENTED** (Phase 1, Week 2, Days 1-2)

**Authentication Strategy**:
- Kinde OAuth 2.0 for user authentication
- JWT tokens (access + refresh)
- Access tokens: 15 minute expiration (Authorization header)
- Refresh tokens: 7 day expiration (HTTP-only cookie)

#### GET /auth/login
- **Description**: Initiate Kinde OAuth login flow
- **Implementation**: Redirects to Kinde OAuth login page
- **Response**: `302 Redirect` to Kinde login URL
- **Note**: After successful login at Kinde, redirects to `/auth/callback`

#### GET /auth/register
- **Description**: Initiate Kinde OAuth registration flow
- **Implementation**: Redirects to Kinde registration page
- **Response**: `302 Redirect` to Kinde registration URL
- **Note**: After successful registration at Kinde, redirects to `/auth/callback`

#### GET /auth/callback
- **Description**: Handle Kinde OAuth callback
- **Query Parameters**:
  - `code`: Authorization code from Kinde
  - `state`: OAuth state parameter
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Login successful",
    "accessToken": "eyJhbGci...",
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "isSubscribed": false
    }
  }
  ```
- **Side Effects**:
  - Creates user in database if first login
  - Sets `refreshToken` HTTP-only cookie (7 days)
- **Errors**:
  - `401`: Authentication failed

#### POST /auth/refresh
- **Description**: Refresh access token using refresh token
- **Cookie Required**: `refreshToken` (HTTP-only)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "accessToken": "eyJhbGci..."
  }
  ```
- **Errors**:
  - `401`: Invalid or missing refresh token

#### GET /auth/verify
- **Description**: Verify access token validity
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "valid": true,
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "isSubscribed": false
    }
  }
  ```
- **Errors**:
  - `401`: Invalid or missing token

#### GET /auth/me
- **Description**: Get current user profile
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "kindeId": "kinde_xxx",
      "isSubscribed": false,
      "createdAt": "2025-10-21T...",
      "updatedAt": "2025-10-21T..."
    }
  }
  ```
- **Errors**:
  - `401`: Invalid or missing token

#### POST /auth/logout
- **Description**: Logout user
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Logged out successfully",
    "logoutUrl": "https://parentinghelper.kinde.com/logout"
  }
  ```
- **Side Effects**: Clears `refreshToken` cookie
- **Note**: Client should redirect to `logoutUrl` to complete Kinde logout

---

### User API

#### GET /users/me
- **Description**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user: User, subscription: Subscription, storageUsage: StorageUsage }`

#### PUT /users/me
- **Description**: Update user profile
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ ...userFields }`
- **Response**: `{ user: User }`

#### GET /users/me/storage
- **Description**: Get storage usage breakdown by group
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ storageLimit: number, storageUsed: number, byGroup: StorageByGroup[] }`

---

### Subscription API

**Implementation Status**: ✅ **IMPLEMENTED** (Phase 2 - Web Admin App)

#### GET /subscriptions/pricing
- **Description**: Get subscription plan pricing information
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "pricing": {
      "adminSubscription": {
        "name": "Admin Subscription",
        "description": "Full admin access...",
        "priceId": "price_xxx",
        "amount": 800,
        "currency": "aud",
        "interval": "month"
      },
      "additionalStorage": {
        "name": "Additional Storage",
        "description": "Extra 2GB storage...",
        "amount": 100,
        "currency": "aud",
        "interval": "month"
      }
    }
  }
  ```

#### GET /subscriptions/current
- **Description**: Get current user's subscription status
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "subscription": {
      "userId": "uuid",
      "isSubscribed": true,
      "startDate": "2025-10-21T...",
      "endDate": null,
      "storageUsedGb": "2.50",
      "stripe": {
        "customerId": "cus_xxx",
        "subscriptionId": "sub_xxx",
        "currentPeriodEnd": "2025-11-21T..."
      }
    }
  }
  ```

#### POST /subscriptions/checkout
- **Description**: Create Stripe checkout session
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ priceId: string, successUrl: string, cancelUrl: string }`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "url": "https://checkout.stripe.com/..."
  }
  ```

#### POST /subscriptions/cancel
- **Description**: Cancel subscription (access continues until end of billing period)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "cancelAt": "2025-11-21T..."
  }
  ```

#### POST /subscriptions/reactivate
- **Description**: Reactivate a canceled subscription
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "subscription": { ... }
  }
  ```

#### POST /subscriptions/webhook
- **Description**: Handle Stripe webhooks
- **Headers**: `stripe-signature: <signature>`
- **Request**: Stripe webhook event data
- **Response**: `{ received: boolean }`

---

### Group API

**Implementation Status**: ⚠️ **PARTIALLY IMPLEMENTED** (Phase 2 - GET /groups only)

#### GET /groups
- **Description**: Get all groups for current user with role information
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "groups": [
      {
        "groupId": "uuid",
        "name": "Test Family Group",
        "icon": "👨‍👩‍👧‍👦",
        "backgroundColor": "#4CAF50",
        "backgroundImageUrl": null,
        "createdAt": "2025-10-21T...",
        "isHidden": false,
        "role": "admin",
        "displayName": "John Doe",
        "isMuted": false
      }
    ]
  }
  ```
- **Note**: Includes role information (admin, parent, child, caregiver, supervisor) for permission checks

#### POST /groups
- **Description**: Create new group (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ name: string, icon?: string, backgroundImage?: File, backgroundColor?: string }`
- **Response**: `{ group: Group }`
- **Implementation Status**: ❌ **NOT YET IMPLEMENTED**

#### GET /groups/:groupId
- **Description**: Get group details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ group: Group, members: GroupMember[], settings: GroupSettings }`
- **Implementation Status**: ❌ **NOT YET IMPLEMENTED**

#### PUT /groups/:groupId
- **Description**: Update group (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ name?: string, icon?: string, ... }`
- **Response**: `{ group: Group }`

#### DELETE /groups/:groupId/hide
- **Description**: Request to hide/delete group
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ approval: Approval }`

#### GET /groups/:groupId/members
- **Description**: Get group members
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ members: GroupMember[] }`

#### POST /groups/:groupId/members
- **Description**: Add member to group (admin only, may require approval)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ email?: string, displayName: string, role: Role, iconLetters: string, iconColor: string }`
- **Response**: `{ member: GroupMember } | { approval: Approval }`

#### PUT /groups/:groupId/members/:memberId
- **Description**: Update member (admin only, may require approval)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ displayName?: string, role?: Role, ... }`
- **Response**: `{ member: GroupMember } | { approval: Approval }`

#### DELETE /groups/:groupId/members/:memberId
- **Description**: Remove member (admin only, may require approval)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean } | { approval: Approval }`

#### POST /groups/:groupId/leave
- **Description**: Leave group or request to leave (admin)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean } | { approval: Approval }`

#### GET /groups/:groupId/settings
- **Description**: Get group settings
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ settings: GroupSettings, adminPermissions?: AdminPermissions[] }`

#### PUT /groups/:groupId/settings
- **Description**: Update group settings (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ ...settingsFields }`
- **Response**: `{ settings: GroupSettings }`

#### POST /groups/:groupId/logs/export
- **Description**: Request log export (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ startDate: timestamp, endDate: timestamp }`
- **Response**: `{ success: boolean, emailSent: boolean }`
- **Implementation Status**: ❌ **NOT YET IMPLEMENTED** (replaced by /logs/exports endpoint)

---

### Logs API

**Implementation Status**: ✅ **IMPLEMENTED** (Phase 2 - Web Admin App)

#### POST /logs/exports
- **Description**: Request audit log export for a group (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Request**:
  ```json
  {
    "groupId": "uuid",
    "password": "string (min 8 chars)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "exportId": "uuid",
    "message": "Export request created. You will receive an email when it is ready."
  }
  ```
- **Validation**:
  - User must be admin of the specified group
  - Password minimum 8 characters (used to encrypt export ZIP)
- **Processing**: Export is processed asynchronously, email notification sent when ready

#### GET /logs/exports
- **Description**: Get all export requests for current user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "exports": [
      {
        "exportId": "uuid",
        "groupName": "Test Family Group",
        "requestedAt": "2025-10-21T...",
        "status": "completed",
        "expiresAt": "2025-11-20T..."
      }
    ]
  }
  ```
- **Status Values**: `pending`, `processing`, `completed`, `failed`
- **Note**: Exports expire 30 days after request date

#### GET /logs/exports/:id/download
- **Description**: Download completed export file
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` - Binary ZIP file
  - Content-Type: `application/zip`
  - Content-Disposition: `attachment; filename="audit-logs-{exportId}.zip"`
- **Validation**:
  - Export must be owned by requesting user
  - Export status must be `completed`
  - Export must not be expired
- **Security**: ZIP file is password-protected with password provided during request

---

### Message API

#### GET /groups/:groupId/message-groups
- **Description**: Get all message groups in a group
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ messageGroups: MessageGroup[] }`

#### POST /groups/:groupId/message-groups
- **Description**: Create message group
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ name: string, memberIds: UUID[] }`
- **Response**: `{ messageGroup: MessageGroup } | { approval: Approval }`

#### GET /message-groups/:messageGroupId
- **Description**: Get message group details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ messageGroup: MessageGroup, members: GroupMember[] }`

#### PUT /message-groups/:messageGroupId
- **Description**: Update message group settings
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ name?: string }`
- **Response**: `{ messageGroup: MessageGroup }`

#### POST /message-groups/:messageGroupId/members
- **Description**: Add member to message group (may require approval)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ memberId: UUID }`
- **Response**: `{ success: boolean } | { approval: Approval }`

#### GET /message-groups/:messageGroupId/messages
- **Description**: Get messages in message group
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `?before=<timestamp>&limit=50`
- **Response**: `{ messages: Message[], hasMore: boolean }`

#### POST /message-groups/:messageGroupId/messages
- **Description**: Send message
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ content: string, mentions?: UUID[], media?: File[] }`
- **Response**: `{ message: Message }`

#### PUT /messages/:messageId
- **Description**: Edit message (only content, creates log entry)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ content: string }`
- **Response**: `{ message: Message }`

#### DELETE /messages/:messageId
- **Description**: Hide message (user or admin)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean } | { approval: Approval }`

#### POST /messages/:messageId/read
- **Description**: Mark message as read
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean }`

#### POST /message-groups/:messageGroupId/pin
- **Description**: Pin/unpin message group
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ pinned: boolean }`
- **Response**: `{ success: boolean }`

---

### Calendar API

#### GET /groups/:groupId/calendar/events
- **Description**: Get calendar events for a group
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `?startDate=<timestamp>&endDate=<timestamp>`
- **Response**: `{ events: CalendarEvent[], responsibilityEvents: ChildResponsibilityEvent[] }`

#### POST /groups/:groupId/calendar/events
- **Description**: Create calendar event (may require approval)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ title, startTime, endTime, attendeeIds?, notes?, recurrence? }`
- **Response**: `{ event: CalendarEvent } | { approval: Approval }`

#### POST /groups/:groupId/calendar/responsibility-events
- **Description**: Create child responsibility event (may require approval)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ title, childIds, startTime, endTime, startResponsibility, endResponsibility, recurrence?, notes? }`
- **Response**: `{ event: CalendarEvent, responsibilityEvent: ChildResponsibilityEvent } | { approval: Approval }`

#### PUT /calendar/events/:eventId
- **Description**: Update event (requires approval if already saved)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ ...eventFields, updateRecurring?: 'this'|'future'|'all' }`
- **Response**: `{ event: CalendarEvent } | { approval: Approval }`

#### DELETE /calendar/events/:eventId
- **Description**: Delete event (requires approval)
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `?deleteRecurring=this|future|all`
- **Response**: `{ success: boolean } | { approval: Approval }`

---

### Finance API

#### GET /groups/:groupId/finance/matters
- **Description**: Get finance matters (filtered by role permissions)
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `?settled=true|false`
- **Response**: `{ financeMatters: FinanceMatter[] }`

#### POST /groups/:groupId/finance/matters
- **Description**: Create finance matter
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ name, description?, totalAmount, currency, memberAllocations: {memberId, expectedAmount}[], dueDate? }`
- **Response**: `{ financeMatter: FinanceMatter }`

#### GET /finance/matters/:matterId
- **Description**: Get finance matter details
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ financeMatter: FinanceMatter, members: FinanceMatterMember[], payments: Payment[] }`

#### PUT /finance/matters/:matterId
- **Description**: Update finance matter (requires approval)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ ...matterFields }`
- **Response**: `{ financeMatter: FinanceMatter } | { approval: Approval }`

#### POST /finance/matters/:matterId/payments
- **Description**: Report payment
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ toMemberId: UUID, amount: number, receiptImage?: File }`
- **Response**: `{ payment: Payment, approval: Approval }`

#### POST /finance/payments/:paymentId/confirm
- **Description**: Confirm payment received
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ payment: Payment }`

#### POST /finance/matters/:matterId/settle
- **Description**: Mark finance matter as settled
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ financeMatter: FinanceMatter } | { approval: Approval }`

#### POST /finance/matters/:matterId/unsettle
- **Description**: Mark finance matter as unsettled (creator or admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ financeMatter: FinanceMatter }`

#### POST /finance/matters/:matterId/pin
- **Description**: Pin/unpin finance matter
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ pinned: boolean }`
- **Response**: `{ success: boolean }`

---

### Approval API

#### GET /groups/:groupId/approvals
- **Description**: Get approvals for group
- **Headers**: `Authorization: Bearer <token>`
- **Query**: `?filter=awaiting_my_action|awaiting_others|completed`
- **Response**: `{ approvals: Approval[] }`

#### POST /approvals/:approvalId/vote
- **Description**: Vote on approval (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `{ vote: 'approve' | 'reject' }`
- **Response**: `{ approval: Approval, completed: boolean }`

#### POST /approvals/:approvalId/cancel
- **Description**: Cancel approval request
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean }`

---

### Files API

**Implementation Status**: ✅ **IMPLEMENTED** (Phase 1 - Foundation)

#### POST /files/upload
- **Description**: Upload a single file (image, video, or document)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `multipart/form-data` with fields:
  - `file` (File, required): The file to upload
  - `category` (string, optional): File category - `messages`, `calendar`, `finance`, `profiles` (default: `messages`)
  - `groupId` (UUID, optional): Group ID if file is associated with a group
- **Response**: `{ success: boolean, message: string, file: FileMetadata }`
- **FileMetadata**: `{ fileId: UUID, fileName: string, originalName: string, mimeType: string, size: number, category: string, userId: UUID, groupId: UUID | null, url: string, uploadedAt: timestamp }`
- **Limits**:
  - Images: 10 MB max
  - Videos: 100 MB max
  - Documents: 25 MB max
- **Allowed Types**:
  - Images: JPEG, PNG, GIF, WebP
  - Videos: MP4, QuickTime, AVI, WebM
  - Documents: PDF, DOC, DOCX

#### POST /files/upload-multiple
- **Description**: Upload multiple files (up to 10 files)
- **Headers**: `Authorization: Bearer <token>`
- **Request**: `multipart/form-data` with fields:
  - `files` (File[], required): Array of files to upload (max 10)
  - `category` (string, optional): File category (applies to all files)
  - `groupId` (UUID, optional): Group ID if files are associated with a group
- **Response**: `{ success: boolean, message: string, files: FileMetadata[] }`

#### GET /files/:fileId
- **Description**: Retrieve file content
- **Headers**: `Authorization: Bearer <token>`
- **Response**: File binary data with appropriate `Content-Type` header
- **Errors**:
  - 404: File not found or deleted

#### GET /files/:fileId/metadata
- **Description**: Get file metadata without downloading the file
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean, metadata: FileMetadata }`
- **Errors**:
  - 404: File not found or deleted

#### DELETE /files/:fileId
- **Description**: Delete a file (soft delete)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean, message: string }`
- **Note**: Files are never hard deleted per audit requirements. They are soft deleted with `is_hidden` flag set to `true`. The file remains on disk for audit purposes.

#### GET /files/storage-usage/:userId
- **Description**: Get storage usage for a user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: boolean, userId: UUID, usage: { bytes: number, megabytes: number } }`
- **Note**: Storage usage is calculated by scanning all non-hidden files for the user across all categories.

**Storage Implementation Notes:**
- **Local Development**: Files stored in `backend/uploads/` directory organized by category
- **Production (Phase 6)**: Files stored in AWS S3 with same abstraction layer
- **Metadata Storage**:
  - Local: JSON files stored alongside actual files
  - Production: Will use database tables (`message_media`, etc.) when attached to messages/events
- **Architecture Pattern**: Storage service abstraction allows seamless switching between local filesystem and S3 without changing application code

---

## 6. Implementation Notes

### Security Considerations

1. **Authentication & Authorization**
   - Use Kinde for authentication with MFA (email code for MVP1)
   - Implement JWT tokens for API authentication
   - Token refresh strategy with short-lived access tokens (15 min) and longer refresh tokens (7 days)
   - Store refresh tokens in secure HTTP-only cookies

2. **Role-Based Access Control (RBAC)**
   - Implement middleware to check user roles for each group
   - Validate permissions at API Gateway level and Lambda function level
   - Admin-only endpoints must verify subscriber status
   - Supervisors have read-only access (enforce at API level)

3. **Data Privacy**
   - Encrypt sensitive data at rest (S3 server-side encryption with KMS)
   - Use HTTPS/TLS for all data in transit
   - Implement row-level security for multi-tenant data isolation
   - Media links with temporary signed URLs (expire after 1 week for log exports)
   - Password-protected log export emails

4. **Input Validation**
   - Validate all inputs server-side (never trust client)
   - Sanitize user content to prevent XSS attacks
   - Use parameterized queries to prevent SQL injection
   - Implement rate limiting on all endpoints (API Gateway throttling)
   - File upload validation (type, size, malware scanning with S3 antivirus)

5. **Audit Logging**
   - Log ALL actions to audit_logs table (immutable)
   - Include IP address, user agent, timestamp for all requests
   - Separate logging pipeline for security events
   - Regular audit log reviews for suspicious activity

6. **Data Retention**
   - Soft deletes only (never hard delete messages, groups, or logs)
   - Implement data retention policies for GDPR compliance
   - User data export capability (GDPR right to data portability)
   - User data deletion requests (30-day grace period)

---

### Testing Strategy

1. **Unit Testing**
   - Jest for backend Lambda functions (80%+ coverage target)
   - React Testing Library for frontend components
   - Mock external services (Kinde, AWS SDK, Stripe)
   - Test all permission/authorization logic thoroughly

2. **Integration Testing**
   - API endpoint testing with test database
   - Test approval workflows (multi-admin scenarios)
   - Test subscription lifecycle (create, upgrade, cancel)
   - Test storage calculation accuracy

3. **E2E Testing**
   - Detox for mobile app critical user flows:
     - Login and MFA
     - Create group and add members
     - Send message with media
     - Create calendar event
     - Create and settle finance matter
     - Approval workflows
   - Test on both iOS and Android

4. **Performance Testing**
   - Load testing for Lambda functions (Artillery or k6)
   - Database query optimization (explain plans)
   - Test with 1000+ messages in a message group
   - Test calendar rendering with 500+ events
   - S3 upload/download performance testing

5. **Security Testing**
   - OWASP Top 10 vulnerability scanning
   - Penetration testing before production launch
   - Dependency vulnerability scanning (Snyk, Dependabot)
   - Test role permission boundaries

---

### Third-Party Integrations

1. **Kinde (Authentication)**
   - Integration: OAuth 2.0 / OIDC
   - Features: Email/password, MFA via email codes
   - Future: Social login (Google, Apple)
   - Documentation: https://kinde.com/docs

2. **Stripe (Payments)**
   - Integration: Stripe SDK, webhooks
   - Features: Recurring subscriptions, usage-based billing (storage)
   - Webhook events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - PCI compliance: Use Stripe Elements (no card data touches our servers)

3. **AWS Services**
   - **S3**: Media storage (images, videos), log export files
   - **Lambda**: Serverless compute for all API endpoints
   - **API Gateway**: REST API management, throttling, CORS
   - **RDS (PostgreSQL)**: Primary database
   - **SES**: Email delivery (log exports, notifications, subscription confirmations)
   - **EventBridge**: Event-driven workflows (approval processing, notifications)
   - **CloudWatch**: Logging, monitoring, alerts
   - **CloudFront**: CDN for media delivery
   - **KMS**: Encryption key management

4. **Push Notifications**
   - iOS: Apple Push Notification Service (APNS)
   - Android: Firebase Cloud Messaging (FCM)
   - Integration: AWS SNS or OneSignal for unified push notifications

---

### Pending Questions/Assumptions

#### Questions
1. **Subscription Management**
   - Q: Should storage overages automatically charge extra, or prevent new uploads?
   - Assumption: Prevent new uploads, show warning at 80% usage

2. **Group Deletion**
   - Q: What happens to storage when a user leaves a group? Is their storage freed immediately?
   - Assumption: Storage is freed after user confirms deletion of group backups

3. **Message Delivery**
   - Q: Should offline users receive messages via email notification?
   - Assumption: MVP1 uses push notifications only, email for critical approvals

4. **Calendar Timezone Handling**
   - Q: How to handle users in different timezones within the same group?
   - Assumption: Store all times in UTC, display in user's local timezone

5. **Finance Matter Currency**
   - Q: Can finance matters use different currencies within the same group?
   - Assumption: Each finance matter can specify its own currency, no auto-conversion

6. **Admin Approval Ties**
   - Q: What happens if 50% approve and 50% reject?
   - Assumption: Rejection wins in a tie (safer default)

7. **Recurring Event Edits**
   - Q: When editing "all future events", should past instances be preserved?
   - Assumption: Yes, create new series from edit point forward, keep past events unchanged

8. **Media Retention After User Deletion**
   - Q: When a user deletes their account, what happens to media they uploaded?
   - Assumption: Media remains for audit purposes, anonymize user reference

#### Technical Assumptions
1. **Database**: Using PostgreSQL on RDS for relational data integrity
2. **Wrapper**: Using React Native for mobile app (better native performance than Capacitor)
3. **File Size Limits**: 10MB per image, 100MB per video
4. **Message Pagination**: 50 messages per page
5. **Calendar Range**: Load 1 month of events at a time
6. **WebSocket**: Not in MVP1, use polling for new messages (consider Socket.io for MVP2)
7. **Offline Support**: Minimal in MVP1 (read-only cached data, sync on reconnect)
8. **iOS/Android Versions**: iOS 13+, Android 8+ (API level 26+)

---

### Development Phases (6 Phases, 24 Weeks Total)

#### Phase 1: Foundation (Weeks 1-2)
- Infrastructure setup (Terraform, AWS accounts, CI/CD)
- Authentication integration (Kinde)
- Database schema implementation
- Basic API framework (API Gateway + Lambda structure)
- Shared utilities and schemas

#### Phase 2: Web App - Admin Portal (Weeks 3-6)
- **Priority: Build this FIRST before mobile apps**
- User authentication (Kinde)
- Subscription management UI (plans, billing)
- Stripe payment integration
- Storage tracking dashboard
- Log export functionality
- My Account page
- Email notifications for billing/storage
- Testing and deployment to parentinghelperapp.com

#### Phase 3: Mobile - Main App Foundation (Weeks 7-10)
- **After web app is complete**
- React Native project setup (Expo)
- Authentication (Kinde, link to web for subscriptions)
- Group creation and member management
- Basic approvals system
- Navigation structure
- Link to web app for subscription management

#### Phase 4: Mobile - Core Features (Weeks 11-16)
- Messaging (text + media uploads)
- Message groups
- Calendar implementation
- Child responsibility tracking
- Finance matter tracking
- Admin permissions matrix
- Full audit logging

#### Phase 5: Mobile - PH Messenger App (Weeks 17-18)
- **After main mobile app is complete**
- Lightweight messaging-only app
- Biometric authentication
- Shared messaging components
- Simplified navigation
- Testing on restricted devices

#### Phase 6: Testing & Launch (Weeks 19-24)
- E2E testing (all 3 products)
- Cross-product integration testing
- Performance optimization
- Security audit
- Production infrastructure hardening
- App store submissions (iOS + Android)
- Beta testing with real families
- Support documentation
- Marketing site updates

---

### Success Metrics
- User registration conversion rate
- Subscription conversion rate (free to paid)
- Daily active users (DAU)
- Message send success rate
- Average storage usage per admin
- API response time (p95 < 500ms)
- App crash rate (< 1%)
- Customer support ticket volume

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
**Status**: 🎉 Phase 2 Complete - Web Admin App Operational

**Current Phase**: Phase 3 - Mobile Main App (Next)

**Completed Phases**:
- ✅ Phase 1: Foundation (Authentication, Database, File Storage)
- ✅ Phase 2: Web Admin App (Subscription Management, Log Exports)
