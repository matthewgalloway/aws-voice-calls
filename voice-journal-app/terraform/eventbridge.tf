# EventBridge Scheduler resources for Voice Journal

# IAM Role for EventBridge Scheduler to invoke Lambda
resource "aws_iam_role" "eventbridge_scheduler" {
  name = "${var.app_name}-${var.environment}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for EventBridge Scheduler to invoke outbound caller Lambda
resource "aws_iam_role_policy" "eventbridge_invoke_lambda" {
  name = "${var.app_name}-${var.environment}-scheduler-invoke"
  role = aws_iam_role.eventbridge_scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.outbound_caller.arn
      }
    ]
  })
}

# Scheduler Group for organizing user call schedules
resource "aws_scheduler_schedule_group" "user_calls" {
  name = "${var.app_name}-${var.environment}-user-calls"
}
