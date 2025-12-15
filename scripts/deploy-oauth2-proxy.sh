#!/bin/bash
# Deploy oauth2-proxy to Lightsail
#
# This script:
# 1. Downloads and installs oauth2-proxy binary
# 2. Copies configuration files
# 3. Sets up systemd service
# 4. Updates Nginx to route through oauth2-proxy
#
# Prerequisites:
# - KINDE_CLIENT_SECRET must be set on the server
# - Run this AFTER the app is working without oauth2-proxy
#
# Usage: ./scripts/deploy-oauth2-proxy.sh

set -e

LIGHTSAIL_IP="52.65.37.116"
SSH_KEY="$HOME/.ssh/lightsail-family-helper.pem"
APP_DIR="/home/ubuntu/family-helper"
OAUTH2_PROXY_VERSION="v7.6.0"

echo "=== Deploying oauth2-proxy to Lightsail ==="
echo ""

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

# Check if KINDE_CLIENT_SECRET is available
echo "Checking prerequisites..."
if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP "test -f $APP_DIR/oauth2-proxy/.env"; then
    echo ""
    echo "ERROR: oauth2-proxy/.env file not found on server!"
    echo ""
    echo "Before running this script, you must create:"
    echo "  $APP_DIR/oauth2-proxy/.env"
    echo ""
    echo "With contents:"
    echo "  OAUTH2_PROXY_CLIENT_ID=your-kinde-client-id"
    echo "  OAUTH2_PROXY_CLIENT_SECRET=your-kinde-client-secret"
    echo "  OAUTH2_PROXY_COOKIE_SECRET=\$(openssl rand -base64 32)"
    echo ""
    echo "To create it:"
    echo "  ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP"
    echo "  mkdir -p $APP_DIR/oauth2-proxy"
    echo "  nano $APP_DIR/oauth2-proxy/.env"
    echo ""
    exit 1
fi

# Create directory structure
echo "Creating directories..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP "mkdir -p $APP_DIR/oauth2-proxy"

# Copy configuration files
echo "Copying configuration files..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    ./backend/oauth2-proxy/oauth2-proxy.cfg \
    ubuntu@$LIGHTSAIL_IP:$APP_DIR/oauth2-proxy/

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    ./backend/oauth2-proxy/oauth2-proxy.service \
    ubuntu@$LIGHTSAIL_IP:/tmp/

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    ./backend/oauth2-proxy/nginx-with-oauth2-proxy.conf \
    ubuntu@$LIGHTSAIL_IP:/tmp/

# Install oauth2-proxy and configure services
echo "Installing oauth2-proxy..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP << EOF
set -e

# Download oauth2-proxy binary if not present
if [ ! -f /usr/local/bin/oauth2-proxy ]; then
    echo "Downloading oauth2-proxy $OAUTH2_PROXY_VERSION..."
    cd /tmp
    wget -q https://github.com/oauth2-proxy/oauth2-proxy/releases/download/$OAUTH2_PROXY_VERSION/oauth2-proxy-$OAUTH2_PROXY_VERSION.linux-amd64.tar.gz
    tar -xzf oauth2-proxy-$OAUTH2_PROXY_VERSION.linux-amd64.tar.gz
    sudo mv oauth2-proxy-$OAUTH2_PROXY_VERSION.linux-amd64/oauth2-proxy /usr/local/bin/
    sudo chmod +x /usr/local/bin/oauth2-proxy
    rm -rf oauth2-proxy-$OAUTH2_PROXY_VERSION.linux-amd64*
    echo "oauth2-proxy installed successfully"
else
    echo "oauth2-proxy already installed"
fi

# Install systemd service
echo "Installing systemd service..."
sudo mv /tmp/oauth2-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable oauth2-proxy

# Backup current Nginx config
echo "Backing up current Nginx config..."
sudo cp /etc/nginx/sites-available/familyhelper /etc/nginx/sites-available/familyhelper.backup.\$(date +%Y%m%d%H%M%S)

# Install new Nginx config
echo "Installing new Nginx config with oauth2-proxy..."
sudo mv /tmp/nginx-with-oauth2-proxy.conf /etc/nginx/sites-available/familyhelper-oauth2-proxy

# Test Nginx config
echo "Testing Nginx configuration..."
sudo nginx -t

echo ""
echo "=== Installation Complete ==="
echo ""
echo "oauth2-proxy is installed but NOT YET ACTIVE."
echo ""
echo "To ACTIVATE oauth2-proxy:"
echo "  1. Start oauth2-proxy service:"
echo "     sudo systemctl start oauth2-proxy"
echo ""
echo "  2. Switch Nginx to use oauth2-proxy config:"
echo "     sudo ln -sf /etc/nginx/sites-available/familyhelper-oauth2-proxy /etc/nginx/sites-enabled/familyhelper"
echo "     sudo systemctl reload nginx"
echo ""
echo "To ROLLBACK to direct Express:"
echo "  1. Stop oauth2-proxy:"
echo "     sudo systemctl stop oauth2-proxy"
echo ""
echo "  2. Restore original Nginx config:"
echo "     sudo ln -sf /etc/nginx/sites-available/familyhelper /etc/nginx/sites-enabled/familyhelper"
echo "     sudo systemctl reload nginx"
echo ""
echo "Check oauth2-proxy status:"
echo "  sudo systemctl status oauth2-proxy"
echo "  journalctl -u oauth2-proxy -f"
echo ""
EOF

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Next steps:"
echo "1. SSH into server: ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP"
echo "2. Test oauth2-proxy: sudo systemctl start oauth2-proxy"
echo "3. Check logs: journalctl -u oauth2-proxy -f"
echo "4. If working, activate Nginx config (see commands above)"
echo ""
