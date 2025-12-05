/**
 * Family Helper App - Terraform Variables
 */

# ============================================
# General Settings
# ============================================
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "family-helper"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2"
}

# ============================================
# Domain Settings
# ============================================
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "familyhelperapp.com"
}

variable "cors_origin" {
  description = "CORS origin for API"
  type        = string
  default     = "https://familyhelperapp.com"
}

variable "cors_allowed_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = [
    "https://familyhelperapp.com",
    "https://www.familyhelperapp.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8081"
  ]
}

# ============================================
# Database Settings
# ============================================
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # Free tier eligible
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "familyhelper"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# ============================================
# Lambda Settings
# ============================================
variable "lambda_zip_path" {
  description = "Path to Lambda deployment package"
  type        = string
  default     = "../backend/lambda.zip"
}

# ============================================
# Authentication Settings
# ============================================
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "message_encryption_key" {
  description = "Message encryption key (64 hex chars)"
  type        = string
  sensitive   = true
}

variable "kinde_domain" {
  description = "Kinde authentication domain"
  type        = string
}

variable "kinde_client_id" {
  description = "Kinde client ID"
  type        = string
}

variable "kinde_client_secret" {
  description = "Kinde client secret (optional - only needed for mobile callback)"
  type        = string
  default     = ""
  sensitive   = true
}

# ============================================
# Stripe Settings
# ============================================
variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "billing_api_key" {
  description = "API key for internal billing endpoint"
  type        = string
  sensitive   = true
}
