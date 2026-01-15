terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ECR Repository for Docker images
resource "aws_ecr_repository" "app" {
  name                 = "${var.app_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# ECR Lifecycle Policy - keep last 10 images
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# IAM Role for App Runner to access ECR
resource "aws_iam_role" "app_runner_ecr_access" {
  name = "${var.app_name}-${var.environment}-apprunner-ecr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_runner_ecr_access" {
  role       = aws_iam_role.app_runner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM Role for App Runner instance
resource "aws_iam_role" "app_runner_instance" {
  name = "${var.app_name}-${var.environment}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

# App Runner Service
resource "aws_apprunner_service" "app" {
  service_name = "${var.app_name}-${var.environment}"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.app_runner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "3000"

        runtime_environment_variables = {
          NODE_ENV                           = "production"
          HOSTNAME                           = "0.0.0.0"
          PORT                               = "3000"
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  = var.clerk_publishable_key
          CLERK_SECRET_KEY                   = var.clerk_secret_key
          NEXT_PUBLIC_CLERK_SIGN_IN_URL      = "/sign-in"
          NEXT_PUBLIC_CLERK_SIGN_UP_URL      = "/sign-up"
          NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = "/dashboard"
          NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = "/dashboard"
        }
      }

      image_identifier      = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"
    }

    auto_deployments_enabled = false
  }

  instance_configuration {
    cpu               = var.app_runner_cpu
    memory            = var.app_runner_memory
    instance_role_arn = aws_iam_role.app_runner_instance.arn
  }

  health_check_configuration {
    protocol            = "TCP"
    interval            = 5
    timeout             = 2
    healthy_threshold   = 1
    unhealthy_threshold = 20
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.app.arn

  depends_on = [
    aws_iam_role_policy_attachment.app_runner_ecr_access,
    aws_iam_role_policy_attachment.app_runner_secrets_access
  ]
}

# Auto Scaling Configuration
resource "aws_apprunner_auto_scaling_configuration_version" "app" {
  auto_scaling_configuration_name = "${var.app_name}-${var.environment}-autoscaling"

  max_concurrency = 100
  max_size        = 5
  min_size        = 1
}

# Secrets Manager for Clerk Secret Key
resource "aws_secretsmanager_secret" "clerk_secret_key" {
  name        = "${var.app_name}-${var.environment}-clerk-secret-key"
  description = "Clerk secret key for ${var.app_name}"
}

resource "aws_secretsmanager_secret_version" "clerk_secret_key" {
  secret_id     = aws_secretsmanager_secret.clerk_secret_key.id
  secret_string = var.clerk_secret_key
}

# IAM Policy for App Runner to access Secrets Manager
resource "aws_iam_policy" "app_runner_secrets_access" {
  name        = "${var.app_name}-${var.environment}-secrets-access"
  description = "Allow App Runner to access secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.clerk_secret_key.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_runner_secrets_access" {
  role       = aws_iam_role.app_runner_instance.name
  policy_arn = aws_iam_policy.app_runner_secrets_access.arn
}
