# Parenting Helper Mobile App - Navigation Structure

## CRITICAL: Full App Navigation Hierarchy

**This is the FULL Parenting Helper app, NOT the messaging-only PH Messenger app.**

## App Flow

```
┌─────────────────────────────────────────┐
│         Login Screen                    │
│   (Kinde OAuth - every time)            │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│    Groups List (LANDING SCREEN)         │
│  - My Account button (👤) left header   │──┐
│  - Search groups                        │  │
│  - List of all groups user is in        │  │
│  - Create new group (+)                 │  │
│  - Invites button (📧) right header     │──┼─┐
│  - Each card shows: name, role, avatar  │  │ │
└──────────────────┬──────────────────────┘  │ │
                   ↓ (Click on a group)      │ │
                                              │ │
        ┌─────────────────────────────────────┘ │
        ↓                                       │
┌─────────────────────────────────────────┐     │
│     My Account Screen                   │     │
│  - View/edit display name               │     │
│  - View/edit member icon                │     │
│  - View subscription status             │     │
│  - Button to open web admin portal      │     │
│  - Shows trial/subscription info        │     │
└─────────────────────────────────────────┘     │
                                                │
        ┌───────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│     Group Invitations Screen            │
│  - List of pending invitations          │
│  - Shows: group name, role, inviter     │
│  - Accept/Decline buttons               │
│  - Auto-refreshes count on focus        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│      Group Dashboard/Overview           │
│  ┌───────────────────────────────────┐  │
│  │  Group Name & Icon                │  │
│  │  Members Count                    │  │
│  │  User Role                        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Navigation Tabs/Sections:              │
│  ┌───────────────────────────────────┐  │
│  │ 📋 Group Settings                 │  │
│  ├───────────────────────────────────┤  │
│  │ ✅ Approvals                      │  │
│  ├───────────────────────────────────┤  │
│  │ 💬 Messages                       │──┼─┐
│  ├───────────────────────────────────┤  │ │
│  │ 📅 Calendar                       │──┼─┼─┐
│  ├───────────────────────────────────┤  │ │ │
│  │ 💰 Finance                        │──┼─┼─┼─┐
│  └───────────────────────────────────┘  │ │ │ │
└─────────────────────────────────────────┘ │ │ │
                                            │ │ │
        ┌───────────────────────────────────┘ │ │
        ↓                                     │ │
┌─────────────────────────────────────────┐   │ │
│     Message Groups List                 │   │ │
│  - List of all message threads/groups   │   │ │
│  - Create new message group (+)         │   │ │
│  - Each shows: name, last message, etc. │   │ │
└──────────────────┬──────────────────────┘   │ │
                   ↓ (Click on message group) │ │
┌─────────────────────────────────────────┐   │ │
│    Individual Message Group             │   │ │
│  ┌───────────────────────────────────┐  │   │ │
│  │  Message Group Settings ⚙️        │  │   │ │
│  └───────────────────────────────────┘  │   │ │
│  ┌───────────────────────────────────┐  │   │ │
│  │  Messages (Chat Interface)        │  │   │ │
│  │  - Message bubbles                │  │   │ │
│  │  - Message input                  │  │   │ │
│  │  - Send button                    │  │   │ │
│  └───────────────────────────────────┘  │   │ │
└─────────────────────────────────────────┘   │ │
                                              │ │
        ┌─────────────────────────────────────┘ │
        ↓                                       │
┌─────────────────────────────────────────┐     │
│       Calendar View                     │     │
│  ┌───────────────────────────────────┐  │     │
│  │  Calendar Settings ⚙️             │  │     │
│  └───────────────────────────────────┘  │     │
│  ┌───────────────────────────────────┐  │     │
│  │  Month/Week/Day Views             │  │     │
│  │  Event List                       │  │     │
│  │  Child Responsibility Tracking    │  │     │
│  └───────────────────────────────────┘  │     │
└─────────────────────────────────────────┘     │
                                                │
        ┌───────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│     Finance Matters List                │
│  - List of all finance matters          │
│  - Create new matter (+)                │
│  - Each shows: name, amount, status     │
└──────────────────┬──────────────────────┘
                   ↓ (Click on finance matter)
┌─────────────────────────────────────────┐
│    Individual Finance Matter            │
│  - Details                              │
│  - Members involved                     │
│  - Payment tracking                     │
│  - Settlement status                    │
└─────────────────────────────────────────┘
```

## Screen Names & Files

### Current Implementation (INCORRECT - Being Fixed)

**Problem**: Currently goes directly from Groups List → Messages
```
GroupsListScreen → GroupDetailScreen (shows messages)
```
**This is WRONG** - it's using the PH Messenger structure!

### Correct Implementation (Full App)

```
GroupsListScreen → GroupDashboardScreen → Feature Sections
                         ├─ GroupSettingsScreen
                         ├─ ApprovalsListScreen
                         ├─ MessageGroupsListScreen → MessageGroupDetailScreen
                         ├─ CalendarScreen
                         └─ FinanceMattersListScreen → FinanceMatterDetailScreen
```

## File Structure

```
src/
├── screens/
│   ├── auth/
│   │   └── LoginScreen.jsx
│   ├── account/
│   │   └── MyAccountScreen.jsx        ← User profile and subscription
│   ├── groups/
│   │   ├── GroupsListScreen.jsx       ← Landing screen
│   │   ├── InvitesScreen.jsx          ← Group invitations management
│   │   ├── GroupDashboardScreen.jsx   ← NEW: Group overview with tabs
│   │   ├── GroupSettingsScreen.jsx
│   │   └── ApprovalsListScreen.jsx
│   ├── messaging/
│   │   ├── MessageGroupsListScreen.jsx
│   │   ├── MessageGroupDetailScreen.jsx
│   │   └── MessageGroupSettingsScreen.jsx
│   ├── calendar/
│   │   ├── CalendarScreen.jsx
│   │   └── CalendarSettingsScreen.jsx
│   └── finance/
│       ├── FinanceMattersListScreen.jsx
│       └── FinanceMatterDetailScreen.jsx
```

## Key Differences from PH Messenger App

| Feature | Full App (mobile-main) | PH Messenger (mobile-messenger) |
|---------|------------------------|----------------------------------|
| Landing Screen | Groups List | Groups List (same) |
| After clicking Group | Group Dashboard | Message Groups List (direct) |
| Calendar | ✅ Yes | ❌ No |
| Finance | ✅ Yes | ❌ No |
| Group Settings | ✅ Yes | ❌ No |
| Approvals | ✅ Yes | ❌ No |
| Biometric Auth | ❌ No (login each time) | ✅ Yes (after first login) |

## Navigation Implementation

### Using React Navigation

```javascript
// Stack Navigator Structure
<Stack.Navigator>
  {/* Auth */}
  <Stack.Screen name="Login" component={LoginScreen} />

  {/* Account */}
  <Stack.Screen name="MyAccount" component={MyAccountScreen} />

  {/* Groups */}
  <Stack.Screen name="GroupsList" component={GroupsListScreen} />
  <Stack.Screen name="Invites" component={InvitesScreen} />
  <Stack.Screen name="GroupDashboard" component={GroupDashboardScreen} />
  <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
  <Stack.Screen name="ApprovalsList" component={ApprovalsListScreen} />

  {/* Messages */}
  <Stack.Screen name="MessageGroupsList" component={MessageGroupsListScreen} />
  <Stack.Screen name="MessageGroupDetail" component={MessageGroupDetailScreen} />
  <Stack.Screen name="MessageGroupSettings" component={MessageGroupSettingsScreen} />

  {/* Calendar */}
  <Stack.Screen name="Calendar" component={CalendarScreen} />
  <Stack.Screen name="CalendarSettings" component={CalendarSettingsScreen} />

  {/* Finance */}
  <Stack.Screen name="FinanceMattersList" component={FinanceMattersListScreen} />
  <Stack.Screen name="FinanceMatterDetail" component={FinanceMatterDetailScreen} />
</Stack.Navigator>
```

## IMPORTANT Notes

1. **DO NOT** go directly from Groups List to Messages
2. **DO NOT** skip the Group Dashboard screen
3. **DO NOT** implement messaging-only navigation (that's for PH Messenger app)
4. **GroupDashboardScreen** should have tabs or cards for:
   - Settings
   - Approvals
   - Messages (navigate to Message Groups List)
   - Calendar (navigate to Calendar View)
   - Finance (navigate to Finance Matters List)

## Current Status

- ✅ GroupsListScreen implemented (with My Account and Invites buttons in header)
- ✅ MyAccountScreen implemented (profile, subscription status, web admin link)
- ✅ InvitesScreen implemented (with header button, badge, count API)
- ❌ GroupDashboardScreen NOT YET IMPLEMENTED (currently skipped!)
- ⚠️  GroupDetailScreen incorrectly showing messages (should be GroupDashboardScreen)
- ❌ MessageGroupsListScreen not implemented
- ❌ CalendarScreen not implemented
- ❌ FinanceMattersListScreen not implemented

## Next Steps

1. Rename `GroupDetailScreen` to `MessageGroupDetailScreen`
2. Create new `GroupDashboardScreen` with navigation tabs
3. Create `MessageGroupsListScreen`
4. Update navigation to follow correct hierarchy
5. Add placeholders for Calendar and Finance sections
