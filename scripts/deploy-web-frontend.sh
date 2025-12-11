#!/bin/bash
# Deploy web-admin to Lightsail
# Usage: ./scripts/deploy-web-frontend.sh
#
# This script builds the web-admin app and syncs it to Lightsail.
# The web frontend is served by nginx from /home/ubuntu/web-admin on Lightsail.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

LIGHTSAIL_IP="52.65.37.116"
SSH_KEY="$HOME/.ssh/lightsail-family-helper.pem"
WEB_DIR="/home/ubuntu/web-admin"

echo "=== Deploying Web Admin to Lightsail ==="
echo "Project root: $PROJECT_ROOT"

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

# Build the web frontend
echo ""
echo "Step 1: Building web-admin for web..."
cd "$PROJECT_ROOT/web-admin"
npm install --legacy-peer-deps
npx expo export --platform web

# Verify build succeeded
if [ ! -f "dist/index.html" ]; then
    echo "ERROR: Build failed - dist/index.html not found"
    exit 1
fi

# Extract bundle hash for verification
BUNDLE_HASH=$(grep -o 'index-[a-f0-9]*\.js' dist/index.html | head -1)
echo "Built bundle: $BUNDLE_HASH"

# Sync to Lightsail
echo ""
echo "Step 2: Syncing to Lightsail..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$PROJECT_ROOT/web-admin/dist/" ubuntu@$LIGHTSAIL_IP:$WEB_DIR/

# Verify deployment
echo ""
echo "Step 3: Verifying deployment..."
DEPLOYED_BUNDLE=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP "grep -o 'index-[a-f0-9]*\.js' $WEB_DIR/index.html | head -1")

if [ "$BUNDLE_HASH" = "$DEPLOYED_BUNDLE" ]; then
    echo "SUCCESS: Deployment verified!"
    echo "  Local bundle:    $BUNDLE_HASH"
    echo "  Deployed bundle: $DEPLOYED_BUNDLE"
else
    echo "WARNING: Bundle mismatch!"
    echo "  Local bundle:    $BUNDLE_HASH"
    echo "  Deployed bundle: $DEPLOYED_BUNDLE"
fi

# Final verification via HTTPS
echo ""
echo "Step 4: Verifying via HTTPS..."
LIVE_BUNDLE=$(curl -s "https://familyhelperapp.com/index.html" | grep -o 'index-[a-f0-9]*\.js' | head -1)

if [ "$BUNDLE_HASH" = "$LIVE_BUNDLE" ]; then
    echo "SUCCESS: Live site verified!"
    echo "  Live bundle: $LIVE_BUNDLE"
else
    echo "WARNING: Live site may be cached. Bundle: $LIVE_BUNDLE"
    echo "  Try clearing browser cache or wait a moment."
fi

echo ""
echo "=== Web Admin Deployment Complete ==="
echo "URL: https://familyhelperapp.com"
