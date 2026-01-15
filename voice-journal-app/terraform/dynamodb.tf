# DynamoDB Tables for Voice Journal

# Users table - stores user preferences
resource "aws_dynamodb_table" "users" {
  name         = "${var.app_name}-${var.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Name = "Voice Journal Users"
  }
}

# Calls table - tracks call history
resource "aws_dynamodb_table" "calls" {
  name         = "${var.app_name}-${var.environment}-calls"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "callSid"

  attribute {
    name = "callSid"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-timestamp-index"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = {
    Name = "Voice Journal Calls"
  }
}

# Entries table - stores journal transcriptions
resource "aws_dynamodb_table" "entries" {
  name         = "${var.app_name}-${var.environment}-entries"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "entryId"

  attribute {
    name = "entryId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Name = "Voice Journal Entries"
  }
}
