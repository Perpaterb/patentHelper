# Next Steps - Family Helper Development

## Current Status (Updated: 2025-11-04)

**Current Phase:** Phase 3 - Mobile Main App Development (70% complete)

**Currently Working On:**
- ✅ Gift Registry backend (COMPLETE)
- ✅ Kris Kringle backend (COMPLETE)
- ⏳ Adding new feature buttons to Group Dashboard
- ⏳ Planning 5 additional features (see below)

---

## 🎉 Recently Completed (2025-11-04)

### Gift Registry & Kris Kringle Backend
- [x] Designed database schema (5 new tables)
  - `wish_lists` - Gift registries
  - `wish_list_items` - Individual gift items
  - `kris_kringles` - Secret Santa events
  - `kris_kringle_participants` - Event participants
  - `kris_kringle_matches` - Secret assignments
  - `kris_kringle_exclusions` - Exclusion rules
- [x] Created and applied Prisma migration
- [x] Implemented Gift Registry controller (6 endpoints)
  - GET/POST wish lists
  - Add/mark/unmark/delete items
  - Privacy: owners can't see purchased items (surprise!)
- [x] Implemented Kris Kringle controller (5 endpoints)
  - Create events, generate matches
  - Fisher-Yates matching algorithm with exclusions
  - Email notifications to participants
  - View "my match" (who I'm giving to)
- [x] Created routes and integrated with groups router
- [x] Tested backend server restart (successful)

**Files Created:**
- `backend/controllers/wishLists.controller.js` (700+ lines)
- `backend/controllers/krisKringle.controller.js` (800+ lines)
- `backend/routes/wishLists.routes.js`
- `backend/routes/krisKringle.routes.js`
- `backend/prisma/migrations/20251104034041_add_gift_registry_and_kris_kringle/`

---

## 📋 5 New Features Planned

### Overview
See `NEW_FEATURES_SPEC.md` for complete specifications.

1. **📚 Wiki** - Collaborative knowledge base
2. **✅ To-Do Lists** - Shared shopping/task lists
3. **📖 Book Library** - Family reading tracker
4. **🔄 Calendar Sync** - Import from schools/clubs (iCal)
5. ~~Gift Registry~~ (DONE)
6. ~~Kris Kringle~~ (DONE)

### Implementation Priority Order

#### Phase 3A - CURRENT (Gift Registry & Kris Kringle)
1. [x] Gift Registry backend
2. [x] Kris Kringle backend
3. [ ] Gift Registry mobile UI screens
4. [ ] Kris Kringle mobile UI screens
5. [ ] Update Group Dashboard with new buttons

#### Phase 3B - NEXT (Simple Features)
6. [ ] **To-Do Lists** (Easiest - 3 tables, similar to existing features)
   - Database schema design
   - Backend API (8-10 endpoints)
   - Mobile UI (List view, Item management)
   - Recurring lists support
7. [ ] **Book Library** (Medium - 4 tables, straightforward)
   - Database schema design
   - Backend API (10-12 endpoints)
   - Mobile UI (Book catalog, Reading status)
   - Optional: Google Books API integration

#### Phase 3C - LATER (Advanced Features)
8. [ ] **Wiki** (Complex - version history, rich text)
   - Database schema (3 tables)
   - Backend API (8+ endpoints)
   - Mobile UI with rich text editor
   - Version history viewer
   - Search functionality
9. [ ] **Calendar Sync** (Complex - external integration)
   - Database schema (2 tables + ALTER existing)
   - iCal parsing library integration
   - Backend sync service
   - Mobile UI (subscription management)
   - Auto-sync scheduler (cron/EventBridge)

---

## 🗓️ Updated Roadmap

### Week 1-2 (Nov 4-17): Phase 3A - Complete Gift Registry & Kris Kringle
- [ ] Create Gift Registry mobile screens
  - GiftRegistryListScreen (list all wish lists)
  - CreateWishListScreen (create new wish list)
  - WishListDetailsScreen (view/add items)
  - WishListItemScreen (item details, mark as purchased)
- [ ] Create Kris Kringle mobile screens
  - KrisKringleListScreen (list events)
  - CreateKrisKringleScreen (setup event, add participants)
  - KrisKringleDetailsScreen (view event, generate matches)
  - MyMatchScreen (view who I'm giving to + their wish list)
- [ ] Update GroupDashboardScreen with 2 new buttons
- [ ] Navigation updates (add 8 new routes)
- [ ] Test end-to-end user flows
- [ ] Update API.md documentation

### Week 3-4 (Nov 18-Dec 1): Phase 3B - To-Do Lists
- [ ] Design database schema (3 tables)
- [ ] Create Prisma migration
- [ ] Implement backend controller (8-10 endpoints)
- [ ] Create mobile UI screens (3-4 screens)
- [ ] Test recurring list functionality
- [ ] Update documentation

### Week 5-6 (Dec 2-15): Phase 3B - Book Library
- [ ] Design database schema (4 tables)
- [ ] Create Prisma migration
- [ ] Implement backend controller (10-12 endpoints)
- [ ] Integrate Google Books API (optional)
- [ ] Create mobile UI screens (4-5 screens)
- [ ] Test borrowing/reading status flows
- [ ] Update documentation

### Week 7-10 (Dec 16-Jan 12): Phase 3C - Wiki
- [ ] Design database schema (3 tables + version history)
- [ ] Create Prisma migration
- [ ] Implement backend controller
- [ ] Choose rich text editor library (React Native)
- [ ] Create mobile UI screens
- [ ] Implement version history viewer
- [ ] Test collaborative editing
- [ ] Update documentation

### Week 11-14 (Jan 13-Feb 9): Phase 3C - Calendar Sync
- [ ] Design database schema (2 tables + ALTER)
- [ ] Research iCal parsing libraries (ical.js)
- [ ] Create Prisma migration
- [ ] Implement iCal fetch & parse service
- [ ] Implement backend controller
- [ ] Create mobile UI (subscription management)
- [ ] Test with real school calendars
- [ ] Implement sync scheduler (local cron first)
- [ ] Update documentation

### Week 15-16 (Feb 10-23): Finish Existing Features
- [ ] Complete Finance feature mobile UI
  - FinanceMatterDetailsScreen enhancements
  - Payment recording UI
  - Payment confirmation flows
- [ ] Complete Calendar Day view
  - Render events in grid
  - Event creation UI
  - Responsibility lines visualization
- [ ] Polish & bug fixes

### Week 17+ (Phase 4): Testing & Refinement
- [ ] Comprehensive E2E testing
- [ ] Performance optimization
- [ ] UX polish
- [ ] Accessibility improvements
- [ ] Prepare for Phase 5 (PH Messenger app)

---

## 📊 Database Growth Forecast

**Current Schema**: 23 tables (as of Phase 2 complete)

**After All New Features**: 35 tables

### Breakdown by Feature:
- Original app: 23 tables
- Gift Registry: +2 tables (wish_lists, wish_list_items)
- Kris Kringle: +3 tables (kris_kringles, participants, matches, exclusions)
- To-Do Lists: +3 tables (todo_lists, items, history)
- Book Library: +4 tables (books, reading_status, reviews, borrowing)
- Wiki: +3 tables (wiki_pages, versions, attachments)
- Calendar Sync: +2 tables (subscriptions, sync_log) + ALTER calendar_events

**Total: 35 tables**

---

## 🎯 Success Metrics

### By End of Phase 3 (All Features Complete)
- ✅ 35 database tables fully defined
- ✅ 100+ API endpoints implemented
- ✅ 50+ mobile screens/components
- ✅ 80%+ test coverage maintained
- ✅ All features working end-to-end locally
- ✅ Complete API documentation
- ✅ Zero known critical bugs

---

## 🛠️ Technical Debt & Improvements

### To Address During Phase 3
1. [ ] Refactor calendar grid rendering (extract components)
2. [ ] Optimize message polling (reduce from 5s to WebSocket in Phase 6)
3. [ ] Add input validation schemas (Joi) for all new endpoints
4. [ ] Create shared mobile UI components (buttons, cards, modals)
5. [ ] Implement proper error handling in all controllers
6. [ ] Add loading states to all mobile screens
7. [ ] Optimize images (lazy loading, compression)

### Known Bugs
1. [ ] **Calendar Day View - Event Flicker on Re-render**: When scrolling stops and events re-render at new positions, there's a brief visual flicker/flash. The issue is timing between when `settledXRef`/`settledYRef` shared values update and when React state updates. Attempted fixes (moving shared value updates to JS callback, double-buffering) did not fully resolve. May need deeper investigation into React Native Reanimated lifecycle.

### To Address in Phase 4
1. [ ] Performance profiling (React Native Performance Monitor)
2. [ ] Memory leak detection
3. [ ] Bundle size optimization
4. [ ] Offline mode support (partial - message queue)

---

## 📚 Documentation Updates Required

### Immediate (Before Next Feature)
- [x] Create NEW_FEATURES_SPEC.md (DONE)
- [ ] Update API.md with Gift Registry endpoints
- [ ] Update API.md with Kris Kringle endpoints
- [ ] Update NAVIGATION.md with new screens
- [ ] Update README.md (feature list, table count)

### Per Feature (As Implemented)
- [ ] Add to-do list endpoints to API.md
- [ ] Add book library endpoints to API.md
- [ ] Add wiki endpoints to API.md
- [ ] Add calendar sync endpoints to API.md
- [ ] Update appplan.md with feature details
- [ ] Create user guide (markdown) for each feature

---

## 🔒 Security Checklist (New Features)

### Gift Registry & Kris Kringle
- [x] Input validation (name, email, etc.)
- [x] Authorization checks (group membership)
- [x] XSS prevention (sanitize user input)
- [x] Audit logging (all actions tracked)
- [x] Privacy protection (purchased items hidden from owners)

### To-Do Lists
- [ ] Validate item text length (max 500 chars)
- [ ] Rate limit item creation (100/day per user)
- [ ] Prevent duplicate items (optional check)

### Book Library
- [ ] Validate ISBN format (10 or 13 digits)
- [ ] Sanitize book descriptions (could contain HTML)
- [ ] Rate limit book additions (50/day per user)
- [ ] Google Books API key protection (server-side only)

### Wiki
- [ ] **CRITICAL**: Sanitize HTML/Markdown (prevent XSS)
- [ ] Rate limit page creation (20/day per user)
- [ ] Version history prevents data loss
- [ ] File upload validation (type, size)

### Calendar Sync
- [ ] **CRITICAL**: Validate iCal URLs (prevent SSRF)
- [ ] Only allow HTTPS URLs
- [ ] Timeout for feed fetching (5s max)
- [ ] Limit feed file size (1MB max)
- [ ] Safe parsing (prevent XXE, billion laughs)
- [ ] Rate limit sync requests (1/min per subscription)

---

## 📱 Mobile UI Component Library Needed

As features grow, create reusable components:

### Already Exist
- CustomBackButton
- ColorPickerModal

### Need to Create
- [ ] RichTextEditor (for Wiki)
- [ ] CheckboxList (for To-Do Lists)
- [ ] StarRating (for Book reviews)
- [ ] ProgressBar (for book reading progress)
- [ ] FileUploader (for Wiki attachments)
- [ ] SearchBar (for Wiki, Books, Calendar)
- [ ] FilterPanel (for Books, To-Do Lists)
- [ ] ConfirmationModal (for delete actions)
- [ ] LoadingSpinner (standardized across app)
- [ ] ErrorMessage (standardized error display)

Place in: `mobile-main/src/components/shared/`

---

## 🧪 Testing Strategy per Feature

### Unit Tests (Backend)
- Controllers: 80%+ coverage
- Services: 90%+ coverage (especially matching algorithm)
- Validation schemas: 100% coverage

### Integration Tests (Backend)
- All API endpoints tested with supertest
- Permission checks verified
- Error cases handled

### Mobile Tests (Future)
- Component tests (React Testing Library)
- Navigation tests
- User flow tests (Detox or similar)

---

## 💡 Nice-to-Have Features (Post-MVP)

### Phase 5+ Enhancements
1. **Recipe Book** - Extension of Wiki with ingredient lists
2. **Medication Tracker** - Who takes what, when
3. **Pet Care Tracker** - Vet visits, feeding schedules
4. **Vehicle Maintenance Log** - Car servicing, registration
5. **Home Inventory** - Track possessions for insurance
6. **Meal Planner** - Weekly meal planning
7. **Allowance Tracker** - Kid's pocket money
8. **Chore Charts** - Visual task assignments for kids

---

## 🚀 Phase 6 Preparation (AWS Deployment)

### Additional Services Needed for New Features

#### Calendar Sync
- EventBridge (scheduled sync jobs) OR
- Lambda cron (cheaper, within free tier)
- Cost: ~$1/month

#### Wiki Attachments
- S3 bucket for file uploads
- CloudFront for image delivery
- Cost: ~$1-2/month (compressed images)

#### Book Cover Images
- S3 bucket (optional, could hotlink to Google Books)
- Google Books API (FREE - 1000 req/day)
- Cost: ~$0/month

**Total additional AWS cost: ~$2-5/month**
*Still well within $125-500/month budget*

---

## 📞 Questions to Address Before Implementation

### To-Do Lists
1. Should completed items auto-archive after 30 days?
   - **Recommendation**: YES - keep in todo_list_history table
2. Should we support subtasks (nested items)?
   - **Recommendation**: Phase 5+ enhancement

### Book Library
1. Integrate Google Books API for auto-fill (title → fetch details)?
   - **Recommendation**: YES - much better UX
2. Support e-books vs physical books?
   - **Recommendation**: Add `format` field (physical/ebook/audiobook)

### Wiki
1. Which rich text editor for React Native?
   - **Options**: react-native-pell-rich-editor, react-native-cn-quill
   - **Recommendation**: Research and test both
2. Support Markdown vs WYSIWYG?
   - **Recommendation**: WYSIWYG for non-technical users

### Calendar Sync
1. Support private calendar feeds (authentication)?
   - **Recommendation**: Phase 5+ (requires OAuth)
2. Two-way sync (edit in app → update source)?
   - **Recommendation**: NO - too complex, read-only import

---

## 🎯 Next Immediate Action

**NOW (Today):**
1. Update Group Dashboard with Gift Registry & Kris Kringle buttons
2. Add navigation routes for new screens
3. Create placeholder screens (can populate later)

**TOMORROW:**
1. Start building GiftRegistryListScreen
2. Create API integration service calls

**THIS WEEK:**
1. Complete Gift Registry mobile UI
2. Complete Kris Kringle mobile UI
3. Test end-to-end flows

---

**Last Updated**: 2025-11-04
**Next Review**: After completing Phase 3A (Gift Registry & Kris Kringle UI)
