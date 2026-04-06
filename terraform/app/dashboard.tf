resource "aws_cloudwatch_dashboard" "backend" {
  count = local.is_prod ? 1 : 0

  dashboard_name = "${local.prefix}-backend-${local.suffix}"

  # Lambda and Step Functions metrics are omitted here because CloudWatch
  # provides free automatic per-service dashboards that already cover
  # per-function invocations, errors, duration, throttles, concurrent
  # executions, and per-state-machine execution metrics.
  #
  # Keeping only API Gateway and DynamoDB widgets gives a focused cross-service
  # overview while staying within the free-tier limit of 50 metrics per dashboard.

  dashboard_body = jsonencode({
    widgets = [
      # --- API Gateway ---
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
          region = data.aws_region.current.region
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
          region = data.aws_region.current.region
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
          region = data.aws_region.current.region
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "p99", label = "p99" }],
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "p50", label = "p50" }],
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "Average", label = "Average" }],
          ]
        }
      },

      # --- DynamoDB ---
      {
        type   = "text"
        x      = 0
        y      = 7
        width  = 24
        height = 1
        properties = {
          markdown = "# DynamoDB"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 12
        height = 6
        properties = {
          title  = "Characters Table - Read/Write Capacity"
          region = data.aws_region.current.region
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
        y      = 8
        width  = 12
        height = 6
        properties = {
          title  = "History Table - Read/Write Capacity"
          region = data.aws_region.current.region
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
        y      = 14
        width  = 12
        height = 6
        properties = {
          title  = "Characters Table - Latency"
          region = data.aws_region.current.region
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
        y      = 14
        width  = 12
        height = 6
        properties = {
          title  = "History Table - Latency"
          region = data.aws_region.current.region
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
        y      = 20
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Errors"
          region = data.aws_region.current.region
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
        y      = 20
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Throttled Requests"
          region = data.aws_region.current.region
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
