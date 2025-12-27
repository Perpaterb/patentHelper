# Android Build Process

## ⚠️ CRITICAL: Version Numbers

**EVERY build requires incrementing version numbers. Play Store rejects duplicate versionCodes.**

### Current Version (update after each release):
```
versionCode: 25
versionName: 1.0.79
```

### Next Build Must Use:
```
versionCode: 26
versionName: 1.0.80
```

---

## Build Steps

### Step 1: BUMP VERSION (MANDATORY)

**Before ANY build, update these two files:**

**android/app/build.gradle** (lines 95-96):
```gradle
versionCode 25        // INCREMENT THIS (was 24)
versionName "1.0.79"  // INCREMENT THIS (was 1.0.78)
```

**app.json** (line 5):
```json
"version": "1.0.79"   // MUST MATCH versionName
```

### Step 2: Commit Version Bump

```bash
cd mobile-main
git add app.json android/app/build.gradle
git commit -m "chore: Bump version to 1.0.79 (versionCode 25)"
git push
```

### Step 3: Build (Choose One)

#### Option A: Local Build (Recommended - Fast, ~5 min)

```bash
cd mobile-main/android
KEYSTORE_PASSWORD='NFWFurn6N82k19ymlZQDB3AQp9web0Ai' KEY_PASSWORD='NFWFurn6N82k19ymlZQDB3AQp9web0Ai' ./gradlew bundleRelease
```

AAB output: `android/app/build/outputs/bundle/release/app-release.aab`

Copy to releases:
```bash
cp android/app/build/outputs/bundle/release/app-release.aab releases/family-helper-v1.0.XX.aab
```

#### Option B: EAS Build (Cloud - Slower, ~15-30 min)

```bash
cd mobile-main
npx eas build --platform android --profile production
```

- Has queue wait time (free tier)
- Build logs: https://expo.dev/accounts/zcarss/projects/family-helper/builds
- Download AAB from link shown when complete

### Step 4: Update This File

**After successful build, update the "Current Version" section at the top of this file!**

### Step 5: Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select Family Helper > Production > Create new release
3. Upload the AAB file
4. Add release notes
5. Submit for review

---

## Prerequisites

- Node.js v20+
- EAS CLI: `npm install -g eas-cli`
- Logged in: `eas login`

## Configuration Files

| File | Purpose |
|------|---------|
| `eas.json` | EAS Build configuration |
| `app.json` | Expo app config (version here) |
| `android/app/build.gradle` | Android config (versionCode here) |
| `google-services.json` | Firebase/FCM (committed to repo) |

## Troubleshooting

### "Version code already used"
You forgot to increment versionCode. Check current version at top of this file.

### "google-services.json missing"
Ensure file exists at `android/app/google-services.json` and is committed.

### Push notifications not working
1. Check device token registered (backend logs)
2. Verify Firebase service account uploaded to Expo
3. Test: `POST /notifications/test`

---

## Version History

| Version | Code | Date | Notes |
|---------|------|------|-------|
| 1.0.79 | 25 | Dec 27, 2024 | Calendar date fix, notification reminders |
| 1.0.78 | 24 | Dec 27, 2024 | Calendar reminders, FCM push |
| 1.0.77 | 23 | Dec 27, 2024 | FCM configuration |
| 1.0.76 | 22 | Dec 23, 2024 | Login flow improvements |
