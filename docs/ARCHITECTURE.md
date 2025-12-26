# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          3 PRODUCTS, 1 BACKEND                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────┐  ┌─────────────────┐         │
│  │           Web Admin                   │  │  FH Messenger   │         │
│  │          (web-admin/)                 │  │(mobile-messenger)│         │
│  │                                       │  │                 │         │
│  │ Uses screens FROM mobile-main:        │  │ NOT IN MVP1     │         │
│  │ - Messaging, Calendar, Finance        │  │                 │         │
│  │ - Registries, Groups, etc.           │  │ Future: Message- │         │
│  │                                       │  │ only app with   │         │
│  │ PLUS admin-only features:             │  │ biometric auth  │         │
│  │ - Subscriptions & Payments            │  │                 │         │
│  │ - Storage management                  │  │                 │         │
│  │ - Audit log exports                   │  │                 │         │
│  └──────────────────┬───────────────────┘  └─────────────────┘         │
│                     │                                                   │
│  ┌──────────────────┴───────────────────┐                              │
│  │           Mobile Main                 │                              │
│  │         (mobile-main/)                │                              │
│  │                                       │                              │
│  │ React Native app (Android/iOS)        │                              │
│  │ - Messaging, Calendar, Finance        │                              │
│  │ - Registries, Groups, etc.           │                              │
│  │                                       │                              │
│  │ SAME functionality as web-admin       │                              │
│  │ (web-admin imports these screens)     │                              │
│  └──────────────────┬───────────────────┘                              │
│                     │                                                   │
│                     ▼                                                   │
│         ┌─────────────────────┐                                        │
│         │   Express Backend   │                                        │
│         │    (backend/)       │                                        │
│         └──────────┬──────────┘                                        │
│                    │                                                   │
│         ┌──────────┴──────────┐                                        │
│         ▼                     ▼                                        │
│  ┌─────────────┐       ┌─────────────┐                                 │
│  │ PostgreSQL  │       │   AWS S3    │                                 │
│  │   (RDS)     │       │  (files)    │                                 │
│  └─────────────┘       └─────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Point:** Web Admin and Mobile Main share the SAME screens. Web Admin imports components directly from `mobile-main/src/screens/`. Users can do everything on web that they can on mobile.

## Infrastructure

### Production (Lightsail)

```
Internet → Nginx (443/SSL) → Express (3000) → PostgreSQL (RDS)
                                           → S3 (files)
```

| Component | Details |
|-----------|---------|
| **Server** | Lightsail `family-helper-prod` (52.65.37.116) |
| **Database** | RDS PostgreSQL (via SSH tunnel through bastion) |
| **Files** | S3 bucket `family-helper-files-prod` |
| **Web App** | Static files served by Nginx |
| **Process Manager** | PM2 |
| **SSL** | Let's Encrypt via Certbot |

**SSH Access (port 2847):**
```bash
ssh -i ~/.ssh/lightsail-family-helper.pem -p 2847 ubuntu@52.65.37.116
```

### Local Development (Docker)

```
Browser → Nginx (80) → Express (3000) → PostgreSQL (container)
                                      → Local uploads folder
```

Start with: `docker-compose up -d`

| Service | Port | Purpose |
|---------|------|---------|
| nginx | 80 | Web app + API proxy |
| api | 3000 | Express backend |
| postgres | 5432 | Database |
| mailhog | 8025 | Email testing UI |

## Authentication

### Current State (BROKEN - causes browser popups)

```
Mobile App → Kinde Login → Get Kinde Token
          → POST /auth/exchange → Get Custom JWT (15 min expiry!)
          → Use Custom JWT for API calls
          → Token expires → Refresh fails → Browser popup!
```

**Problem:** Custom JWTs expire every 15 minutes. The refresh token flow wasn't storing tokens properly, and oauth2-proxy can't validate custom JWTs.

### Target State (TODO - Phase 2)

```
Mobile App → Kinde Login → Get Kinde Token
          → Use Kinde Token DIRECTLY for API calls
          → oauth2-proxy validates at edge
          → Kinde handles refresh automatically
          → No browser popups!
```

**Migration required:**
1. Mobile apps use Kinde tokens directly (skip /auth/exchange)
2. API validates Kinde tokens via JWKS (not custom JWT)
3. Enable oauth2-proxy validation (remove SKIP_AUTH_ROUTES)

See: `backend/oauth2-proxy/README.md` for full migration plan.

## Database

**ORM:** Prisma
**Schema:** `backend/prisma/schema.prisma`

Key tables:
- `users` - User accounts (synced from Kinde)
- `groups` - Family groups
- `group_members` - Membership with roles
- `messages` - Encrypted messages
- `calendar_events` - Calendar entries
- `finance_matters` - Financial tracking
- `audit_logs` - All actions logged

**Migrations:**
```bash
cd backend
npx prisma migrate dev    # Local
npx prisma migrate deploy # Production
```

## File Storage

| Environment | Storage |
|-------------|---------|
| Local | `backend/uploads/` folder |
| Production | S3 bucket `family-helper-files-prod` |

## Security

- **Messages:** AES-256-GCM encrypted at rest
- **Passwords:** Never stored (Kinde handles auth)
- **API:** All endpoints require authentication except `/health`, `/public/*`
- **Audit:** All group actions logged to `audit_logs` table
- **HTTPS:** Required in production

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| Admin | Full access, can manage subscriptions |
| Parent | Standard access, can manage most features |
| Adult | Similar to parent |
| Child | Limited access, no admin features |
| Caregiver | Care-related access only |
| Supervisor | Read-only access |
