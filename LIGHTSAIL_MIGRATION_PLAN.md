# Migration Plan: Lambda → Lightsail

## Overview

Migrate from complex Lambda + Fargate architecture to a simple, unified Lightsail server.

```
BEFORE (Complex):                    AFTER (Simple):
┌─────────────────────┐              ┌─────────────────────┐
│ API Gateway         │              │                     │
│      ↓              │              │  Lightsail ($20)    │
│ Lambda (API)        │              │  ┌─────────────┐    │
│      ↓              │     ──►      │  │ Express.js  │    │
│ Fargate (Recorder)  │              │  │ + Puppeteer │    │
│      ↓              │              │  └─────────────┘    │
│ RDS + S3            │              │        ↓            │
└─────────────────────┘              │    RDS + S3         │
~$27/month                           └─────────────────────┘
                                     ~$36/month (simpler!)
```

## Architecture

### What We Keep
- **RDS PostgreSQL** - Database (automatic backups, safe)
- **S3** - File storage (recordings, uploads, images)
- **Kinde** - Authentication (no changes)
- **Stripe** - Payments (no changes)

### What We Remove
- Lambda function
- API Gateway
- Fargate cluster & service
- ECR repositories
- Service Discovery namespace

### What We Add
- Lightsail instance ($20/month - 4GB RAM, 2 vCPU)
- PM2 process manager (free)
- Nginx reverse proxy (free)

---

## Phase 1: Local Development Setup

### 1.1 Create Unified Server Structure

```
backend/
├── server.js              # Main Express server (already exists)
├── services/
│   └── recorder.service.js  # Change to use local Puppeteer
├── puppeteer/
│   └── recorder.js        # Move from recorder-service
├── public/
│   ├── recorder.html      # Already exists
│   └── videoRecorder.html # Already exists
├── Dockerfile             # For local dev with Docker
└── docker-compose.yml     # Local dev stack
```

### 1.2 Docker Compose for Local Dev

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      - S3_BUCKET=family-helper-files-prod
      - NODE_ENV=development
    volumes:
      - ./:/app
      - /app/node_modules
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: familyhelper
      POSTGRES_USER: familyhelper_admin
      POSTGRES_PASSWORD: localdevpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 1.3 Unified Dockerfile

```dockerfile
FROM node:20-slim

# Install Chrome dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 \
    libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxfixes3 \
    libxkbcommon0 libxrandr2 xdg-utils curl \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Phase 2: Merge Recorder into Backend

### 2.1 Changes to recorder.service.js

```javascript
// BEFORE: Calls external Fargate service
const response = await axios.post(`${RECORDER_FARGATE_URL}/recording/start`, ...);

// AFTER: Calls local Puppeteer directly
const localRecorder = require('../puppeteer/recorder');
await localRecorder.startRecording({ groupId, callId, callType, ... });
```

### 2.2 Move Puppeteer Code

Copy from `recorder-service/src/recorder.js` to `backend/puppeteer/recorder.js`

Key change: Instead of loading HTML from file, load from Express:
```javascript
// BEFORE
const htmlPath = path.join(__dirname, '../public/recorder.html');
return `file://${htmlPath}?${params}`;

// AFTER
return `http://localhost:3000/recorder.html?${params}`;
```

---

## Phase 3: Lightsail Setup

### 3.1 Create Lightsail Instance

1. **Region:** ap-southeast-2 (Sydney)
2. **Blueprint:** Ubuntu 22.04 LTS
3. **Instance Plan:** $20/month (4GB RAM, 2 vCPU, 80GB SSD)
4. **Name:** family-helper-prod

### 3.2 Initial Server Setup

```bash
# Connect via SSH
ssh -i ~/.ssh/lightsail-key.pem ubuntu@<ip-address>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Chrome dependencies for Puppeteer
sudo apt install -y wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 \
    libnss3 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 \
    libxrandr2 xdg-utils

# Create app directory
sudo mkdir -p /var/www/familyhelper
sudo chown ubuntu:ubuntu /var/www/familyhelper
```

### 3.3 Nginx Configuration

```nginx
# /etc/nginx/sites-available/familyhelper
server {
    listen 80;
    server_name familyhelperapp.com www.familyhelperapp.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.4 SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d familyhelperapp.com -d www.familyhelperapp.com
```

### 3.5 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'familyhelper',
    script: 'server.js',
    instances: 1,  // Single instance for Puppeteer
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://...',
      S3_BUCKET: 'family-helper-files-prod',
      // ... other env vars
    }
  }]
};
```

### 3.6 Deployment Script

```bash
#!/bin/bash
# deploy.sh - Run on Lightsail server

cd /var/www/familyhelper

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Restart application
pm2 restart familyhelper
```

---

## Phase 4: DNS Migration

### 4.1 Update DNS Records

```
# Current (pointing to CloudFront/API Gateway)
familyhelperapp.com     A     <cloudfront-ip>
api.familyhelperapp.com A     <api-gateway-ip>

# New (pointing to Lightsail)
familyhelperapp.com     A     <lightsail-static-ip>
www.familyhelperapp.com A     <lightsail-static-ip>
```

### 4.2 Update Kinde Callback URLs

- Remove CloudFront URLs
- Add: `https://familyhelperapp.com/auth/callback`

### 4.3 Update Stripe Webhook URL

- Change to: `https://familyhelperapp.com/webhooks/stripe`

---

## Phase 5: Tear Down Old Infrastructure

### 5.1 Resources to Delete

```bash
# Delete in this order to avoid dependency issues:

# 1. ECS Service
aws ecs delete-service --cluster family-helper-recorder-prod \
    --service family-helper-recorder --force

# 2. ECS Cluster
aws ecs delete-cluster --cluster family-helper-recorder-prod

# 3. Service Discovery
aws servicediscovery delete-service --id srv-iawupwp2piohhryg
aws servicediscovery delete-namespace --id ns-zthxpq4ynp7m3tnt

# 4. Lambda Function
aws lambda delete-function --function-name family-helper-api-prod

# 5. API Gateway
aws apigatewayv2 delete-api --api-id i5i7f82usg

# 6. ECR Repositories (optional - keep for rollback)
# aws ecr delete-repository --repository-name family-helper-recorder --force

# 7. CloudFront Distribution (if not needed)
# Keep if serving static web-admin from S3
```

### 5.2 Resources to KEEP

- **RDS** - Database
- **S3 buckets** - File storage
- **IAM roles** - May need for S3 access
- **VPC** - If RDS needs it (check security groups)

---

## Phase 6: Web Admin Hosting

Two options:

### Option A: Serve from Lightsail (Simplest)

```javascript
// In server.js
app.use(express.static('web-admin/dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-admin/dist/index.html'));
});
```

### Option B: Keep S3 + CloudFront (Faster for static files)

Keep current setup, just update API URL in web-admin to point to Lightsail.

**Recommendation:** Option A for simplicity. Lightsail can easily serve static files.

---

## Cost Comparison

| Item | Before (Lambda) | After (Lightsail) |
|------|-----------------|-------------------|
| Compute | Lambda ~$5 + Fargate ~$6 | Lightsail $20 |
| Database | RDS ~$15 | RDS ~$15 |
| Storage | S3 ~$1 | S3 ~$1 |
| API Gateway | ~$1 | $0 |
| CloudFront | ~$1 | $0 (if using Option A) |
| **Total** | **~$29/month** | **~$36/month** |

Slightly more expensive but **MUCH simpler** to maintain and debug.

---

## Rollback Plan

If something goes wrong:

1. Point DNS back to CloudFront/API Gateway
2. Lambda and Fargate are still running (don't delete until confirmed)
3. Database unchanged - no data migration needed

---

## Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Local Docker setup | 1-2 hours |
| 2 | Merge recorder code | 1-2 hours |
| 3 | Lightsail setup | 2-3 hours |
| 4 | DNS migration | 30 mins |
| 5 | Tear down old | 30 mins |
| 6 | Web admin decision | 30 mins |
| **Total** | | **6-8 hours** |

---

## Checklist

### Pre-Migration
- [ ] Test locally with Docker
- [ ] Verify Puppeteer works in unified server
- [ ] Test all API endpoints locally
- [ ] Test call recording locally

### Migration
- [ ] Create Lightsail instance
- [ ] Install dependencies
- [ ] Deploy code
- [ ] Configure Nginx + SSL
- [ ] Test with Lightsail IP directly
- [ ] Update DNS
- [ ] Update Kinde/Stripe URLs

### Post-Migration
- [ ] Verify all features work
- [ ] Monitor logs for errors
- [ ] Test mobile app connectivity
- [ ] Test web admin
- [ ] Delete old infrastructure (after 1 week of stability)

---

## Questions to Decide

1. **Web admin hosting:** Serve from Lightsail or keep CloudFront?
   - Recommendation: Lightsail (simpler)

2. **Keep local Postgres option for dev?**
   - Recommendation: Yes, with docker-compose

3. **Backup strategy for Lightsail?**
   - Enable Lightsail automatic snapshots ($2.50/month for 7 days)

---

Ready to start? Let's begin with Phase 1: Local Docker setup.
