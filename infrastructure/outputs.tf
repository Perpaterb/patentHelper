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
  description = "CloudFront URL for web app"
  value       = "https://${aws_cloudfront_distribution.web_app.domain_name}"
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
  description = "Main API Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  description = "Main API Lambda function ARN"
  value       = aws_lambda_function.api.arn
}

output "media_processor_function_name" {
  description = "Media Processor Lambda function name"
  value       = aws_lambda_function.media_processor.function_name
}

output "media_processor_function_arn" {
  description = "Media Processor Lambda function ARN"
  value       = aws_lambda_function.media_processor.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL for Media Processor"
  value       = aws_ecr_repository.media_processor.repository_url
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

# ============================================
# Bastion Outputs
# ============================================
output "bastion_public_ip" {
  description = "Bastion host public IP (for SSH tunneling to RDS)"
  value       = aws_instance.bastion.public_ip
}

output "bastion_ssh_command" {
  description = "SSH command to connect to bastion"
  value       = "ssh -i ~/.ssh/${var.bastion_key_name}.pem ec2-user@${aws_instance.bastion.public_ip}"
}

output "database_tunnel_command" {
  description = "SSH tunnel command for database access"
  value       = "ssh -i ~/.ssh/${var.bastion_key_name}.pem -L 5433:${aws_db_instance.main.endpoint} ec2-user@${aws_instance.bastion.public_ip} -N"
}
