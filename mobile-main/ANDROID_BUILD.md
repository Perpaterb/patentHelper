# Android Build & Deployment Guide

## Overview

This document covers the Android build process for the Family Helper mobile app, including local builds, signing, and Google Play deployment.

## Prerequisites

### Android SDK (Ubuntu/WSL)

The Android SDK is installed at `~/android-sdk`. Environment variables are set in `~/.bashrc`:

```bash
# Android SDK
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

Installed components:
- platform-tools
- platforms;android-34
- build-tools;34.0.0

### Signing Keystore

**Location**: `mobile-main/android/app/keystores/release.keystore`

| Property | Value |
|----------|-------|
| Alias | familyhelper |
| Validity | 10000 days (~27 years) |
| Algorithm | RSA 2048-bit |
| Owner | CN=Andrew Strange, O=Family Helper, L=Sydney, ST=New South Wales, C=AU |

**CRITICAL**: The keystore and password are backed up separately. If lost, you CANNOT update the app on Google Play - you would need to publish a new app with a different package name.

## Environment Configuration

### Production Build (.env)

Before building for release, ensure `.env` has production values:

```env
# Mobile Main - Production Environment
EXPO_PUBLIC_API_URL=https://familyhelperapp.com
EXPO_PUBLIC_KINDE_DOMAIN=familyhelperapp.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=bfbf86777e654654b374cf92f5719c74
EXPO_PUBLIC_KINDE_REDIRECT_URI=familyhelper://callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI=familyhelper://
EXPO_PUBLIC_WEB_URL=https://familyhelperapp.com
```

### Development (.env.dev.backup)

After building, restore dev environment:

```bash
cp .env.dev.backup .env
```

## Building a Release APK

### Step 1: Switch to Production Environment

```bash
cd mobile-main

# Backup current dev env if needed
cp .env .env.dev.backup

# Set production values in .env
cat > .env << 'EOF'
EXPO_PUBLIC_API_URL=https://familyhelperapp.com
EXPO_PUBLIC_KINDE_DOMAIN=familyhelperapp.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=bfbf86777e654654b374cf92f5719c74
EXPO_PUBLIC_KINDE_REDIRECT_URI=familyhelper://callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI=familyhelper://
EXPO_PUBLIC_WEB_URL=https://familyhelperapp.com
EOF
```

### Step 2: Update Version Numbers

Edit `android/app/build.gradle`:

```groovy
defaultConfig {
    applicationId 'com.familyhelper.app'
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2        // Increment for EVERY release (Google Play requires this)
    versionName "1.1.0"  // Semantic version shown to users
}
```

**Version Rules:**
- `versionCode`: Integer that MUST increase with every upload to Google Play
- `versionName`: User-facing version string (e.g., "1.0.0", "1.1.0", "2.0.0")

### Step 3: Build Signed APK

```bash
cd mobile-main

# Set keystore passwords (get from secure backup)
export KEYSTORE_PASSWORD="your-keystore-password"
export KEY_PASSWORD="your-keystore-password"

# Run prebuild to generate native code
npx expo prebuild --platform android

# Build signed release APK
cd android
./gradlew assembleRelease
```

Build takes 10-20 minutes depending on your machine.

### Step 4: Locate and Verify APK

```bash
# APK location
ls -la app/build/outputs/apk/release/app-release.apk

# Verify signature
~/android-sdk/build-tools/34.0.0/apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

### Step 5: Copy to Releases Folder

```bash
cp app/build/outputs/apk/release/app-release.apk ../releases/family-helper-v1.1.0.apk
```

### Step 6: Restore Dev Environment

```bash
cd ..
cp .env.dev.backup .env
```

## Version History

| Version | versionCode | Date | Notes |
|---------|-------------|------|-------|
| 1.0.0 | 1 | 2024-12-12 | Initial release |

## Google Play Deployment

### First-Time Setup

1. Create Google Play Developer Account ($25): https://play.google.com/console/signup
2. Create new app in Play Console
3. Fill out store listing:
   - App name: "Family Helper"
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - Screenshots (phone, tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)
4. Complete content rating questionnaire
5. Set up pricing (Free)
6. Add privacy policy URL

### Uploading Updates

1. Go to Play Console > Your App > Release > Production
2. Create new release
3. Upload APK
4. Add release notes
5. Review and roll out

### Release Tracks

- **Internal testing**: Up to 100 testers, instant availability
- **Closed testing**: Invite-only, review not required
- **Open testing**: Anyone can join, review required
- **Production**: Public release, full review

## Forced Updates

The app supports forced updates via the backend API. See `FORCED_UPDATES.md` for implementation details.

When you release version 1.1.0 with breaking changes:
1. Update `minimumVersion` in backend config
2. Users on older versions will see update prompt and cannot continue until they update

## Troubleshooting

### Build Fails with Signing Error

Ensure environment variables are set:
```bash
export KEYSTORE_PASSWORD="your-password"
export KEY_PASSWORD="your-password"
```

### APK Too Large

The APK includes native libraries for all architectures (~150MB). To reduce size:
- Use Android App Bundle (AAB) instead of APK for Play Store
- AAB is automatically optimized per device

### Build AAB Instead of APK

```bash
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

Google Play prefers AAB format as it optimizes download size per device.
