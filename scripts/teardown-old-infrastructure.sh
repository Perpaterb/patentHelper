#!/bin/bash
# Tear down old Lambda/Fargate infrastructure after Lightsail migration
# WARNING: Only run this AFTER confirming Lightsail is working!
#
# Usage: ./scripts/teardown-old-infrastructure.sh
#
# This script will DELETE:
# - ECS Fargate service and cluster
# - Lambda function
# - API Gateway
# - Service Discovery namespace
#
# This script will KEEP:
# - RDS database (still used by Lightsail)
# - S3 buckets (still used by Lightsail)
# - CloudFront distribution (can be deleted manually later)
# - ECR repositories (can be deleted manually later)

set -e

AWS_CLI="$HOME/.local/bin/aws"
REGION="ap-southeast-2"

echo "=============================================="
echo "  OLD INFRASTRUCTURE TEARDOWN"
echo "=============================================="
echo ""
echo "This will DELETE the following resources:"
echo "  - ECS Fargate service: family-helper-recorder"
echo "  - ECS Cluster: family-helper-recorder-prod"
echo "  - Lambda function: family-helper-api-prod"
echo "  - API Gateway: i5i7f82usg"
echo "  - Service Discovery namespace"
echo ""
echo "This will KEEP (still used by Lightsail):"
echo "  - RDS database"
echo "  - S3 buckets"
echo "  - CloudFront (delete manually if desired)"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Step 1: Delete ECS Service ==="
$AWS_CLI ecs update-service \
    --cluster family-helper-recorder-prod \
    --service family-helper-recorder \
    --desired-count 0 \
    --region $REGION 2>/dev/null || echo "Service may already be stopped"

$AWS_CLI ecs delete-service \
    --cluster family-helper-recorder-prod \
    --service family-helper-recorder \
    --force \
    --region $REGION 2>/dev/null || echo "Service may already be deleted"

echo ""
echo "=== Step 2: Delete ECS Cluster ==="
$AWS_CLI ecs delete-cluster \
    --cluster family-helper-recorder-prod \
    --region $REGION 2>/dev/null || echo "Cluster may already be deleted"

echo ""
echo "=== Step 3: Delete Lambda Function ==="
$AWS_CLI lambda delete-function \
    --function-name family-helper-api-prod \
    --region $REGION 2>/dev/null || echo "Lambda may already be deleted"

echo ""
echo "=== Step 4: Delete API Gateway ==="
$AWS_CLI apigatewayv2 delete-api \
    --api-id i5i7f82usg \
    --region $REGION 2>/dev/null || echo "API Gateway may already be deleted"

echo ""
echo "=== Step 5: Delete Service Discovery ==="
# Get namespace ID
NS_ID=$($AWS_CLI servicediscovery list-namespaces --region $REGION --query "Namespaces[?Name=='recorder.family-helper.local'].Id" --output text 2>/dev/null)
if [ -n "$NS_ID" ] && [ "$NS_ID" != "None" ]; then
    # Delete services in namespace first
    SERVICES=$($AWS_CLI servicediscovery list-services --region $REGION --query "Services[?NamespaceId=='$NS_ID'].Id" --output text 2>/dev/null)
    for SVC in $SERVICES; do
        echo "Deleting service discovery service: $SVC"
        $AWS_CLI servicediscovery delete-service --id $SVC --region $REGION 2>/dev/null || true
    done
    # Delete namespace
    $AWS_CLI servicediscovery delete-namespace --id $NS_ID --region $REGION 2>/dev/null || echo "Namespace may already be deleted"
else
    echo "No Service Discovery namespace found"
fi

echo ""
echo "=============================================="
echo "  TEARDOWN COMPLETE"
echo "=============================================="
echo ""
echo "The following resources have been deleted:"
echo "  - ECS Fargate service and cluster"
echo "  - Lambda function"
echo "  - API Gateway"
echo "  - Service Discovery namespace"
echo ""
echo "Still running (keep these):"
echo "  - RDS database: family-helper-db-prod"
echo "  - S3 buckets: family-helper-files-prod, family-helper-web-prod"
echo ""
echo "Optional manual cleanup:"
echo "  - CloudFront distribution: EOFB5YCW926IM"
echo "  - ECR repositories"
echo "  - VPC (if not needed)"
echo "  - Bastion host (can be stopped to save costs)"
echo ""
echo "Estimated monthly savings: ~$15-20/month"
