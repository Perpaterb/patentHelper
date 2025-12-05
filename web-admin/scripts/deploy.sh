#!/bin/bash
# Deploy script for web-admin to S3 + CloudFront
# Builds the app and syncs to S3, then invalidates CloudFront cache

set -e

# Configuration - update these after running terraform
S3_BUCKET="${S3_BUCKET:-family-helper-web-prod}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"

echo "🏗️  Building web-admin for production..."

# Navigate to web-admin directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the app
echo "🔨 Building production bundle..."
npx expo export --platform web

# Sync to S3
echo "📤 Uploading to S3..."
aws s3 sync dist/ s3://${S3_BUCKET}/ \
  --delete \
  --region ${AWS_REGION} \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html" \
  --exclude "*.json"

# Upload HTML/JSON files with shorter cache
aws s3 sync dist/ s3://${S3_BUCKET}/ \
  --delete \
  --region ${AWS_REGION} \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html" \
  --include "*.json"

# Invalidate CloudFront cache
if [ -n "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
    --paths "/*" \
    --region us-east-1
else
  echo "⚠️  CLOUDFRONT_DISTRIBUTION_ID not set, skipping cache invalidation"
fi

echo ""
echo "✅ Deployment complete!"
echo "🌐 Web app is now live!"
