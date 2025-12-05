/**
 * Family Helper App - Terraform Outputs
 */

# ============================================
# API Outputs
# ============================================
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_stage_url" {
  description = "Full API URL with stage"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/${var.environment}"
}

# ============================================
# Web App Outputs
# ============================================
output "web_app_bucket" {
  description = "S3 bucket for web app"
  value       = aws_s3_bucket.web_app.id
}

output "web_app_url" {
  description = "S3 website URL"
  value       = aws_s3_bucket_website_configuration.web_app.website_endpoint
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.web_app.id
}

output "cloudfront_domain" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.web_app.domain_name
}

# ============================================
# Database Outputs
# ============================================
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

# ============================================
# Storage Outputs
# ============================================
output "file_storage_bucket" {
  description = "S3 bucket for file storage"
  value       = aws_s3_bucket.file_storage.id
}

# ============================================
# Lambda Outputs
# ============================================
output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.api.arn
}

# ============================================
# VPC Outputs
# ============================================
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}
