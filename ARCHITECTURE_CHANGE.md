# Major Architecture Change: Free App + Google Drive Storage

**Date**: 2025-11-04
**Status**: 🚨 PLANNING PHASE - NOT YET IMPLEMENTED
**Impact**: HIGH - Affects business model, storage, auth, costs, database

---

## 🎯 Vision: The New Model

### **Old Model (Current)**
- ❌ $8/month subscription per admin
- ❌ Storage limits (10GB base + $1/2GB extra)
- ❌ Stripe payment processing
- ❌ S3 storage (AWS costs)
- ❌ Web admin app for subscriptions
- ✅ Kinde authentication

### **New Model (Proposed)**
- ✅ **100% FREE** - No subscriptions, no payments
- ✅ **"Please Donate" button** - Optional donations to keep running
- ✅ **Google Drive storage** - Each user stores in their own Google Drive
- ✅ **WhatsApp-style storage** - Data owned by users, not centralized
- ✅ **Dual auth**: Kinde (identity) + Google (storage access)
- ✅ **You pay for compute only** - No storage costs!

---

## 🔄 How It Would Work

### **User Experience Flow**

1. **First Launch**
   ```
   User opens app
     ↓
   Kinde Login (email/password or social)
     ↓
   "Connect Google Drive" screen
     ↓
   Google OAuth consent (allow app to store files)
     ↓
   App creates hidden folder in Google Drive:
     /Parenting Helper App Data/
       ├── media/
       │   ├── messages/
       │   ├── calendar/
       │   └── finance/
       └── exports/
           └── audit_logs/
     ↓
   Home screen (ready to use)
   ```

2. **When User Uploads Media**
   ```
   User uploads photo in message
     ↓
   App uploads to THEIR Google Drive (not yours!)
     ↓
   Database stores: googleDriveFileId + userId
     ↓
   When someone views message:
     - App fetches file from uploader's Google Drive
     - User's Google account serves the file
     - No S3 bandwidth costs for you!
   ```

3. **When Admin Exports Logs**
   ```
   Admin requests log export
     ↓
   Backend generates CSV
     ↓
   CSV saved to ADMIN'S Google Drive
     ↓
   Email sent with link to their own Google Drive file
     ↓
   No S3 storage or bandwidth costs!
   ```

---

## 💰 Cost Analysis

### **Current Costs (With Subscriptions)**
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| AWS Lambda | $10-50 | Serverless compute |
| RDS PostgreSQL | $30-80 | Database |
| S3 Storage | $20-100 | User-uploaded media |
| S3 Bandwidth | $10-50 | Serving files |
| CloudFront CDN | $10-30 | File delivery |
| SES Email | $1-5 | Notifications |
| Kinde Auth | $25 | Authentication |
| Stripe | 2.9% + $0.30 | Payment processing |
| **TOTAL** | **$100-400/month** | |

**Revenue**: $8 × 20-60 users = $160-480/month
**Break-even**: 20-50 paying users

### **New Costs (Free + Google Drive)**
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| AWS Lambda | $10-50 | Serverless compute (same) |
| RDS PostgreSQL | $30-80 | Database (same) |
| ~~S3 Storage~~ | **$0** | ✅ Moved to Google Drive |
| ~~S3 Bandwidth~~ | **$0** | ✅ Served from Google Drive |
| ~~CloudFront CDN~~ | **$0** | ✅ Google Drive serves files |
| SES Email | $1-5 | Notifications (same) |
| Kinde Auth | $25 | Authentication (same) |
| ~~Stripe~~ | **$0** | ✅ No payments |
| Google Drive API | **$0** | ✅ FREE (15GB per user) |
| **TOTAL** | **$66-160/month** | |

**Revenue**: Donations (unpredictable, maybe $0-50/month)
**Your cost**: ~$66-160/month out of pocket

### **Cost Savings: $34-240/month!** 🎉

---

## 🏗️ Technical Architecture Changes

### **1. Authentication: Dual Auth System**

**Current**: Only Kinde (email/password, social login)

**New**: Kinde + Google OAuth

```javascript
// Kinde: Identity provider (who you are)
// Google: Storage provider (where your files live)

// Auth flow:
1. User logs in with Kinde (email/password/social)
   → Get: kindeUserId, email, displayName

2. App prompts: "Connect Google Drive"
   → Google OAuth consent screen
   → Permissions: drive.file (app-created files only)
   → Get: googleAccessToken, googleRefreshToken

3. Store in database:
   users table:
     - kindeId (identity)
     - googleAccountEmail (storage)
     - googleRefreshToken (encrypted!)
     - googleTokenExpiry
```

**Why This Works:**
- Kinde = Identity (who you are in the app)
- Google = Storage (where your media lives)
- Users can change Google accounts without losing identity
- Users can revoke Google access anytime

---

### **2. Storage: Google Drive Integration**

#### **Google Drive API - What You Need**

**OAuth Scopes Required:**
```
https://www.googleapis.com/auth/drive.file
```
This scope:
- ✅ Can create files in user's Drive
- ✅ Can read files created by your app
- ✅ Can delete files created by your app
- ❌ CANNOT see user's personal files (privacy!)
- ❌ CANNOT see other apps' files

**Folder Structure (Hidden from User):**
```
User's Google Drive (root)
  └── .familyhelper/  (hidden folder)
      ├── media/
      │   ├── message-abc123.jpg
      │   ├── calendar-def456.pdf
      │   └── finance-ghi789.png
      └── exports/
          └── audit_log_2025-11-04.csv
```

#### **Upload Flow**

```javascript
// When user uploads message photo:
async function uploadMessagePhoto(userId, file) {
  // 1. Get user's Google refresh token from database
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { googleRefreshToken: true }
  });

  // 2. Get fresh access token
  const accessToken = await refreshGoogleToken(user.googleRefreshToken);

  // 3. Upload to THEIR Google Drive
  const response = await googleDrive.files.create({
    auth: accessToken,
    requestBody: {
      name: `message-${messageId}.jpg`,
      parents: [appFolderId], // Hidden .familyhelper folder
    },
    media: {
      mimeType: 'image/jpeg',
      body: fileStream,
    },
  });

  // 4. Store file ID in database (NOT the file itself!)
  await prisma.messageMedia.create({
    data: {
      messageId: messageId,
      mediaType: 'image',
      googleDriveFileId: response.data.id,  // ← Just the ID!
      uploadedByUserId: userId,
      fileSizeBytes: file.size,
    },
  });

  // NO S3 upload!
  // NO storage costs for you!
}
```

#### **Retrieve Flow**

```javascript
// When someone views the message:
async function getMessagePhoto(messageMediaId, viewerUserId) {
  // 1. Get media record
  const media = await prisma.messageMedia.findUnique({
    where: { mediaId: messageMediaId },
    include: { uploader: true }
  });

  // 2. Get UPLOADER's Google token (not viewer's!)
  const uploader = await prisma.user.findUnique({
    where: { userId: media.uploadedByUserId },
    select: { googleRefreshToken: true }
  });

  // 3. Get fresh access token
  const accessToken = await refreshGoogleToken(uploader.googleRefreshToken);

  // 4. Get file from UPLOADER's Google Drive
  const response = await googleDrive.files.get({
    auth: accessToken,
    fileId: media.googleDriveFileId,
    alt: 'media',  // Download actual file
  });

  // 5. Stream to viewer
  return response.data;

  // File served from uploader's Google Drive!
  // NO S3 bandwidth costs!
}
```

---

### **3. Database Schema Changes**

#### **Add to `users` Table**
```sql
ALTER TABLE users ADD COLUMN google_account_email VARCHAR(255);
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;  -- Encrypted!
ALTER TABLE users ADD COLUMN google_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN google_drive_connected BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN google_drive_app_folder_id VARCHAR(255);
```

#### **Remove/Archive Subscription Tables**
```sql
-- Option A: Soft removal (keep data for migration)
ALTER TABLE users DROP COLUMN is_subscribed;
ALTER TABLE users DROP COLUMN subscription_id;
ALTER TABLE users DROP COLUMN subscription_start_date;
ALTER TABLE users DROP COLUMN subscription_end_date;
ALTER TABLE users DROP COLUMN storage_limit_gb;

-- Option B: Keep tables but mark as archived
-- (useful if you want to migrate existing paid users)
```

#### **Update Media Tables**
```sql
-- Change message_media table:
ALTER TABLE message_media ADD COLUMN google_drive_file_id VARCHAR(255);
ALTER TABLE message_media ADD COLUMN uploaded_by_user_id UUID;  -- Owner of file
ALTER TABLE message_media ALTER COLUMN s3_key DROP NOT NULL;  -- Make optional

-- Later: Remove s3_key entirely after migration
-- ALTER TABLE message_media DROP COLUMN s3_key;
```

#### **Add Donations Table (Optional)**
```sql
CREATE TABLE donations (
  donation_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  amount DECIMAL(12,2),
  currency VARCHAR(3),
  payment_method VARCHAR(50),  -- 'stripe', 'paypal', 'buy_me_coffee'
  donated_at TIMESTAMP DEFAULT NOW(),
  thank_you_sent BOOLEAN DEFAULT false
);
```

---

### **4. Code Changes Required**

#### **Files to Modify**

**Backend:**
- ✅ `backend/services/googleDrive.service.js` (NEW - Google Drive API wrapper)
- ✅ `backend/controllers/auth.controller.js` (Add Google OAuth flow)
- ✅ `backend/controllers/files.controller.js` (Upload to Drive, not S3)
- ✅ `backend/controllers/donations.controller.js` (NEW - Handle donations)
- ❌ ~~`backend/controllers/subscriptions.controller.js`~~ (DELETE or archive)
- ❌ ~~`backend/services/stripe.js`~~ (DELETE or archive)
- ✅ `backend/prisma/schema.prisma` (Update User model)

**Mobile:**
- ✅ `mobile-main/src/screens/auth/LoginScreen.jsx` (Add "Connect Google Drive" step)
- ✅ `mobile-main/src/screens/auth/GoogleDriveConnectScreen.jsx` (NEW)
- ✅ `mobile-main/src/screens/account/MyAccountScreen.jsx` (Show Drive storage, donation button)
- ❌ ~~`mobile-main/src/screens/account/SubscriptionScreen.jsx`~~ (DELETE)

**Web Admin:**
- ❌ **Entire web-admin/ directory** - DELETE or archive?
  - No subscriptions = no web admin needed
  - OR repurpose as: "Admin Dashboard" for group management?

---

### **5. Google Drive API Limits**

**FREE Tier (Per User):**
- ✅ 15GB storage per Google account
- ✅ 1 billion API requests/day (shared across all apps)
- ✅ 1,000 requests per 100 seconds per user

**For Your App:**
- Each user stores in THEIR 15GB quota (not yours!)
- API requests count against YOUR project quota
- Typical usage: ~100-500 requests/day per active user
- With 100 users: 10,000-50,000 requests/day (well within limits)

**If You Hit Limits:**
- Upgrade Google Cloud Project to paid tier
- Cost: $0.012 per 1,000 requests over free tier
- Example: 10 million requests/month = $120

---

## 🚨 Critical Considerations

### **1. What Happens If User Disconnects Google?**

**Scenario**: User revokes app permission in Google account settings

**Impact**:
- ✅ Their messages still visible (text content in database)
- ❌ Their uploaded media becomes inaccessible
- ❌ Other users can't see photos they uploaded

**Solution Options:**

**Option A: Require Google Drive (Recommended)**
- Don't allow app usage without Google Drive connected
- On revoke: Lock account until reconnected
- Show warning: "Reconnect Google Drive to continue"

**Option B: Fallback to Limited Mode**
- Allow text-only messages
- Disable photo/file uploads
- Show banner: "Limited mode - Connect Google Drive for full features"

**Option C: Temporary S3 Cache (Expensive)**
- Cache recently uploaded files on S3 (7-30 days)
- If Google Drive unavailable, serve from cache
- After cache expiry, file lost
- ❌ This defeats the cost savings!

**Recommendation: Option A** - Require Google Drive connection

---

### **2. Privacy & User Concerns**

**"Why does this app need access to my Google Drive?"**

**Your Answer:**
```
Parenting Helper stores your uploaded photos and files in YOUR
Google Drive, not on our servers. This means:

✅ You own your data (it's in YOUR Google account)
✅ You can delete your data anytime
✅ No one else can see your personal Google Drive files
✅ We can keep the app 100% FREE (no storage costs!)

We only access:
- Files created by Parenting Helper (not your personal files)
- We never see your documents, photos, or other apps' data

Think of it like WhatsApp backup to Google Drive!
```

**Consent Screen (Google OAuth):**
- App Name: Parenting Helper
- Permissions: "See and manage files created by this app"
- User can revoke anytime

---

### **3. Compliance & Legal**

**GDPR (Europe):**
- ✅ User owns data (stored in their Drive)
- ✅ Right to erasure: User deletes Drive folder → data gone
- ✅ Data portability: User can download from their own Drive
- ✅ Transparent: Clear explanation of where data lives

**COPPA (Children's Privacy):**
- ⚠️ App involves children's data (calendars, photos)
- ✅ Parents control the Google accounts (not children)
- ✅ No ads, no tracking
- ✅ Clear privacy policy

**Terms of Service Updates:**
- Must disclose Google Drive storage model
- Explain what happens if Drive disconnected
- Liability disclaimer (data loss if user deletes)

---

### **4. Migration Plan (If You Have Existing Users)**

**If you already have paid users:**

1. **Announcement (30 days notice)**
   ```
   Big News! Parenting Helper is now 100% FREE!

   Changes:
   - No more subscriptions (your current plan will end 2025-12-31)
   - Media now stored in YOUR Google Drive (more privacy!)
   - Next time you open the app, you'll be asked to connect Google Drive

   Your data is safe:
   - All messages, calendar, finance data remains
   - We'll migrate your existing photos to Google Drive
   - If you don't want to continue, export your data before 2025-12-31
   ```

2. **Migration Script**
   ```javascript
   // For each user with uploaded media:
   async function migrateUserToGoogleDrive(userId) {
     // 1. Get all their S3 files
     const media = await prisma.messageMedia.findMany({
       where: { uploadedByUserId: userId }
     });

     // 2. Prompt user to connect Google Drive
     // (can't auto-migrate without consent!)

     // 3. Download from S3, upload to their Drive
     for (const file of media) {
       const s3File = await s3.getObject(file.s3Key);
       const driveFileId = await uploadToGoogleDrive(
         userId,
         s3File,
         file.fileName
       );

       // 4. Update database
       await prisma.messageMedia.update({
         where: { mediaId: file.mediaId },
         data: {
           googleDriveFileId: driveFileId,
           s3Key: null,  // Remove S3 reference
         },
       });
     }

     // 5. Delete from S3 (save money!)
     await deleteAllUserFilesFromS3(userId);
   }
   ```

3. **Refund Handling**
   - Pro-rate remaining subscription days
   - Stripe refund API
   - Or: Let subscription run until period end (no refund)

---

## 📋 Implementation Checklist

### **Phase 1: Planning & Setup (Week 1)**
- [x] Document architecture change (this file!)
- [ ] Create Google Cloud Project
- [ ] Enable Google Drive API
- [ ] Set up OAuth consent screen
- [ ] Get OAuth client credentials
- [ ] Update privacy policy
- [ ] Update terms of service

### **Phase 2: Backend Integration (Week 2-3)**
- [ ] Install Google Drive API library (`googleapis` npm package)
- [ ] Create `googleDrive.service.js` (upload, download, delete)
- [ ] Update auth controller (add Google OAuth flow)
- [ ] Update files controller (use Drive instead of S3)
- [ ] Add Google token refresh mechanism (tokens expire!)
- [ ] Update Prisma schema (add Google fields)
- [ ] Create migration script
- [ ] Test upload/download flows

### **Phase 3: Mobile UI (Week 4)**
- [ ] Create GoogleDriveConnectScreen
- [ ] Update LoginScreen (add Drive connection step)
- [ ] Update MyAccountScreen (show Drive storage, remove subscription UI)
- [ ] Add "Donate" button/screen
- [ ] Test user flows
- [ ] Handle Drive disconnection gracefully

### **Phase 4: Migration (Week 5-6)**
- [ ] Announce changes to existing users (if any)
- [ ] Build S3 → Google Drive migration script
- [ ] Test migration with test accounts
- [ ] Run migration for all users
- [ ] Verify all files accessible
- [ ] Delete S3 buckets (or archive)

### **Phase 5: Cleanup (Week 7)**
- [ ] Remove Stripe integration
- [ ] Archive/delete web-admin app
- [ ] Remove subscription database tables
- [ ] Update all documentation
- [ ] Update app store descriptions
- [ ] Remove "Premium" branding

### **Phase 6: Launch (Week 8)**
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather user feedback
- [ ] Adjust as needed

---

## 💡 Alternative: Hybrid Approach

**Don't want to go 100% Google Drive?**

Consider a **hybrid model:**

1. **Database**: Keep on your RDS (text data is tiny)
2. **Small files (<1MB)**: Keep on S3 (cheap, fast)
3. **Large files (>1MB)**: Google Drive (expensive otherwise)
4. **Log exports**: Google Drive (huge files)

**Cost**: Still saves ~$50-150/month, less complexity

---

## 🤔 Questions to Answer Before Implementing

### **Business Model:**
1. Are you committed to keeping this 100% free forever?
   - What if donations don't cover costs?
   - Backup plan?

2. How will you handle donations?
   - Stripe Checkout (easiest)
   - PayPal
   - Buy Me a Coffee
   - Patreon

3. What if users don't donate?
   - Are you okay paying $66-160/month out of pocket?
   - For how long?

### **Technical:**
4. What if Google Drive API goes down?
   - Fallback plan?
   - Show error message?

5. What if user hits 15GB limit in their Google Drive?
   - App stops working?
   - Show warning?
   - Prompt to delete old files?

6. Do you want to keep web-admin app?
   - Repurpose for analytics/admin tools?
   - Or delete entirely?

### **User Experience:**
7. Is requiring Google account acceptable?
   - Will you lose users who don't have/want Google?
   - Alternative: Microsoft OneDrive? Dropbox?

8. What about users who don't trust Google?
   - Privacy-conscious users
   - Corporate users (can't use personal Google)

---

## 🎯 Recommendation

### **If This Is Your First Launch (No Existing Users):**
✅ **DO IT!** This is the perfect time to change architecture.

**Benefits:**
- Much lower costs
- User owns their data (privacy!)
- No payment processing headaches
- Simpler codebase (remove Stripe, subscriptions)

### **If You Have Existing Paid Users:**
⚠️ **CAREFUL!** This is a major disruption.

**Considerations:**
- Need migration plan
- Need to handle refunds
- Risk losing users who don't want Google integration
- Need clear communication

---

## 📄 Documentation Updates Required

If you proceed, need to update:

1. **README.md** - Architecture section
2. **appplan.md** - Remove subscription features
3. **DECISIONS_SUMMARY.md** - Update business model
4. **API.md** - Remove subscription endpoints
5. **NEW_FEATURES_SPEC.md** - Remove storage limits
6. **NEXT_STEPS.md** - Add Google Drive migration tasks
7. **Privacy Policy** - Explain Google Drive usage
8. **Terms of Service** - Update liability clauses

---

## 💰 Long-Term Cost Projection

**Scenario: 1,000 active users (optimistic!)**

### **Old Model (Subscriptions)**
- Revenue: $8 × 200 paying admins = $1,600/month
- AWS Costs: ~$500-800/month
- **Net Profit**: $800-1,100/month 💰

### **New Model (Free + Donations)**
- Revenue: Donations (maybe $50-200/month?) 🤷
- Your Costs: ~$150-300/month
- **Net Loss**: $50-250/month out of pocket 😬

**At 1,000 users, you'll likely LOSE money without subscriptions.**

**Mitigation:**
- Keep costs ultra-low (optimize Lambda, downgrade RDS)
- Aggressive donation prompts
- Optional "Pro" features (contradicts free model?)
- Sponsorships/partnerships?

---

## 🚦 Decision Point

**Before proceeding, decide:**

1. ✅ **I'm committed to free forever, even if I lose money**
   → GO FOR IT! 🚀

2. ⚠️ **I want to try free first, but may add subscriptions later**
   → DON'T DO IT - Architecture change is massive, hard to reverse

3. ❌ **I need this to be profitable**
   → STICK WITH SUBSCRIPTIONS - The math doesn't work for free

---

**What do you think? Should we proceed with this architecture change?**

I can help implement it, but want to make sure you've thought through the implications! 🤔
