# Documentation Changes Needed for Architecture Change

**Date**: 2025-11-04
**Status**: 🚨 PLANNING PHASE - NOT YET IMPLEMENTED
**Context**: If proceeding with free app + Google Drive storage model

---

## Overview

If you decide to proceed with the architecture change from paid subscriptions to free app with Google Drive storage, the following documentation files need to be updated:

---

## 1. README.md

### Lines 16-19: Business Model Section

**Current:**
```markdown
**Business Model:**
- Free tier: Non-admin parents
- Premium tier: $8/month for group admins (10GB storage, $1/2GB additional)
- Storage includes group logs, images, videos, and backups
```

**Change To:**
```markdown
**Business Model:**
- 100% FREE - No subscriptions, no ads, no in-app purchases
- Optional donations to keep servers running (Stripe, PayPal)
- Storage: Each user's own Google Drive (app-created files only)
- Privacy-focused: You own your data, not us
```

### Lines 26-35: Product Architecture

**Current:**
```markdown
**3 Products, 1 Backend Architecture (KISS Principle):**
1. **Admin Web App** (familyhelperapp.com) - Subscription management, payments, storage upgrades, log exports
2. **family helper Mobile App** - Full co-parenting features: messaging, calendar, finance (NO payment features)
3. **PH Messenger Mobile App** - Messaging only, biometric auth, for children/restricted devices

**Key Architecture Decisions:**
- **NO in-app purchases** - All subscription/payment management via web app only
- Mobile apps link to web for subscription management
- All 3 products share same Kinde authentication and backend API/database
- Web app built FIRST, then main mobile app, then messenger app
```

**Change To:**
```markdown
**2 Products, 1 Backend Architecture (KISS Principle):**
1. **family helper Mobile App** - Full co-parenting features: messaging, calendar, finance
2. **PH Messenger Mobile App** - Messaging only, biometric auth, for children/restricted devices

**Key Architecture Decisions:**
- **100% FREE** - No subscriptions, no payments, no web admin app needed
- **Dual Authentication**: Kinde (identity) + Google OAuth (storage)
- Storage in user's own Google Drive (app-created files only, private from personal files)
- Optional donations via web landing page
- Both mobile apps share same backend API/database
```

### Section 3: Technology Stack

**Add Google Drive API:**
```markdown
**Backend:**
- AWS Lambda (Node.js 20)
- PostgreSQL (RDS in production, Docker locally)
- Prisma ORM
- Kinde Authentication (OAuth 2.0)
- Google Drive API (Storage) ← NEW
- Express.js (local dev server)

**Storage:**
- Google Drive (user's own account, via Drive API) ← NEW (replaces S3)
- 15GB free per user (Google's quota)
- Files stored in hidden .familyhelper/ folder
```

### Section 4: Database Schema

**Update table count:**

**Current:**
```markdown
The database includes 23 core tables...
```

**Change To:**
```markdown
The database includes 28 core tables (23 original + 5 new Gift Registry/Kris Kringle features)...
```

**Update users table description:**

**Add:**
```markdown
#### users
- google_account_email: VARCHAR(255) - Connected Google account
- google_refresh_token: TEXT - Encrypted OAuth refresh token
- google_token_expiry: TIMESTAMP - When token expires
- google_drive_connected: BOOLEAN - Whether Drive is connected
- google_drive_app_folder_id: VARCHAR(255) - App folder ID in user's Drive
- google_drive_connected_at: TIMESTAMP - When connected
- google_drive_last_sync_at: TIMESTAMP - Last sync timestamp
```

**Remove (or mark as deprecated):**
```markdown
- is_subscribed: BOOLEAN
- subscription_id: VARCHAR
- subscription_start_date: TIMESTAMP
- subscription_end_date: TIMESTAMP
- storage_limit_gb: INT
```

**Update message_media table:**

**Add:**
```markdown
- google_drive_file_id: VARCHAR(255) - File ID in uploader's Google Drive
- uploaded_by_user_id: UUID - Who uploaded (their Drive stores it)
```

**Add donations table:**
```markdown
#### donations
- donation_id: UUID (PK)
- user_id: UUID (FK → users)
- amount: DECIMAL(12,2)
- currency: VARCHAR(3) - USD, EUR, etc.
- payment_method: VARCHAR(50) - stripe, paypal, etc.
- stripe_session_id: VARCHAR(255)
- donated_at: TIMESTAMP
- thank_you_sent: BOOLEAN
- message: TEXT - Optional message from donor
```

### Section 5: API Endpoints

**Remove subscription endpoints:**
```markdown
❌ DELETE SECTION:
POST /subscriptions/create
POST /subscriptions/cancel
GET /subscriptions/status
POST /subscriptions/upgrade-storage
GET /subscriptions/billing-history
```

**Add Google OAuth endpoints:**
```markdown
## Authentication - Google Drive
GET  /auth/google/url                    # Get OAuth URL for Drive connection
GET  /auth/google/callback?code=...     # Handle OAuth callback
POST /auth/google/disconnect            # Disconnect Google Drive
GET  /auth/google/status                # Check connection status
```

**Add donations endpoint (optional):**
```markdown
## Donations
POST /donations/create                  # Create Stripe checkout session
GET  /donations/history                 # User's donation history
```

**Update file upload endpoints:**
```markdown
## File Uploads (via Google Drive)

POST /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/media
- Uploads to uploader's Google Drive (not S3)
- Returns: mediaId, fileName, fileSizeBytes

GET /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/media/:mediaId
- Fetches from uploader's Google Drive
- Streams file to viewer
```

---

## 2. appplan.md

### Lines 1-50: Remove Subscription Requirements

**Current mentions of subscriptions throughout the document:**
- "Admin role requires active subscription"
- "Storage limits enforced per subscription tier"
- "Subscription cancellation handling"

**Change To:**
- "Admin role requires Google Drive connection"
- "Storage limited by user's Google Drive quota (15GB free)"
- "Google Drive disconnection handling"

### Add Google Drive Connection Flow

**Add new section:**
```markdown
## 1.X Google Drive Connection (NEW)

### Connection Flow
1. User completes Kinde login
2. App checks: `user.googleDriveConnected`
3. If false: Show GoogleDriveConnectScreen
4. User clicks "Connect Google Drive"
5. Google OAuth consent screen (scope: drive.file)
6. User authorizes
7. Backend stores encrypted refresh token
8. Backend creates .familyhelper/ folder in user's Drive
9. User can now use app

### Disconnection Handling
- If user revokes Google access in Google Account settings:
  - Text messages still visible
  - Uploaded media becomes unavailable
  - App shows warning banner: "Reconnect Google Drive"
  - Lock account until reconnected (recommended)
  - OR: Limited mode (text-only, no uploads)

### Storage Limits
- Each user has 15GB free in their Google Drive
- App warns at 80% full (12GB used)
- User must free space in their Google Drive
- No additional storage purchases (user's responsibility)
```

---

## 3. DECISIONS_SUMMARY.md

### Add Decision: Architecture Change

**Add at top:**
```markdown
## Decision 0: Free App + Google Drive Storage (2025-11-04)

**Context**: Original plan had $8/month subscriptions with S3 storage.

**Decision**: Changed to 100% FREE app with Google Drive storage.

**Rationale**:
- Removes payment complexity (no Stripe, no subscriptions)
- Massive cost savings ($34-240/month less in AWS costs)
- Better privacy (user owns their data)
- Simpler codebase (remove subscription/payment code)
- Competitive advantage (truly free, not freemium)

**Implications**:
- User MUST have Google account
- App requires drive.file OAuth scope
- Files stored in user's own Google Drive
- Rely on donations for server costs
- May not be profitable (accept this risk)
- No web admin app needed (remove or repurpose)

**Trade-offs**:
- ✅ Lower costs, better privacy, simpler code
- ❌ Requires Google account (may lose privacy-conscious users)
- ❌ Unpredictable revenue (donations may not cover costs)
- ❌ API rate limits (mitigated by per-user quotas)
```

### Update Existing Decisions

**Decision 1: Remove mentions of subscriptions**

**Decision 3: Update storage strategy**

---

## 4. NEW_FEATURES_SPEC.md

### Remove Storage Limit Considerations

**Search for mentions of:**
- "Storage limits"
- "Subscription tier"
- "Premium features"

**Replace with:**
- "Files stored in user's Google Drive"
- "Subject to user's Drive quota (15GB free)"

---

## 5. NEXT_STEPS_UPDATED.md

### Add New Phase: Google Drive Migration

**Add before Phase 3A:**
```markdown
### Phase 2B: Google Drive Integration (Weeks 1-4)
- [ ] Create Google Cloud Project
- [ ] Enable Google Drive API
- [ ] Configure OAuth consent screen
- [ ] Update Prisma schema (add Google fields)
- [ ] Create migration script
- [ ] Implement googleDrive.service.js
- [ ] Update auth controller (Google OAuth)
- [ ] Update files controller (use Drive, not S3)
- [ ] Create GoogleDriveConnectScreen (mobile)
- [ ] Update MyAccountScreen (remove subscriptions)
- [ ] Test upload/download flows
- [ ] Deploy to production
- [ ] Monitor for issues

**Estimated Time**: 4-6 weeks full-time
**Blockers**: Requires Google Cloud account, OAuth verification
**Risk Level**: HIGH (major architecture change)
```

### Update Cost Projections

**Change from:**
```markdown
**Total additional AWS cost: ~$2-5/month**
*Still well within $125-500/month budget*
```

**To:**
```markdown
**Total AWS cost: ~$66-160/month**
*No subscription revenue - relies on donations*
*May operate at a loss of $50-200/month*
*Acceptable for passion project / non-profit*
```

---

## 6. API.md

### Remove All Subscription Endpoints

**Delete sections:**
- Subscription Management
- Storage Upgrades
- Billing History

### Add Google OAuth Endpoints

**Add new section:**
```markdown
## Google Drive Integration

### Get OAuth URL
GET /auth/google/url

Returns:
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}

### Handle OAuth Callback
GET /auth/google/callback?code=...

Returns:
{
  "success": true,
  "message": "Google Drive connected successfully",
  "googleEmail": "user@gmail.com"
}

### Disconnect Google Drive
POST /auth/google/disconnect

Returns:
{
  "success": true,
  "message": "Google Drive disconnected"
}

### Check Connection Status
GET /auth/google/status

Returns:
{
  "success": true,
  "connected": true,
  "email": "user@gmail.com",
  "lastSync": "2025-11-04T10:30:00Z"
}
```

### Update File Upload Documentation

**Change all S3 references to Google Drive**

---

## 7. Create New Documentation Files

### ARCHITECTURE_CHANGE.md
✅ **Already Created** - Comprehensive analysis of the change

### GOOGLE_DRIVE_IMPLEMENTATION.md
✅ **Already Created** - Step-by-step implementation guide

### MIGRATION_PLAN.md (if existing users)
**Create if you have existing paid users** - How to migrate from S3 to Google Drive

---

## 8. Update User-Facing Documentation

### Privacy Policy
**Add section:**
```markdown
## Google Drive Storage

family helper stores your uploaded photos and files in YOUR Google Drive account, not on our servers.

What we access:
- Files created by family helper app only
- We use the "drive.file" scope (app-created files only)
- We CANNOT see your personal files, documents, or photos
- We CANNOT see files from other apps

What you control:
- You can revoke access anytime in Google Account settings
- You can delete the .familyhelper/ folder anytime
- Deleting files removes them from app (no backup on our servers)

Data ownership:
- You own all files in your Google Drive
- We do not store copies on our servers
- When you delete your account, files remain in your Drive
```

### Terms of Service
**Add section:**
```markdown
## Google Drive Integration

By using family helper, you agree to:
1. Connect a Google account with Google Drive enabled
2. Grant the app permission to create files in your Drive
3. Maintain sufficient storage space in your Google Drive
4. Understand that revoking Google access will make your uploaded files unavailable

Liability:
- We are not responsible for data loss due to:
  - You deleting files from your Google Drive
  - You revoking app access
  - Google Drive service outages
  - You exceeding Google Drive storage quota
- You are responsible for backing up important files
```

---

## 9. Delete or Archive Files

### Delete Entirely (if proceeding)
```
❌ web-admin/ (entire directory)
❌ backend/controllers/subscriptions.controller.js
❌ backend/services/stripe.js
❌ backend/routes/subscriptions.routes.js
❌ mobile-main/src/screens/account/SubscriptionScreen.jsx
```

### Archive (keep for reference)
Move to `archive/` directory:
```
- web-admin/ → archive/web-admin-deprecated/
- Subscription-related files → archive/subscription-model/
```

---

## 10. Update External Resources

### App Store Listings

**iOS App Store:**
- Change description: "100% FREE with no ads"
- Remove mentions of "Premium" or "Subscription"
- Add: "Requires Google account for storage"

**Google Play Store:**
- Same changes as iOS

### Website (familyhelperapp.com)

**Homepage:**
- Prominent "100% FREE" messaging
- Explain Google Drive storage model
- Add donation button

**Pricing Page:**
- Replace with "Why We're Free" page
- Explain donation model
- Show transparency (monthly costs)

**FAQ Page:**
- Add: "Why do you need access to my Google Drive?"
- Add: "Is my personal data safe?"
- Add: "What if I run out of Google Drive space?"
- Add: "Can I use the app without Google Drive?" (Answer: No)

---

## Summary

**Total Files to Modify:** 9 major documentation files
**Total New Files:** 2 (ARCHITECTURE_CHANGE.md, GOOGLE_DRIVE_IMPLEMENTATION.md)
**Total Files to Delete/Archive:** 4+ files (entire web-admin/ directory)

**Estimated Documentation Time:** 2-3 days

**Critical:**
- ALL user-facing docs must explain Google Drive clearly
- Privacy Policy and Terms MUST be updated before launch
- Cannot deploy to production without legal doc updates

---

**Decision Required:**
Before starting documentation updates, user must decide:
1. ✅ Proceed with architecture change → Update all docs
2. ❌ Stick with subscriptions → No documentation changes needed

---

**Last Updated**: 2025-11-04
**Status**: 🚨 AWAITING USER DECISION
