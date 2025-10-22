# Known Bugs - Admin Web App

This file tracks known bugs and UI/UX issues in the web admin app.

---

## UI/UX Issues (Low Priority)

### Subscription Page - Chip Overlap

**Status:** Known Issue (Not Urgent)
**Reported:** 2025-10-21
**Location:** `web-admin/src/pages/Subscription.jsx`
**Priority:** Low (cosmetic)

**Description:**
The "Required for Admin" blue chip/pill overlaps with the "Admin Subscription" heading text on the subscription pricing card.

**Current Behavior:**
- Chip positioned absolutely at `top: 16, right: 16`
- Heading text starts at top-left
- On smaller screens or longer headings, the chip overlaps the text

**Expected Behavior:**
- Chip should not overlap with heading text
- Either adjust chip position, heading width, or layout

**Workaround:**
None needed - still functional, just cosmetic.

**Fix Ideas:**
1. Move chip below the heading instead of absolute positioning
2. Add padding-right to heading to reserve space for chip
3. Use a flex layout instead of absolute positioning
4. Move chip to a different position (top-left, below heading, etc.)

**References:**
- File: `web-admin/src/pages/Subscription.jsx:153-158`
- Component: Admin Subscription Card

---

## Completed Fixes

_(No fixes yet - this is the first bug report)_
