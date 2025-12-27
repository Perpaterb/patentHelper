# Project Status

**Last Updated:** 2024-12-26

## Overview

Family Helper is a **working production app** with 2 products live (1 future):
- **Web Admin** (familyhelperapp.com) - React web app (includes all mobile-main screens)
- **Family Helper Mobile** (mobile-main) - React Native (Android/iOS)
- **FH Messenger** (mobile-messenger) - NOT IN MVP1 - Future messaging-only app

## Current State: Production Live

The app is deployed and functional. Users can:
- Create/manage family groups
- Send messages with read receipts
- Manage calendars and events
- Track finances
- Create gift/item registries
- Run Secret Santa events
- Make phone/video calls with recording

## Known Issues

### High Priority
None currently tracked.

### Medium Priority
| Issue | Description | Status |
|-------|-------------|--------|
| Android role popup | CustomAlert only shows 3 buttons on Android | Branch: `fix/android-custom-alert-modal` |

### Low Priority
None currently tracked.

## Active Branches

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production | Stable |
| `feature/phase2-kinde-token-auth` | Phase 2: Use Kinde tokens directly | Ready for testing |
| `fix/android-custom-alert-modal` | Fix role change popup on Android | Ready for testing |

## Recently Completed

- **Auth Phase 2 Migration** - Mobile/web now use Kinde tokens directly (no custom JWT)
- **Documentation Overhaul** - Clean structure in `/docs/`

## What's Next

1. **Test Phase 2 auth** - Verify token refresh works without browser popups
2. **Merge Phase 2 to main** - After testing confirmed

## Future Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Web Push Notifications | Add browser push notifications for web-admin (requires Service Worker, VAPID keys, Web Push API) | Medium |

---

**Note:** Keep this file concise. Move completed items to archive, not here.
