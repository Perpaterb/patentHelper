#!/bin/bash
# Build script for Lambda deployment package
# Creates a lambda.zip file ready for deployment

set -e

echo "🏗️  Building Lambda deployment package..."

# Navigate to backend directory
cd "$(dirname "$0")/.."

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

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Create zip file
echo "📦 Creating zip file..."
cd ..
zip -r lambda.zip lambda-build -x "*.git*" -x "*__tests__*" -x "*.test.js" -x "*.spec.js"

# Clean up build directory
rm -rf lambda-build

# Show file size
ZIP_SIZE=$(ls -lh lambda.zip | awk '{print $5}')
echo ""
echo "✅ Build complete!"
echo "📁 Output: lambda.zip ($ZIP_SIZE)"
echo ""
echo "Next steps:"
echo "1. cd ../infrastructure"
echo "2. terraform init"
echo "3. terraform plan"
echo "4. terraform apply"
