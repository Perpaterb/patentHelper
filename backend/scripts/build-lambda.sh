#!/bin/bash
# Build script for Main API Lambda deployment package
# Creates a lambda.zip file ready for deployment WITHOUT media processing packages
# Media processing is handled by a separate container-based Lambda

set -e

echo "🏗️  Building Main API Lambda deployment package..."
echo "   (Excludes media processing - that's in a separate Lambda)"

# Navigate to backend directory
cd "$(dirname "$0")/.."
BACKEND_DIR=$(pwd)

# Clean up any existing build
rm -rf lambda-build lambda.zip

# Create build directory
mkdir -p lambda-build

# Copy necessary files
echo "📦 Copying files..."
cp -r controllers lambda-build/
cp -r routes lambda-build/
cp -r services lambda-build/
cp -r middleware lambda-build/
cp -r config lambda-build/
cp -r prisma lambda-build/
cp server.js lambda-build/
cp lambda.js lambda-build/
cp package.json lambda-build/
cp package-lock.json lambda-build/

# Copy public folder if it exists
if [ -d "public" ]; then
  cp -r public lambda-build/
fi

# Install production dependencies only
echo "📥 Installing production dependencies..."
cd lambda-build
npm ci --omit=dev

# Generate Prisma client for AWS Lambda (rhel-openssl-3.0.x only)
echo "🗄️  Generating Prisma client for AWS Lambda..."
PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x npx prisma generate

# Remove unnecessary files to reduce package size
echo "🧹 Cleaning up unnecessary files..."

# CRITICAL: Remove media processing packages (handled by separate Lambda)
echo "  - Removing media processing packages (handled by Media Processor Lambda)..."
rm -rf node_modules/fluent-ffmpeg 2>/dev/null || true
rm -rf node_modules/@ffmpeg-installer 2>/dev/null || true
rm -rf node_modules/@ffprobe-installer 2>/dev/null || true

# Aggressively remove non-Lambda Prisma engine binaries (keep only rhel for Lambda)
echo "  - Removing non-Lambda Prisma engines..."
find node_modules -name "libquery_engine-*" ! -name "*rhel*" -delete 2>/dev/null || true
find node_modules/@prisma -name "*darwin*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/@prisma -name "*windows*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/@prisma -name "*debian*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/@prisma -name "*linux-musl*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/prisma -type f -name "*.node" ! -name "*rhel*" -delete 2>/dev/null || true
rm -rf node_modules/prisma/libquery_engine-* 2>/dev/null || true
rm -rf node_modules/@prisma/engines/libquery* 2>/dev/null || true

# Remove packages that shouldn't be in production
echo "  - Removing dev packages..."
rm -rf node_modules/typescript 2>/dev/null || true
rm -rf node_modules/effect 2>/dev/null || true
rm -rf node_modules/eslint 2>/dev/null || true
rm -rf node_modules/fast-check 2>/dev/null || true
rm -rf node_modules/@types 2>/dev/null || true
rm -rf node_modules/core-js 2>/dev/null || true

# Remove TypeScript source and declaration files
echo "  - Removing TypeScript files..."
find node_modules -name "*.ts" ! -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "*.map" -delete 2>/dev/null || true

# Remove documentation and test files
echo "  - Removing docs and tests..."
find node_modules -name "README*" -delete 2>/dev/null || true
find node_modules -name "CHANGELOG*" -delete 2>/dev/null || true
find node_modules -name "*.md" -delete 2>/dev/null || true
find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "example" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true

# Show node_modules size after cleanup
echo ""
echo "📊 node_modules size after cleanup:"
du -sh node_modules

# Create zip file from inside the lambda-build directory (flat structure)
echo "📦 Creating zip file..."
zip -r "$BACKEND_DIR/lambda.zip" . -x "*.git*" -x "*__tests__*" -x "*.test.js" -x "*.spec.js"

# Go back to backend dir and clean up
cd "$BACKEND_DIR"
rm -rf lambda-build

# Show file size
ZIP_SIZE=$(ls -lh lambda.zip | awk '{print $5}')
UNZIP_SIZE=$(unzip -l lambda.zip | tail -1 | awk '{print $1}')
UNZIP_MB=$(echo "scale=2; $UNZIP_SIZE / 1048576" | bc)

echo ""
echo "✅ Build complete!"
echo "📁 Output: lambda.zip"
echo "   Compressed: $ZIP_SIZE"
echo "   Uncompressed: ${UNZIP_MB} MB"
echo ""

# Check if under Lambda limit
if [ "$UNZIP_SIZE" -gt 262144000 ]; then
  echo "⚠️  WARNING: Uncompressed size exceeds 250MB Lambda limit!"
  echo "   Consider further optimization or use container deployment."
else
  echo "✅ Size is within Lambda zip deployment limits (250MB)"
fi

echo ""
echo "Next steps:"
echo "1. Upload lambda.zip to S3:"
echo "   aws s3 cp lambda.zip s3://family-helper-files-prod/lambda/lambda.zip"
echo ""
echo "2. Run terraform apply in infrastructure/"
echo ""
echo "Note: Media processing (video/audio conversion) is handled by"
echo "      a separate Media Processor Lambda using container deployment."
