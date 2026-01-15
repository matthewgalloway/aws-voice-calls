variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "voice-journal"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key (CLERK_SECRET_KEY)"
  type        = string
  sensitive   = true
}

variable "app_runner_cpu" {
  description = "CPU units for App Runner (1024 = 1 vCPU)"
  type        = string
  default     = "1024"
}

variable "app_runner_memory" {
  description = "Memory in MB for App Runner"
  type        = string
  default     = "2048"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Twilio Configuration
variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
}

variable "twilio_phone_number" {
  description = "Twilio phone number for calls (E.164 format, e.g., +15551234567)"
  type        = string
}
