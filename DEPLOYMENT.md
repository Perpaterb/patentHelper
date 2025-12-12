# Family Helper App - Deployment Guide

## Architecture Overview

Family Helper uses a **Lightsail-based architecture** for production:

```
                    ┌─────────────────────────────────────────────┐
                    │              PRODUCTION                      │
                    │         familyhelperapp.com                  │
                    ├─────────────────────────────────────────────┤
                    │                                             │
                    │   ┌─────────────┐     ┌─────────────┐      │
                    │   │  Lightsail  │────▶│    RDS      │      │
                    │   │  (Ubuntu)   │     │  PostgreSQL │      │
                    │   │             │     │             │      │
                    │   │  - Express  │     └─────────────┘      │
                    │   │  - PM2      │            │              │
                    │   │  - Nginx    │            │              │
                    │   │  - Puppeteer│     ┌─────────────┐      │
                    │   │  - Web App  │────▶│    S3       │      │
                    │   └─────────────┘     │  (Files)    │      │
                    │         │             └─────────────┘      │
                    │         ▼                                   │
                    │   Let's Encrypt SSL                         │
                    │                                             │
                    └─────────────────────────────────────────────┘
```

---

## Environments

| Environment | Purpose | URL | Database |
|-------------|---------|-----|----------|
| **Production** | Live users | https://familyhelperapp.com | AWS RDS PostgreSQL |
| **Local Dev** | Development | http://localhost:3000 | Docker PostgreSQL |

---

## Production Setup

### Server Details

| Property | Value |
|----------|-------|
| Instance Name | `family-helper-prod` |
| IP Address | `52.65.37.116` |
| Region | ap-southeast-2 (Sydney) |
| OS | Ubuntu 22.04 LTS |
| Node.js | v20 |
| SSH Key | `~/.ssh/lightsail-family-helper.pem` |

### Services Running on Lightsail

| Service | Port | Process Manager | Purpose |
|---------|------|-----------------|---------|
| Express API | 3000 | PM2 | Main backend API |
| Puppeteer Recorder | (internal) | PM2 | WebRTC call recording |
| Nginx | 80/443 | systemd | Reverse proxy + SSL |
| Web App | (static) | Nginx | Frontend files |

### Domain & SSL

- **Domain**: `familyhelperapp.com` (Route53)
- **SSL**: Let's Encrypt via Certbot (auto-renewal)
- **Nginx**: Proxies `/*` to Express on port 3000

### AWS Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Lightsail | family-helper-prod | Application server |
| RDS | family-helper-db-prod | PostgreSQL database |
| S3 | family-helper-files-prod | File storage (uploads, recordings) |

---

## Local Development Setup

### Prerequisites

- **Node.js v20+**
- **Docker & Docker Compose**
- **AWS CLI** (optional, for S3 access in dev)

### Quick Start

```bash
# 1. Start database and services
docker-compose up -d postgres mailhog

# 2. Set up backend
cd backend
cp .env.example .env    # Edit with your values
npm install
npx prisma migrate dev  # Run migrations
npm start               # http://localhost:3000

# 3. Start web admin (new terminal)
cd web-admin
npm install --legacy-peer-deps
npm start               # http://localhost:8081

# 4. Start mobile app (new terminal)
cd mobile-main
npm install --legacy-peer-deps
npm start               # Expo DevTools
```

### Local Services

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:3000 | Main API |
| Web Admin | http://localhost:8081 | Admin web app |
| Mobile App | exp://192.168.x.x:8081 | Expo dev server |
| PostgreSQL | localhost:5432 | Database |
| MailHog | http://localhost:8025 | Email testing UI |
| pgAdmin | http://localhost:5050 | DB admin (optional) |

### Docker Commands

```bash
# Start core services (database + email)
docker-compose up -d postgres mailhog

# Start with pgAdmin
docker-compose --profile tools up -d

# View logs
docker-compose logs -f postgres

# Stop services
docker-compose down

# Reset database (fresh start)
docker-compose down -v
```

---

## Deployment

### Deploy to Production

```bash
# Full deployment (backend + web app)
./scripts/deploy-lightsail.sh
```

This script:
1. Syncs backend files to Lightsail
2. Installs dependencies
3. Runs Prisma migrations
4. Restarts PM2
5. Builds and deploys web-admin

### Deploy Backend Only

```bash
# Sync files
rsync -avz --exclude 'node_modules' --exclude '.env*' \
  -e "ssh -i ~/.ssh/lightsail-family-helper.pem" \
  ./backend/ ubuntu@52.65.37.116:/home/ubuntu/family-helper/

# Install and restart
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 \
  "cd /home/ubuntu/family-helper && npm ci --omit=dev && npx prisma migrate deploy && pm2 restart family-helper"
```

### Deploy Web App Only

```bash
cd web-admin
npm install --legacy-peer-deps
npx expo export --platform web

rsync -avz --delete \
  -e "ssh -i ~/.ssh/lightsail-family-helper.pem" \
  ./dist/ ubuntu@52.65.37.116:/home/ubuntu/web-admin/
```

---

## Database Operations

### Run Migrations (Production)

```bash
# Option 1: Via SSH
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 \
  "cd /home/ubuntu/family-helper && npx prisma migrate deploy"

# Option 2: Via SSH tunnel (for direct access)
# Terminal 1: Create tunnel
ssh -i ~/.ssh/lightsail-family-helper.pem -L 5433:family-helper-db-prod.c3uu4gkmcwnq.ap-southeast-2.rds.amazonaws.com:5432 ubuntu@52.65.37.116 -N

# Terminal 2: Run migrations
cd backend
DATABASE_URL="postgresql://familyhelper_admin:PASSWORD@localhost:5433/familyhelper" npx prisma migrate deploy
```

### Run Migrations (Local)

```bash
cd backend
npx prisma migrate dev
```

---

## Monitoring & Logs

### View Production Logs

```bash
# PM2 application logs
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'pm2 logs family-helper'

# PM2 status
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'pm2 status'

# Nginx access logs
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'sudo tail -f /var/log/nginx/access.log'

# Nginx error logs
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'sudo tail -f /var/log/nginx/error.log'
```

### Health Check

```bash
# Production
curl https://familyhelperapp.com/health

# Local
curl http://localhost:3000/health
```

### Server Resources

```bash
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'htop'
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'df -h'
```

---

## Environment Variables

### Backend (.env)

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `NODE_ENV` | development | production |
| `PORT` | 3000 | 3000 |
| `DATABASE_URL` | localhost:5432 | RDS endpoint |
| `S3_BUCKET` | family-helper-files-prod | family-helper-files-prod |
| `KINDE_DOMAIN` | https://familyhelperapp.kinde.com | Same |
| `KINDE_CLIENT_ID` | (dev app ID) | (prod app ID) |
| `USE_LOCAL_RECORDER` | true | true |
| `CORS_ORIGINS` | localhost URLs | https://familyhelperapp.com |

### Web Admin (.env / .env.production)

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `EXPO_PUBLIC_API_URL` | http://localhost:3000 | https://familyhelperapp.com |
| `EXPO_PUBLIC_KINDE_CLIENT_ID` | (dev app ID) | (prod app ID) |
| `EXPO_PUBLIC_KINDE_REDIRECT_URI` | http://localhost:8081/auth/callback | https://familyhelperapp.com/auth/callback |

### Mobile Main (.env / .env.production)

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `EXPO_PUBLIC_API_URL` | http://localhost:3000 | https://familyhelperapp.com |
| `EXPO_PUBLIC_KINDE_CLIENT_ID` | (dev app ID) | (prod app ID) |

---

## CI/CD Pipeline

### Current Status

**Manual deployment** via `./scripts/deploy-lightsail.sh`

GitHub Actions available for automated testing:
- `.github/workflows/pr-checks.yml` - Runs tests on pull requests

### Future: Enable Automatic Deployment

To enable automatic deployment on push to main:

1. Update `.github/workflows/ci-cd.yml`
2. Uncomment the `push` trigger
3. Add Lightsail deployment steps (SSH-based)

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `LIGHTSAIL_SSH_KEY` | Private key for Lightsail SSH |
| `STRIPE_PUBLISHABLE_KEY` | Stripe key for web build |

---

## Rollback

### Backend Rollback

```bash
# 1. Find commit to rollback to
git log --oneline -10

# 2. Checkout that commit
git checkout <commit-hash>

# 3. Deploy
./scripts/deploy-lightsail.sh

# 4. Return to main
git checkout main
```

### Database Rollback

```bash
# View migration history
npx prisma migrate status

# Rollback specific migration (CAUTION: may cause data loss)
npx prisma migrate resolve --rolled-back "migration_name"
```

---

## Troubleshooting

### API Not Responding

```bash
# Check PM2 status
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'pm2 status'

# Restart application
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'pm2 restart family-helper'

# Check logs
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'pm2 logs family-helper --lines 100'
```

### Database Connection Issues

```bash
# Test from server
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 \
  "PGPASSWORD=PASSWORD psql -h family-helper-db-prod.c3uu4gkmcwnq.ap-southeast-2.rds.amazonaws.com -U familyhelper_admin -d familyhelper -c 'SELECT 1'"
```

### SSL Certificate Renewal

```bash
# Check certificate status
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'sudo certbot certificates'

# Force renewal
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'sudo certbot renew --force-renewal'

# Reload Nginx
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'sudo systemctl reload nginx'
```

### Disk Full

```bash
# Check disk usage
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'df -h'

# Find large files
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'sudo du -sh /home/ubuntu/* | sort -hr | head -10'

# Clear PM2 logs
ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116 'pm2 flush'
```

---

## Cost Estimation

Monthly costs (Sydney region):

| Service | Estimated Cost |
|---------|---------------|
| Lightsail (1GB RAM) | ~$5/month |
| RDS (db.t3.micro) | ~$15-20/month |
| S3 (storage + transfer) | ~$1-5/month |
| Route53 (domain) | ~$0.50/month |
| **Total** | **~$22-30/month** |

---

## Features Implemented

### Video/Phone Call Recording
- WebRTC-based recording via Puppeteer
- 2-minute chunks with 5-second overlap
- Direct upload to S3
- Status broadcast to participants
- Pending upload indicator on call details

### Full Feature List
See `README.md` for complete feature documentation.
