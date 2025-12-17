# Database Schema

PostgreSQL database schema for Family Helper App.

## Files

- **schema.sql** - Complete database schema with 23 tables
- **migrations/** - Database migration scripts (to be created with Prisma/Knex)
- **seeds/** - Seed data for development/testing (to be created)

## Quick Start

### Local Development Setup

1. **Install PostgreSQL** (if not already installed):
```bash
# macOS
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15
```

2. **Create Database**:
```bash
# Create database
createdb family_helper_dev

# Or using psql
psql postgres -c "CREATE DATABASE family_helper_dev;"
```

3. **Import Schema**:
```bash
# Import the schema
psql family_helper_dev < database/schema.sql

# Verify tables were created
psql family_helper_dev -c "\dt"
```

### Using Docker (Recommended)

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name parenting-helper-db \
  -e POSTGRES_DB=family_helper_dev \
  -e POSTGRES_USER=dev_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:15

# Import schema
docker exec -i parenting-helper-db psql -U dev_user family_helper_dev < database/schema.sql

# Connect to database
docker exec -it parenting-helper-db psql -U dev_user family_helper_dev
```

## Schema Overview

### 23 Tables Organized by Domain

#### Users & Authentication (2 tables)
- `users` - User accounts with Kinde integration

#### Groups & Members (6 tables)
- `groups` - Family/co-parenting groups
- `group_members` - Members with roles (admin, parent, child, caregiver, supervisor)
- `relationships` - Parent-child, grandparent-child relationships
- `group_settings` - Group-level configuration
- `admin_permissions` - Granular admin permission matrix

#### Messaging (6 tables)
- `message_groups` - Conversation groups within family groups
- `message_group_members` - Membership in message groups
- `messages` - Text messages with mentions
- `message_media` - Images and videos attached to messages
- `message_read_receipts` - Read status tracking (4-state: sent/delivered/read by some/read by all)

#### Calendar (3 tables)
- `calendar_events` - Events with recurrence support
- `event_attendees` - Event participants
- `child_responsibility_events` - Child custody/responsibility timeline tracking

#### Finance (3 tables)
- `finance_matters` - Shared expenses (e.g., "Kids shoes - $100")
- `finance_matter_members` - Expected vs. actual payment tracking
- `finance_payments` - Payment reports with receipt uploads

#### Approvals (2 tables)
- `approvals` - Multi-admin approval workflows
- `approval_votes` - Admin votes on pending approvals

#### Audit & Tracking (4 tables)
- `audit_logs` - Complete audit trail (nothing ever truly deleted)
- `media_log_links` - Temporary links for media in log exports
- `storage_usage` - Per-admin, per-group storage tracking
- `pinned_items` - User-specific pinned items

## Key Design Decisions

### Soft Deletes
- **Nothing is hard-deleted** (legal/custody compliance)
- Use `is_hidden` flags instead
- Admins can see hidden content
- All deletions logged in `audit_logs`

### UUIDs for Primary Keys
- Prevents ID enumeration attacks
- Better for distributed systems
- Easier merging/splitting of data

### JSONB for Flexibility
- `approvals.approval_data` - Flexible approval context
- `audit_logs.log_data` - Additional context without schema changes

### Timestamps
- All tables have `created_at`
- Most have `updated_at`
- Critical tracking: `joined_at`, `settled_at`, `confirmed_at`, etc.

### Array Types
- `messages.mentions` - UUID array for @mentions
- `audit_logs.media_links` - Text array for media URLs

## Migrations Strategy

### Option 1: Prisma (Recommended)
```bash
# Install Prisma
npm install -D prisma
npm install @prisma/client

# Initialize
npx prisma init

# Create schema from existing SQL
# (Convert schema.sql to prisma/schema.prisma)

# Generate migrations
npx prisma migrate dev --name init
```

### Option 2: Knex.js
```bash
# Install Knex
npm install knex pg

# Initialize
npx knex init

# Create migration
npx knex migrate:make create_schema

# Run migrations
npx knex migrate:latest
```

## Environment Variables

```bash
# .env
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/family_helper_dev

# Production (AWS RDS)
DATABASE_URL=postgresql://username:password@rds-endpoint.amazonaws.com:5432/parenting_helper_prod
```

## Indexes

All indexes are defined in `schema.sql`:
- Primary keys (automatic)
- Foreign keys (automatic)
- **23 custom indexes** for query optimization:
  - User lookups (email, kinde_id)
  - Group member roles
  - Message sorting (created_at DESC)
  - Calendar event time ranges
  - Audit log searches
  - etc.

## Common Queries

### Get User's Groups
```sql
SELECT g.*, gm.role
FROM groups g
JOIN group_members gm ON g.group_id = gm.group_id
WHERE gm.user_id = 'user-uuid'
AND g.is_hidden = false;
```

### Get Messages with Read Status
```sql
SELECT
  m.*,
  COUNT(DISTINCT mrr.group_member_id) as read_count,
  COUNT(DISTINCT mgm.group_member_id) as total_members
FROM messages m
LEFT JOIN message_read_receipts mrr ON m.message_id = mrr.message_id
LEFT JOIN message_group_members mgm ON m.message_group_id = mgm.message_group_id
WHERE m.message_group_id = 'group-uuid'
GROUP BY m.message_id
ORDER BY m.created_at DESC
LIMIT 50;
```

### Get Child Responsibility Timeline
```sql
SELECT
  ce.event_id,
  ce.start_time,
  ce.end_time,
  cre.child_id,
  child.display_name as child_name,
  cre.start_responsible_member_id,
  start_member.display_name as start_caregiver,
  cre.end_responsible_member_id,
  end_member.display_name as end_caregiver
FROM calendar_events ce
JOIN child_responsibility_events cre ON ce.event_id = cre.event_id
JOIN group_members child ON cre.child_id = child.group_member_id
LEFT JOIN group_members start_member ON cre.start_responsible_member_id = start_member.group_member_id
LEFT JOIN group_members end_member ON cre.end_responsible_member_id = end_member.group_member_id
WHERE ce.group_id = 'group-uuid'
AND ce.start_time >= NOW()
ORDER BY ce.start_time;
```

## Data Retention & Privacy

### GDPR Compliance
- User data export: Query all tables where `user_id` matches
- Right to be forgotten: Anonymize instead of delete (legal requirement for audit logs)
- Data minimization: Only required fields are NOT NULL

### Audit Log Retention
- **Minimum**: 7 years (common legal requirement)
- **Recommendation**: Indefinite (custody cases can span decades)
- Store in S3 for archival after 1 year

## Backup Strategy

### Daily Automated Backups (RDS)
```bash
# AWS RDS automatic backups (enabled by default)
# Retention: 7-35 days
```

### Manual Backup
```bash
# Full dump
pg_dump parenting_helper_prod > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only parenting_helper_prod > schema_backup.sql

# Data only
pg_dump --data-only parenting_helper_prod > data_backup.sql
```

### Restore
```bash
psql parenting_helper_prod < backup_20251018.sql
```

## Performance Optimization

### Connection Pooling
Use PgBouncer or RDS Proxy for Lambda functions (many concurrent connections).

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Add indexes based on actual usage patterns
- Consider materialized views for complex reports

### Partitioning (Future)
Consider partitioning `audit_logs` and `messages` by date once > 10M rows.

## Next Steps

1. ✅ Schema created
2. [ ] Choose ORM (Prisma recommended)
3. [ ] Set up migrations
4. [ ] Create seed data for testing
5. [ ] Write integration tests
6. [ ] Deploy to AWS RDS

## Questions?

See:
- Main documentation: `README.md` Section 4
- Feature requirements: `appplan.md`
- AI/Developer guide: `aiMessageToDev.md`
