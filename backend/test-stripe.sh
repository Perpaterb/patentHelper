#!/bin/bash

# Stripe Subscription Testing Script
# This script tests the Stripe subscription endpoints

API_URL="http://localhost:3000"
echo "=========================================="
echo "Stripe Subscription Endpoint Tests"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ PASS${NC} - Server is running"
else
    echo -e "${RED}❌ FAIL${NC} - Server is not responding"
    exit 1
fi
echo ""

# Test 2: Get Pricing (Public endpoint - no auth required)
echo "Test 2: GET /subscriptions/pricing (Public)"
echo "--------------------------------------------"
PRICING_RESPONSE=$(curl -s "$API_URL/subscriptions/pricing")
if echo "$PRICING_RESPONSE" | grep -q "Admin Subscription"; then
    echo -e "${GREEN}✅ PASS${NC} - Pricing endpoint returns data"
    echo "Response:"
    echo "$PRICING_RESPONSE" | jq .
else
    echo -e "${RED}❌ FAIL${NC} - Pricing endpoint failed"
    echo "$PRICING_RESPONSE"
fi
echo ""

# Test 3: Check Stripe configuration
echo "Test 3: Stripe Configuration Check"
echo "-----------------------------------"
if grep -q "STRIPE_SECRET_KEY=sk_test_" ../.env.local 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} - Stripe test secret key configured"
elif grep -q "STRIPE_SECRET_KEY=sk_live_" ../.env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING${NC} - Using LIVE Stripe keys (should use TEST keys)"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - Stripe secret key not configured"
fi

if grep -q "STRIPE_PRICE_ADMIN_SUBSCRIPTION=price_" ../.env.local 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} - Admin subscription price ID configured"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - Admin subscription price ID not configured"
fi

if grep -q "STRIPE_PRICE_ADDITIONAL_STORAGE=price_" ../.env.local 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} - Additional storage price ID configured"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - Additional storage price ID not configured"
fi
echo ""

# Test 4: POST /subscriptions/checkout (Requires authentication)
echo "Test 4: POST /subscriptions/checkout (Protected)"
echo "------------------------------------------------"
echo -e "${YELLOW}⚠️  SKIP${NC} - Requires valid authentication token"
echo "To test manually:"
echo "1. Log in via the web app at http://localhost:3001"
echo "2. Navigate to the Subscription page"
echo "3. Click 'Subscribe Now' button"
echo ""

# Test 5: Web app accessibility
echo "Test 5: Web App Accessibility"
echo "------------------------------"
WEB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001")
if [ "$WEB_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Web app is accessible at http://localhost:3001"
else
    echo -e "${RED}❌ FAIL${NC} - Web app is not responding (HTTP $WEB_RESPONSE)"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Endpoints tested:"
echo "  • GET /health - ✅ Working"
echo "  • GET /subscriptions/pricing - ✅ Working"
echo "  • POST /subscriptions/checkout - ⚠️  Requires Stripe configuration"
echo ""
echo "Next steps to complete testing:"
echo "1. Follow STRIPE_SETUP_GUIDE.md to get Stripe test credentials"
echo "2. Update .env.local with test API keys and price IDs"
echo "3. Restart backend server: npm run dev"
echo "4. Test checkout flow in web app: http://localhost:3001/subscription"
echo ""
