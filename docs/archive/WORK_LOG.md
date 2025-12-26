# Work Log

## December 23, 2024

### Android Login Flow & UX Improvements (v1.0.74, versionCode 20)

**Issues Fixed:**

#### 1. Browser Closing During Kinde Email Verification

**Symptom:** When user enters email in Kinde login and switches to email app to get verification code, the browser window closes. User cannot complete login.

**Root Cause:** expo-auth-session uses Chrome Custom Tabs which close when the app is backgrounded.

**Solution:** Complete rewrite of LoginScreen.jsx to use system browser via `Linking.openURL()` instead of Custom Tabs.

**Files Changed:**
- `mobile-main/src/screens/auth/LoginScreen.jsx` - Complete rewrite
  - Uses `Linking.openURL()` for OAuth flow
  - Manual PKCE implementation (code verifier, code challenge)
  - Listens for deep link callbacks via `Linking.addEventListener()`
  - System browser stays open when app is backgrounded

- `mobile-main/android/app/src/main/java/com/familyhelper/app/LaunchActivity.kt` - NEW
  - Entry point activity that manages activity lifecycle
  - Prevents duplicate MainActivity instances

- `mobile-main/android/app/src/main/java/com/familyhelper/app/MainActivity.kt`
  - Changed launchMode from singleTask to standard
  - Added activity stack tracking
  - Added edge-to-edge disable code

- `mobile-main/android/app/src/main/java/com/familyhelper/app/MainApplication.kt`
  - Added activity stack tracking methods (addActivityToStack, removeActivityFromStack, isActivityInBackStack)

- `mobile-main/android/app/src/main/AndroidManifest.xml`
  - LaunchActivity as MAIN/LAUNCHER
  - MainActivity handles deep links only

**Reference:** Stargazer wallet fix - https://github.com/StardustCollective/stargazer-wallet-ext/commit/a0cdb76

---

#### 2. Navigation Bar Overlap (Android SDK 35+)

**Symptom:** Content was rendering behind the Android navigation bar.

**Solution:**
- Disabled edge-to-edge mode programmatically in MainActivity.kt
- Added SafeAreaProvider wrapper in App.js
- Updated CustomNavigationHeader to use useSafeAreaInsets hook

**Files Changed:**
- `mobile-main/android/app/src/main/java/com/familyhelper/app/MainActivity.kt`
  - `WindowCompat.setDecorFitsSystemWindows(window, true)`
  - Set navigation bar color to white
  - Set light navigation bar icons

- `mobile-main/App.js`
  - Added SafeAreaProvider wrapper around entire app

- `mobile-main/src/components/CustomNavigationHeader.jsx`
  - Now uses `useSafeAreaInsets()` hook
  - Removed manual STATUS_BAR_HEIGHT calculation

---

#### 3. Token Error Handling & Auto-Retry

**Symptom:** Users saw scary red error messages about "authorization grant invalid/expired/revoked" when reopening the app.

**Solution:**
- Auto-retry on token errors (4 retries = 5 total attempts)
- User only sees loading screen during retries
- After max retries, show support-friendly error with error code and timestamp

**Files Changed:**
- `mobile-main/src/screens/auth/LoginScreen.jsx`
  - Added `isTokenError()` function to detect auth errors
  - Added `MAX_AUTO_RETRIES = 4`
  - Auto-retry silently shows "Refreshing session..." instead of error
  - Final error: "Unable to complete login after multiple attempts. Error Code: AUTH-XXXXX, Time: YYYY-MM-DD HH:MM:SS"

---

#### 4. Skip Login for Valid Sessions

**Symptom:** App was clearing tokens on every startup, forcing users to login even when their session was still valid. This caused unnecessary login screens and errors.

**Solution:** Validate existing tokens on startup instead of clearing them.

**Files Changed:**
- `mobile-main/App.js` - Updated `checkAuthStatus()`:
  - Check if token exists in SecureStore
  - If exists, validate by calling `api.get('/auth/me')`
  - If valid → go straight to Groups (no login needed)
  - If invalid → clear tokens and show login

**New Flow for Returning Users:**
```
Before: Splash → Login flow → Browser → Errors → Groups
After:  Splash → Groups (if token valid)
```

---

#### 5. Updated App Icons

**Issue:** App launcher icons were too large, getting cropped on Android adaptive icon masks.

**Solution:** Updated icons with proper padding (icon at ~1/9 of canvas size).

**Files Changed:**
- `mobile-main/assets/icon.png`
- `mobile-main/assets/adaptive-icon.png`
- All mipmap icons regenerated via `npx expo prebuild`

---

### Kinde Token Settings Recommendation

For 30-day sessions, update Kinde dashboard:
- ID token: 3,600 seconds (1 hour) - keep as is
- Access token: 86,400 seconds (1 day) - keep as is
- Refresh token: 2,592,000 seconds (30 days) - change from 15 days

---

## December 13, 2024

### AWS Cleanup - Old Project Resources Deleted

**Context:** User requested review and cleanup of AWS resources to reduce costs and remove unused resources from old projects.

**Resources Deleted:**

#### S3 Buckets (25 total)
All non-Family Helper buckets were deleted:

1. `aws-sam-cli-managed-default-samclisourcebucket-bq87ca08br21` (versioned bucket)
2. `cf-templates-od1244c63r93-ap-southeast-2`
3. `custom-mannequin-dev-distbucket-ykmp77zgz7t9`
4. `custom-mannequin-dev-serverlessdeploymentbucket-4v29bneox4c7`
5. `custom-mannequin-prod-serverlessdeploymentbucket-rthjxjn7wv3e`
6. `custom-mannequin-producti-serverlessdeploymentbuck-6oljoglmm13p`
7. `game1-02-dev-serverlessdeploymentbucket-cub6nejs6z6i`
8. `game1-02-dev-serverlessdeploymentbucket-lpovjw3xc9jp`
9. `game1-dev-distbucket-bxqschnuvgcs`
10. `game1-dev-distbucket-cjtaigjqwme8`
11. `game1-dev-serverlessdeploymentbucket-lywjl2qfc5v0`
12. `game1-dev-serverlessdeploymentbucket-tmhywoefarcg`
13. `iamusernotify`
14. `internalskillsearch-dev-distbucket-nvdcjzxnukgf`
15. `internalskillsearch-dev-serverlessdeploymentbucket-etrjk5d24l7m`
16. `rosterhelperserverless-d-serverlessdeploymentbuck-eibmuk6kc2fz`
17. `rosterhelperserverless-dev-distbucket-1qibg6gymgza1`
18. `serverless-custom-manneq-serverlessdeploymentbuck-bnu8cav6n6hz`
19. `serverless-custom-mannequin-dev-distbucket-h3z2bwaed5w7`
20. `serverless-custom-manniquin-dev-distbucket-1ktpqp6vkfnde`
21. `serverless-portfolio-dev-distbucket-7iebujnzoka9`
22. `serverless-portfolio-dev-serverlessdeploymentbuck-lbv1pey9lsjd`
23. `serverlessreactboilerplat-serverlessdeploymentbuck-sl5brotv9wna`
24. `ssa-dev-distbucket-nwavsfzrvicz`
25. `ssa-dev-serverlessdeploymentbucket-cyjhvzyu6xch`

#### CloudFront Distribution (1)
- `E1FANZJFDUQV1` (d2o5ja8q1b1ri4.cloudfront.net)
  - Domain alias: custommannequin.com
  - Origin: f25i7f8kq1.execute-api.ap-southeast-2.amazonaws.com/dev (deleted API Gateway)
  - Status: Had to disable first, wait for deployment, then delete

**Commands Used:**
```bash
# Delete regular S3 buckets
aws s3 rb s3://bucket-name --force

# Delete versioned bucket (required special handling)
aws s3api list-object-versions --bucket bucket-name --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text | while read key versionId; do
  aws s3api delete-object --bucket bucket-name --key "$key" --version-id "$versionId"
done
# Also delete DeleteMarkers, then delete bucket

# Delete CloudFront (must disable first)
aws cloudfront get-distribution-config --id E1FANZJFDUQV1 > config.json
# Modify config to set Enabled: false
aws cloudfront update-distribution --id E1FANZJFDUQV1 --distribution-config file://config-disabled.json --if-match ETAG
# Wait for Status: Deployed
aws cloudfront delete-distribution --id E1FANZJFDUQV1 --if-match NEW_ETAG
```

**Remaining AWS Resources (Family Helper only):**
| Resource | Name/ID |
|----------|---------|
| S3 | family-helper-files-prod, family-helper-web-prod |
| CloudFront | EOFB5YCW926IM (familyhelperapp.com) |
| Lightsail | family-helper-prod (52.65.37.116) |
| EC2 | family-helper-bastion (i-085ac3030ad9e712c) |
| RDS | family-helper-db-prod |
| Lambda | family-helper-media-processor-prod |

**Monthly Cost Estimate:** ~$50-70/month (no change - deleted resources were already inactive)

**Documentation Updated:** `infrastructure/AWS_RESOURCES.md`

---

### Bug Fixes - Registry Passcode Reset & Emoji Picker

**Bug 1: Gift Registry Reset Passcode 404 Error**

**Symptom:** Error when clicking "Reset Passcode" on gift registry:
```
POST /users/personal-registries/gift-registries/:id/reset-passcode 404 (Not Found)
```

**Root Cause:** HTTP method mismatch:
- Frontend was using `api.post()`
- Backend route expected `PUT`

**Files Fixed:**
1. `mobile-main/src/screens/account/PersonalGiftRegistryDetailScreen.jsx` (line 129)
   - Changed `api.post()` to `api.put()`
2. `mobile-main/src/screens/account/PersonalItemRegistryDetailScreen.jsx` (line 129)
   - Changed `api.post()` to `api.put()`

**Additional Fix - Missing Group Item Registry Endpoint:**
The group-level item registry was missing the reset-passcode endpoint entirely.

3. `backend/controllers/itemRegistry.controller.js`
   - Added `resetPasscode()` function (lines 1462-1561)
4. `backend/routes/itemRegistry.routes.js`
   - Added POST route for `/:registryId/reset-passcode` (lines 69-74)

---

**Bug 2: Reaction Search Box Disappearing**

**Symptom:** When clicking inside the emoji picker search box on web, the modal closes.

**Root Cause:** Click events were propagating through the emoji picker container to the parent TouchableOpacity overlay, triggering the close handler.

**Fix:** Wrapped the emoji picker container in a `Pressable` component with `onPress={(e) => e.stopPropagation()}` to prevent event bubbling.

**File Fixed:** `mobile-main/src/screens/groups/MessagesScreen.jsx`
- Lines 1429-1442: Message input emoji picker
- Lines 1461-1474: Reaction emoji picker

**Changes:**
```jsx
// Before (View doesn't stop propagation)
<View style={styles.webEmojiPickerContainer}>
  <WebEmojiPicker ... />
</View>

// After (Pressable stops propagation)
<Pressable
  style={styles.webEmojiPickerContainer}
  onPress={(e) => e.stopPropagation()}
>
  <WebEmojiPicker ... />
</Pressable>
```

---
