# AWS Resources Documentation

This document lists all AWS resources used by Family Helper and their requirements.

## Critical Resources (MUST STAY RUNNING)

These resources are required for production to work. **DO NOT stop or delete these.**

### 1. Lightsail Instance - `family-helper-prod`

| Property | Value |
|----------|-------|
| Type | small_3_2 (2GB RAM, 2 vCPU) |
| IP | 52.65.37.116 |
| Cost | ~$24/month |
| Purpose | Runs the backend API server (Node.js/Express via PM2) |

### 2. RDS Database - `family-helper-db-prod`

| Property | Value |
|----------|-------|
| Type | db.t3.micro |
| Storage | 20GB |
| Endpoint | family-helper-db-prod.c3uu4gkmcwnq.ap-southeast-2.rds.amazonaws.com |
| Cost | ~$15-20/month |
| Purpose | PostgreSQL database for all app data |

### 3. EC2 Bastion - `family-helper-bastion`

| Property | Value |
|----------|-------|
| Instance ID | i-085ac3030ad9e712c |
| Type | t2.micro |
| Cost | ~$8-10/month |
| Purpose | SSH tunnel for Lightsail to reach RDS (RDS is in private VPC) |

**IMPORTANT:** The bastion MUST stay running for the database connection to work. Lightsail connects to RDS through an SSH tunnel via this bastion.

### 4. S3 Buckets

| Bucket | Purpose | Cost |
|--------|---------|------|
| family-helper-files-prod | User uploads (photos, videos, documents) | ~$1-5/month |
| family-helper-web-prod | Static web app files | ~$0.50/month |

### 5. CloudFront Distribution

| ID | Domain | Purpose |
|----|--------|---------|
| EOFB5YCW926IM | did5g5bty80vq.cloudfront.net | CDN for web app (also serves familyhelperapp.com) |

### 6. Lambda Functions

| Function | Purpose | Cost |
|----------|---------|------|
| family-helper-media-processor-prod | Video/audio processing (on-demand) | Pay per use |

---

## Resources Safely Deleted (Dec 2024)

These old/unused resources were deleted to reduce costs:

### Deleted Lambda Functions
- Game1-dev-serve
- serverless-portfolio-dev-serve
- servicenow-trigger
- servicenow-trigger-001
- custom-mannequin-dev-serve
- InternalSkillSearch-dev-serve
- RosterHelperServerless-dev-serve
- SSA-dev-serve
- CFIAMUserNotify-LambdaFunction

### Deleted API Gateways (HTTP)
- 7x duplicate servicenow-api gateways

### Deleted API Gateways (REST)
- Game1-dev
- InternalSkillSearch-dev
- custom-mannequin-dev
- serverless-portfolio-dev
- SSA-dev
- RosterHelperServerless-dev

---

## Bastion SSH Tunnel Configuration

The Lightsail server connects to RDS through an SSH tunnel via the bastion.

### How it Works

```
Lightsail (API) --> SSH Tunnel (localhost:5432) --> Bastion EC2 --> RDS (5432)
```

### Configuration Files on Lightsail

**Environment Variables** (`/home/ubuntu/family-helper/.env`):
```bash
# Database connection (via local tunnel)
DATABASE_URL=postgresql://familyhelper_admin:PASSWORD@localhost:5432/familyhelper

# Bastion SSH Tunnel settings
BASTION_HOST=3.27.81.17        # <-- UPDATE THIS if bastion IP changes
BASTION_USER=ec2-user
BASTION_KEY=/home/ubuntu/.ssh/bastion.pem
RDS_HOST=family-helper-db-prod.c3uu4gkmcwnq.ap-southeast-2.rds.amazonaws.com
RDS_PORT=5432
```

**Tunnel Startup Script** (`/home/ubuntu/start-tunnel.sh`):
```bash
#!/bin/bash
source /home/ubuntu/family-helper/.env
pkill -f 'autossh.*5432' 2>/dev/null || true
pkill -f 'ssh.*5432' 2>/dev/null || true
sleep 2
autossh -M 0 -f -N \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=no \
  -i $BASTION_KEY \
  -L 5432:$RDS_HOST:$RDS_PORT \
  $BASTION_USER@$BASTION_HOST
echo "SSH tunnel started to $BASTION_HOST"
```

**Crontab** (runs on Lightsail reboot):
```
@reboot /home/ubuntu/start-tunnel.sh
```

### If Bastion IP Changes

When the bastion EC2 is stopped and restarted, it gets a NEW public IP address.

**To update:**

1. Get the new bastion IP:
   ```bash
   ~/.local/bin/aws ec2 describe-instances --instance-ids i-085ac3030ad9e712c \
     --region ap-southeast-2 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
   ```

2. SSH to Lightsail and update the .env:
   ```bash
   ssh -i ~/.ssh/lightsail-family-helper.pem ubuntu@52.65.37.116
   nano /home/ubuntu/family-helper/.env
   # Update BASTION_HOST=<new-ip>
   ```

3. Restart the tunnel:
   ```bash
   /home/ubuntu/start-tunnel.sh
   ```

4. Restart the API:
   ```bash
   pm2 restart family-helper
   ```

5. Verify database connection:
   ```bash
   curl https://familyhelperapp.com/health/ready
   # Should show: "database": "connected"
   ```

### Troubleshooting

**"Can't reach database server at localhost:5432"**
- Check if tunnel is running: `ps aux | grep ssh | grep 5432`
- Check bastion is running: AWS Console or `aws ec2 describe-instances`
- Restart tunnel: `/home/ubuntu/start-tunnel.sh`

**Tunnel dies after some time**
- autossh should auto-reconnect, but if not, check bastion is reachable
- Verify bastion security group allows SSH from Lightsail IP

---

## Monthly Cost Estimate

| Resource | Cost |
|----------|------|
| Lightsail (small_3_2) | $24 |
| RDS (db.t3.micro) | $15-20 |
| EC2 Bastion (t2.micro) | $8-10 |
| S3 Storage | $2-5 |
| CloudFront | $1-5 |
| Lambda (media processor) | $0-5 |
| **Total** | **~$50-70/month** |

---

## Other AWS Resources (Not Family Helper)

These resources exist in the account but are NOT part of Family Helper:

### S3 Buckets (can be deleted if not needed)
- aws-sam-cli-managed-default-samclisourcebucket-*
- cf-templates-*
- custom-mannequin-* (multiple)
- game1-* (multiple)
- internalskillsearch-*
- rosterhelperserverless-*
- serverless-* (multiple)
- ssa-*

### CloudFront
- E1FANZJFDUQV1 (d2o5ja8q1b1ri4.cloudfront.net) - Unknown, may be from old project
