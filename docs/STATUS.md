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
| Issue | Description | Status |
|-------|-------------|--------|
| Auth token refresh | Browser popup every ~15 min on mobile due to short JWT expiry | Branch: `fix/token-refresh-auth` - partial fix |
| Auth architecture | Need to migrate from custom JWT to Kinde tokens directly | Not started - see `docs/ARCHITECTURE.md` |

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
| `fix/token-refresh-auth` | Store refresh tokens properly | Ready for testing |
| `fix/android-custom-alert-modal` | Fix role change popup on Android | Ready for testing |

## What's Next

1. **Fix auth token refresh** - Migrate to Kinde tokens (Phase 2 in oauth2-proxy docs)
2. **Complete documentation overhaul** - This is in progress

---

**Note:** Keep this file concise. Move completed items to archive, not here.
