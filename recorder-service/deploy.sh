#!/bin/bash
# Deploy Recorder Service to AWS Fargate
#
# Prerequisites:
# 1. Docker Desktop running with WSL integration enabled
# 2. AWS CLI configured with proper credentials
# 3. Terraform installed
#
# Usage: ./deploy.sh

set -e

# Configuration
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID="412527729032"
ECR_REPO="family-helper-recorder"
IMAGE_TAG="latest"

echo "========================================"
echo "  Recorder Service Deployment Script"
echo "========================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker not found. Please ensure Docker Desktop is running with WSL integration enabled."
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    # Try common alternative locations
    if command -v ~/.local/bin/aws &> /dev/null; then
        AWS_CMD=~/.local/bin/aws
    else
        echo "ERROR: AWS CLI not found."
        exit 1
    fi
else
    AWS_CMD=aws
fi

echo "1. Logging into ECR..."
$AWS_CMD ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo ""
echo "2. Building Docker image..."
cd "$(dirname "$0")"
docker build -t $ECR_REPO:$IMAGE_TAG .

echo ""
echo "3. Tagging image for ECR..."
docker tag $ECR_REPO:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

echo ""
echo "4. Pushing to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

echo ""
echo "========================================"
echo "  Docker image pushed successfully!"
echo "========================================"
echo ""
echo "Image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"
echo ""
echo "Next steps:"
echo "  1. Run 'terraform apply' in infrastructure/ to create ECS resources"
echo "  2. Add RECORDER_FARGATE_URL to Lambda environment variables"
echo "  3. Test call recording"
echo ""
