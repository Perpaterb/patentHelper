# Local Development Setup Guide

Complete guide for setting up the Parenting Helper local development environment.

## Prerequisites

- **Node.js** v20+ (use nvm for version management)
- **Docker Desktop** or Docker Engine with Docker Compose
- **Git** configured with GitHub access
- **WSL2** (if on Windows)

## Quick Start (TL;DR)

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Set up backend
cd backend
cp .env.example .env  # Or create from template below
npm install
npx prisma@6.17.1 migrate deploy
npm start

# 3. Set up web-admin (new terminal)
cd web-admin
npm install --legacy-peer-deps
npm run dev

# 4. Access the app
# Web Admin: http://localhost:8081
# Backend API: http://localhost:3000
# MailHog UI: http://localhost:8025
```

---

## Detailed Setup Instructions

### Step 1: Start Docker Services

The project uses Docker Compose for local infrastructure that mirrors production AWS services.

```bash
# From project root
docker-compose up -d
```

This starts:
| Service | Local URL | Production Equivalent |
|---------|-----------|----------------------|
| PostgreSQL | localhost:5432 | AWS RDS |
| MailHog SMTP | localhost:1025 | AWS SES |
| MailHog Web UI | http://localhost:8025 | - |
| Media Processor | http://localhost:3001 | ECR Lambda |

**Verify services are running:**
```bash
docker-compose ps
```

All services should show `healthy` status.

### Step 2: Configure Backend Environment

Create `backend/.env` with the following:

```env
# Family Helper Backend - Local Development Environment
# DO NOT commit this file to git!

# Database - Local PostgreSQL via Docker
DATABASE_URL="postgresql://familyhelper_admin:localdev123@localhost:5432/familyhelper"

# Server Settings
PORT=3000
NODE_ENV=development

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# Kinde Authentication (FamilyHelperAPPDev)
KINDE_DOMAIN=https://familyhelperapp.kinde.com
KINDE_CLIENT_ID=552e8d9d29f046418a8dfce0b7f0de1b
KINDE_CLIENT_SECRET=
# Note: KINDE_CLIENT_SECRET is NOT needed - Kinde uses PKCE flow

# JWT Settings
JWT_SECRET=super-secret-jwt-key-change-in-production

# Message Encryption
MESSAGE_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Stripe Settings (test keys for local development)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder

# Billing API Key
BILLING_API_KEY=6baac3adaf1695f3c1de17b2afd095aab02f9cc689ca627c1a3ade8515583c0f

# AWS Settings (for local development)
AWS_REGION=ap-southeast-2
S3_BUCKET=family-helper-files-prod
```

### Step 3: Install Backend Dependencies and Run Migrations

```bash
cd backend
npm install
```

**CRITICAL: Run Prisma migrations to create database tables:**

```bash
npx prisma@6.17.1 migrate deploy
```

This applies all 37+ migrations to create the database schema.

**IMPORTANT: Schema Drift Fix**

The Prisma schema may include columns that don't have migrations yet (e.g., Stripe billing fields). If you see errors like:

```
The column `users.stripe_customer_id` does not exist in the current database
```

Run this to add missing columns:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function addMissingColumns() {
  const columns = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS default_payment_method_id VARCHAR(255)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMP(6)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS additional_storage_packs INT DEFAULT 0',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_billing_attempt TIMESTAMP(6)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_failure_count INT DEFAULT 0'
  ];

  for (const sql of columns) {
    try {
      await p.\$executeRawUnsafe(sql);
      console.log('Added:', sql.split('EXISTS ')[1].split(' ')[0]);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }

  // Create index
  await p.\$executeRawUnsafe('CREATE INDEX IF NOT EXISTS users_renewal_date_idx ON users(renewal_date)');
  console.log('Index created');
}

addMissingColumns().finally(() => p.\$disconnect());
"
```

### Step 4: Start Backend Server

```bash
cd backend
npm start
```

You should see:
```
🚀 Parenting Helper API Server
================================
Environment: development
Server: http://localhost:3000
Health Check: http://localhost:3000/health
...
✅ MailHog email service connected
```

**Note:** The warning `⚠️ Missing Kinde configuration: KINDE_CLIENT_SECRET` can be **IGNORED**. Kinde uses PKCE flow and does not require a client secret.

### Step 5: Configure Web Admin Environment

Create `web-admin/.env`:

```env
# Parenting Helper - Admin Web App Local Development

# API Configuration (Local backend)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_TIMEOUT=30000

# Kinde Authentication (FamilyHelperAPPDev)
EXPO_PUBLIC_KINDE_DOMAIN=https://familyhelperapp.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=552e8d9d29f046418a8dfce0b7f0de1b
EXPO_PUBLIC_KINDE_REDIRECT_URI=http://localhost:8081/auth/callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI=http://localhost:8081

# Stripe (use test key for local development)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ISwOGEgo6t5nkunguEjhvUFsRM9PGIhUE8LK1qc4nuhWyshD7ps1v2JDsVRFWusHSEysXGmd8LIcCtFiB4zyaQ600NdPpDKuF

# App Configuration
EXPO_PUBLIC_APP_NAME=Parenting Helper Admin
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_ENVIRONMENT=development

# Feature Flags
EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS=true
EXPO_PUBLIC_ENABLE_LOG_EXPORTS=true
EXPO_PUBLIC_ENABLE_STORAGE_MANAGEMENT=true
```

### Step 6: Install and Start Web Admin

```bash
cd web-admin
npm install --legacy-peer-deps
npm run dev
```

Access the web admin at: **http://localhost:8081**

### Step 7: Configure Mobile App (Optional)

Create `mobile-main/.env`:

```env
# Mobile Main - Local Development Environment

# API Configuration
# Android Emulator uses 10.0.2.2 to reach host machine's localhost
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Kinde Authentication (FamilyHelperAPPDev)
EXPO_PUBLIC_KINDE_DOMAIN=https://familyhelperapp.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=552e8d9d29f046418a8dfce0b7f0de1b
EXPO_PUBLIC_KINDE_REDIRECT_URI=exp+mobile-main://callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI=exp+mobile-main://

# Web URLs (for linking to subscription/account pages)
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:8081
```

---

## Kinde Authentication Configuration

### Two Kinde Environments

| Environment | Client ID | Usage |
|-------------|-----------|-------|
| **FamilyHelperAPPDev** | `552e8d9d29f046418a8dfce0b7f0de1b` | Local development |
| **FamilyHelperAPPProd** | `bfbf86777e654654b374cf92f5719c74` | Production |

Both use domain: `https://familyhelperapp.kinde.com`

### IMPORTANT: No Client Secret Required

Kinde uses **PKCE (Proof Key for Code Exchange)** flow. There is **NO client secret**.

The backend warning about missing `KINDE_CLIENT_SECRET` should be **IGNORED**.

### Dev Environment Callback URLs (configured in Kinde dashboard)

- **Allowed Callback URLs:** `http://localhost:8081/auth/callback`
- **Allowed Logout Redirect URLs:** `http://localhost:8081`
- **Homepage/Login URI:** `http://localhost:8081`

---

## Database Setup Details

### Fresh Database Setup

When starting with a fresh Docker volume:

1. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Apply migrations:**
   ```bash
   cd backend
   npx prisma@6.17.1 migrate deploy
   ```

3. **Fix schema drift (if needed):**
   Run the SQL commands in Step 3 above.

### Reset Database (Start Fresh)

```bash
# Stop all containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
cd backend
npx prisma@6.17.1 migrate deploy
```

### View Database (pgAdmin)

```bash
docker-compose --profile tools up -d
```

Access pgAdmin at: http://localhost:5050
- Email: `admin@familyhelper.local`
- Password: `admin`

---

## Service Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Web Admin | 8081 | http://localhost:8081 |
| PostgreSQL | 5432 | - |
| MailHog SMTP | 1025 | - |
| MailHog Web UI | 8025 | http://localhost:8025 |
| Media Processor | 3001 | http://localhost:3001 |
| pgAdmin | 5050 | http://localhost:5050 |

---

## Troubleshooting

### "Column does not exist" Errors

The Prisma schema may have columns that haven't been migrated. Run the SQL fix in Step 3.

### Token Exchange 500 Error

Usually means the database isn't set up:
1. Check Docker is running: `docker-compose ps`
2. Apply migrations: `npx prisma@6.17.1 migrate deploy`
3. Restart backend: `npm start`

### "No refresh token" Logout Loop

1. Clear browser localStorage and cookies for localhost:8081
2. Restart backend server
3. Try logging in again

### Prisma Version Mismatch

Always use the locked version:
```bash
npx prisma@6.17.1 migrate deploy  # NOT just `npx prisma`
```

The project uses Prisma 6.x. Prisma 7.x has breaking changes.

### Sharp/FFmpeg Warnings

These warnings are normal in development:
```
[ImageConversion] sharp/heic-convert not available - image conversion disabled
[AudioConverter] ffmpeg not available - media processing disabled
```

Media processing runs in the Docker media-processor container, not the Node.js backend.

### KINDE_CLIENT_SECRET Warning

**IGNORE THIS WARNING.** Kinde uses PKCE flow. No client secret is needed.

---

## Development Workflow

### Daily Startup

```bash
# 1. Start Docker services (if not running)
docker-compose up -d

# 2. Start backend (Terminal 1)
cd backend && npm start

# 3. Start web-admin (Terminal 2)
cd web-admin && npm run dev
```

### After Pulling New Code

```bash
# If schema changed, re-apply migrations
cd backend
npx prisma@6.17.1 migrate deploy

# Restart backend to pick up changes
npm start
```

### Stopping Development

```bash
# Stop Docker services (keeps data)
docker-compose stop

# OR: Stop and remove containers but keep data
docker-compose down

# OR: Stop, remove containers, AND delete data (fresh start)
docker-compose down -v
```

---

## Production vs Development Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| Database | Docker PostgreSQL | AWS RDS |
| Email | MailHog | AWS SES |
| Media Processing | Docker container | AWS Lambda (ECR) |
| File Storage | Local `uploads/` folder | AWS S3 |
| Authentication | Kinde Dev app | Kinde Prod app |
| API | Express on port 3000 | API Gateway + Lambda |
| Web Hosting | Metro dev server | CloudFront + S3 |
