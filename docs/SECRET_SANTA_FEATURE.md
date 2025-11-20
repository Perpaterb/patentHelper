# Secret Santa (Kris Kringle) Feature Documentation

## Overview

Secret Santa allows group members to organize gift exchanges where participants are randomly assigned someone to buy a gift for. The feature supports both group members and external participants (non-app users) via email-based access.

## Key Features

### 1. Event Details

When creating a Secret Santa event, the organizer specifies:

- **Event Name** - Title for the Secret Santa event
- **Occasion** - What the event is for (e.g., "Christmas 2024", "Office Holiday Party")
- **Occasion Date/Time** - When the gift exchange will happen
- **Assigning Date/Time** - When participants are revealed their assigned person (defaults to creation time)
- **Gift Value** - Suggested spending limit (e.g., $25, $50)

### 2. Participants

#### Adding Participants

Participants can be:
- **Group members** - Selected from existing group members
- **External participants** - Added via email and name (not required to have app account)

**UI Advisory**: When creating a Secret Santa, the app will display a note:
> "Tip: It's better to add people as group members before adding them to the Secret Santa. This allows them to link their gift registry for better gift ideas."

#### Participant Data Structure
```javascript
{
  participantId: "uuid",
  secretSantaId: "uuid",
  email: "participant@email.com",
  name: "John Doe",
  groupMemberId: "uuid" | null,  // null for external participants
  assignedToId: "uuid",          // Who they need to buy for
  passcode: "ABC123",            // Auto-generated 6-char alphanumeric
  emailSentAt: "timestamp",
  hasViewed: boolean
}
```

### 3. Email Notifications

#### Initial Creation Email
Sent immediately when Secret Santa is created to ALL participants:

**Subject**: You've been added to [Event Name] Secret Santa!

**Content**:
- Event name and occasion
- Occasion date/time
- Gift value suggestion
- External link to view their assignment
- Their personal passcode
- Note: "Your Secret Santa will be revealed on [Assigning Date/Time]"

#### Assignment Reveal Email
Sent automatically at the Assigning Date/Time:

**Subject**: Your Secret Santa Assignment for [Event Name]!

**Content**:
- Same link and passcode
- "You have been assigned to buy a gift for someone! Click the link to find out who."

#### Reminder Email (Optional - Future Feature)
Could be sent X days before the occasion.

### 4. External Access Page

#### Authentication Flow
1. User clicks link from email
2. Lands on `/secret-santa/view/:webToken`
3. Page prompts for:
   - Email address
   - Passcode
4. On successful validation, shows assignment

#### Page Content

**Before Assigning Date/Time**:
- Event details (name, occasion, date, gift value)
- Live countdown to assignment reveal
- "Check back on [Assigning Date/Time] to see who you've been assigned!"

**After Assigning Date/Time**:
- Event details
- "You are buying a gift for: **[Assigned Person Name]**"
- If assigned person has linked a gift registry:
  - "View their wish list: [Link to Gift Registry]"
  - Note: Links to their personal gift registry if linked
- If no gift registry linked:
  - "They haven't shared a wish list yet."

### 5. Gift Registry Integration

Secret Santa integrates with Gift Registries:

1. **During Event Creation**:
   - Organizer can encourage participants to link their personal gift registries

2. **For Participants**:
   - When viewing their assignment, they can see the assigned person's gift registry
   - Only works if that person has linked their personal gift registry to the group's gift registry section

3. **Important Note About Group-Only Registries**:
   - Group-only registries CANNOT be seen by external participants
   - External participants can only see personal registries that have been linked with public/passcode sharing
   - The app warns about this when creating group-only registries

### 6. Admin Controls

#### Event Management
Only the **creator** or **group admins** can:

1. **Delete Secret Santa Event**
   - If deleted BEFORE occasion date/time:
     - Email sent to all participants: "The [Event Name] Secret Santa has been cancelled"
   - If deleted AFTER occasion date/time:
     - No email sent (event already happened)
     - Data is soft-deleted

2. **Regenerate Email/Passcode**
   - For any individual participant
   - Generates new passcode
   - Re-sends the initial creation email with new passcode
   - Use case: Participant lost email or forgot passcode

3. **View Participants**
   - See list of all participants
   - See who has viewed their assignment
   - See email delivery status

4. **Edit Event** (Before assignment)
   - Can modify event details
   - Can add/remove participants (if before assigning date)

### 7. Assignment Algorithm

When assignments are made (at Assigning Date/Time):

1. Shuffle all participants randomly
2. Assign each person to the next person in the shuffled list
3. Last person is assigned to first person (circular)
4. Ensures no one is assigned to themselves
5. Assignments are stored and cannot be regenerated once set

### 8. Database Schema

```sql
-- Main Secret Santa event
CREATE TABLE secret_santa (
  secret_santa_id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(group_id),
  creator_id UUID REFERENCES group_members(group_member_id),
  name VARCHAR(255) NOT NULL,
  occasion VARCHAR(255),
  occasion_date_time TIMESTAMP NOT NULL,
  assigning_date_time TIMESTAMP NOT NULL DEFAULT NOW(),
  gift_value DECIMAL(10,2),
  web_token VARCHAR(64) UNIQUE,
  is_assigned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Participants
CREATE TABLE secret_santa_participant (
  participant_id UUID PRIMARY KEY,
  secret_santa_id UUID REFERENCES secret_santa(secret_santa_id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  group_member_id UUID REFERENCES group_members(group_member_id), -- null for external
  assigned_to_id UUID REFERENCES secret_santa_participant(participant_id), -- who they buy for
  passcode VARCHAR(6) NOT NULL,
  initial_email_sent_at TIMESTAMP,
  assignment_email_sent_at TIMESTAMP,
  has_viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9. API Endpoints

```
POST   /groups/:groupId/secret-santa                    - Create new Secret Santa
GET    /groups/:groupId/secret-santa                    - List all Secret Santas in group
GET    /groups/:groupId/secret-santa/:secretSantaId     - Get Secret Santa details
PUT    /groups/:groupId/secret-santa/:secretSantaId     - Update Secret Santa
DELETE /groups/:groupId/secret-santa/:secretSantaId     - Delete Secret Santa

POST   /groups/:groupId/secret-santa/:secretSantaId/participants     - Add participant
DELETE /groups/:groupId/secret-santa/:secretSantaId/participants/:id - Remove participant
POST   /groups/:groupId/secret-santa/:secretSantaId/participants/:id/resend - Resend email

GET    /secret-santa/view/:webToken                     - Public page (no auth)
POST   /secret-santa/view/:webToken/verify              - Verify email + passcode
```

### 10. Mobile App Screens

1. **SecretSantaListScreen** - List all Secret Santas in group
2. **CreateSecretSantaScreen** - Create new event with participant selection
3. **SecretSantaDetailScreen** - View event details, participants, manage
4. **AddParticipantScreen** - Add group members or external participants

### 11. Security Considerations

- Passcodes are random 6-character alphanumeric (case-insensitive)
- Web tokens are 32-character random hex strings
- Rate limiting on passcode verification (prevent brute force)
- Passcodes can be regenerated by admins
- External page only reveals assignment after assigning date/time
- No way to see who has you (maintains secrecy)

### 12. Edge Cases

1. **Participant removed after assignment**: Cannot remove participants after assigning date/time
2. **Fewer than 3 participants**: Cannot create Secret Santa (need minimum 3 for proper exchange)
3. **Email delivery failure**: Admin can resend with new passcode
4. **Duplicate emails**: Same email cannot be added twice to same event
5. **Group member also added as external**: Use their group member record if they're already a member

### 13. Future Enhancements

- Reminder emails before occasion
- Exclusion rules (A should not get B)
- Couples mode (partners don't get each other)
- Price range instead of fixed value
- Multiple rounds of gift exchange
- Wish list notes from participants

---

## Implementation Priority

### Phase 1: Core Functionality
1. Database schema and migrations
2. Backend API endpoints
3. Email templates (initial, assignment)
4. External access page
5. Mobile screens (list, create, detail)

### Phase 2: Polish
1. Countdown timer on external page
2. Gift registry integration
3. Admin resend functionality
4. Participant management UI

### Phase 3: Enhancements
1. Reminder emails
2. Analytics (who has viewed)
3. Export participant list
