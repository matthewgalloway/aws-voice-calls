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
