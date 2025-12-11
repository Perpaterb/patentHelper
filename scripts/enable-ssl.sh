#!/bin/bash
# Enable SSL on Lightsail after DNS is pointed
# Usage: ./scripts/enable-ssl.sh

set -e

LIGHTSAIL_IP="52.65.37.116"
SSH_KEY="$HOME/.ssh/lightsail-family-helper.pem"
DOMAIN="familyhelperapp.com"

echo "=== Checking DNS for $DOMAIN ==="
CURRENT_IP=$(curl -s "https://dns.google/resolve?name=$DOMAIN&type=A" | grep -o '"data":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Current IP: $CURRENT_IP"
echo "Expected IP: $LIGHTSAIL_IP"

if [ "$CURRENT_IP" != "$LIGHTSAIL_IP" ]; then
    echo ""
    echo "WARNING: DNS has not propagated yet!"
    echo "  Current: $CURRENT_IP"
    echo "  Expected: $LIGHTSAIL_IP"
    echo ""
    echo "Please update DNS in Porkbun first:"
    echo "  A record @ -> $LIGHTSAIL_IP"
    echo "  A record www -> $LIGHTSAIL_IP"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "=== Enabling SSL with Let's Encrypt ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP \
    "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN"

echo ""
echo "=== Restarting services ==="
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$LIGHTSAIL_IP \
    "sudo systemctl reload nginx && pm2 restart family-helper"

echo ""
echo "=== SSL Enabled! ==="
echo "Web App: https://$DOMAIN"
echo "API: https://$DOMAIN/health"
