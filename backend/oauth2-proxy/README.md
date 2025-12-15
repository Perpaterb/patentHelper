# oauth2-proxy Edge Authentication

This directory contains configuration for oauth2-proxy, which provides edge authentication to block unauthorized requests BEFORE they reach the Express API.

## Overview

### Current Architecture (Without oauth2-proxy)
```
User → Nginx → Express (handles auth internally)
                  ↓
          Unauthorized requests still
          reach Express before rejection
```

### New Architecture (With oauth2-proxy)
```
User → Nginx → oauth2-proxy → Express
                    ↓
          Unauthorized requests
          blocked HERE (never reach Express)
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

## Local Development Testing

### Prerequisites
1. Get **Kinde Client Secret** from Kinde dashboard:
   - Go to: https://familyhelperapp.kinde.com
   - Settings → Applications → FamilyHelperAPPDev
   - Copy the Client Secret

2. Add callback URL in Kinde:
   - Settings → Applications → FamilyHelperAPPDev → Callbacks
   - Add: `http://localhost:4180/oauth2/callback`

### Start oauth2-proxy Locally

```bash
# Set environment variables
export KINDE_CLIENT_SECRET="your-client-secret-from-kinde"
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
