# Android Build Process

This document describes how to build and release the Family Helper Android app.

## Prerequisites

- Node.js v20+
- Expo CLI: `npm install -g eas-cli`
- Expo account logged in: `eas login`

## Build Steps

### 1. Bump Version Numbers

Update version in **two files**:

**app.json** (line 5):
```json
"version": "1.0.XX"
```

**android/app/build.gradle** (lines 95-96):
```gradle
versionCode XX        // Increment by 1 each release (Play Store requires unique)
versionName "1.0.XX"  // Display version
```

### 2. Commit and Push

```bash
git add app.json android/app/build.gradle
git commit -m "chore: Bump version to 1.0.XX (versionCode XX)"
git push
```

### 3. Run EAS Build

```bash
npx eas build --platform android --profile production
```

- Build takes ~10-15 minutes
- Free tier has a queue (can take longer)
- Build logs: https://expo.dev/accounts/zcarss/projects/family-helper/builds

### 4. Download AAB

Once complete, download the AAB file:
- From the terminal link provided, OR
- From Expo dashboard: https://expo.dev/accounts/zcarss/projects/family-helper/builds

Save to `releases/` folder:
```bash
curl -L -o releases/family-helper-v1.0.XX.aab "https://expo.dev/artifacts/eas/XXXXX.aab"
```

### 5. Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select Family Helper app
3. Go to Production > Create new release
4. Upload the AAB file
5. Add release notes
6. Submit for review

## Configuration Files

| File | Purpose |
|------|---------|
| `eas.json` | EAS Build configuration |
| `app.json` | Expo app configuration |
| `android/app/build.gradle` | Android-specific config (version, signing) |
| `google-services.json` | Firebase/FCM configuration (committed) |
| `.easignore` | Files to exclude from EAS builds |

## Firebase Cloud Messaging (FCM)

Push notifications require FCM configuration:

1. **google-services.json** - Already in repo at:
   - `mobile-main/google-services.json`
   - `mobile-main/android/app/google-services.json`

2. **Firebase Service Account** - Uploaded to Expo:
   - Expo Dashboard > Credentials > Android > Service Account Key
   - Generate from Firebase Console > Project Settings > Service Accounts

## Signing Keys

Signing is managed by EAS:
- Keystore stored securely on Expo servers
- Credentials: https://expo.dev/accounts/zcarss/projects/family-helper/credentials

## Troubleshooting

### Build fails with "google-services.json missing"
- Ensure file exists at `android/app/google-services.json`
- Ensure NOT in `.gitignore`
- Commit and push before building

### Push notifications not working
1. Verify device token registered (check backend logs)
2. Verify Firebase service account uploaded to Expo
3. Test with: `POST /notifications/test` endpoint

### Version code already used
- Play Store requires unique versionCode for each upload
- Always increment versionCode in build.gradle

## Version History

| Version | versionCode | Date | Notes |
|---------|-------------|------|-------|
| 1.0.78 | 24 | Dec 27, 2024 | FCM push notifications |
| 1.0.77 | 23 | Dec 27, 2024 | FCM configuration added |
| 1.0.76 | 22 | Dec 23, 2024 | Login flow improvements |
