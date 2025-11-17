# Kris Kringle (Secret Santa) Feature - Implementation Notes

**Last Updated:** 2025-11-17
**Status:** ✅ BACKEND COMPLETE | ❌ MOBILE APP NOT STARTED

---

## 📋 Overview

The Kris Kringle (Secret Santa) feature allows groups to organize gift exchanges with automated matching, exclusion rules, wish lists, and integration with gift registries.

**Key Features:**
- Secret Santa matching algorithm with exclusion rules
- External participant invitations (non-group members)
- Wish list creation and viewing
- Integration with Gift Registry feature
- Email notifications for matches
- Reveal date and exchange date scheduling
- Price limit suggestions

---

## ✅ What's Already Implemented (Backend)

### Backend Controller
**File:** `backend/controllers/krisKringle.controller.js` (678 lines)

**Endpoints Implemented:**
1. ✅ `GET /groups/:groupId/kris-kringle` - List all events
2. ✅ `POST /groups/:groupId/kris-kringle` - Create new event
3. ✅ `GET /groups/:groupId/kris-kringle/:krisKringleId` - Get event details
4. ✅ `POST /groups/:groupId/kris-kringle/:krisKringleId/draw` - Generate matches
5. ✅ `GET /groups/:groupId/kris-kringle/:krisKringleId/my-match` - Get user's match
6. ✅ `PUT /groups/:groupId/kris-kringle/:krisKringleId` - Update event
7. ✅ `DELETE /groups/:groupId/kris-kringle/:krisKringleId` - Delete/hide event

**Algorithm Features:**
- Fisher-Yates shuffle for randomization
- Derangement generation (no one draws themselves)
- Exclusion rule enforcement (e.g., spouses can't draw each other)
- Up to 1000 attempts to find valid matching
- Returns null if matching impossible with given constraints

### Database Schema
**File:** `backend/prisma/schema.prisma`

**Tables:**
1. **`kris_kringles`** - Main event table
   - `kris_kringle_id` (UUID, PK)
   - `group_id` (UUID, FK to groups)
   - `name` (VARCHAR 255)
   - `description` (TEXT, optional)
   - `price_limit` (DECIMAL 12,2, optional)
   - `reveal_date` (TIMESTAMP, optional)
   - `exchange_date` (TIMESTAMP, optional)
   - `created_by` (UUID, FK to group_members)
   - `status` (VARCHAR 20, default: 'draft')
     - States: `draft`, `active`, `revealed`, `completed`
   - `is_hidden` (BOOLEAN, default: false)

2. **`kris_kringle_participants`** - Participants in event
   - `participant_id` (UUID, PK)
   - `kris_kringle_id` (UUID, FK)
   - `group_member_id` (UUID, FK to group_members, nullable)
   - `email` (VARCHAR 255, nullable)
   - `name` (VARCHAR 255)
   - `has_joined` (BOOLEAN, default: false)
   - `wish_list_id` (UUID, FK to wish_lists, nullable)
   - `joined_at` (TIMESTAMP, nullable)

3. **`kris_kringle_matches`** - Secret Santa assignments
   - `match_id` (UUID, PK)
   - `kris_kringle_id` (UUID, FK)
   - `giver_id` (UUID, FK to kris_kringle_participants)
   - `receiver_id` (UUID, FK to kris_kringle_participants)
   - `created_at` (TIMESTAMP)

4. **`kris_kringle_exclusions`** - Pairs who can't draw each other
   - `exclusion_id` (UUID, PK)
   - `kris_kringle_id` (UUID, FK)
   - `participant1_id` (UUID, FK to kris_kringle_participants)
   - `participant2_id` (UUID, FK to kris_kringle_participants)

### API Routes
**File:** `backend/routes/krisKringle.routes.js`

All routes are mounted under `/groups/:groupId/kris-kringle` with authentication required.

---

## ❌ What's NOT Implemented (Mobile App)

### Missing Screens
**Location:** `mobile-main/src/screens/groups/` (should be here, but don't exist)

**Screens Needed:**
1. ❌ **KrisKringleListScreen** - List all events for a group
2. ❌ **CreateKrisKringleScreen** - Create new event
3. ❌ **KrisKringleDetailScreen** - View event details
4. ❌ **ParticipantSelectionScreen** - Select/invite participants
5. ❌ **ExclusionRulesScreen** - Add exclusion pairs
6. ❌ **MyMatchScreen** - View who you're giving to
7. ❌ **WishListScreen** - Create/view wish lists

### Missing Navigation
**File:** `mobile-main/src/navigation/`

The Kris Kringle section needs to be added to group navigation flow:

```
Group Dashboard
    └── Kris Kringle Button
           ↓
        Kris Kringle Events List
           ↓
        Individual Event Detail
           ├── Edit Event (creator/admins)
           ├── View Participants
           ├── Add Exclusions (before draw)
           ├── Draw Names (admins only)
           └── My Match (after draw)
```

### Missing Components
**Location:** `mobile-main/src/components/` (should be here)

**Components Needed:**
1. ❌ **ParticipantCard** - Display participant with status
2. ❌ **ExclusionPairItem** - Display exclusion rule
3. ❌ **MatchRevealCard** - Animated reveal of match
4. ❌ **WishListItem** - Display wish list item
5. ❌ **DatePicker** - Select reveal/exchange dates

---

## 🎯 Feature Requirements (from appplan.md)

### Core Functionality

**Event Creation:**
- Name (required, e.g., "Smith Family Christmas 2024")
- Description (optional, e.g., "Annual Christmas gift exchange")
- Price limit (optional, e.g., $50)
- Reveal date (optional, when matches are revealed)
- Exchange date (optional, when gifts are exchanged)
- Participants (minimum 3)
  - Group members (select from list)
  - External emails (invite non-members)
- Exclusion rules (optional, e.g., spouses)

**Drawing Names:**
- Admin-only action (creator or group admins)
- Status changes: `draft` → `active`
- Algorithm generates matches
- Emails sent to all participants
- Cannot be undone (create new event instead)

**Viewing Match:**
- Each participant can see WHO they're buying for
- Cannot see WHO is buying for them
- Can view recipient's wish list
- Can view recipient's gift registry (if linked)

**Wish Lists:**
- Each participant can create ONE wish list per event
- Wish list items:
  - Title (required)
  - Link (optional, URL to product)
  - Price (optional)
  - Notes (optional)
- Wish list visible to the person buying for them
- Can be updated anytime before reveal date

**Revealing Matches:**
- Happens automatically on reveal date
- Status changes: `active` → `revealed`
- All participants can now see full matching
- Shows who was everyone's Secret Santa

---

## 🔄 User Flows

### Flow 1: Creating a Kris Kringle Event

**Actor:** Group admin/parent

1. Navigate to group dashboard
2. Tap "Kris Kringle" section
3. Tap "Create Event" button
4. Enter event details:
   - Name: "Smith Family Christmas 2024"
   - Description: "Annual Christmas gift exchange"
   - Price limit: $50
   - Reveal date: Dec 25, 2024
   - Exchange date: Dec 25, 2024
5. Add participants:
   - Select Mom, Dad, Sarah, Tom (group members)
   - Invite grandma@email.com (external)
6. Add exclusions:
   - Mom ↔ Dad (spouses)
   - Sarah ↔ Tom (siblings)
7. Tap "Create Event"
8. Status: `draft`
9. External participants receive email invitation

---

### Flow 2: Drawing Names

**Actor:** Event creator or group admin

1. Open Kris Kringle event
2. Verify all participants have joined
3. Tap "Draw Names" button
4. Confirmation dialog:
   - "This cannot be undone. Draw names now?"
5. Tap "Confirm"
6. Backend runs matching algorithm
7. Status changes: `draft` → `active`
8. All participants receive email:
   - "You're buying a gift for: [Name]"
   - Link to their wish list (if created)
   - Link to their gift registry (if linked)

---

### Flow 3: Viewing Your Match

**Actor:** Any participant

1. Open Kris Kringle event
2. Tap "My Match" button
3. See recipient details:
   - Name: "Grandma"
   - Wish list link (if created)
   - Gift registry link (if linked)
4. Tap "View Wish List"
5. See recipient's wish list items:
   - Item 1: "Blue scarf"
   - Item 2: "Gardening book"
   - Item 3: "Coffee mug set"
6. Can copy links or make notes

---

### Flow 4: Creating a Wish List

**Actor:** Participant

1. Open Kris Kringle event
2. Tap "My Wish List" button
3. Tap "Add Item"
4. Enter item details:
   - Title: "Blue scarf"
   - Link: https://amazon.com/...
   - Price: $25
   - Notes: "Prefer wool or cashmere"
5. Tap "Save"
6. Repeat for more items
7. Wish list visible to Secret Santa

---

### Flow 5: Revealing Matches (Automatic)

**Occurs:** On reveal date (automated)

1. Cron job checks for events with `revealDate <= now()`
2. For each event:
   - Status changes: `active` → `revealed`
   - Send email to all participants:
     - "The Secret Santa matches have been revealed!"
     - Full list: "You gave to X, Y gave to you"
3. Participants can now see full matching in app

---

## 🎨 UI/UX Specifications

### Kris Kringle Events List Screen

**Header:**
- Title: "Kris Kringle"
- Right button: "+ Create Event" (admins only)

**Event Cards:**
- Event name (large, bold)
- Status badge:
  - DRAFT (gray) - Matches not drawn yet
  - ACTIVE (blue) - Matches drawn, not revealed
  - REVEALED (green) - Matches revealed
  - COMPLETED (purple) - Exchange completed
- Participant count: "12 participants"
- Exchange date: "Exchange: Dec 25, 2024"
- Creator: "Created by Mom"
- Tap to view details

**Empty State:**
- Icon: Gift box
- Text: "No Kris Kringle events yet"
- Button: "Create Your First Event"

---

### Create/Edit Kris Kringle Screen

**Sections:**

**1. Event Details**
- Text input: Event name*
- Text area: Description
- Number input: Price limit ($ - optional)
- Date picker: Reveal date (optional)
- Date picker: Exchange date (optional)

**2. Participants** (minimum 3)
- Subtitle: "Select at least 3 participants"
- List of group members with checkboxes
- "+ Invite by Email" button
  - Modal: Enter name and email
  - Sends invitation email
- Selected count: "5 participants selected"

**3. Exclusion Rules** (optional)
- Subtitle: "Pairs who can't draw each other"
- "+ Add Exclusion" button
  - Picker: Select person 1
  - Picker: Select person 2
  - Save
- List of exclusions:
  - "Mom ↔ Dad" with delete button
  - "Sarah ↔ Tom" with delete button

**4. Actions**
- Save as Draft button (primary)
- Cancel button (secondary)

---

### Kris Kringle Detail Screen

**Header:**
- Event name
- Edit button (creator/admins only, if draft)
- Settings menu (delete event)

**Event Info Card:**
- Status badge
- Price limit: "$50"
- Reveal date: "Dec 25, 2024"
- Exchange date: "Dec 25, 2024"
- Creator: "Created by Mom"

**Participants Section:**
- Count: "12 participants"
- List of participant cards:
  - Avatar
  - Name
  - Status:
    - ✓ Joined (group member)
    - ⏳ Invited (pending email)
  - Wish list badge (if created)

**Exclusions Section** (if any):
- List of exclusion pairs
- "Mom ↔ Dad"
- "Sarah ↔ Tom"

**Actions** (depends on status):

**If DRAFT:**
- "Draw Names" button (admins only)
  - Disabled if < 3 participants
  - Disabled if any exclusion makes matching impossible

**If ACTIVE:**
- "My Match" button (all participants)
  - Shows who you're buying for
  - Link to their wish list
- "My Wish List" button (all participants)
  - Create/edit your wish list

**If REVEALED:**
- "View Matches" button (all participants)
  - Shows full matching
  - Who gave to who

---

### My Match Screen

**Header:**
- Title: "Your Secret Santa Match"
- Subtitle: "Keep it secret!"

**Recipient Card:**
- Large avatar
- Name: "Grandma"
- Message: "You're buying a gift for..."

**Wish List Section:**
- "View Wish List" button
  - Opens wish list modal
  - List of items with:
    - Title
    - Link button
    - Price
    - Notes

**Gift Registry Section** (if linked):
- "View Gift Registry" button
  - Opens web view of registry
  - Anonymous viewing (recipient doesn't know)

**Notes Section:**
- Text area: "Gift ideas and notes"
- Auto-saved locally
- Not visible to recipient

---

### My Wish List Screen

**Header:**
- Title: "My Wish List"
- Right button: "+ Add Item"

**Wish List Items:**
- Each item card shows:
  - Title (large)
  - Link (if provided) with icon
  - Price (if provided)
  - Notes preview
  - Edit/Delete buttons

**Add/Edit Item Modal:**
- Text input: Title* (required)
- Text input: Link (optional, URL)
- Number input: Price (optional, $)
- Text area: Notes (optional)
- Save/Cancel buttons

**Empty State:**
- Icon: Gift
- Text: "No items in your wish list yet"
- Button: "Add Your First Item"

---

### View Matches Screen (Revealed)

**Header:**
- Title: "Secret Santa Matches"
- Subtitle: "The secret is out!"

**Matches List:**
- For each participant:
  - Avatar of giver
  - "→" arrow
  - Avatar of receiver
  - Text: "Mom gave to Grandma"

**Your Match Highlight:**
- Highlighted row:
  - "You gave to: Grandma"
  - "You received from: Dad"

---

## 🔒 Permissions & Security

### Who Can Create Events?
- ✅ Group admins
- ✅ Parents
- ❌ Children (unless admin)
- ❌ Caregivers (unless admin)
- ❌ Supervisors

### Who Can Draw Names?
- ✅ Event creator
- ✅ Group admins
- ❌ Regular participants

### Who Can Edit Events?
- ✅ Event creator (before drawing)
- ✅ Group admins (before drawing)
- ❌ After drawing: Cannot edit participants/exclusions

### Who Can Delete Events?
- ✅ Event creator
- ✅ Group admins
- **Note:** Soft delete only (`is_hidden: true`)

### Who Can View Matches?
- **Before reveal date:**
  - ✅ Each participant sees only their match
  - ❌ Cannot see who's buying for them
  - ✅ Admins can see full matching (for troubleshooting)
- **After reveal date:**
  - ✅ All participants see full matching

---

## 🔗 Integration with Other Features

### Wish Lists
**Table:** `wish_lists` (separate from gift registries)

**Relationship:**
- Each Kris Kringle participant can have ONE wish list per event
- `kris_kringle_participants.wish_list_id` → `wish_lists.wish_list_id`
- Wish list items stored in `wish_list_items` table

**Difference from Gift Registries:**
- Wish lists: Private, for Secret Santa only, one per event
- Gift registries: Public/shareable, for any occasion, multiple allowed

### Gift Registries
**Integration:**
- Participants can link their gift registry to Kris Kringle
- Secret Santa can view recipient's registry anonymously
- Registry items can be added to wish list

**How it works:**
1. Participant creates gift registry (separate feature)
2. In Kris Kringle event, tap "Link Gift Registry"
3. Select which registry to link
4. Secret Santa sees "View Gift Registry" button
5. Opens web view of registry (anonymous)

---

## 📊 Database Relationships

```
groups (1) ──────────< (many) kris_kringles

group_members (1) ────< (many) kris_kringles (as creator)

kris_kringles (1) ────< (many) kris_kringle_participants

kris_kringle_participants (1) ──< (many) kris_kringle_matches (as giver)
kris_kringle_participants (1) ──< (many) kris_kringle_matches (as receiver)

kris_kringle_participants (1) ──< (many) kris_kringle_exclusions (as participant1)
kris_kringle_participants (1) ──< (many) kris_kringle_exclusions (as participant2)

kris_kringle_participants (1) ──> (0-1) wish_lists
kris_kringle_participants (0-1) ──> (0-1) group_members (if not external)

wish_lists (1) ────< (many) wish_list_items
```

---

## 🐛 Known Issues & Considerations

### Issue 1: Impossible Matching
**Problem:** With certain exclusion rules, matching might be impossible.

**Example:**
- 3 participants: A, B, C
- Exclusions: A ↔ B, B ↔ C, A ↔ C
- Impossible to match (everyone excluded from everyone)

**Solution:**
- Backend algorithm tries up to 1000 times
- Returns `null` if impossible
- Frontend shows error: "Cannot generate matches with current exclusions. Please adjust exclusion rules."

---

### Issue 2: External Participants Not Joining
**Problem:** External participant invited but doesn't sign up.

**Solution:**
- Event shows "⏳ Invited (pending)" badge
- Admin can resend invitation email
- Admin can remove participant before drawing
- Cannot draw names until all invited participants join

**Consideration:** Or allow drawing with pending participants?
- **Decision needed:** Should we allow drawing without all participants joined?

---

### Issue 3: Participant Drops Out After Draw
**Problem:** Participant leaves group or deletes account after matches drawn.

**Solution:**
- Match remains in database (for audit)
- Their Secret Santa sees: "Participant no longer active"
- Admin can regenerate matches (creates new event)

---

### Issue 4: Changing Participants After Draw
**Problem:** Admin wants to add/remove participant after drawing.

**Solution:**
- ❌ Cannot modify participants after drawing
- ✅ Must create new event
- Old event archived with status: `completed`

---

## 📧 Email Notifications

### Email 1: Invitation (External Participant)
**Sent when:** External email added to event

**Subject:** "You've been invited to a Secret Santa event"

**Body:**
```
Hi [Name],

[Creator Name] has invited you to join a Secret Santa gift exchange!

Event: [Event Name]
Price Limit: $[Amount] (if provided)
Exchange Date: [Date] (if provided)

To join, please sign up for Parenting Helper:
[Sign Up Link]

After signing up, you'll be able to:
- See who you're buying a gift for
- Create a wish list
- View other participants

Looking forward to having you!
```

---

### Email 2: Matches Drawn
**Sent when:** Admin draws names

**Subject:** "Your Secret Santa match is ready!"

**Body:**
```
Hi [Name],

The Secret Santa matches have been drawn for [Event Name]!

You're buying a gift for: [Recipient Name]

Price Limit: $[Amount] (if provided)
Exchange Date: [Date] (if provided)

[Recipient Name]'s Wish List: [Link] (if created)
[Recipient Name]'s Gift Registry: [Link] (if linked)

Remember to keep it a secret! 🤫

View your match in the app:
[Deep Link to App]
```

---

### Email 3: Matches Revealed
**Sent when:** Reveal date reached

**Subject:** "Secret Santa matches revealed!"

**Body:**
```
Hi [Name],

The Secret Santa matches for [Event Name] have been revealed!

You gave a gift to: [Recipient Name]
You received a gift from: [Giver Name]

All matches:
- [Giver 1] → [Receiver 1]
- [Giver 2] → [Receiver 2]
- ...

View full matches in the app:
[Deep Link to App]
```

---

## 🚀 Implementation Priority (Mobile App)

**Phase 1: Core Screens** (MUST HAVE)
1. ✅ Backend API (COMPLETE)
2. ❌ KrisKringleListScreen - List events
3. ❌ CreateKrisKringleScreen - Create event
4. ❌ KrisKringleDetailScreen - View event
5. ❌ MyMatchScreen - View your match

**Phase 2: Advanced Features** (SHOULD HAVE)
6. ❌ ParticipantSelectionScreen - Select/invite participants
7. ❌ ExclusionRulesScreen - Add exclusions
8. ❌ MyWishListScreen - Create/edit wish list
9. ❌ ViewMatchesScreen - View revealed matches (after reveal date)

**Phase 3: Polish** (NICE TO HAVE)
10. ❌ Animated match reveal
11. ❌ Gift registry integration
12. ❌ Push notifications for matches
13. ❌ Reminder notifications before exchange date

---

## 🧪 Testing Checklist (When Implementing)

### Backend API (Already Complete)
- [x] Create event with valid data
- [x] Create event with minimum participants (3)
- [x] Create event with exclusions
- [x] Draw names with valid participants
- [x] Draw names with impossible exclusions (should fail gracefully)
- [x] View my match after drawing
- [x] Cannot view match before drawing
- [x] Update event before drawing
- [x] Cannot update after drawing
- [x] Delete/hide event

### Mobile App (Not Yet Implemented)
- [ ] List events for group
- [ ] Create event with group members
- [ ] Create event with external participants
- [ ] Add exclusion rules
- [ ] Draw names (admin only)
- [ ] View my match after drawing
- [ ] Create wish list
- [ ] View recipient's wish list
- [ ] Event status badges display correctly
- [ ] Email invitations sent to external participants
- [ ] Deep links work from emails
- [ ] Reveal date triggers automatic reveal
- [ ] Permissions enforced (admins vs participants)

---

## 📝 Code Examples

### Example 1: Backend - Create Kris Kringle Event

```javascript
POST /groups/{groupId}/kris-kringle

Request Body:
{
  "name": "Smith Family Christmas 2024",
  "description": "Annual Christmas gift exchange",
  "priceLimit": 50,
  "revealDate": "2024-12-25T00:00:00Z",
  "exchangeDate": "2024-12-25T18:00:00Z",
  "participants": [
    { "groupMemberId": "uuid-mom" },
    { "groupMemberId": "uuid-dad" },
    { "email": "grandma@email.com", "name": "Grandma" }
  ],
  "exclusions": [
    { "participant1Id": "uuid-mom", "participant2Id": "uuid-dad" }
  ]
}

Response:
{
  "success": true,
  "krisKringle": {
    "krisKringleId": "uuid",
    "name": "Smith Family Christmas 2024",
    "status": "draft",
    ...
  }
}
```

---

### Example 2: Backend - Draw Names

```javascript
POST /groups/{groupId}/kris-kringle/{krisKringleId}/draw

Response:
{
  "success": true,
  "message": "Matches generated successfully. Emails sent to all participants.",
  "matchCount": 5
}
```

---

### Example 3: Backend - View My Match

```javascript
GET /groups/{groupId}/kris-kringle/{krisKringleId}/my-match

Response:
{
  "success": true,
  "match": {
    "recipientName": "Grandma",
    "recipientEmail": "grandma@email.com",
    "wishListId": "uuid",
    "wishListItems": [
      {
        "title": "Blue scarf",
        "link": "https://amazon.com/...",
        "price": 25,
        "notes": "Prefer wool or cashmere"
      }
    ]
  }
}
```

---

## 🔗 Related Files

**Backend:**
- `backend/controllers/krisKringle.controller.js` - Main controller (678 lines)
- `backend/routes/krisKringle.routes.js` - API routes
- `backend/prisma/schema.prisma` - Database schema (4 tables)

**Frontend (Not Yet Implemented):**
- `mobile-main/src/screens/groups/` - Where screens should go
- `mobile-main/src/components/krisKringle/` - Where components should go
- `mobile-main/src/navigation/` - Add to navigation

**Documentation:**
- `appplan.md` - Original feature requirements
- `README.md` - Database schema reference

---

## ✅ Summary

**Backend:** COMPLETE ✅
- Full API implemented
- Matching algorithm working
- Database schema ready
- Email notifications configured

**Mobile App:** NOT STARTED ❌
- No screens implemented
- No components created
- Not in navigation
- Not accessible from app

**Next Steps:**
1. Create KrisKringleListScreen
2. Add "Kris Kringle" button to GroupDashboardScreen
3. Implement event creation flow
4. Add navigation routes
5. Build remaining screens

---

**This feature is ready for frontend implementation!**
