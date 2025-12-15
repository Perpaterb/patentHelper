# oauth2-proxy Edge Authentication

This directory contains configuration for oauth2-proxy, which provides edge authentication to block unauthorized requests BEFORE they reach the Express API.

## Overview

### Current Mode: Simple Blocking (Phase 1)

**STATUS: Implemented but deferred for full validation**

Currently oauth2-proxy is configured in "simple blocking" mode. This is a stepping stone to full edge authentication.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT ARCHITECTURE                                  │
│                        (Simple Blocking Mode)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────┐ │
│    │          │     │               │     │             │     │          │ │
│    │ Internet │────▶│ oauth2-proxy  │────▶│  Express    │────▶│ Database │ │
│    │          │     │ (passthrough) │     │    API      │     │          │ │
│    └──────────┘     └───────────────┘     └─────────────┘     └──────────┘ │
│                            │                     │                          │
│                            │                     │                          │
│                     Currently skips        API validates its                │
│                     all routes (can't      own custom JWTs                  │
│                     validate API JWTs)     (JWT_SECRET)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Why simple blocking?
- API uses custom JWTs signed with JWT_SECRET (issuer: parenting-helper-api)
- oauth2-proxy validates Kinde tokens (issuer: https://familyhelperapp.kinde.com)
- These are DIFFERENT tokens with DIFFERENT issuers
- oauth2-proxy cannot validate API's custom JWTs

Current behavior:
- All routes are skipped (SKIP_AUTH_ROUTES: "^/.*")
- oauth2-proxy acts as a passthrough proxy
- API handles all authentication internally
```

### Future Architecture (Full Edge Validation - Phase 2)

**TODO: Implement when adding load balancer or migrating to Kinde tokens**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TARGET ARCHITECTURE                                  │
│                     (Full Edge Validation Mode)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────┐ │
│    │          │     │               │     │             │     │          │ │
│    │ Internet │────▶│ oauth2-proxy  │────▶│  Express    │────▶│ Database │ │
│    │          │     │ (validates!)  │     │    API      │     │          │ │
│    └──────────┘     └───────┬───────┘     └─────────────┘     └──────────┘ │
│                             │                    │                          │
│                      ┌──────┴──────┐             │                          │
│                      │             │             │                          │
│                      ▼             ▼             │                          │
│               ┌──────────┐  ┌──────────┐   API trusts                       │
│               │ No Token │  │ Invalid  │   oauth2-proxy                     │
│               │          │  │  Token   │   completely                       │
│               └────┬─────┘  └────┬─────┘                                    │
│                    │             │                                          │
│                    ▼             ▼                                          │
│               ┌─────────────────────┐                                       │
│               │   Public Pages      │                                       │
│               │   (Landing Page)    │                                       │
│               └─────────────────────┘                                       │
│                                                                              │
│  Requirements for full validation:                                          │
│  1. Mobile apps send Kinde tokens directly (not custom JWTs)                │
│  2. API validates Kinde tokens (not custom JWTs)                            │
│  3. Remove JWT_SECRET-based auth from API                                   │
│  4. Update all auth middleware to use Kinde validation                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Legacy Architecture (Without oauth2-proxy)
```
User → Nginx → Express (handles auth internally)
                  ↓
          Unauthorized requests still
          reach Express before rejection
```

## Benefits

1. **Security**: Unauthorized traffic never reaches your application
2. **Performance**: Reduced load on Express (no processing of unauthorized requests)
3. **DDoS Protection**: oauth2-proxy blocks malformed requests
4. **Zero Frontend Changes**: Mobile apps and web app continue working unchanged

## How It Works

### For Web App (Browser)
1. User visits `https://familyhelperapp.com/groups`
2. oauth2-proxy checks for session cookie
3. No valid session → Redirect to Kinde login
4. User logs in via Kinde
5. Kinde redirects back with auth code
6. oauth2-proxy exchanges code for tokens, creates session cookie
7. Request forwarded to Express with user info headers

### For Mobile Apps (JWT)
1. Mobile app sends request with `Authorization: Bearer <jwt_token>`
2. oauth2-proxy validates JWT against Kinde JWKS
3. Valid token → Request forwarded to Express
4. Invalid token → 401 Unauthorized (never reaches Express)

## Files

| File | Purpose |
|------|---------|
| `oauth2-proxy.cfg` | Main configuration file |
| `oauth2-proxy.service` | systemd service definition |
| `nginx-with-oauth2-proxy.conf` | Nginx config that routes through oauth2-proxy |
| `.env` (create on server) | Secrets (client ID, client secret, cookie secret) |

## Important: M2M App Required

**oauth2-proxy requires a "confidential client" with a client secret.**

The regular Kinde apps (FamilyHelperAPPDev/Prod) are "public clients" (SPA/Mobile) and don't have secrets. You need a separate **Machine-to-Machine (M2M)** app for oauth2-proxy.

### Kinde Apps Structure

| App | Type | Purpose | Has Secret |
|-----|------|---------|------------|
| FamilyHelperAPPDev | Public (SPA) | Web app + Mobile (Dev) | No |
| FamilyHelperAPPProd | Public (SPA) | Web app + Mobile (Prod) | No |
| FamilyHelperAPPM2MDev | M2M | oauth2-proxy (Dev) | **Yes** |
| FamilyHelperAPPM2MProd | M2M | oauth2-proxy (Prod) | **Yes** (TODO) |

### Dev M2M App Credentials

| Setting | Value |
|---------|-------|
| Name | FamilyHelperAPPM2MDev |
| Client ID | `6363c85be6ba43529f5bcd953f5fdb32` |
| Client Secret | (stored securely, not in repo) |

## Local Development Testing

### Prerequisites
1. The **M2M app** is already created (FamilyHelperAPPM2MDev)
   - Client ID: `6363c85be6ba43529f5bcd953f5fdb32`
   - Client Secret: Get from Kinde dashboard

2. Add callback URL in Kinde for the M2M app:
   - Settings → Applications → FamilyHelperAPPM2MDev → Callbacks
   - Add: `http://localhost:4180/oauth2/callback`

### Start oauth2-proxy Locally

```bash
# Set environment variables (use M2M app secret from Kinde dashboard)
export KINDE_M2M_CLIENT_SECRET="your-m2m-client-secret-from-kinde"
export OAUTH2_PROXY_COOKIE_SECRET=$(openssl rand -base64 32 | tr -d '\n')

# Start with oauth2-proxy profile
docker-compose --profile oauth2-proxy up -d

# View logs
docker-compose logs -f oauth2-proxy
```

### Test It

```bash
# Public route (should work without auth)
curl http://localhost:4180/health

# Protected route (should redirect to Kinde)
curl -v http://localhost:4180/groups

# With JWT token (mobile app simulation)
curl -H "Authorization: Bearer <your_jwt_token>" http://localhost:4180/groups
```

### Stop oauth2-proxy

```bash
docker-compose --profile oauth2-proxy down
```

## Production Deployment

### Prerequisites

1. **Get Kinde Client Secret** (Production):
   - Go to: https://familyhelperapp.kinde.com
   - Settings → Applications → FamilyHelperAPPProd
   - Copy the Client Secret

2. **Add callback URL** in Kinde (Production):
   - Add: `https://familyhelperapp.com/oauth2/callback`

3. **Create secrets file on server**:
   ```bash
   ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116
   mkdir -p /home/ubuntu/family-helper/oauth2-proxy
   nano /home/ubuntu/family-helper/oauth2-proxy/.env
   ```

   Contents:
   ```env
   OAUTH2_PROXY_CLIENT_ID=bfbf86777e654654b374cf92f5719c74
   OAUTH2_PROXY_CLIENT_SECRET=your-kinde-client-secret
   OAUTH2_PROXY_COOKIE_SECRET=generate-with-openssl-rand-base64-32
   ```

### Deploy

```bash
./scripts/deploy-oauth2-proxy.sh
```

This script:
1. Downloads oauth2-proxy binary
2. Copies configuration files
3. Installs systemd service
4. Prepares Nginx config (but doesn't activate it)

### Activate oauth2-proxy

SSH into server and run:

```bash
# Start oauth2-proxy
sudo systemctl start oauth2-proxy

# Check it's running
sudo systemctl status oauth2-proxy
journalctl -u oauth2-proxy -f

# If working, switch Nginx to use oauth2-proxy
sudo ln -sf /etc/nginx/sites-available/familyhelper-oauth2-proxy /etc/nginx/sites-enabled/familyhelper
sudo nginx -t
sudo systemctl reload nginx
```

### Verify

```bash
# Health check (should work)
curl https://familyhelperapp.com/health

# Protected route without auth (should redirect to Kinde)
curl -v https://familyhelperapp.com/groups

# Test mobile app flow
curl -H "Authorization: Bearer <jwt_token>" https://familyhelperapp.com/groups
```

### Rollback

If something goes wrong:

```bash
# Stop oauth2-proxy
sudo systemctl stop oauth2-proxy

# Restore original Nginx config
sudo ln -sf /etc/nginx/sites-available/familyhelper /etc/nginx/sites-enabled/familyhelper
sudo systemctl reload nginx
```

## Configuration Reference

### Skip Auth Routes

These routes bypass oauth2-proxy authentication (defined in `oauth2-proxy.cfg`):

| Pattern | Purpose |
|---------|---------|
| `^/health.*` | Health checks |
| `^/public.*` | Public API endpoints |
| `^/webhooks.*` | Stripe webhooks (have own auth) |
| `^/auth.*` | Kinde auth endpoints |
| `^/.*\.(js\|css\|png\|...)$` | Static assets |

### Headers Passed to Express

oauth2-proxy adds these headers to authenticated requests:

| Header | Value |
|--------|-------|
| `X-Forwarded-User` | User's email |
| `X-Forwarded-Email` | User's email |
| `X-Forwarded-Access-Token` | OIDC access token |
| `Authorization` | `Bearer <token>` (passthrough) |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OAUTH2_PROXY_CLIENT_ID` | Yes | Kinde client ID |
| `OAUTH2_PROXY_CLIENT_SECRET` | Yes | Kinde client secret |
| `OAUTH2_PROXY_COOKIE_SECRET` | Yes | 32-byte random string for cookie encryption |

## Troubleshooting

### oauth2-proxy won't start

```bash
# Check logs
journalctl -u oauth2-proxy -f

# Common issues:
# - Missing .env file
# - Invalid client secret
# - Missing OIDC issuer URL
```

### Mobile app requests failing

```bash
# Check oauth2-proxy logs for JWT validation errors
journalctl -u oauth2-proxy | grep -i jwt

# Common issues:
# - JWT token expired
# - Wrong audience in token
# - Kinde JWKS endpoint unreachable
```

### Web app redirect loop

```bash
# Check Nginx config
sudo nginx -t

# Common issues:
# - Callback URL not added to Kinde
# - Cookie domain mismatch
# - HTTPS redirect issues
```

### Rollback to direct Express

```bash
# Stop oauth2-proxy
sudo systemctl stop oauth2-proxy

# Restore original Nginx
sudo ln -sf /etc/nginx/sites-available/familyhelper /etc/nginx/sites-enabled/familyhelper
sudo systemctl reload nginx

# Verify
curl https://familyhelperapp.com/health
```

## Security Notes

1. **Never commit secrets** - `.env` file is in `.gitignore`
2. **Cookie secret must be random** - Use `openssl rand -base64 32`
3. **HTTPS required in production** - Cookies have `Secure` flag
4. **Session duration** - Default 24 hours, configurable in `oauth2-proxy.cfg`

## Migration Roadmap: Simple Blocking → Full Edge Validation

**Current State (Phase 1 - Simple Blocking):**
- oauth2-proxy installed and configured
- All routes skipped (`SKIP_AUTH_ROUTES: "^/.*"`)
- API handles all authentication internally
- oauth2-proxy acts as passthrough proxy

**Future State (Phase 2 - Full Edge Validation):**

When you need a load balancer or want full edge validation, follow this migration:

### Step 1: Migrate Mobile Apps to Kinde Tokens

Currently mobile apps:
1. Login via Kinde → Get Kinde token
2. Exchange Kinde token for custom JWT via `/auth/mobile/token`
3. Use custom JWT for all API calls

Change to:
1. Login via Kinde → Get Kinde token
2. Use Kinde token directly for all API calls (skip `/auth/mobile/token`)

### Step 2: Update API Authentication Middleware

Currently API (`backend/middleware/auth.js`):
```javascript
// Validates custom JWT signed with JWT_SECRET
jwt.verify(token, process.env.JWT_SECRET)
```

Change to:
```javascript
// Validate Kinde tokens using JWKS
const jwksClient = require('jwks-rsa');
const client = jwksClient({ jwksUri: 'https://familyhelperapp.kinde.com/.well-known/jwks' });
```

### Step 3: Configure oauth2-proxy for Validation

Update `docker-compose.yml`:
```yaml
# Remove this line (currently skips all routes):
OAUTH2_PROXY_SKIP_AUTH_ROUTES: "^/.*"

# Change to only skip public routes:
OAUTH2_PROXY_SKIP_AUTH_ROUTES: "^/health.*|^/public.*|^/webhooks.*"

# Ensure JWT validation is enabled:
OAUTH2_PROXY_SKIP_JWT_BEARER_TOKENS: "false"
```

### Step 4: Test Thoroughly

1. Test mobile app login flow
2. Test web app login flow
3. Test API endpoints with valid tokens
4. Test API endpoints with invalid/expired tokens
5. Verify oauth2-proxy blocks unauthorized requests

### Estimated Effort

- Mobile apps: 2-4 hours (update auth service)
- API middleware: 4-8 hours (new JWKS validation)
- Testing: 4-8 hours (comprehensive auth testing)
- Total: ~2-3 days of focused work

### When to Do This

Consider migrating when:
- Adding a load balancer (ALB, nginx load balancing)
- Security audit requires edge authentication
- Need to reduce load on API from unauthorized requests
- Moving to multi-region deployment
