#!/bin/bash
# Check which apps use a specific endpoint
# Usage: ./check-endpoint-usage.sh "/subscriptions/current"

ENDPOINT="$1"

if [ -z "$ENDPOINT" ]; then
  echo "Usage: ./check-endpoint-usage.sh '/endpoint/path'"
  exit 1
fi

echo "🔍 Searching for endpoint: $ENDPOINT"
echo ""

echo "📱 Mobile Main App:"
grep -rn "$ENDPOINT" ../mobile-main/src 2>/dev/null | head -10 || echo "  Not found"
echo ""

echo "📱 Mobile Messenger App:"
grep -rn "$ENDPOINT" ../mobile-messenger/src 2>/dev/null | head -10 || echo "  Not found"
echo ""

echo "🌐 Web Admin:"
grep -rn "$ENDPOINT" ../web-admin/src 2>/dev/null | head -10 || echo "  Not found"
echo ""

echo "✅ Done. Found all consumers of $ENDPOINT"
