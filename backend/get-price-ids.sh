#!/bin/bash

# Script to get Price IDs from Stripe Products
# Usage: STRIPE_SECRET_KEY=sk_test_xxx ./get-price-ids.sh

# Check if STRIPE_SECRET_KEY is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "Error: STRIPE_SECRET_KEY environment variable is not set"
  echo "Usage: STRIPE_SECRET_KEY=sk_test_xxx ./get-price-ids.sh"
  exit 1
fi

STRIPE_KEY="$STRIPE_SECRET_KEY"
ADMIN_PRODUCT="prod_TH7BO6YhhlO5Oq"
STORAGE_PRODUCT="prod_TH7CRMwhpViasn"

echo "Fetching Price IDs from Stripe..."
echo "===================================="
echo ""

echo "Admin Subscription Product:"
echo "---------------------------"
curl -s "https://api.stripe.com/v1/products/${ADMIN_PRODUCT}" \
  -u "${STRIPE_KEY}:" \
  | jq -r '"Product Name: \(.name)\nDefault Price ID: \(.default_price)"'
echo ""

echo "Additional Storage Product:"
echo "---------------------------"
curl -s "https://api.stripe.com/v1/products/${STORAGE_PRODUCT}" \
  -u "${STRIPE_KEY}:" \
  | jq -r '"Product Name: \(.name)\nDefault Price ID: \(.default_price)"'
echo ""

# Get all prices for these products
echo "Getting all prices..."
echo "====================="
echo ""

echo "Prices for Admin Subscription:"
ADMIN_PRICES=$(curl -s "https://api.stripe.com/v1/prices?product=${ADMIN_PRODUCT}" \
  -u "${STRIPE_KEY}:")
echo "$ADMIN_PRICES" | jq -r '.data[] | "Price ID: \(.id)\nAmount: \(.unit_amount / 100) \(.currency | ascii_upcase)\nInterval: \(.recurring.interval)\nActive: \(.active)\n"'

echo "Prices for Additional Storage:"
STORAGE_PRICES=$(curl -s "https://api.stripe.com/v1/prices?product=${STORAGE_PRODUCT}" \
  -u "${STRIPE_KEY}:")
echo "$STORAGE_PRICES" | jq -r '.data[] | "Price ID: \(.id)\nAmount: \(.unit_amount / 100) \(.currency | ascii_upcase)\nInterval: \(.recurring.interval)\nActive: \(.active)\n"'
