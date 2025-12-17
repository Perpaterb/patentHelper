# Forced App Updates

## Overview

The Family Helper app includes a mechanism to force users to update when critical updates are released. This ensures all users are on a minimum required version before they can use the app.

## How It Works

1. **On App Launch**: The app calls `GET /health/app-version?app=mobile-main`
2. **Server Returns**: Minimum required version and store URLs
3. **Version Comparison**: App compares its version against `minVersion`
4. **If Update Required**: A non-dismissible modal blocks app usage with "Update Now" button

### Version Comparison Logic

```javascript
// Version: MAJOR.MINOR.PATCH
// 1.0.0 vs 1.0.9 - Patch update (optional)
// 1.0.9 vs 1.1.0 - Minor update (can be forced)
// 1.0.0 vs 2.0.0 - Major update (can be forced)

// User on 1.0.9, Server requires 1.1.0
// 1.0.9 < 1.1.0 = TRUE -> Force update
```

## Forcing an Update

When you release version 1.1.0 and want to force all users on 1.0.x to update:

### Step 1: Update Backend Environment Variables

On AWS Lambda (production):

```bash
# Set minimum required version to 1.1.0
MIN_VERSION_MOBILE_MAIN=1.1.0

# Optionally update current version (latest available)
CURRENT_VERSION_MOBILE_MAIN=1.1.0
```

Or via AWS Console:
1. Go to Lambda → family-helper-api-prod → Configuration → Environment variables
2. Update `MIN_VERSION_MOBILE_MAIN` to `1.1.0`
3. Click Save

### Step 2: Deploy Backend (if needed)

If adding the env var for the first time:
```bash
cd backend
./scripts/build-lambda.sh
~/.local/bin/aws s3 cp lambda.zip s3://family-helper-files-prod/lambda/lambda.zip
~/.local/bin/aws lambda update-function-code --function-name family-helper-api-prod --s3-bucket family-helper-files-prod --s3-key lambda/lambda.zip
```

### Step 3: Verify

```bash
curl https://familyhelperapp.com/health/app-version?app=mobile-main
```

Expected response:
```json
{
  "minVersion": "1.1.0",
  "currentVersion": "1.1.0",
  "updateUrl": {
    "ios": "https://apps.apple.com/app/family-helper/id000000000",
    "android": "https://play.google.com/store/apps/details?id=com.familyhelper.app"
  }
}
```

## What Users See

When a user opens the app with version 1.0.9 and minVersion is 1.1.0:

```
+----------------------------------+
|                                  |
|             [↑]                  |
|                                  |
|       Update Required            |
|                                  |
|  A new version of the app is     |
|  available. Please update to     |
|  continue using the app.         |
|                                  |
|  Your version: 1.0.9             |
|  Required version: 1.1.0         |
|                                  |
|       [ Update Now ]             |
|                                  |
+----------------------------------+
```

- Modal is **non-dismissible** - user cannot close it
- "Update Now" opens the Google Play Store / App Store
- User cannot use the app until they update

## Mobile App Version Management

### Files to Update When Releasing New Version

1. **`mobile-main/src/config/config.js`** - App's internal version
   ```javascript
   export const APP_CONFIG = {
     VERSION: '1.1.0',  // Update this
   };
   ```

2. **`mobile-main/android/app/build.gradle`** - Android build version
   ```groovy
   defaultConfig {
     versionCode 2        // Must increment for EVERY Play Store upload
     versionName "1.1.0"  // User-visible version
   }
   ```

3. **`mobile-main/app.json`** (if using Expo config)
   ```json
   {
     "expo": {
       "version": "1.1.0"
     }
   }
   ```

### Version Consistency

**IMPORTANT**: All three version locations must match:
- `config.js` VERSION = `build.gradle` versionName = `app.json` version

## Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MIN_VERSION_MOBILE_MAIN` | Minimum required version for mobile-main | 1.0.0 |
| `MIN_VERSION_MOBILE_MESSENGER` | Minimum required version for mobile-messenger | 1.0.0 |
| `CURRENT_VERSION_MOBILE_MAIN` | Latest available version | 1.0.0 |
| `CURRENT_VERSION_MOBILE_MESSENGER` | Latest available version | 1.0.0 |
| `APP_STORE_URL_MAIN_ANDROID` | Play Store URL | (default placeholder) |
| `APP_STORE_URL_MAIN_IOS` | App Store URL | (default placeholder) |

## Typical Update Workflow

### Scenario: Release 1.1.0 with breaking API changes

1. **Develop and test version 1.1.0**
2. **Build APK/AAB**
   ```bash
   cd mobile-main
   # Update version numbers in all 3 files (config.js, build.gradle, app.json)
   # Switch to production .env
   cd android && ./gradlew bundleRelease
   ```
3. **Upload to Play Store**
   - Create new release in Play Console
   - Upload AAB
   - Submit for review
4. **Wait for approval** (usually 1-7 days for first release)
5. **After app is live in store, force update:**
   ```bash
   # Update Lambda env var
   MIN_VERSION_MOBILE_MAIN=1.1.0
   ```

### Scenario: Hotfix 1.0.1 (optional update)

1. Build and upload 1.0.1 to Play Store
2. **Do NOT change MIN_VERSION_MOBILE_MAIN**
3. Users will see "Update available" in store but won't be forced

## Implementation Files

| File | Purpose |
|------|---------|
| `backend/routes/health.routes.js` | `/health/app-version` endpoint |
| `mobile-main/src/hooks/useVersionCheck.js` | Version check hook |
| `mobile-main/src/components/ForceUpdateModal.jsx` | Update modal UI |
| `mobile-main/App.js` | Version check integration |
| `mobile-main/src/config/config.js` | APP_CONFIG.VERSION |

## Troubleshooting

### Modal not showing when it should

1. Check app version in `config.js`
2. Check API response: `curl https://familyhelperapp.com/health/app-version`
3. Verify version comparison logic in `useVersionCheck.js`

### Modal showing when it shouldn't

1. Verify MIN_VERSION_MOBILE_MAIN is correct
2. Check if app version is less than minVersion
3. Clear app cache and restart

### "Update Now" not opening store

1. Check Play Store URL is correct in Lambda env vars
2. Verify URL format: `https://play.google.com/store/apps/details?id=com.familyhelper.app`
3. On emulator, Play Store may not be available
