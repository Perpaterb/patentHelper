# Family Helper App - Deployment Guide

This guide covers deploying the Family Helper App to AWS production environment.

## Prerequisites

1. **AWS Account** with CLI configured (`aws configure`)
2. **Terraform** installed (v1.0+)
3. **Node.js 20** installed
4. **Domain** (familyhelperapp.com) registered and ready

## Architecture Overview

```
                    ┌─────────────────┐
                    │   CloudFront    │
                    │   (CDN + SSL)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼──────────┐
    │   S3 (Web App)    │       │    API Gateway      │
    │  Static Hosting   │       │    (REST API)       │
    └───────────────────┘       └──────────┬──────────┘
                                           │
                                ┌──────────▼──────────┐
                                │   Lambda Function   │
                                │   (Express.js)      │
                                └──────────┬──────────┘
                                           │
                         ┌─────────────────┼─────────────────┐
                         │                 │                 │
              ┌──────────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐
              │  RDS PostgreSQL │  │ S3 (Files)    │  │ CloudWatch  │
              │   (Database)    │  │ (User Media)  │  │  (Logs)     │
              └─────────────────┘  └───────────────┘  └─────────────┘
```

## Deployment Steps

### Step 1: Set Up Terraform Variables

```bash
cd infrastructure

# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Fill in these values in `terraform.tfvars`:

```hcl
# Database credentials
db_username = "familyhelper_admin"
db_password = "YOUR_STRONG_PASSWORD_HERE"  # Use a strong password!

# From your .env.local file:
jwt_secret             = "your-jwt-secret"
message_encryption_key = "your-64-char-hex-key"
kinde_domain           = "https://your-app.kinde.com"
kinde_client_id        = "your-client-id"
kinde_client_secret    = "your-client-secret"

# Stripe PRODUCTION keys (not test keys!)
stripe_secret_key     = "sk_live_..."
stripe_webhook_secret = "whsec_..."
```

### Step 2: Build Lambda Package

```bash
cd backend
./scripts/build-lambda.sh
```

This creates `lambda.zip` ready for deployment.

### Step 3: Initialize and Apply Terraform

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply (creates all AWS resources)
terraform apply
```

**Important:** First apply will take 10-15 minutes (RDS creation is slow).

### Step 4: Run Database Migrations

After Terraform creates the RDS instance, run migrations:

```bash
# Get the database URL from Terraform output
terraform output rds_endpoint

# Update your DATABASE_URL and run migrations
cd ../backend
DATABASE_URL="postgresql://familyhelper_admin:PASSWORD@RDS_ENDPOINT:5432/familyhelper" npx prisma migrate deploy
```

### Step 5: Deploy Web App

```bash
cd web-admin

# Set environment variables
export S3_BUCKET=$(cd ../infrastructure && terraform output -raw web_app_bucket)
export CLOUDFRONT_DISTRIBUTION_ID=$(cd ../infrastructure && terraform output -raw cloudfront_distribution_id)

# Deploy
./scripts/deploy.sh
```

### Step 6: Update DNS (familyhelperapp.com)

Get the CloudFront domain:
```bash
cd infrastructure
terraform output cloudfront_domain
```

In your domain registrar (Route 53, Namecheap, etc.):
1. Create a CNAME record: `www` → `<cloudfront_domain>`
2. Create an A record (or ALIAS): `@` → `<cloudfront_domain>`

### Step 7: Configure Custom Domain (Optional)

To use `familyhelperapp.com` with SSL:

1. Request an ACM certificate in `us-east-1` region
2. Validate domain ownership (DNS or email)
3. Update `infrastructure/main.tf` to use the certificate
4. Run `terraform apply` again

## Environment Variables

### Backend (Lambda)
Set via Terraform in `infrastructure/main.tf`:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `MESSAGE_ENCRYPTION_KEY` | 64-char hex key for message encryption |
| `KINDE_DOMAIN` | Kinde auth domain |
| `KINDE_CLIENT_ID` | Kinde client ID |
| `KINDE_CLIENT_SECRET` | Kinde client secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `S3_BUCKET` | File storage bucket name |
| `CORS_ORIGIN` | Allowed origin for CORS |

### Web App (Build Time)
Create `.env.production` in `web-admin/`:

```env
EXPO_PUBLIC_API_URL=https://API_GATEWAY_URL/prod
EXPO_PUBLIC_KINDE_DOMAIN=https://your-app.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=your-client-id
EXPO_PUBLIC_KINDE_REDIRECT_URI=https://familyhelperapp.com/callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI=https://familyhelperapp.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Monitoring

### CloudWatch Logs
- Lambda logs: `/aws/lambda/family-helper-api-prod`
- API Gateway logs: `/aws/api-gateway/family-helper`

### Useful AWS Console Links
- [Lambda Console](https://ap-southeast-2.console.aws.amazon.com/lambda)
- [API Gateway Console](https://ap-southeast-2.console.aws.amazon.com/apigateway)
- [RDS Console](https://ap-southeast-2.console.aws.amazon.com/rds)
- [S3 Console](https://s3.console.aws.amazon.com/s3)
- [CloudFront Console](https://console.aws.amazon.com/cloudfront)

## CI/CD Pipeline (Automated Deployment)

The project uses **GitHub Actions** for automated testing and deployment.

### Workflow Files

Located in `.github/workflows/`:

| File | Purpose | Trigger |
|------|---------|---------|
| `ci-cd.yml` | Full pipeline: tests + deployment | Push to `main` |
| `pr-checks.yml` | Validation only: tests + build check | Pull requests |

### How Automated Deployment Works

**On push to `main` branch:**
1. **Test Phase** (parallel):
   - `test-backend`: Runs backend linting and tests
   - `test-web-admin`: Runs web-admin tests
   - `test-mobile-main`: Runs mobile-main tests

2. **Deploy Phase** (only if ALL tests pass):
   - `deploy-backend`: Builds Lambda package → uploads to S3 → updates Lambda
   - `deploy-web-admin`: Builds web app → syncs to S3 → invalidates CloudFront cache

### Required GitHub Secrets

Configure in GitHub: **Settings → Secrets and variables → Actions**

| Secret Name | Description |
|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for web-admin build |

### Monitoring Deployments

- **GitHub Actions Dashboard**: https://github.com/Perpaterb/patentHelper/actions
- **View deployment logs**: Click on any workflow run

### Deploying Changes

**Automatic (Recommended):**
```bash
# Simply push to main - CI/CD handles everything
git add -A
git commit -m "feat: Your feature description"
git push
```

**Monitor at**: https://github.com/Perpaterb/patentHelper/actions

---

## Manual Deployment (Emergency/Override)

Use these commands if CI/CD fails or you need to deploy manually.

### Backend Updates (Lambda)
```bash
cd backend
npm ci

# Build Lambda package
mkdir -p lambda-build
cp -r controllers routes services middleware config prisma utils server.js lambda.js package.json package-lock.json lambda-build/
[ -d "public" ] && cp -r public lambda-build/ || true
cd lambda-build
npm ci --omit=dev
npx prisma generate

# Remove unnecessary packages to stay under Lambda 250MB limit
# Media processing packages (handled by separate Media Processor Lambda)
rm -rf node_modules/sharp node_modules/@img node_modules/heic-convert node_modules/libheif-js 2>/dev/null || true
rm -rf node_modules/fluent-ffmpeg node_modules/@ffmpeg-installer node_modules/@ffprobe-installer 2>/dev/null || true

# Dev tools that shouldn't be in production
rm -rf node_modules/typescript node_modules/eslint node_modules/@types 2>/dev/null || true
rm -rf node_modules/@typescript-eslint node_modules/@eslint node_modules/@eslint-community 2>/dev/null || true

# Prisma CLI (we only need @prisma/client at runtime)
rm -rf node_modules/prisma 2>/dev/null || true

# Heavy transitive dependencies
rm -rf node_modules/effect node_modules/fast-check 2>/dev/null || true
rm -rf node_modules/core-js 2>/dev/null || true

# Remove non-Lambda Prisma engines (keep only rhel for Lambda)
find node_modules -type f -name "libquery_engine-*" ! -name "*rhel*" -delete 2>/dev/null || true
find node_modules/@prisma -name "*darwin*" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules/@prisma -name "*windows*" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules/@prisma -name "*debian*" -type d -exec rm -rf {} + 2>/dev/null || true

# Create zip and deploy
zip -r ../lambda.zip . -x "*.git*" -x "*__tests__*" -x "*.test.js"
cd ..
rm -rf lambda-build

# Upload and update Lambda
aws s3 cp lambda.zip s3://family-helper-files-prod/lambda/lambda.zip
aws lambda update-function-code \
  --function-name family-helper-api-prod \
  --s3-bucket family-helper-files-prod \
  --s3-key lambda/lambda.zip
```

### Web App Updates (CloudFront)
```bash
cd web-admin
npm install --legacy-peer-deps

# Build for production
npx expo export --platform web

# Deploy to S3 and invalidate cache
aws s3 sync dist/ s3://family-helper-web-prod/ --delete
aws cloudfront create-invalidation --distribution-id EOFB5YCW926IM --paths "/*"
```

### Rollback Procedure

**Rollback Lambda to previous version:**
```bash
# Option 1: Redeploy from a specific git commit
git checkout <commit-hash>
cd backend
# Follow manual deployment steps above

# Option 2: Roll back to previous Lambda version (if versions are enabled)
aws lambda list-versions-by-function --function-name family-helper-api-prod
```

**Rollback Web Admin:**
```bash
git checkout <commit-hash>
cd web-admin
npm install --legacy-peer-deps
npx expo export --platform web
aws s3 sync dist/ s3://family-helper-web-prod/ --delete
aws cloudfront create-invalidation --distribution-id EOFB5YCW926IM --paths "/*"
```

## Cost Estimation

Monthly costs (Sydney region, low traffic):

| Service | Estimated Cost |
|---------|---------------|
| RDS (db.t3.micro) | ~$15-20/month |
| Lambda | ~$0-5/month (free tier) |
| API Gateway | ~$0-5/month |
| S3 | ~$1-5/month |
| CloudFront | ~$1-5/month |
| NAT Gateway | ~$35/month |
| **Total** | **~$55-70/month** |

**Note:** NAT Gateway is the biggest cost. For lower costs, consider using Lambda without VPC (requires RDS Proxy or public RDS endpoint).

## Troubleshooting

### Lambda Timeout
If API requests timeout, check:
1. Lambda memory/timeout settings in Terraform
2. RDS connection issues (security groups)
3. NAT Gateway routing

### CORS Errors
1. Check `cors_allowed_origins` in `variables.tf`
2. Verify API Gateway CORS settings
3. Check CloudFront doesn't strip headers

### Database Connection Failed
1. Verify security groups allow Lambda → RDS (port 5432)
2. Check DATABASE_URL is correct
3. Ensure Lambda is in same VPC as RDS

## Cleanup

To destroy all resources:
```bash
cd infrastructure
terraform destroy
```

**Warning:** This deletes everything including the database. Make backups first!
