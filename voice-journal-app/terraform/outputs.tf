output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_name" {
  description = "ECR repository name"
  value       = aws_ecr_repository.app.name
}

output "app_runner_service_url" {
  description = "App Runner service URL"
  value       = "https://${aws_apprunner_service.app.service_url}"
}

output "app_runner_service_arn" {
  description = "App Runner service ARN"
  value       = aws_apprunner_service.app.arn
}

output "app_runner_service_id" {
  description = "App Runner service ID"
  value       = aws_apprunner_service.app.service_id
}

output "push_commands" {
  description = "Commands to build and push Docker image to ECR"
  value       = <<-EOT
    # Authenticate Docker to ECR
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}

    # Build the Docker image
    docker build -t ${aws_ecr_repository.app.repository_url}:latest .

    # Push the image to ECR
    docker push ${aws_ecr_repository.app.repository_url}:latest

    # Trigger App Runner deployment
    aws apprunner start-deployment --service-arn ${aws_apprunner_service.app.arn} --region ${var.aws_region}
  EOT
}

# DynamoDB Tables
output "dynamodb_users_table" {
  description = "DynamoDB users table name"
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_calls_table" {
  description = "DynamoDB calls table name"
  value       = aws_dynamodb_table.calls.name
}

output "dynamodb_entries_table" {
  description = "DynamoDB entries table name"
  value       = aws_dynamodb_table.entries.name
}

# Lambda Functions
output "outbound_caller_lambda_arn" {
  description = "Outbound caller Lambda ARN"
  value       = aws_lambda_function.outbound_caller.arn
}

output "scheduler_manager_lambda_arn" {
  description = "Scheduler manager Lambda ARN"
  value       = aws_lambda_function.scheduler_manager.arn
}

# Telnyx Webhook URLs
output "telnyx_webhook_urls" {
  description = "URLs to configure in Telnyx portal"
  value       = <<-EOT
    Configure these URLs in Telnyx portal for your connection:

    Voice webhook (HTTP POST):
      https://${aws_apprunner_service.app.service_url}/api/telnyx/voice

    Status callback (HTTP POST):
      https://${aws_apprunner_service.app.service_url}/api/telnyx/status
  EOT
}
