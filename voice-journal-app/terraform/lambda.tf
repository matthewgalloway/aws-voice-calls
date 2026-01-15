# Lambda Functions for Voice Journal

# IAM Role for Outbound Caller Lambda
resource "aws_iam_role" "outbound_caller_lambda" {
  name = "${var.app_name}-${var.environment}-outbound-caller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for Outbound Caller Lambda
resource "aws_iam_role_policy" "outbound_caller_policy" {
  name = "${var.app_name}-${var.environment}-outbound-caller-policy"
  role = aws_iam_role.outbound_caller_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.calls.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.twilio_credentials.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Outbound Caller Lambda Function
resource "aws_lambda_function" "outbound_caller" {
  filename         = "${path.module}/../lambda/outbound-caller/function.zip"
  function_name    = "${var.app_name}-${var.environment}-outbound-caller"
  role             = aws_iam_role.outbound_caller_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../lambda/outbound-caller/function.zip") ? filebase64sha256("${path.module}/../lambda/outbound-caller/function.zip") : null

  environment {
    variables = {
      TWILIO_SECRET_ARN   = aws_secretsmanager_secret.twilio_credentials.arn
      TWILIO_PHONE_NUMBER = var.twilio_phone_number
      APP_URL             = "https://${aws_apprunner_service.app.service_url}"
      USERS_TABLE         = aws_dynamodb_table.users.name
      CALLS_TABLE         = aws_dynamodb_table.calls.name
    }
  }

  depends_on = [aws_iam_role_policy.outbound_caller_policy]
}

# CloudWatch Log Group for Outbound Caller
resource "aws_cloudwatch_log_group" "outbound_caller" {
  name              = "/aws/lambda/${aws_lambda_function.outbound_caller.function_name}"
  retention_in_days = 14
}

# IAM Role for Scheduler Manager Lambda
resource "aws_iam_role" "scheduler_manager_lambda" {
  name = "${var.app_name}-${var.environment}-scheduler-manager-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for Scheduler Manager Lambda
resource "aws_iam_role_policy" "scheduler_manager_policy" {
  name = "${var.app_name}-${var.environment}-scheduler-manager-policy"
  role = aws_iam_role.scheduler_manager_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "scheduler:CreateSchedule",
          "scheduler:UpdateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:GetSchedule"
        ]
        Resource = "arn:aws:scheduler:${var.aws_region}:*:schedule/${aws_scheduler_schedule_group.user_calls.name}/*"
      },
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = aws_iam_role.eventbridge_scheduler.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.users.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Scheduler Manager Lambda Function
resource "aws_lambda_function" "scheduler_manager" {
  filename         = "${path.module}/../lambda/scheduler-manager/function.zip"
  function_name    = "${var.app_name}-${var.environment}-scheduler-manager"
  role             = aws_iam_role.scheduler_manager_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../lambda/scheduler-manager/function.zip") ? filebase64sha256("${path.module}/../lambda/scheduler-manager/function.zip") : null

  environment {
    variables = {
      OUTBOUND_CALLER_ARN = aws_lambda_function.outbound_caller.arn
      SCHEDULER_ROLE_ARN  = aws_iam_role.eventbridge_scheduler.arn
      USERS_TABLE         = aws_dynamodb_table.users.name
      SCHEDULE_GROUP      = aws_scheduler_schedule_group.user_calls.name
    }
  }

  depends_on = [aws_iam_role_policy.scheduler_manager_policy]
}

# CloudWatch Log Group for Scheduler Manager
resource "aws_cloudwatch_log_group" "scheduler_manager" {
  name              = "/aws/lambda/${aws_lambda_function.scheduler_manager.function_name}"
  retention_in_days = 14
}

# Permission for App Runner to invoke Scheduler Manager Lambda
resource "aws_lambda_permission" "scheduler_manager_invoke" {
  statement_id  = "AllowAppRunnerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler_manager.function_name
  principal     = "tasks.apprunner.amazonaws.com"
  source_arn    = aws_apprunner_service.app.arn
}
