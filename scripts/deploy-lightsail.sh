#!/bin/bash
# Deploy to Lightsail
# Usage: ./scripts/deploy-lightsail.sh

set -e

LIGHTSAIL_IP="52.65.37.116"
SSH_KEY="$HOME/.ssh/lightsail-family-helper.pem"
APP_DIR="/home/ubuntu/family-helper"

echo "=== Deploying to Lightsail ==="

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

# Create app directory on server
echo "Creating app directory..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP "mkdir -p $APP_DIR"

# Sync backend files (excluding node_modules, uploads, etc.)
echo "Syncing backend files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'uploads' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.log' \
  --exclude 'coverage' \
  --exclude '__tests__' \
  --exclude 'worker-service' \
  --exclude '.git' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  ./backend/ ubuntu@$LIGHTSAIL_IP:$APP_DIR/

# Install dependencies and run migrations
echo "Installing dependencies and running migrations..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP << 'EOF'
cd /home/ubuntu/family-helper

# Install production dependencies
npm ci --omit=dev

# Generate Prisma client
npx prisma generate

# Create uploads directory
mkdir -p uploads

# Check if .env exists
if [ ! -f .env ]; then
  echo "WARNING: .env file not found. Please create it before starting the server."
  exit 1
fi

# Run database migrations
npx prisma migrate deploy

# Restart the app with PM2
pm2 delete family-helper 2>/dev/null || true
pm2 start server.js --name family-helper \
  --env production \
  --log-date-format 'YYYY-MM-DD HH:mm:ss' \
  --merge-logs

# Save PM2 config
pm2 save

# Show status
pm2 status
EOF

# Build and deploy mobile-main web frontend
echo "Building mobile-main for web..."
cd mobile-main
npm install --legacy-peer-deps
npx expo export --platform web
cd ..

echo "Syncing web frontend files..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  ./mobile-main/dist/ ubuntu@$LIGHTSAIL_IP:/home/ubuntu/web-admin/

# Verify deployment
echo "Verifying deployment..."
DEPLOYED_BUNDLE=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP "grep -o 'index-[a-f0-9]*\.js' /home/ubuntu/web-admin/index.html | head -1")
echo "Deployed bundle: $DEPLOYED_BUNDLE"

echo "=== Deployment complete ==="
echo "Check status: ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP 'pm2 status'"
echo "View logs: ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP 'pm2 logs family-helper'"
echo ""
echo "Web App: https://familyhelperapp.com"
echo "API: https://familyhelperapp.com/health"
