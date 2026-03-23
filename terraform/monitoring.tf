// ============================================================================
// Backend Monitoring & Alerting
//
// Controlled by var.enable_monitoring (default: false).
// Set TF_VAR_enable_monitoring=true in CircleCI to deploy these resources.
//
// Free tier budget:
// - CloudWatch Alarms: 10 total (2 used by backup.tf, 8 used here)
// - CloudWatch Dashboards: 3 total (1 used here)
// - SNS: 1,000 email notifications/month
// ============================================================================

// --- SNS Topic for backend monitoring alerts ---

resource "aws_sns_topic" "monitoring_alerts" {
  count = var.enable_monitoring ? 1 : 0
  name  = "pnp-app-monitoring-alerts-topic"
}

resource "aws_sns_topic_subscription" "monitoring_email" {
  count     = var.enable_monitoring ? 1 : 0
  topic_arn = aws_sns_topic.monitoring_alerts[0].arn
  protocol  = "email"
  endpoint  = var.backup_alert_email
}

// --- CloudWatch Alarms (8 of 8 remaining free tier alarms) ---

// 1. Lambda errors across all functions
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "errors"
    expression  = "SUM(METRICS())"
    label       = "Total Lambda Errors"
    return_data = true
  }

  dynamic "metric_query" {
    for_each = local.lambda_function_names
    content {
      id = "e_${replace(metric_query.value, "-", "_")}"
      metric {
        metric_name = "Errors"
        namespace   = "AWS/Lambda"
        period      = 300
        stat        = "Sum"
        dimensions = {
          FunctionName = "pnp-${metric_query.value}"
        }
      }
    }
  }

  alarm_description = "Alerts when any Lambda function produces errors"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 2. Lambda throttles across all functions
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "throttles"
    expression  = "SUM(METRICS())"
    label       = "Total Lambda Throttles"
    return_data = true
  }

  dynamic "metric_query" {
    for_each = local.lambda_function_names
    content {
      id = "t_${replace(metric_query.value, "-", "_")}"
      metric {
        metric_name = "Throttles"
        namespace   = "AWS/Lambda"
        period      = 300
        stat        = "Sum"
        dimensions = {
          FunctionName = "pnp-${metric_query.value}"
        }
      }
    }
  }

  alarm_description = "Alerts when any Lambda function is being throttled"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 3. API Gateway 5xx errors
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when the API returns 5xx server errors"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 4. API Gateway 4xx errors (high rate may indicate auth issues or misuse)
resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 50

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when the API returns a high number of 4xx client errors (>50 in 10 minutes), which may indicate auth issues or abuse"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 5. API Gateway latency (p99 > 5 seconds)
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 5000

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when API p99 latency exceeds 5 seconds for 10 minutes"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 6. DynamoDB system errors on characters table
resource "aws_cloudwatch_metric_alarm" "dynamodb_characters_errors" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-dynamodb-characters-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    TableName = aws_dynamodb_table.characters.name
  }

  alarm_description = "Alerts when DynamoDB system errors occur on the characters table"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 7. DynamoDB system errors on history table
resource "aws_cloudwatch_metric_alarm" "dynamodb_history_errors" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-dynamodb-history-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    TableName = aws_dynamodb_table.characters_history.name
  }

  alarm_description = "Alerts when DynamoDB system errors occur on the history table"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// 8. Step Functions execution failures
resource "aws_cloudwatch_metric_alarm" "step_functions_failures" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "pnp-app-step-functions-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "failures"
    expression  = "SUM(METRICS())"
    label       = "Total Step Function Failures"
    return_data = true
  }

  dynamic "metric_query" {
    for_each = local.state_machine_names
    content {
      id = "f_${replace(metric_query.value, "-", "_")}"
      metric {
        metric_name = "ExecutionsFailed"
        namespace   = "AWS/States"
        period      = 300
        stat        = "Sum"
        dimensions = {
          StateMachineArn = "arn:aws:states:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:stateMachine:${metric_query.value}"
        }
      }
    }
  }

  alarm_description = "Alerts when any Step Functions state machine execution fails"
  alarm_actions     = [aws_sns_topic.monitoring_alerts[0].arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts[0].arn]
}

// --- Locals for function/state machine names ---

locals {
  lambda_function_names = [
    "add-history-record",
    "add-special-ability",
    "apply-level-up",
    "clone-character",
    "create-character",
    "delete-character",
    "get-character",
    "get-characters",
    "get-history",
    "get-level-up",
    "get-skill-increase-cost",
    "revert-history-record",
    "set-history-comment",
    "update-attribute",
    "update-base-value",
    "update-calculation-points",
    "update-combat-stats",
    "update-skill",
  ]

  state_machine_names = [
    "update-skill",
    "update-attribute",
    "update-base-value",
    "add-special-ability",
    "update-calculation-points",
    "update-combat-stats",
    "apply-level-up",
    "create-character",
  ]
}

// --- CloudWatch Dashboard (1 of 3 free tier dashboards) ---

resource "aws_cloudwatch_dashboard" "backend" {
  count          = var.enable_monitoring ? 1 : 0
  dashboard_name = "pnp-app-backend"

  dashboard_body = jsonencode({
    widgets = [
      // --- Row 1: API Gateway Overview ---
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# API Gateway"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "API Requests"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { label = "Total Requests" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "API Errors"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "5XXError", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { label = "5xx Errors", color = "#d62728" }],
            ["AWS/ApiGateway", "4XXError", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { label = "4xx Errors", color = "#ff7f0e" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "API Latency"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "p99", label = "p99" }],
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "p50", label = "p50" }],
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "Average", label = "Average" }],
          ]
        }
      },

      // --- Row 2: Lambda Overview ---
      {
        type   = "text"
        x      = 0
        y      = 7
        width  = 24
        height = 1
        properties = {
          markdown = "# Lambda Functions"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Invocations"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for name in local.lambda_function_names :
            ["AWS/Lambda", "Invocations", "FunctionName", "pnp-${name}"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 8
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Errors"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for name in local.lambda_function_names :
            ["AWS/Lambda", "Errors", "FunctionName", "pnp-${name}"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 8
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Duration (Average)"
          region = data.aws_region.current.name
          stat   = "Average"
          period = 300
          metrics = [for name in local.lambda_function_names :
            ["AWS/Lambda", "Duration", "FunctionName", "pnp-${name}"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 14
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Throttles"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for name in local.lambda_function_names :
            ["AWS/Lambda", "Throttles", "FunctionName", "pnp-${name}"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 14
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Concurrent Executions"
          region = data.aws_region.current.name
          stat   = "Maximum"
          period = 300
          metrics = [for name in local.lambda_function_names :
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", "pnp-${name}"]
          ]
        }
      },

      // --- Row 3: Step Functions ---
      {
        type   = "text"
        x      = 0
        y      = 20
        width  = 24
        height = 1
        properties = {
          markdown = "# Step Functions"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 21
        width  = 8
        height = 6
        properties = {
          title  = "Executions Started"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for name in local.state_machine_names :
            ["AWS/States", "ExecutionsStarted", "StateMachineArn", "arn:aws:states:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:stateMachine:${name}"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 21
        width  = 8
        height = 6
        properties = {
          title  = "Executions Failed"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for name in local.state_machine_names :
            ["AWS/States", "ExecutionsFailed", "StateMachineArn", "arn:aws:states:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:stateMachine:${name}"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 21
        width  = 8
        height = 6
        properties = {
          title  = "Execution Time (Average)"
          region = data.aws_region.current.name
          stat   = "Average"
          period = 300
          metrics = [for name in local.state_machine_names :
            ["AWS/States", "ExecutionTime", "StateMachineArn", "arn:aws:states:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:stateMachine:${name}"]
          ]
        }
      },

      // --- Row 4: DynamoDB ---
      {
        type   = "text"
        x      = 0
        y      = 27
        width  = 24
        height = 1
        properties = {
          markdown = "# DynamoDB"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 28
        width  = 12
        height = 6
        properties = {
          title  = "Characters Table - Read/Write Capacity"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.characters.name, { stat = "Sum", label = "Read Units" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.characters.name, { stat = "Sum", label = "Write Units" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 28
        width  = 12
        height = 6
        properties = {
          title  = "History Table - Read/Write Capacity"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.characters_history.name, { stat = "Sum", label = "Read Units" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.characters_history.name, { stat = "Sum", label = "Write Units" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 34
        width  = 12
        height = 6
        properties = {
          title  = "Characters Table - Latency"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "GetItem", { stat = "Average", label = "GetItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "PutItem", { stat = "Average", label = "PutItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "UpdateItem", { stat = "Average", label = "UpdateItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "Query", { stat = "Average", label = "Query" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 34
        width  = 12
        height = 6
        properties = {
          title  = "History Table - Latency"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters_history.name, "Operation", "GetItem", { stat = "Average", label = "GetItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters_history.name, "Operation", "PutItem", { stat = "Average", label = "PutItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters_history.name, "Operation", "Query", { stat = "Average", label = "Query" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 40
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Errors"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/DynamoDB", "SystemErrors", "TableName", aws_dynamodb_table.characters.name, { label = "Characters - System Errors", color = "#d62728" }],
            ["AWS/DynamoDB", "SystemErrors", "TableName", aws_dynamodb_table.characters_history.name, { label = "History - System Errors", color = "#ff7f0e" }],
            ["AWS/DynamoDB", "UserErrors", "TableName", aws_dynamodb_table.characters.name, { label = "Characters - User Errors", color = "#9467bd" }],
            ["AWS/DynamoDB", "UserErrors", "TableName", aws_dynamodb_table.characters_history.name, { label = "History - User Errors", color = "#8c564b" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 40
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Throttled Requests"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", aws_dynamodb_table.characters.name, { label = "Characters" }],
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", aws_dynamodb_table.characters_history.name, { label = "History" }],
          ]
        }
      },
    ]
  })
}
