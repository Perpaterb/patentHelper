# New Features Specification

**Date Created**: 2025-11-04
**Status**: Planning Phase
**Implementation Priority**: After Gift Registry & Kris Kringle completion

---

## Overview

This document specifies 5 new features to be added to the Parenting Helper app:

1. **Wiki** - Collaborative knowledge base
2. **To-Do Lists** - Shared task/shopping lists
3. **Book Library** - Family reading tracker
4. **Calendar Sync** - Import from schools/clubs
5. *(Gift Registry & Kris Kringle already in progress)*

---

## 1. 📚 Wiki Feature

### Purpose
A collaborative knowledge base where group members can create, edit, and organize information pages. Great for family recipes, emergency contacts, medical info, house rules, etc.

### User Stories
- As a parent, I want to create a "House Rules" page that everyone can reference
- As an admin, I want to organize wiki pages into categories
- As any member, I want to search the wiki for information
- As a member, I want to see the edit history of a page

### Features
- ✅ **Anyone can create pages** (unless role restricted in settings)
- ✅ **Anyone can edit pages** (full collaborative editing)
- ✅ **Version history** - See who edited what and when
- ✅ **Page categories/folders** - Organize pages (e.g., "Medical", "Recipes", "Contacts")
- ✅ **Rich text editing** - Bold, italic, lists, headings, links
- ✅ **Search functionality** - Find pages by title or content
- ✅ **Page templates** - Quick start templates (Emergency Contact, Recipe, etc.)
- ✅ **Attachments** - Upload files to wiki pages (images, PDFs)
- ✅ **Audit logging** - All edits logged for compliance

### Permissions (Configurable in Group Settings)
- **Who can create pages**: Everyone / Parents & Admins / Admins Only
- **Who can edit pages**: Everyone / Creator Only / Admins Only
- **Who can delete pages**: Creator & Admins / Admins Only
- **Supervisors**: View only (consistent with other features)

### Database Schema (Proposed)

**wiki_pages**
- `page_id` (UUID, PK)
- `group_id` (UUID, FK)
- `title` (VARCHAR 255)
- `content` (TEXT) - Markdown or HTML
- `category` (VARCHAR 100, nullable) - e.g., "Medical", "Recipes"
- `created_by` (UUID, FK to group_members)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `is_hidden` (BOOLEAN) - Soft delete
- `view_count` (INT) - Track popularity

**wiki_page_versions**
- `version_id` (UUID, PK)
- `page_id` (UUID, FK)
- `content` (TEXT) - Snapshot of content
- `edited_by` (UUID, FK to group_members)
- `edited_at` (TIMESTAMP)
- `change_summary` (VARCHAR 500, nullable) - Optional edit note

**wiki_page_attachments**
- `attachment_id` (UUID, PK)
- `page_id` (UUID, FK)
- `file_name` (VARCHAR 255)
- `file_url` (TEXT)
- `file_size_bytes` (BIGINT)
- `uploaded_by` (UUID, FK to group_members)
- `uploaded_at` (TIMESTAMP)

### API Endpoints

- `GET /groups/:groupId/wiki` - List all wiki pages
- `GET /groups/:groupId/wiki/:pageId` - Get page content + metadata
- `POST /groups/:groupId/wiki` - Create new page
- `PUT /groups/:groupId/wiki/:pageId` - Edit page (creates version snapshot)
- `DELETE /groups/:groupId/wiki/:pageId` - Soft delete page
- `GET /groups/:groupId/wiki/:pageId/history` - Get version history
- `GET /groups/:groupId/wiki/search?q=query` - Search pages
- `POST /groups/:groupId/wiki/:pageId/attachments` - Upload attachment

### UI Flow
```
Group Dashboard → Wiki
  ├── List view (all pages, categorized)
  ├── Search bar (top)
  ├── Create Page button (+)
  └── Tap page → View Page
       ├── Edit button (pencil icon)
       ├── History button (clock icon)
       └── Attachments section (if any)
```

---

## 2. ✅ To-Do Lists Feature

### Purpose
Shared task lists for shopping, chores, packing, or any collaborative to-dos. Members can add items, tick them off, and see who completed each task.

### User Stories
- As a parent, I want to create a "Weekly Grocery List" that everyone can add to
- As any member, I want to tick off items I've purchased/completed
- As a member, I want to see who ticked off each item
- As an admin, I want to create a "Packing List for School Camp" with pre-filled items

### Features
- ✅ **Multiple lists per group** - Grocery, Chores, Packing, etc.
- ✅ **Anyone can add items** (unless restricted)
- ✅ **Anyone can tick off items** - Name recorded when ticked
- ✅ **Recurring lists** - Weekly grocery template that resets
- ✅ **Item quantities** - "Milk (2 cartons)"
- ✅ **Item notes** - "Get organic if possible"
- ✅ **List templates** - Pre-filled common lists
- ✅ **Completed items history** - See what was ticked last week
- ✅ **Assign items** - Optional: Assign specific items to members

### List Types
1. **One-Time List** - Packing for trip, party supplies (archived when all done)
2. **Recurring List** - Weekly groceries (resets every week)
3. **Ongoing List** - Household chores (never resets, items recur)

### Database Schema (Proposed)

**todo_lists**
- `list_id` (UUID, PK)
- `group_id` (UUID, FK)
- `name` (VARCHAR 255) - "Weekly Groceries"
- `description` (TEXT, nullable)
- `list_type` (ENUM: 'one_time', 'recurring', 'ongoing')
- `recurrence_pattern` (VARCHAR 50, nullable) - "weekly", "monthly"
- `created_by` (UUID, FK to group_members)
- `created_at` (TIMESTAMP)
- `is_archived` (BOOLEAN)
- `is_hidden` (BOOLEAN)

**todo_list_items**
- `item_id` (UUID, PK)
- `list_id` (UUID, FK)
- `text` (VARCHAR 500) - "Buy milk"
- `quantity` (VARCHAR 50, nullable) - "2 cartons"
- `notes` (TEXT, nullable)
- `is_completed` (BOOLEAN)
- `completed_by` (UUID, FK to group_members, nullable)
- `completed_at` (TIMESTAMP, nullable)
- `assigned_to` (UUID, FK to group_members, nullable)
- `added_by` (UUID, FK to group_members)
- `created_at` (TIMESTAMP)
- `order_index` (INT) - For custom ordering

**todo_list_history**
- `history_id` (UUID, PK)
- `list_id` (UUID, FK)
- `snapshot_date` (TIMESTAMP) - When list was completed/reset
- `items_snapshot` (JSONB) - Array of completed items
- `total_items` (INT)
- `completed_items` (INT)

### API Endpoints

- `GET /groups/:groupId/todo-lists` - List all to-do lists
- `POST /groups/:groupId/todo-lists` - Create new list
- `GET /groups/:groupId/todo-lists/:listId` - Get list with items
- `PUT /groups/:groupId/todo-lists/:listId` - Update list settings
- `DELETE /groups/:groupId/todo-lists/:listId` - Archive list
- `POST /groups/:groupId/todo-lists/:listId/items` - Add item
- `PUT /groups/:groupId/todo-lists/:listId/items/:itemId/complete` - Tick off item
- `PUT /groups/:groupId/todo-lists/:listId/items/:itemId/uncomplete` - Untick item
- `DELETE /groups/:groupId/todo-lists/:listId/items/:itemId` - Delete item
- `POST /groups/:groupId/todo-lists/:listId/reset` - Reset recurring list

### UI Flow
```
Group Dashboard → To-Do Lists
  ├── List of Lists view
  ├── Create List button (+)
  └── Tap list → Items view
       ├── Add Item button (+)
       ├── Item checkboxes (tap to toggle)
       ├── Item shows "✓ by John" when completed
       └── Filter: All / Active / Completed
```

---

## 3. 📖 Book Library & Reading List

### Purpose
Track family book collection and reading progress. Members can add books they own, mark books they're currently reading, and see what others are reading.

### User Stories
- As a parent, I want to add books I own so others know they can borrow them
- As a child, I want to mark a book as "Currently Reading"
- As any member, I want to see what books the family owns
- As a member, I want to request to borrow a book someone owns

### Features
- ✅ **Book catalog** - All books owned by family members
- ✅ **Reading status** - Not Started / Reading / Finished
- ✅ **Book ownership** - Who owns each book
- ✅ **Book borrowing** - Mark book as borrowed, track who has it
- ✅ **Reading progress** - Optional page number or percentage
- ✅ **Book reviews** - Members can rate/review books they've read
- ✅ **Search & filter** - By title, author, genre, owner
- ✅ **Cover images** - Upload or fetch from Google Books API
- ✅ **Reading history** - See past books read

### Database Schema (Proposed)

**books**
- `book_id` (UUID, PK)
- `group_id` (UUID, FK)
- `title` (VARCHAR 500)
- `author` (VARCHAR 255)
- `isbn` (VARCHAR 20, nullable) - ISBN-10 or ISBN-13
- `cover_image_url` (TEXT, nullable)
- `genre` (VARCHAR 100, nullable)
- `page_count` (INT, nullable)
- `description` (TEXT, nullable)
- `owned_by` (UUID, FK to group_members) - Who owns physical copy
- `added_by` (UUID, FK to group_members)
- `added_at` (TIMESTAMP)
- `is_hidden` (BOOLEAN)

**book_reading_status**
- `status_id` (UUID, PK)
- `book_id` (UUID, FK)
- `group_member_id` (UUID, FK)
- `status` (ENUM: 'not_started', 'reading', 'finished')
- `current_page` (INT, nullable)
- `progress_percentage` (INT, nullable) - 0-100
- `started_at` (TIMESTAMP, nullable)
- `finished_at` (TIMESTAMP, nullable)
- `updated_at` (TIMESTAMP)

**book_reviews**
- `review_id` (UUID, PK)
- `book_id` (UUID, FK)
- `group_member_id` (UUID, FK)
- `rating` (INT) - 1-5 stars
- `review_text` (TEXT, nullable)
- `created_at` (TIMESTAMP)

**book_borrowing**
- `borrowing_id` (UUID, PK)
- `book_id` (UUID, FK)
- `borrowed_by` (UUID, FK to group_members)
- `borrowed_from` (UUID, FK to group_members) - Owner
- `borrowed_at` (TIMESTAMP)
- `due_date` (TIMESTAMP, nullable)
- `returned_at` (TIMESTAMP, nullable)

### API Endpoints

- `GET /groups/:groupId/books` - List all books
- `POST /groups/:groupId/books` - Add new book
- `GET /groups/:groupId/books/:bookId` - Get book details
- `PUT /groups/:groupId/books/:bookId` - Update book info
- `DELETE /groups/:groupId/books/:bookId` - Remove book
- `PUT /groups/:groupId/books/:bookId/reading-status` - Update my reading status
- `POST /groups/:groupId/books/:bookId/reviews` - Add review
- `POST /groups/:groupId/books/:bookId/borrow` - Borrow book
- `POST /groups/:groupId/books/:bookId/return` - Return book
- `GET /groups/:groupId/books/search?q=query` - Search books

### UI Flow
```
Group Dashboard → Book Library
  ├── All Books tab
  │   ├── Grid/List view with covers
  │   ├── Search bar
  │   └── Add Book button (+)
  ├── Currently Reading tab
  │   └── Books I'm reading now
  ├── My Books tab
  │   └── Books I own
  └── Tap book → Book Details
       ├── Cover, title, author
       ├── Reading status (dropdown)
       ├── Progress slider (if reading)
       ├── Reviews section
       └── Borrow button (if someone else owns it)
```

---

## 4. 🔄 Calendar Sync with Schools/Clubs

### Purpose
Import external calendar feeds (iCal/ICS format) from schools, sports clubs, or other organizations directly into the group calendar. Reduces manual entry and keeps everyone in sync.

### User Stories
- As a parent, I want to import my child's school calendar so I don't have to manually enter events
- As a member, I want to subscribe to a sports club calendar feed
- As an admin, I want to see which events came from external sources vs. manually created

### Features
- ✅ **iCal/ICS import** - Standard calendar feed format
- ✅ **Multiple subscriptions** - School + Sports + Music lessons, etc.
- ✅ **Auto-sync** - Refresh feeds daily or weekly
- ✅ **Event tagging** - Imported events tagged with source ("School Calendar", "Soccer Club")
- ✅ **Conflict detection** - Warn if imported event overlaps with existing
- ✅ **Selective import** - Choose which events to import (filter by keywords)
- ✅ **Color coding** - Different color per calendar source
- ✅ **Manual override** - Can edit imported events (marks as modified)
- ✅ **Unsubscribe** - Remove feed and all its imported events

### Database Schema (Proposed)

**calendar_subscriptions**
- `subscription_id` (UUID, PK)
- `group_id` (UUID, FK)
- `name` (VARCHAR 255) - "Lincoln High School Calendar"
- `ical_url` (TEXT) - https://school.edu/calendar.ics
- `sync_frequency` (ENUM: 'daily', 'weekly', 'manual')
- `color` (VARCHAR 7) - Hex color for events from this source
- `is_active` (BOOLEAN)
- `last_synced_at` (TIMESTAMP, nullable)
- `created_by` (UUID, FK to group_members)
- `created_at` (TIMESTAMP)

**calendar_events** (EXISTING TABLE - Add these fields)
- Add: `source_subscription_id` (UUID, FK to calendar_subscriptions, nullable)
- Add: `is_imported` (BOOLEAN, default false)
- Add: `external_event_id` (VARCHAR 500, nullable) - UID from iCal
- Add: `is_modified` (BOOLEAN, default false) - True if manually edited after import

**calendar_sync_log**
- `sync_log_id` (UUID, PK)
- `subscription_id` (UUID, FK)
- `synced_at` (TIMESTAMP)
- `events_added` (INT)
- `events_updated` (INT)
- `events_removed` (INT)
- `status` (ENUM: 'success', 'failed')
- `error_message` (TEXT, nullable)

### API Endpoints

- `GET /groups/:groupId/calendar/subscriptions` - List calendar subscriptions
- `POST /groups/:groupId/calendar/subscriptions` - Add new subscription
- `PUT /groups/:groupId/calendar/subscriptions/:subscriptionId` - Update settings
- `DELETE /groups/:groupId/calendar/subscriptions/:subscriptionId` - Unsubscribe
- `POST /groups/:groupId/calendar/subscriptions/:subscriptionId/sync` - Manual sync now
- `GET /groups/:groupId/calendar/subscriptions/:subscriptionId/preview` - Preview events before subscribing

### How It Works

1. **User adds iCal URL** (e.g., school provides public calendar link)
2. **Backend fetches iCal file** using axios/node-fetch
3. **Parse iCal** using `ical.js` or similar library
4. **Extract events** (title, start, end, description, location, recurrence)
5. **Import to database** as `CalendarEvent` records with `source_subscription_id`
6. **Tag events** with subscription name/color
7. **Auto-sync** via cron job or scheduled Lambda (Phase 6)
8. **Handle updates/deletions** by comparing `external_event_id`

### UI Flow
```
Group Dashboard → Calendar → Settings (⚙️) → Calendar Subscriptions
  ├── List of subscriptions
  ├── Add Subscription button (+)
  └── Add form:
       ├── Name: "Lincoln High School"
       ├── iCal URL: https://...
       ├── Color picker
       ├── Sync frequency: Daily/Weekly/Manual
       └── Preview Events button
            ↓
       Show list of events to be imported
            ↓
       Confirm → Import events
```

**Calendar View Updates:**
- Imported events show small tag icon (🔗) and source name
- Can filter by source ("Show only School events")
- Different color per subscription

---

## 5. Implementation Priority

### Phase 3A (Current - Complete First)
1. ✅ Gift Registry backend (DONE)
2. ✅ Kris Kringle backend (DONE)
3. Gift Registry mobile UI
4. Kris Kringle mobile UI

### Phase 3B (Next - Simple Features)
5. **To-Do Lists** (Easiest - similar to messages/finance)
6. **Book Library** (Medium - new domain but straightforward)

### Phase 3C (Advanced Features)
7. **Wiki** (Complex - version history, rich text editor)
8. **Calendar Sync** (Complex - external API integration, parsing iCal)

### Phase 4+ (Future)
- Complete Finance feature UI
- Calendar Day view event rendering
- Testing & polish

---

## Database Migration Strategy

To avoid massive schema changes, implement incrementally:

1. **Migration 1**: Gift Registry + Kris Kringle tables (DONE)
2. **Migration 2**: To-Do Lists tables (3 tables)
3. **Migration 3**: Book Library tables (4 tables)
4. **Migration 4**: Wiki tables (3 tables)
5. **Migration 5**: Calendar Sync tables + update CalendarEvent (2 tables + ALTER)

Each migration tested independently before moving to next feature.

---

## UI/UX Considerations

### Group Dashboard Update
Add 5 new buttons/cards:
```
Group Dashboard
  ├── Messages (existing)
  ├── Calendar (existing)
  ├── Finance (existing)
  ├── 🎁 Gift Registry (NEW)
  ├── 🎅 Kris Kringle (NEW)
  ├── 📚 Wiki (NEW)
  ├── ✅ To-Do Lists (NEW)
  ├── 📖 Book Library (NEW)
  ├── 🔄 Calendar Sync (under Calendar settings) (NEW)
  ├── ⚙️ Settings (existing)
  └── ✓ Approvals (existing)
```

### Navigation Updates
- Add routes for new screens
- Update `NAVIGATION.md` with new flows
- Ensure back button navigation works correctly

---

## API Documentation Updates Required

1. **API.md** - Add all new endpoints with:
   - Request/response schemas
   - Error codes
   - Example requests
   - Permissions required

2. **README.md** - Update:
   - Feature list
   - Database schema section (23 → 35+ tables)
   - API endpoint count

3. **NEXT_STEPS.md** - Add:
   - New feature implementation timeline
   - Testing requirements
   - Deployment considerations

---

## Testing Strategy

Each new feature needs:
- ✅ Unit tests (controllers, services)
- ✅ Integration tests (API endpoints)
- ✅ E2E tests (full user flows)
- ✅ Permission tests (role-based access)
- ✅ Audit log verification

**Target: 80%+ code coverage maintained**

---

## Security Considerations

### Wiki
- Sanitize HTML/Markdown to prevent XSS attacks
- Version history prevents data loss from malicious edits
- Audit all page edits

### To-Do Lists
- Validate item text length (prevent spam)
- Rate limit item creation (max 100/day per user)

### Book Library
- Validate ISBN format
- Sanitize book descriptions (could contain malicious content)
- Rate limit book additions

### Calendar Sync
- ⚠️ **CRITICAL**: Validate iCal URLs (prevent SSRF attacks)
- Only allow HTTPS URLs
- Set timeout for fetching feeds (5 seconds max)
- Limit feed size (max 1MB)
- Parse safely (prevent XXE, billion laughs attacks)
- Rate limit sync requests (max 1/minute per subscription)

---

## Cost Implications (Phase 6 - AWS Deployment)

### Additional AWS Services Needed

1. **Calendar Sync**:
   - EventBridge (scheduled sync jobs) - ~$1/month
   - OR Lambda cron - $0 (within free tier)

2. **Wiki Attachments**:
   - S3 storage for files - ~$0.023 per GB
   - CloudFront for images - ~$0.085 per GB transferred

3. **Book Cover Images**:
   - S3 storage - minimal (compressed JPEGs)
   - Google Books API - FREE (1000 requests/day)

**Total added cost: ~$2-5/month** (well within budget)

---

## Questions to Clarify

1. **Wiki**: Should wiki pages support file uploads? (images, PDFs)
   - Answer: YES - specified in features

2. **To-Do Lists**: Should completed items auto-archive after X days?
   - Recommendation: Keep history for 30 days, then archive

3. **Book Library**: Integrate with Google Books API for cover images?
   - Recommendation: YES - better UX, free API

4. **Calendar Sync**: Support Google Calendar, Outlook Calendar?
   - Answer: YES - both support iCal format export

5. **All Features**: Available in PH Messenger app?
   - Recommendation: NO - Messenger is messages-only (keep it simple)

---

**Document Status**: ✅ Complete - Ready for implementation planning
**Next Step**: Update NEXT_STEPS.md with phased roadmap
**Review Date**: Before starting implementation of each feature
